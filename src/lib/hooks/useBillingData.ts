'use client';

import { useQuery } from '@tanstack/react-query';

interface Subscription {
  planName: string;
  status: string;
  credits: number;
  endDate?: string;
  planKey?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  planDetails?: {
    features?: {
      maxCVs?: number;
      maxExports?: number;
    };
  };
}

interface PaymentMethod {
  id: string;
  type: string;
  provider: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
  email?: string;
  accountName?: string;
  createdAt: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  subtotal: number;
  taxAmount: number;
  amount: number;
  currency: string;
  status: string;
  planName: string;
  billingCycle: string;
  paymentMethodType: string;
  paymentMethodLast4: string;
  paidAt?: string;
  dueDate?: string;
  invoiceDate?: string;
  description: string;
  createdAt: string;
  items?: InvoiceItem[];
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  type: string;
}

interface Transaction {
  id: string;
  invoiceId?: string;
  paymentMethodId?: string;
  amount: number;
  status: string;
  gatewayReferenceId: string;
  gateway: string;
  failureReason?: string;
  createdAt: string;
}

interface BillingData {
  subscription: Subscription | null;
  paymentMethods: PaymentMethod[];
  invoices: Invoice[];
  transactions: Transaction[];
}

interface UseBillingDataResult {
  data: BillingData;
  isLoading: boolean;
  error: {
    subscription: string | null;
    paymentMethods: string | null;
    invoices: string | null;
    transactions: string | null;
  };
  refetch: () => void;
}

const emptyBillingData: BillingData = {
  subscription: null,
  paymentMethods: [],
  invoices: [],
  transactions: [],
};

const emptyBillingErrors = {
  subscription: null,
  paymentMethods: null,
  invoices: null,
  transactions: null,
};

async function fetchBillingData(): Promise<{
  data: BillingData;
  error: UseBillingDataResult['error'];
}> {
  // Use unified billing data API (Option A - recommended)
  try {
    const response = await fetch('/api/user/billing-data');
    if (response.ok) {
      const billingData = await response.json();
      if (billingData.success && billingData.data) {
        return {
          data: {
            subscription: billingData.data.subscription,
            paymentMethods: billingData.data.paymentMethods || [],
            invoices: billingData.data.invoices || [],
            transactions: billingData.data.transactions || [],
          },
          error: emptyBillingErrors,
        };
      }
    }
  } catch (unifiedError) {
    console.warn('Unified billing API failed, falling back to individual APIs:', unifiedError);
  }

  // Fallback: Fetch all endpoints in parallel using Promise.all (Option B)
  const [subscriptionResponse, paymentMethodsResponse, invoicesResponse, transactionsResponse] = await Promise.all([
    fetch('/api/user/subscription'),
    fetch('/api/user/payment-methods'),
    fetch('/api/user/invoices?limit=20'),
    fetch('/api/user/transactions?limit=50'),
  ]);

  // Process subscription data
  let subscription: Subscription | null = null;
  let subscriptionError: string | null = null;
  if (subscriptionResponse.ok) {
    const subscriptionData = await subscriptionResponse.json();
    if (subscriptionData.success) {
      subscription = subscriptionData.subscription;
    } else {
      subscriptionError = subscriptionData.error || 'Failed to load subscription';
    }
  } else {
    subscriptionError = 'Failed to load subscription data';
  }

  // Process payment methods data
  let paymentMethods: PaymentMethod[] = [];
  let paymentMethodsError: string | null = null;
  if (paymentMethodsResponse.ok) {
    const paymentData = await paymentMethodsResponse.json();
    if (paymentData.success) {
      paymentMethods = paymentData.paymentMethods || [];
    } else {
      if (paymentData.error && !paymentData.error.includes('No payment methods found') && !paymentData.error.includes('not found')) {
        paymentMethodsError = paymentData.error;
      } else {
        paymentMethods = [];
      }
    }
  } else {
    if (paymentMethodsResponse.status !== 404) {
      paymentMethodsError = 'Failed to load payment methods';
    } else {
      paymentMethods = [];
    }
  }

  // Process invoices data
  let invoices: Invoice[] = [];
  let invoicesError: string | null = null;
  if (invoicesResponse.ok) {
    const invoiceData = await invoicesResponse.json();
    if (invoiceData.success) {
      invoices = invoiceData.invoices || [];
    } else {
      if (invoiceData.error && !invoiceData.error.includes('No invoices found') && !invoiceData.error.includes('not found')) {
        invoicesError = invoiceData.error;
      } else {
        invoices = [];
      }
    }
  } else {
    if (invoicesResponse.status !== 404) {
      invoicesError = 'Failed to load invoices';
    } else {
      invoices = [];
    }
  }

  // Process transactions data
  let transactions: Transaction[] = [];
  let transactionsError: string | null = null;
  if (transactionsResponse.ok) {
    const transactionData = await transactionsResponse.json();
    if (transactionData.success) {
      transactions = transactionData.transactions || [];
    } else {
      if (transactionData.error && !transactionData.error.includes('No transactions found') && !transactionData.error.includes('not found')) {
        transactionsError = transactionData.error;
      } else {
        transactions = [];
      }
    }
  } else {
    if (transactionsResponse.status !== 404) {
      transactionsError = 'Failed to load transactions';
    } else {
      transactions = [];
    }
  }

  return {
    data: {
      subscription,
      paymentMethods,
      invoices,
      transactions,
    },
    error: {
      subscription: subscriptionError,
      paymentMethods: paymentMethodsError,
      invoices: invoicesError,
      transactions: transactionsError,
    },
  };
}

/**
 * Consolidated hook for fetching billing-related data
 * Fetches subscription, payment methods, and invoices in parallel
 */
export function useBillingData(): UseBillingDataResult {
  const billingQuery = useQuery({
    queryKey: ['billing-data'],
    queryFn: fetchBillingData,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    data: billingQuery.data?.data || emptyBillingData,
    isLoading: billingQuery.isPending,
    error: billingQuery.data?.error || (
      billingQuery.error
        ? {
            subscription: 'Network error loading subscription',
            paymentMethods: 'Network error loading payment methods',
            invoices: 'Network error loading invoices',
            transactions: 'Network error loading transactions',
          }
        : emptyBillingErrors
    ),
    refetch: () => {
      billingQuery.refetch();
    },
  };
}
