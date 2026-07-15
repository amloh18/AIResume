#!/usr/bin/env node
/**
 * Direct MongoDB Polar Reconciliation Script
 * Run: node scripts/reconcile-polar.mjs
 *
 * Restores subscriptions for known Polar customers and imports invoices.
 */

import mongoose from 'mongoose';
import { Polar } from '@polar-sh/sdk';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cvcircle';
const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN;
const POLAR_MODE = process.env.POLAR_MODE || 'production';

// ─── Known user overrides (from Polar dashboard + user info) ─────────────────
// These are applied regardless of product ID mapping success.
const MANUAL_OVERRIDES = [
  { email: 'jhasaurabh1907@gmail.com', planKey: 'starter_yearly' },
  // focused_monthly users (from Polar dashboard screenshot):
  { email: 'amlowwh@gmail.com',   planKey: 'focused_monthly' },
  { email: 'itsrajathere@gmail.com', planKey: 'focused_monthly' },
  { email: 'amlohsl@icloud.com',  planKey: 'focused_monthly' },
];

// ─── Plan billing cycle inference ────────────────────────────────────────────
function getBillingCycle(planKey) {
  if (planKey.includes('yearly')) return 'yearly';
  if (planKey.includes('quarterly')) return 'quarterly';
  return 'monthly';
}

function getPeriodEnd(planKey) {
  const days = planKey.includes('yearly') ? 365 : planKey.includes('quarterly') ? 90 : 30;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

// ─── Minimal Mongoose schemas ─────────────────────────────────────────────────
const userSchema = new mongoose.Schema({}, { strict: false });
const subscriptionSchema = new mongoose.Schema({}, { strict: false });
const invoiceSchema = new mongoose.Schema({}, { strict: false });
const pricingPlanSchema = new mongoose.Schema({}, { strict: false });

const User = mongoose.models.User || mongoose.model('User', userSchema, 'users');
const Subscription = mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema, 'subscriptions');
const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema, 'invoices');
const PricingPlan = mongoose.models.PricingPlan || mongoose.model('PricingPlan', pricingPlanSchema, 'pricingplans');

