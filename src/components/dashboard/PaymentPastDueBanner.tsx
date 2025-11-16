'use client';

import React from 'react';
import { AlertCircle, CreditCard, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PaymentPastDueBannerProps {
  amount?: number;
  currency?: string;
  dueDate?: string;
  onDismiss?: () => void;
}

export default function PaymentPastDueBanner({
  amount,
  currency = 'USD',
  dueDate,
  onDismiss
}: PaymentPastDueBannerProps) {
  const router = useRouter();
  const [isDismissed, setIsDismissed] = React.useState(false);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  const handleUpdatePayment = () => {
    router.push('/dashboard/settings?tab=membership');
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isDismissed) {
    return null;
  }

  return (
    <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-400 p-4 mb-6 rounded-r-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-1">
              Payment Past Due
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mb-2">
              Your subscription payment could not be processed. Please update your payment method to continue using the service.
            </p>
            {amount && (
              <p className="text-sm font-medium text-red-900 dark:text-red-200 mb-1">
                Amount Due: {formatCurrency(amount, currency)}
              </p>
            )}
            {dueDate && (
              <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                Due Date: {formatDate(dueDate)}
              </p>
            )}
            <button
              onClick={handleUpdatePayment}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <CreditCard className="w-4 h-4" />
              Update Payment Method
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors p-1"
          aria-label="Dismiss banner"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

