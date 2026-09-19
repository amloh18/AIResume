'use client';

import React from 'react';
import { useEntitlements, LimitKey } from '@/lib/hooks/useEntitlements';

interface QuotaIndicatorProps {
  /** Limit key to display */
  limitKey: LimitKey;
  /** Optional label override */
  label?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show as compact badge vs full indicator */
  compact?: boolean;
  className?: string;
}

/**
 * Compact quota display showing remaining/limit.
 *
 * Usage:
 *   <QuotaIndicator limitKey="auto_apply_daily" />
 *   <QuotaIndicator limitKey="journey_cvs" label="Resumes" size="sm" compact />
 */
export function QuotaIndicator({
  limitKey,
  label,
  size = 'md',
  compact = false,
  className = '',
}: QuotaIndicatorProps) {
  const { getRemaining, getLimit, loading } = useEntitlements();

  if (loading) return null;

  const remaining = getRemaining(limitKey);
  const bucket = getLimit(limitKey);

  if (!bucket) return null;

  const isUnlimited = remaining === null;
  const displayLabel = label ?? limitKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs ${className}`}>
        <span className="text-gray-500 dark:text-gray-400">{displayLabel}:</span>
        <span className={`font-semibold ${isUnlimited ? 'text-emerald-600' : remaining === 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
          {isUnlimited ? 'Unlimited' : remaining}
        </span>
      </span>
    );
  }

  const sizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const barSizes = {
    sm: 'h-1',
    md: 'h-1.5',
    lg: 'h-2',
  };

  const percent = !isUnlimited && bucket.limit > 0
    ? Math.min(100, Math.round((bucket.used / bucket.limit) * 100))
    : 0;

  return (
    <div className={`${sizes[size]} ${className}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-gray-600 dark:text-gray-400">{displayLabel}</span>
        <span className={`font-semibold ${isUnlimited ? 'text-emerald-600' : remaining === 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
          {isUnlimited ? 'Unlimited' : `${bucket.used} / ${bucket.limit}`}
        </span>
      </div>
      {!isUnlimited && bucket.limit > 0 && (
        <div className={`${barSizes[size]} bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden`}>
          <div
            className={`${barSizes[size]} rounded-full transition-all duration-500 ${
              percent >= 90 ? 'bg-red-500' : percent >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
      {!isUnlimited && bucket.resetAt && remaining !== null && remaining <= Math.ceil(bucket.limit * 0.2) && (
        <p className="text-[10px] text-gray-400 mt-1">
          Resets {new Date(bucket.resetAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </p>
      )}
    </div>
  );
}
