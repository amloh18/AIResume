'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useEntitlements } from '@/lib/hooks/useEntitlements';

interface SubscriptionIssueBannerProps {
  /** Custom message */
  message?: string;
  /** Callback for fix action */
  onFix?: () => void;
  className?: string;
}

/**
 * Non-destructive notification for subscription issues (past_due, payment failed, etc.)
 * Does NOT block the UI — just shows a banner.
 *
 * Usage:
 *   <SubscriptionIssueBanner />
 */
export function SubscriptionIssueBanner({
  message,
  onFix,
  className = '',
}: SubscriptionIssueBannerProps) {
  const router = useRouter();
  const { entitlements, loading } = useEntitlements();

  if (loading) return null;

  const status = entitlements?.status;
  const hasIssue = status === 'past_due' || status === 'unpaid' || status === 'incomplete_expired';

  if (!hasIssue) return null;

  const handleFix = () => {
    if (onFix) {
      onFix();
      return;
    }
    router.push('/dashboard/settings?tab=membership');
  };

  const messages: Record<string, string> = {
    past_due: 'Your payment is past due. Please update your payment method.',
    unpaid: 'Your subscription payment failed. Please update your payment method.',
    incomplete_expired: 'Your subscription expired. Choose a plan to continue.',
  };

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-red-500 text-sm">⚠️</span>
        <p className="text-sm text-red-700 dark:text-red-300">
          {message ?? messages[status ?? ''] ?? 'There is an issue with your subscription.'}
        </p>
      </div>
      <button
        onClick={handleFix}
        className="shrink-0 ml-3 px-3 py-1.5 text-xs font-semibold rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
      >
        Fix Now
      </button>
    </div>
  );
}
