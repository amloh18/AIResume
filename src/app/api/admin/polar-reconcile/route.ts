// @ts-nocheck
/**
 * Admin: Bulk Polar Subscription Reconciliation
 * POST /api/admin/polar-reconcile
 *
 * Fetches ALL active subscriptions from Polar, maps each to an internal plan,
 * and restores the correct plan for every user whose MongoDB record is out of sync.
 * Also imports missing invoices from Polar orders.
 *
 * Protected: admin only.
 * Idempotent: safe to run multiple times.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { getPolar } from '@/lib/payment/polar';
import { getAdminPricingPlan } from '@/models/admin-models';
import User from '@/models/User';
import Subscription from '@/models/Subscription';
import Invoice from '@/models/Invoice';

interface ReconcileResult {
  email: string;
  polarSubId: string;
  planKey: string;
  status: 'restored' | 'already_correct' | 'user_not_found' | 'plan_not_found' | 'error';
  detail?: string;
}

interface InvoiceResult {
  email: string;
  orderId: string;
  amount: number;
  status: 'created' | 'already_exists' | 'user_not_found' | 'error';
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();

    // Verify admin
    const requestingUser = await User.findOne({ email: session.user.email });
    if (!requestingUser || requestingUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const polar = getPolar();
    if (!polar) {
      return NextResponse.json({ error: 'Polar not configured (POLAR_ACCESS_TOKEN missing)' }, { status: 503 });
    }

    const PricingPlan = await getAdminPricingPlan();

    // ─── Step 1: Collect all PricingPlans and build lookup maps ───────────────
    const allPlans = await PricingPlan.find({}).lean();
    const productIdToPlan = new Map<string, any>();
    const priceIdToPlan = new Map<string, any>();
    for (const plan of allPlans) {
      const p = plan as any;
      const fields: Array<[string | undefined, string]> = [
        [p.polarProductId_monthly, 'monthly'],
        [p.polarProductId_yearly, 'yearly'],
        [p.polarProductId_quarterly, 'quarterly'],
        [p.polarProductId_one_time, 'one_time'],
      ];
      for (const [id] of fields) {
        if (id) productIdToPlan.set(id, p);
      }
      for (const [id] of [
        [p.polarPriceId_monthly],
        [p.polarPriceId_yearly],
        [p.polarPriceId_quarterly],
        [p.polarPriceId_one_time],
      ] as any) {
        if (id) priceIdToPlan.set(id, p);
      }
      for (const rp of (p.regionalPricing || [])) {
        if (rp.polarProductId) productIdToPlan.set(rp.polarProductId, p);
        if (rp.polarPriceId) priceIdToPlan.set(rp.polarPriceId, p);
      }
    }

    console.log(`[RECONCILE] Loaded ${allPlans.length} PricingPlan docs, ${productIdToPlan.size} productId mappings, ${priceIdToPlan.size} priceId mappings`);

    // ─── Step 2: Fetch ALL active Polar subscriptions (paginated) ─────────────
    const allPolarSubs: any[] = [];
    try {
      const paginator = await polar.subscriptions.list({ limit: 100 });
      if (paginator && typeof (paginator as any)[Symbol.asyncIterator] === 'function') {
        for await (const page of paginator as any) {
          const items = page?.result?.items || page?.items || (Array.isArray(page) ? page : []);
          allPolarSubs.push(...items);
        }
      } else {
        const items = (paginator as any)?.items || (paginator as any)?.result?.items || [];
        allPolarSubs.push(...items);
      }
    } catch (err: any) {
      return NextResponse.json({ error: `Failed to fetch Polar subscriptions: ${err.message}` }, { status: 500 });
    }

    const activeSubs = allPolarSubs.filter(s => s.status === 'active' || s.status === 'trialing');
    console.log(`[RECONCILE] Found ${allPolarSubs.length} total Polar subscriptions, ${activeSubs.length} active`);

    // ─── Step 3: Process each active subscription ──────────────────────────────
    const reconcileResults: ReconcileResult[] = [];

    for (const sub of activeSubs) {
      const customerEmail = sub.customer?.email || sub.customerEmail;
      const polarSubId = sub.id;
      const productId = sub.productId;
      const priceId = sub.priceId;

      if (!customerEmail) {
        reconcileResults.push({ email: '(unknown)', polarSubId, planKey: '', status: 'error', detail: 'No customer email on subscription' });
        continue;
      }

      // Resolve plan
      const plan = productIdToPlan.get(productId) || priceIdToPlan.get(priceId);
      if (!plan) {
        console.error(`[RECONCILE] No plan mapping for email=${customerEmail} productId=${productId} priceId=${priceId}`);
        reconcileResults.push({ email: customerEmail, polarSubId, planKey: '', status: 'plan_not_found', detail: `No PricingPlan matches productId=${productId} priceId=${priceId}` });
        continue;
      }

      const planKey = plan.key;
      const currentPeriodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const currentPeriodStart = sub.currentPeriodStart ? new Date(sub.currentPeriodStart) : new Date();

      // Find user
      const user = await User.findOne({ email: customerEmail });
      if (!user) {
        reconcileResults.push({ email: customerEmail, polarSubId, planKey, status: 'user_not_found', detail: 'No User document found with this email' });
        continue;
      }

      // Check if already correct
      if (user.currentPlanKey === planKey && user.subscription?.status === 'active') {
        reconcileResults.push({ email: customerEmail, polarSubId, planKey, status: 'already_correct' });
        continue;
      }

      // Restore the subscription
      try {
        // 1. Update User document
        await User.findByIdAndUpdate(user._id, {
          $set: {
            currentPlanKey: planKey,
            'subscription.planKey': planKey,
            'subscription.status': 'active',
            'subscription.providerSubscriptionId': polarSubId,
            'subscription.accessExpiresAt': currentPeriodEnd,
            'subscription.currentPeriodEnd': currentPeriodEnd,
            'subscription.currentPeriodStart': currentPeriodStart,
            'subscription.interval': planKey.includes('yearly') ? 'yearly' : planKey.includes('quarterly') ? 'quarterly' : 'monthly',
          }
        });

        // 2. Upsert Subscription document
        await Subscription.findOneAndUpdate(
          { userId: user._id },
          {
            $set: {
              status: 'active',
              planKey: planKey,
              planId: plan._id,
              billingCycle: planKey.includes('yearly') ? 'yearly' : planKey.includes('quarterly') ? 'quarterly' : 'monthly',
              currentPeriodStart,
              currentPeriodEnd,
              endDate: currentPeriodEnd,
              providerSubscriptionId: polarSubId,
              userId: user._id,
              startDate: currentPeriodStart,
            }
          },
          { upsert: true }
        );

        console.log(`[RECONCILE] ✅ Restored user ${customerEmail}: planKey=${planKey} subId=${polarSubId}`);
        reconcileResults.push({ email: customerEmail, polarSubId, planKey, status: 'restored', detail: `Previously was: ${user.currentPlanKey}` });
      } catch (err: any) {
        console.error(`[RECONCILE] Error restoring ${customerEmail}:`, err.message);
        reconcileResults.push({ email: customerEmail, polarSubId, planKey, status: 'error', detail: err.message });
      }
    }

    // ─── Step 4: Also handle manual overrides from request body ──────────────
    // Support: { manualOverrides: [{ email, planKey }] }
    let manualResults: any[] = [];
    try {
      const body = await request.json().catch(() => ({}));
      if (body.manualOverrides && Array.isArray(body.manualOverrides)) {
        for (const override of body.manualOverrides) {
          const { email, planKey: overridePlanKey } = override;
          if (!email || !overridePlanKey) continue;

          const plan = allPlans.find((p: any) => p.key === overridePlanKey);
          if (!plan) {
            manualResults.push({ email, planKey: overridePlanKey, status: 'plan_not_found' });
            continue;
          }

          const user = await User.findOne({ email });
          if (!user) {
            manualResults.push({ email, planKey: overridePlanKey, status: 'user_not_found' });
            continue;
          }

          const interval = overridePlanKey.includes('yearly') ? 'yearly' : overridePlanKey.includes('quarterly') ? 'quarterly' : 'monthly';
          const durationMs = interval === 'yearly' ? 365 : interval === 'quarterly' ? 90 : 30;
          const periodEnd = new Date(Date.now() + durationMs * 24 * 60 * 60 * 1000);

          await User.findByIdAndUpdate(user._id, {
            $set: {
              currentPlanKey: overridePlanKey,
              'subscription.planKey': overridePlanKey,
              'subscription.status': 'active',
              'subscription.accessExpiresAt': periodEnd,
              'subscription.currentPeriodEnd': periodEnd,
              'subscription.interval': interval,
            }
          });

          await Subscription.findOneAndUpdate(
            { userId: user._id },
            {
              $set: {
                status: 'active',
                planKey: overridePlanKey,
                planId: (plan as any)._id,
                billingCycle: interval,
                currentPeriodStart: new Date(),
                currentPeriodEnd: periodEnd,
                endDate: periodEnd,
                userId: user._id,
                startDate: new Date(),
              }
            },
            { upsert: true }
          );

          manualResults.push({ email, planKey: overridePlanKey, status: 'applied' });
          console.log(`[RECONCILE] ✅ Manual override: ${email} → ${overridePlanKey}`);
        }
      }
    } catch {
      // No body or parse error — ignore
    }

    // ─── Step 5: Fetch Polar orders and create missing Invoice records ─────────
    const invoiceResults: InvoiceResult[] = [];
    try {
      const allOrders: any[] = [];
      const orderPaginator = await polar.orders.list({ limit: 100 });
      if (orderPaginator && typeof (orderPaginator as any)[Symbol.asyncIterator] === 'function') {
        for await (const page of orderPaginator as any) {
          const items = page?.result?.items || page?.items || (Array.isArray(page) ? page : []);
          allOrders.push(...items);
        }
      } else {
        const items = (orderPaginator as any)?.items || (orderPaginator as any)?.result?.items || [];
        allOrders.push(...items);
      }

      console.log(`[RECONCILE] Processing ${allOrders.length} Polar orders for invoice sync`);

      for (const order of allOrders) {
        const customerEmail = order.customer?.email || order.customerEmail;
        const orderId = order.id;

        if (!customerEmail) continue;

        // Check if an invoice with this polar order ID already exists
        const existing = await Invoice.findOne({ 'metadata.polarOrderId': orderId });
        if (existing) {
          invoiceResults.push({ email: customerEmail, orderId, amount: (order.amount || 0) / 100, status: 'already_exists' });
          continue;
        }

        const user = await User.findOne({ email: customerEmail });
        if (!user) {
          invoiceResults.push({ email: customerEmail, orderId, amount: (order.amount || 0) / 100, status: 'user_not_found' });
          continue;
        }

        // Find the subscription for this user
        const userSub = await Subscription.findOne({ userId: user._id });
        const planKey = user.currentPlanKey || 'free';
        const planDoc = allPlans.find((p: any) => p.key === planKey);

        try {
          // Create Invoice document
          await Invoice.create({
            userId: user._id,
            invoiceNumber: `POLAR-${(orderId || '').substring(0, 8).toUpperCase()}`,
            subtotal: (order.amount || 0) / 100,
            taxAmount: ((order.taxAmount || order.tax_amount) || 0) / 100,
            amount: (order.amount || 0) / 100,
            currency: (order.currency || 'USD').toUpperCase() as any,
            status: 'paid',
            planName: order.product?.name || planDoc?.name || 'Subscription',
            planId: planDoc ? (planDoc as any)._id : userSub?.planId || new (require('mongoose').Types.ObjectId)(),
            subscriptionId: userSub?._id,
            billingCycle: (planKey.includes('yearly') ? 'yearly' : planKey.includes('quarterly') ? 'quarterly' : 'monthly') as any,
            paymentMethodType: undefined,
            paidAt: order.createdAt || order.created_at ? new Date(order.createdAt || order.created_at) : new Date(),
            dueDate: order.createdAt || order.created_at ? new Date(order.createdAt || order.created_at) : new Date(),
            invoiceDate: order.createdAt || order.created_at ? new Date(order.createdAt || order.created_at) : new Date(),
            description: `Polar order for ${order.product?.name || 'CVCircle subscription'}`,
            metadata: {
              polarOrderId: orderId,
              polarCheckoutId: order.checkoutId || order.checkout_id,
              source: 'polar_reconciliation',
            }
          });

          invoiceResults.push({ email: customerEmail, orderId, amount: (order.amount || 0) / 100, status: 'created' });
          console.log(`[RECONCILE] ✅ Invoice created for ${customerEmail}, orderId=${orderId}`);
        } catch (invoiceErr: any) {
          // May fail if invoiceNumber unique constraint violated
          invoiceResults.push({ email: customerEmail, orderId, amount: (order.amount || 0) / 100, status: 'error' });
          console.error(`[RECONCILE] Invoice create error for ${customerEmail}:`, invoiceErr.message);
        }
      }
    } catch (ordersErr: any) {
      console.warn('[RECONCILE] Orders fetch failed:', ordersErr.message);
    }

    // ─── Summary ──────────────────────────────────────────────────────────────
    const restored = reconcileResults.filter(r => r.status === 'restored').length;
    const alreadyCorrect = reconcileResults.filter(r => r.status === 'already_correct').length;
    const planNotFound = reconcileResults.filter(r => r.status === 'plan_not_found').length;
    const userNotFound = reconcileResults.filter(r => r.status === 'user_not_found').length;
    const errors = reconcileResults.filter(r => r.status === 'error').length;

    const invoicesCreated = invoiceResults.filter(r => r.status === 'created').length;
    const invoicesExisting = invoiceResults.filter(r => r.status === 'already_exists').length;

    return NextResponse.json({
      success: true,
      summary: {
        totalPolarActiveSubs: activeSubs.length,
        subscriptionsRestored: restored,
        subscriptionsAlreadyCorrect: alreadyCorrect,
        planMappingFailures: planNotFound,
        usersNotFound: userNotFound,
        errors,
        manualOverridesApplied: manualResults.filter(r => r.status === 'applied').length,
        invoicesCreated,
        invoicesAlreadyExisted: invoicesExisting,
      },
      subscriptionResults: reconcileResults,
      manualOverrideResults: manualResults,
      invoiceResults,
    });

  } catch (error: any) {
    console.error('[RECONCILE] Fatal error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
