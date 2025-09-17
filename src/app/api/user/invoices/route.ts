import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
// Removed - using Clerk now
import connectDB from '@/lib/database';
import { User, Invoice } from '@/models';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

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

    // Build query
    const query: any = { userId: user._id };
    if (status) {
      query.status = status;
    }

    // Fetch invoices with pagination
    const invoices = await Invoice.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    // Get total count
    const total = await Invoice.countDocuments(query);

    return NextResponse.json({
      success: true,
      invoices: invoices.map(invoice => ({
        id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        currency: invoice.currency,
        status: invoice.status,
        planName: invoice.planName,
        billingCycle: invoice.billingCycle,
        paymentMethodType: invoice.paymentMethodType,
        paymentMethodLast4: invoice.paymentMethodLast4,
        paidAt: invoice.paidAt,
        dueDate: invoice.dueDate,
        description: invoice.description,
        createdAt: invoice.createdAt
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
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
