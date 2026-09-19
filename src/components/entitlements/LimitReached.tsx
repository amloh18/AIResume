'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useEntitlements, FeatureKey, LimitKey } from '@/lib/hooks/useEntitlements';
import { getFeatureName } from '@/lib/entitlements/catalog';

interface LimitReachedProps {
  /** Feature key that hit the limit */
  feature?: FeatureKey;
  /** Or directly specify the limit key */
  limitKey?: LimitKey;
  /** Custom title */
  title?: string;
  /** Custom message */
  message?: string;
  /** Show as banner vs card */
  variant?: 'banner' | 'card';
  /** Callback for upgrade action */
  onUpgrade?: () => void;
  className?: string;
}

/**
 * Prominent "limit reached" state shown when usage is exhausted.
 *
 * Usage:
 *   <LimitReached feature="apply.auto" />
 *   <LimitReached limitKey="auto_apply_daily" variant="banner" />
 */
export function LimitReached({
  feature,
  limitKey,
  title,
  message,
  variant = 'card',
  onUpgrade,
  className = '',
}: LimitReachedProps) {
  const router = useRouter();
  const { getFeature, getRemaining, loading } = useEntitlements();

  if (loading) return null;

  const info = feature ? getFeature(feature) : null;
  const remaining = limitKey ? getRemaining(limitKey) : null;

  const isLimitReached = info?.state === 'limit_reached' || remaining === 0;
  const featureName = feature ? getFeatureName(feature) : limitKey?.replace(/_/g, ' ');

  if (!isLimitReached) return null;

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
      return;
    }
    router.push('/dashboard/settings?tab=membership');
  };

  if (variant === 'banner') {
    return (
      <div className={`flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 ${className}`}>
        <div className="flex items-center gap-2">
          <span className="text-amber-600 dark:text-amber-400 text-sm">⚠️</span>
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {title ?? `${featureName} limit reached`}
            </p>
            {message && (
              <p className="text-xs text-amber-600 dark:text-amber-400">{message}</p>
            )}
          </div>
        </div>
        <button
          onClick={handleUpgrade}
          className="shrink-0 ml-3 px-3 py-1.5 text-xs font-semibold rounded-md bg-amber-600 text-white hover:bg-amber-700 transition-colors"
        >
          Upgrade
        </button>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-amber-600 dark:text-amber-400 text-lg">⚠️</span>
        <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
          {title ?? `${featureName} Limit Reached`}
        </h3>
      </div>
      <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
        {message ?? `You've used all your ${featureName?.toLowerCase()} for this period. Upgrade for higher limits.`}
      </p>
      <button
        onClick={handleUpgrade}
        className="w-full py-2 px-3 text-sm font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
      >
        Upgrade Plan
      </button>
    </div>
  );
}