async function main() {
  console.log('\n[RECONCILE] Connecting to MongoDB:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('[RECONCILE] Connected ✅\n');

  // ─── Load all PricingPlans ─────────────────────────────────────────────────
  const allPlans = await PricingPlan.find({}).lean();
  console.log(`[RECONCILE] Loaded ${allPlans.length} PricingPlan docs`);

  const planByKey = new Map();
  for (const p of allPlans) planByKey.set(p.key, p);

  // ─── Apply Manual Overrides ────────────────────────────────────────────────
  console.log('\n[RECONCILE] ── Applying Manual Plan Overrides ──────────────────');
  for (const { email, planKey } of MANUAL_OVERRIDES) {
    const plan = planByKey.get(planKey);
    if (!plan) {
      console.error(`  ❌ Plan not found: ${planKey} for ${email}`);
      continue;
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.error(`  ❌ User not found: ${email}`);
      continue;
    }

    const cycle = getBillingCycle(planKey);
    const periodEnd = getPeriodEnd(planKey);
    const now = new Date();

    const previousPlan = user.currentPlanKey;

    // Update User doc
    await User.findByIdAndUpdate(user._id, {
      $set: {
        currentPlanKey: planKey,
        'subscription.planKey': planKey,
        'subscription.status': 'active',
        'subscription.accessExpiresAt': periodEnd,
        'subscription.currentPeriodEnd': periodEnd,
        'subscription.currentPeriodStart': now,
        'subscription.interval': cycle,
      }
    });

    // Upsert Subscription doc
    await Subscription.findOneAndUpdate(
      { userId: user._id },
      {
        $set: {
          status: 'active',
          planKey,
          planId: plan._id,
          billingCycle: cycle,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          endDate: periodEnd,
          startDate: now,
          userId: user._id,
        }
      },
      { upsert: true }
    );

    console.log(`  ✅ ${email}: ${previousPlan} → ${planKey} (expires ${periodEnd.toDateString()})`);
  }

  // ─── Polar Live Sync ───────────────────────────────────────────────────────
  if (!POLAR_ACCESS_TOKEN) {
    console.warn('\n[RECONCILE] POLAR_ACCESS_TOKEN not set — skipping live Polar sync');
  } else {
    const polar = new Polar({ accessToken: POLAR_ACCESS_TOKEN, server: POLAR_MODE });

    // Build product/price ID → plan maps
    const productIdToPlan = new Map();
    const priceIdToPlan = new Map();
    for (const p of allPlans) {
      const idFields = [p.polarProductId_monthly, p.polarProductId_yearly, p.polarProductId_quarterly, p.polarProductId_one_time].filter(Boolean);
      const priceFields = [p.polarPriceId_monthly, p.polarPriceId_yearly, p.polarPriceId_quarterly, p.polarPriceId_one_time].filter(Boolean);
      for (const id of idFields) productIdToPlan.set(id, p);
      for (const id of priceFields) priceIdToPlan.set(id, p);
      for (const rp of (p.regionalPricing || [])) {
        if (rp.polarProductId) productIdToPlan.set(rp.polarProductId, p);
        if (rp.polarPriceId) priceIdToPlan.set(rp.polarPriceId, p);
      }
    }
    console.log(`\n[RECONCILE] Product ID map: ${productIdToPlan.size} entries, Price ID map: ${priceIdToPlan.size} entries`);

    // Fetch all Polar subscriptions
    let allPolarSubs = [];
    try {
      const paginator = await polar.subscriptions.list({ limit: 100 });
      if (paginator && typeof paginator[Symbol.asyncIterator] === 'function') {
        for await (const page of paginator) {
          const items = page?.result?.items || page?.items || (Array.isArray(page) ? page : []);
          allPolarSubs.push(...items);
        }
      } else {
        allPolarSubs = paginator?.items || paginator?.result?.items || [];
      }
    } catch (err) {
      console.error('[RECONCILE] Failed to fetch Polar subscriptions:', err.message);
    }

    const activeSubs = allPolarSubs.filter(s => s.status === 'active' || s.status === 'trialing');
    console.log(`\n[RECONCILE] ── Live Polar Subscriptions: ${activeSubs.length} active / ${allPolarSubs.length} total ──`);

    for (const sub of activeSubs) {
      const customerEmail = sub.customer?.email || sub.customerEmail;
      if (!customerEmail) continue;

      const plan = productIdToPlan.get(sub.productId) || priceIdToPlan.get(sub.priceId);
      if (!plan) {
        // Already handled via manual override if email is in that list
        const isManualOverride = MANUAL_OVERRIDES.some(o => o.email === customerEmail);
        if (!isManualOverride) {
          console.warn(`  ⚠️ NO PLAN MAPPING: ${customerEmail} productId=${sub.productId} priceId=${sub.priceId}`);
        }
        continue;
      }

      const planKey = plan.key;
      const user = await User.findOne({ email: customerEmail });
      if (!user) {
        console.warn(`  ⚠️ User not found in DB: ${customerEmail}`);
        continue;
      }



      const cycle = getBillingCycle(planKey);
      const periodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : getPeriodEnd(planKey);
      const periodStart = sub.currentPeriodStart ? new Date(sub.currentPeriodStart) : new Date();

      await User.findByIdAndUpdate(user._id, {
        $set: {
          currentPlanKey: planKey,
          'subscription.planKey': planKey,
          'subscription.status': 'active',
          'subscription.providerSubscriptionId': sub.id,
          'subscription.accessExpiresAt': periodEnd,
          'subscription.currentPeriodEnd': periodEnd,
          'subscription.currentPeriodStart': periodStart,
          'subscription.interval': cycle,
        }
      });

      await Subscription.findOneAndUpdate(
        { userId: user._id },
        {
          $set: {
            status: 'active',
            planKey,
            planId: plan._id,
            billingCycle: cycle,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            endDate: periodEnd,
            startDate: periodStart,
            providerSubscriptionId: sub.id,
            userId: user._id,
          }
        },
        { upsert: true }
      );

      console.log(`  ✅ ${customerEmail}: synced from Polar → ${planKey}`);
    }

    // ─── Import Polar Orders as Invoices ──────────────────────────────────────
    let allOrders = [];
    try {
      const orderPaginator = await polar.orders.list({ limit: 100 });
      if (orderPaginator && typeof orderPaginator[Symbol.asyncIterator] === 'function') {
        for await (const page of orderPaginator) {
          const items = page?.result?.items || page?.items || (Array.isArray(page) ? page : []);
          allOrders.push(...items);
        }
      } else {
        allOrders = orderPaginator?.items || orderPaginator?.result?.items || [];
      }
    } catch (err) {
      console.warn('[RECONCILE] Failed to fetch orders:', err.message);
    }

    console.log(`\n[RECONCILE] ── Invoice Import: ${allOrders.length} Polar orders ──`);
    let invoicesCreated = 0;
    let invoicesSkipped = 0;

    for (const order of allOrders) {
      const customerEmail = order.customer?.email || order.customerEmail;
      const orderId = order.id;
      if (!customerEmail || !orderId) continue;

      // Skip if already imported
      const existing = await Invoice.findOne({ 'metadata.polarOrderId': orderId });
      if (existing) {
        invoicesSkipped++;
        continue;
      }

      const user = await User.findOne({ email: customerEmail });
      if (!user) continue;

      const userSub = await Subscription.findOne({ userId: user._id });
      const planKey = user.currentPlanKey || 'focused_monthly';
      const planDoc = planByKey.get(planKey);
      const cycle = getBillingCycle(planKey);
      const orderDate = order.createdAt || order.created_at ? new Date(order.createdAt || order.created_at) : new Date();

      try {
        // Generate unique invoice number
        const year = orderDate.getFullYear();
        const count = await Invoice.countDocuments({});
        const num = String(count + 1 + invoicesCreated).padStart(4, '0');
        const invoiceNumber = `INV-${year}-${num}`;

        await Invoice.create({
          userId: user._id,
          invoiceNumber,
          subtotal: (order.amount || 0) / 100,
          taxAmount: ((order.taxAmount || order.tax_amount) || 0) / 100,
          amount: (order.amount || 0) / 100,
          currency: (order.currency || 'USD').toUpperCase(),
          status: 'paid',
          planName: order.product?.name || planDoc?.name || 'Subscription',
          planId: planDoc?._id || userSub?.planId || new mongoose.Types.ObjectId(),
          subscriptionId: userSub?._id,
          billingCycle: cycle,
          paidAt: orderDate,
          dueDate: orderDate,
          invoiceDate: orderDate,
          description: `Polar order for ${order.product?.name || 'CVCircle subscription'}`,
          metadata: {
            polarOrderId: orderId,
            polarCheckoutId: order.checkoutId || order.checkout_id,
            source: 'polar_reconciliation',
          }
        });

        invoicesCreated++;
        console.log(`  ✅ Invoice created: ${invoiceNumber} for ${customerEmail} ($${(order.amount || 0) / 100})`);
      } catch (err) {
        console.warn(`  ⚠️ Invoice create failed for ${customerEmail}: ${err.message}`);
      }
    }

    console.log(`\n[RECONCILE] Invoice results: ${invoicesCreated} created, ${invoicesSkipped} already existed`);
  }

  await mongoose.disconnect();
  console.log('\n[RECONCILE] ✅ Done. Disconnected from MongoDB.\n');
}

main().catch(err => {
  console.error('[RECONCILE] Fatal:', err);
  process.exit(1);
});
