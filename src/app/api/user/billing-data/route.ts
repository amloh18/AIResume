// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { User, Subscription, PaymentMethod, Invoice, Transaction } from '@/models';
import InvoiceItem from '@/models/InvoiceItem';
import PolarService from '@/lib/payment/polar';
import { getPlanName } from '@/lib/utils/userPlanUtils';
import { isFreeTierPlan } from '@/lib/utils/subscription-helpers';

/**
 * Unified billing data API
 * Fetches all billing-related data in a single call
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await getConnection();

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = user._id.toString();

    // --- Live Polar Reconciliation Check ---
    let liveDetails: any = { hasActiveSub: false, planKey: undefined, subscription: undefined };
    try {
      const { default: PolarService } = await import('@/lib/payment/polar');
      liveDetails = await PolarService.getActiveSubscriptionDetails(user.email);
    } catch (polarErr) {
      console.error('Failed to query Polar details in billing-data route:', polarErr);
    }

    if (liveDetails.hasActiveSub) {
      if (!liveDetails.planKey) {
        // CRITICAL: Plan mapping failed — do NOT silently assign starter_monthly.
        // This prevents a paid user from being wrongly shown starter_monthly.
        console.error(
          `[BILLING DATA] ⚠️ Polar has active subscription for ${user.email} but plan mapping failed. ` +
          'Polar product/price IDs not found in PricingPlan collection. ' +
          'Keeping MongoDB plan — fix PricingPlan polar product ID fields.'
        );
      } else {
        const resolvedPlanKey = liveDetails.planKey;
        const mongoActive = user.subscription && (user.subscription.status === 'active' || user.subscription.status === 'trialing') && user.currentPlanKey !== 'free';
        if (!mongoActive) {
          console.log(`[BILLING DATA] Reconciling active Polar subscription for ${user.email}: planKey=${resolvedPlanKey}`);
          const expiresAt = liveDetails.subscription?.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          
          await User.findByIdAndUpdate(user._id, {
            $set: {
              currentPlanKey: resolvedPlanKey,
              'subscription.planKey': resolvedPlanKey,
              'subscription.status': 'active',
              'subscription.accessExpiresAt': expiresAt,
              'subscription.currentPeriodEnd': expiresAt
            }
          });
          
          const SubscriptionModel = (await import('@/models/Subscription')).default;
          const { getAdminPricingPlan } = await import('@/models/admin-models');
          const PricingPlan = await getAdminPricingPlan();
          const plan = await PricingPlan.findOne({ key: resolvedPlanKey });
          
          await SubscriptionModel.findOneAndUpdate(
            { userId: user._id },
            {
              $set: {
                status: 'active',
                planKey: resolvedPlanKey,
                planId: plan?._id,
                currentPeriodStart: liveDetails.subscription?.currentPeriodStart || new Date(),
                currentPeriodEnd: expiresAt,
                providerSubscriptionId: liveDetails.subscription?.id || 'polar_sub_reconciled'
              }
            },
            { upsert: true }
          );
        }
      }
    }
    // --- End Live Polar Reconciliation Check ---

    // Fetch all billing data in parallel
    const [subscription, paymentMethods, invoices, transactions] = await Promise.all([
      // Get active subscription
      Subscription.findOne({
        userId: user._id,
        status: { $in: ['active', 'past_due'] }
      })
        .populate('planId')
        .lean(),
      
      // Get payment methods
      PaymentMethod.find({
        userId: user._id,
        isActive: true
      })
        .sort({ isDefault: -1, createdAt: -1 })
        .lean(),
      
      // Get invoices (last 20)
      Invoice.find({
        userId: user._id
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      
      // Get transactions (last 50)
      Transaction.find({
        invoiceId: { $in: await Invoice.find({ userId: user._id }).distinct('_id') }
      })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean()
    ]);

    // Get invoice items for invoices
    const invoiceIds = invoices.map(inv => inv._id);
    const invoiceItems = await InvoiceItem.find({
      invoiceId: { $in: invoiceIds }
    }).lean();

    // Group invoice items by invoice
    const itemsByInvoice = invoiceItems.reduce((acc: any, item: any) => {
      const invId = item.invoiceId.toString();
      if (!acc[invId]) {
        acc[invId] = [];
      }
      acc[invId].push(item);
      return acc;
    }, {});

    // Format subscription — prefer populated planId.key, then subscription.planKey (direct field),
    // then user.currentPlanKey (most authoritative source, updated by reconciliation)
    const resolvedPlanKey =
      (subscription as any)?.planId?.key ||
      (subscription as any)?.planKey ||
      user.currentPlanKey ||
      'free';
    const resolvedPlanName =
      (subscription as any)?.planId?.name ||
      getPlanName(resolvedPlanKey) ||
      'Free Plan';

    const subscriptionData = subscription ? {
      id: subscription._id,
      planName: resolvedPlanName,
      planKey: resolvedPlanKey,
      status: subscription.status,
      billingCycle: subscription.billingCycle,
      amount: subscription.amount,
      discountAmount: subscription.discountAmount,
      finalAmount: subscription.finalAmount,
      currency: subscription.currency,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      nextBillingDate: subscription.nextBillingDate,
      currentPeriodStart: subscription.startDate,
      currentPeriodEnd: subscription.endDate,
      planDetails: {
        features: {
          maxCVs: (subscription as any).planId?.maxCVs || 0,
          maxExports: (subscription as any).planId?.maxExports || 0
        }
      }
    } : {
      // No Subscription document, but user may still have an active plan key (e.g. reconciled from Polar)
      id: null,
      planName: getPlanName(user.currentPlanKey as any) || 'Free Plan',
      planKey: user.currentPlanKey || 'free',
      status: user.subscription?.status || 'inactive',
      billingCycle: user.subscription?.interval || 'monthly',
      amount: 0,
      discountAmount: 0,
      finalAmount: 0,
      currency: 'USD',
      startDate: null,
      endDate: user.subscription?.accessExpiresAt || null,
      nextBillingDate: null,
      currentPeriodStart: null,
      currentPeriodEnd: user.subscription?.currentPeriodEnd || null,
      planDetails: { features: { maxCVs: 0, maxExports: 0 } }
    };

    // Format payment methods
    const paymentMethodsData = paymentMethods.map((pm: any) => ({
      id: pm._id,
      type: pm.type,
      provider: pm.provider,
      last4: pm.last4,
      brand: pm.brand,
      expiryMonth: pm.expiryMonth,
      expiryYear: pm.expiryYear,
      isDefault: pm.isDefault,
      email: pm.email,
      accountName: pm.accountName,
      gatewayCustomerId: pm.gatewayCustomerId,
      createdAt: pm.createdAt
    }));

    // Format invoices with items
    const dbInvoicesFormatted = invoices.map((inv: any) => ({
      id: inv._id,
      invoiceNumber: inv.invoiceNumber,
      subtotal: inv.subtotal || inv.amount,
      taxAmount: inv.taxAmount || 0,
      amount: inv.amount,
      currency: inv.currency,
      status: inv.status,
      planName: inv.planName,
      billingCycle: inv.billingCycle,
      paymentMethodType: inv.paymentMethodType,
      paymentMethodLast4: inv.paymentMethodLast4,
      paidAt: inv.paidAt,
      dueDate: inv.dueDate,
      invoiceDate: inv.invoiceDate || inv.createdAt,
      description: inv.description,
      createdAt: inv.createdAt,
      items: itemsByInvoice[inv._id.toString()] || []
    }));

    // Fetch orders from Polar
    let polarInvoices = [];
    try {
      const polarResult = await PolarService.listOrders({ 
        customerEmail: user.email 
      });

      if (polarResult.success && polarResult.orders) {
        // Collect all checkout IDs already stored in local DB invoices
        // Polar SDK may return checkout_id (snake_case) or checkoutId (camelCase)
        const existingCheckoutIds = new Set(
          invoices
            .map((inv: any) => inv.metadata?.polarCheckoutId)
            .filter(Boolean)
        );

        polarInvoices = polarResult.orders
          .filter((order: any) => {
            const orderId = order.checkout_id || order.checkoutId || null;
            return !orderId || !existingCheckoutIds.has(orderId);
          })
          .map((order: any) => ({
            id: order.id,
            invoiceNumber: (order.id || '').substring(0, 8).toUpperCase(),
            subtotal: (order.amount || 0) / 100,
            taxAmount: ((order.taxAmount || order.tax_amount) || 0) / 100,
            amount: (order.amount || 0) / 100,
            currency: (order.currency || 'USD').toUpperCase(),
            status: 'paid',
            planName: order.product?.name || order.productName || 'Subscription',
            billingCycle: order.product?.recurringInterval || order.product?.recurring_interval || 'one-time',
            paymentMethodType: 'card',
            paymentMethodLast4: '****',
            paidAt: order.createdAt || order.created_at,
            dueDate: order.createdAt || order.created_at,
            invoiceDate: order.createdAt || order.created_at,
            description: `Order for ${order.product?.name || order.productName || 'CVCircle Pro'}`,
            createdAt: order.createdAt || order.created_at,
            isPolar: true,
            items: []
          }));
      }
    } catch (polarError) {
      console.warn('Failed to fetch Polar orders in billing-data:', polarError);
    }

    const allInvoices = [...dbInvoicesFormatted, ...polarInvoices];
    allInvoices.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || a.invoiceDate || 0).getTime();
      const dateB = new Date(b.createdAt || b.invoiceDate || 0).getTime();
      return dateB - dateA;
    });

    const invoicesData = allInvoices.slice(0, 20);

    // Format transactions
    const transactionsData = transactions.map((t: any) => ({
      id: t._id,
      invoiceId: t.invoiceId,
      paymentMethodId: t.paymentMethodId,
      amount: t.amount,
      status: t.status,
      gatewayReferenceId: t.gatewayReferenceId,
      gateway: t.gateway,
      failureReason: t.failureReason,
      createdAt: t.createdAt
    }));

    return NextResponse.json({
      success: true,
      data: {
        subscription: subscriptionData,
        paymentMethods: paymentMethodsData,
        invoices: invoicesData,
        transactions: transactionsData,
        // Include user's authoritative plan key at top level for components that need it
        currentPlanKey: user.currentPlanKey || 'free'
      }
    });
  } catch (error: any) {
    console.error('Error fetching billing data:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

