// @ts-nocheck pre-existing type escape — removal tracked as R14 in docs/application-automation/fix-tasks.md
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { User, Subscription, PaymentMethod, Invoice, Transaction } from '@/models';
import InvoiceItem from '@/models/InvoiceItem';
import PolarService from '@/lib/payment/polar';
import { mixedIdFilter } from '@/lib/utils/mixed-id';

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
        userId: mixedIdFilter(user._id),
        isActive: true
      })
        .sort({ isDefault: -1, createdAt: -1 })
        .lean(),
      
      // Get invoices (last 20)
      Invoice.find({
        userId: mixedIdFilter(user._id)
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      
      // Get transactions (last 50)
      Transaction.find({
        invoiceId: { $in: await Invoice.find({ userId: mixedIdFilter(user._id) }).distinct('_id') }
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

    // Format subscription
    const subscriptionData = subscription ? {
      id: subscription._id,
      planName: (subscription as any).planId?.name || 'Unknown Plan',
      planKey: (subscription as any).planId?.key || 'free',
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
    } : null;

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
        const existingCheckoutIds = invoices
          .map((inv: any) => inv.metadata?.polarCheckoutId)
          .filter(Boolean);

        polarInvoices = polarResult.orders
          .filter((order: any) => !order.checkout_id || !existingCheckoutIds.includes(order.checkout_id))
          .map((order: any) => ({
            id: order.id,
            invoiceNumber: order.id.substring(0, 8).toUpperCase(),
            subtotal: order.amount / 100, // Polar amounts are in cents
            taxAmount: (order.tax_amount || 0) / 100,
            amount: order.amount / 100,
            currency: order.currency.toUpperCase(),
            status: 'paid', // If it's an order in Polar, it's paid
            planName: order.product?.name || 'Subscription',
            billingCycle: order.product?.recurring_interval || 'one-time',
            paymentMethodType: 'card',
            paymentMethodLast4: '****',
            paidAt: order.created_at,
            dueDate: order.created_at,
            invoiceDate: order.created_at,
            description: `Order for ${order.product?.name || 'AIResume Pro'}`,
            createdAt: order.created_at,
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
        transactions: transactionsData
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

