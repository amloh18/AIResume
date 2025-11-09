'use client';

import { useState, useEffect } from 'react';

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
  amount: number;
  currency: string;
  status: string;
  planName: string;
  billingCycle: string;
  paymentMethodType: string;
  paymentMethodLast4: string;
  paidAt?: string;
  dueDate?: string;
  description: string;
  createdAt: string;
}

interface BillingData {
  subscription: Subscription | null;
  paymentMethods: PaymentMethod[];
  invoices: Invoice[];
}

interface UseBillingDataResult {
  data: BillingData;
  isLoading: boolean;
  error: {
    subscription: string | null;
    paymentMethods: string | null;
    invoices: string | null;
  };
  refetch: () => void;
}

/**
 * Consolidated hook for fetching billing-related data
 * Fetches subscription, payment methods, and invoices in parallel
 */
export function useBillingData(): UseBillingDataResult {
  const [data, setData] = useState<BillingData>({
    subscription: null,
    paymentMethods: [],
    invoices: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{
    subscription: string | null;
    paymentMethods: string | null;
    invoices: string | null;
  }>({
    subscription: null,
    paymentMethods: null,
    invoices: null,
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        setIsLoading(true);
        
        // Reset error states
        setError({
          subscription: null,
          paymentMethods: null,
          invoices: null,
        });

        // Fetch all three endpoints in parallel using Promise.all
        const [subscriptionResponse, paymentMethodsResponse, invoicesResponse] = await Promise.all([
          fetch('/api/user/subscription'),
          fetch('/api/user/payment-methods'),
          fetch('/api/user/invoices?limit=20'),
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
            // Only show error if it's not a "no records" case
            if (paymentData.error && !paymentData.error.includes('No payment methods found') && !paymentData.error.includes('not found')) {
              paymentMethodsError = paymentData.error;
            } else {
              paymentMethods = [];
            }
          }
        } else {
          // Only show error for actual HTTP errors, not 404s for empty data
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
            // Only show error if it's not a "no records" case
            if (invoiceData.error && !invoiceData.error.includes('No invoices found') && !invoiceData.error.includes('not found')) {
              invoicesError = invoiceData.error;
            } else {
              invoices = [];
            }
          }
        } else {
          // Only show error for actual HTTP errors, not 404s for empty data
          if (invoicesResponse.status !== 404) {
            invoicesError = 'Failed to load invoices';
          } else {
            invoices = [];
          }
        }

        // Update state with all fetched data
        setData({
          subscription,
          paymentMethods,
          invoices,
        });

        setError({
          subscription: subscriptionError,
          paymentMethods: paymentMethodsError,
          invoices: invoicesError,
        });
      } catch (error) {
        console.error('Error fetching billing data:', error);
        setError({
          subscription: 'Network error loading subscription',
          paymentMethods: 'Network error loading payment methods',
          invoices: 'Network error loading invoices',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchBillingData();
  }, [refreshTrigger]);

  const refetch = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}

