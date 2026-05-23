import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { User } from '@/models';
import { getAdminInvoice } from '@/models/admin-models';
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
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const status = searchParams.get('status');

    // Build query for database invoices
    const query: any = { userId: user._id };
    if (status) {
      query.status = status;
    }

    // Fetch invoices from DB with pagination
    const Invoice = await getAdminInvoice();
    const dbInvoices = await Invoice.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    // Get total count from DB
    const dbTotal = await Invoice.countDocuments(query);

    // Fetch orders from Polar
    let polarInvoices = [];
    try {
      const polarResult = await PolarService.listOrders({ 
        customerEmail: user.email 
      });

      if (polarResult.success && polarResult.orders) {
        polarInvoices = polarResult.orders.map((order: any) => ({
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
          description: `Order for ${order.product?.name || 'CVCircle Pro'}`,
          createdAt: order.created_at,
          isPolar: true
        }));
      }
    } catch (polarError) {
      console.warn('Failed to fetch Polar orders:', polarError);
    }

    // Merge and deduplicate (by checking if DB invoice already represents this Polar order)
    // For now, we'll just merge and sort by date
    const allInvoices = [...dbInvoices.map((invoice: any) => ({
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
    })), ...polarInvoices];

    // Sort all by creation date descending
    allInvoices.sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Apply pagination to merged list if necessary
    // (In a real high-scale app we'd do this more efficiently)
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
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
