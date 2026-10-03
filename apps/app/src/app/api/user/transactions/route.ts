import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { User } from '@/models';
import { getTransactionsByUser } from '@/lib/services/transactionService';

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
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const status = searchParams.get('status') as 'success' | 'failed' | 'refunded' | 'pending' | 'chargeback' | 'dispute' | null;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const invoiceId = searchParams.get('invoiceId');

    // Build filters
    const filters: any = {
      limit,
      skip: (page - 1) * limit
    };

    if (status) {
      filters.status = status;
    }

    if (startDate) {
      filters.startDate = new Date(startDate);
    }

    if (endDate) {
      filters.endDate = new Date(endDate);
    }

    if (invoiceId) {
      filters.invoiceId = invoiceId;
    }

    // Fetch transactions
    const { transactions, total } = await getTransactionsByUser(user._id.toString(), filters);

    return NextResponse.json({
      success: true,
      transactions: transactions.map(t => ({
        id: t._id,
        invoiceId: t.invoiceId,
        paymentMethodId: t.paymentMethodId,
        amount: t.amount,
        status: t.status,
        gatewayReferenceId: t.gatewayReferenceId,
        gateway: t.gateway,
        failureReason: t.failureReason,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

