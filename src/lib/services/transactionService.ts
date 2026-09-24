// @ts-nocheck pre-existing type escape — removal tracked as R14 in docs/application-automation/fix-tasks.md
/**
 * Transaction Service
 * Manages transaction creation, updates, and queries
 */

import { getConnection } from '../database/connection-manager';
import Transaction from '@/models/Transaction';
import Invoice from '@/models/Invoice';

export interface CreateTransactionParams {
  invoiceId?: string;
  paymentMethodId?: string;
  amount: number;
  status: 'success' | 'failed' | 'refunded' | 'pending' | 'chargeback' | 'dispute';
  gatewayReferenceId: string;
  gateway: 'stripe' | 'polar' | 'admin';
  failureReason?: string;
  metadata?: Record<string, any>;
}

/**
 * Create a new transaction record
 */
export async function createTransaction(
  params: CreateTransactionParams
): Promise<Transaction | null> {
  try {
    await getConnection();

    const transaction = await Transaction.create({
      invoiceId: params.invoiceId,
      paymentMethodId: params.paymentMethodId,
      amount: params.amount,
      status: params.status,
      gatewayReferenceId: params.gatewayReferenceId,
      gateway: params.gateway,
      failureReason: params.failureReason,
      metadata: params.metadata || {}
    });

    return transaction;
  } catch (error) {
    console.error('Error creating transaction:', error);
    return null;
  }
}

/**
 * Update transaction status
 */
export async function updateTransactionStatus(
  transactionId: string,
  status: 'success' | 'failed' | 'refunded' | 'pending' | 'chargeback' | 'dispute',
  failureReason?: string
): Promise<Transaction | null> {
  try {
    await getConnection();

    const transaction = await Transaction.findByIdAndUpdate(
      transactionId,
      {
        status,
        failureReason,
        updatedAt: new Date()
      },
      { new: true }
    );

    return transaction;
  } catch (error) {
    console.error('Error updating transaction status:', error);
    return null;
  }
}

/**
 * Get transactions by invoice ID
 */
export async function getTransactionsByInvoice(
  invoiceId: string
): Promise<Transaction[]> {
  try {
    await getConnection();

    const transactions = await Transaction.find({
      invoiceId
    }).sort({ createdAt: -1 });

    return transactions;
  } catch (error) {
    console.error('Error fetching transactions by invoice:', error);
    return [];
  }
}

/**
 * Get transactions by user ID with optional filters
 */
export async function getTransactionsByUser(
  userId: string,
  filters?: {
    status?: 'success' | 'failed' | 'refunded' | 'pending' | 'chargeback' | 'dispute';
    startDate?: Date;
    endDate?: Date;
    invoiceId?: string;
    limit?: number;
    skip?: number;
  }
): Promise<{ transactions: Transaction[]; total: number }> {
  try {
    await getConnection();

    // Build query to find invoices for user, then get transactions
    const invoiceQuery: any = { userId };
    if (filters?.invoiceId) {
      invoiceQuery._id = filters.invoiceId;
    }

    const invoices = await Invoice.find(invoiceQuery).select('_id').lean();
    const invoiceIds = invoices.map(inv => inv._id);

    if (invoiceIds.length === 0) {
      return { transactions: [], total: 0 };
    }

    const transactionQuery: any = {
      invoiceId: { $in: invoiceIds }
    };

    if (filters?.status) {
      transactionQuery.status = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      transactionQuery.createdAt = {};
      if (filters.startDate) {
        transactionQuery.createdAt.$gte = filters.startDate;
      }
      if (filters.endDate) {
        transactionQuery.createdAt.$lte = filters.endDate;
      }
    }

    const total = await Transaction.countDocuments(transactionQuery);

    const transactions = await Transaction.find(transactionQuery)
      .sort({ createdAt: -1 })
      .limit(filters?.limit || 50)
      .skip(filters?.skip || 0)
      .populate('invoiceId')
      .populate('paymentMethodId');

    return { transactions, total };
  } catch (error) {
    console.error('Error fetching transactions by user:', error);
    return { transactions: [], total: 0 };
  }
}

/**
 * Get transaction by gateway reference ID
 */
export async function getTransactionByGatewayRef(
  gatewayReferenceId: string,
  gateway: 'stripe' | 'polar'
): Promise<Transaction | null> {
  try {
    await getConnection();

    const transaction = await Transaction.findOne({
      gatewayReferenceId,
      gateway
    });

    return transaction;
  } catch (error) {
    console.error('Error fetching transaction by gateway ref:', error);
    return null;
  }
}

