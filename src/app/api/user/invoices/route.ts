import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { User } from '@/models';
import Invoice from '@/models/Invoice'; // Use main Invoice model, not the admin collection
import PolarService from '@/lib/payment/polar';

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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const status = searchParams.get('status');

    // Build query for database invoices
    const query: any = { userId: user._id };
    if (status) {
      query.status = status;
    }

    // Fetch invoices from the main Invoice collection (created by webhooks)
    const dbInvoices = await Invoice.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean();

    // Get total count from DB
    const dbTotal = await Invoice.countDocuments(query);

    // Fetch orders from Polar as supplementary source.
    // These are used to show invoices even if the webhook hasn't fired yet.
    let polarInvoices: any[] = [];
    const existingCheckoutIds = new Set(
      (dbInvoices as any[]).map((inv: any) => inv.metadata?.polarCheckoutId).filter(Boolean)
    );

    try {
      const polarResult = await PolarService.listOrders({ 
        customerEmail: user.email 
      });

      if (polarResult.success && polarResult.orders) {
        polarInvoices = polarResult.orders
          .filter((order: any) => {
            // De-duplicate against locally-stored invoices
            // Polar SDK may return checkout_id (snake_case) or checkoutId (camelCase)
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
            isPolar: true
          }));
      }
    } catch (polarError) {
      console.warn('[INVOICES API] Failed to fetch Polar orders:', polarError);
    }

    // Merge DB invoices + polar invoices, sorted by date descending
    const formattedDbInvoices = (dbInvoices as any[]).map((invoice: any) => ({
      id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      subtotal: invoice.subtotal || invoice.amount,
      taxAmount: invoice.taxAmount || 0,
      amount: invoice.amount,
      currency: invoice.currency,
      status: invoice.status,
      planName: invoice.planName,
      billingCycle: invoice.billingCycle,
      paymentMethodType: invoice.paymentMethodType,
      paymentMethodLast4: invoice.paymentMethodLast4,
      paidAt: invoice.paidAt,
      dueDate: invoice.dueDate,
      invoiceDate: invoice.invoiceDate || invoice.createdAt,
      description: invoice.description,
      createdAt: invoice.createdAt,
      isPolar: false
    }));

    const allInvoices = [...formattedDbInvoices, ...polarInvoices];

    // Sort all by creation date descending
    allInvoices.sort((a: any, b: any) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    const paginatedInvoices = allInvoices.slice(0, limit);

    return NextResponse.json({
      success: true,
      invoices: paginatedInvoices,
      pagination: {
        page,
        limit,
        total: Math.max(dbTotal, allInvoices.length),
        pages: Math.ceil(Math.max(dbTotal, allInvoices.length) / limit)
      }
    });

  } catch (error) {
    console.error('[INVOICES API] Error fetching invoices:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
