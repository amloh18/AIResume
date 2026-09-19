'use client';

import React from 'react';
import { useEntitlements, FeatureKey } from '@/lib/hooks/useEntitlements';

interface UsageMeterProps {
  /** Feature key with a usage meter */
  feature: FeatureKey;
  /** Label to display */
  label?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show percentage instead of counts */
  showPercent?: boolean;
  className?: string;
}

/**
 * Full progress bar showing usage against limit for a feature.
 *
 * Usage:
 *   <UsageMeter feature="apply.auto" label="Auto-Apply Today" />
 *   <UsageMeter feature="match.journey_cv" label="Tailored Resumes" size="lg" />
 */
export function UsageMeter({
  feature,
  label,
  size = 'md',
  showPercent = false,
  className = '',
}: UsageMeterProps) {
  const { getFeature, loading } = useEntitlements();
  const info = getFeature(feature);

  if (loading) return null;

  const { usage, usagePercent, name } = info;
  const displayLabel = label ?? name;

  if (!usage) return null;

  const isUnlimited = usage.remaining === null;
  const barSizes = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={`${textSizes[size]} ${className}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-medium text-gray-700 dark:text-gray-300">{displayLabel}</span>
        <span className={`font-semibold ${
          isUnlimited ? 'text-emerald-600 dark:text-emerald-400'
            : usage.remaining === 0 ? 'text-red-500'
            : 'text-gray-900 dark:text-white'
        }`}>
          {isUnlimited ? 'Unlimited' : showPercent ? `${usagePercent ?? 0}%` : `${usage.used} / ${usage.limit}`}
        </span>
      </div>

      {!isUnlimited && usage.limit > 0 && (
        <div className={`${barSizes[size]} bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden`}>
          <div
            className={`${barSizes[size]} rounded-full transition-all duration-500 ${
              (usagePercent ?? 0) >= 90 ? 'bg-red-500'
                : (usagePercent ?? 0) >= 70 ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${usagePercent ?? 0}%` }}
          />
        </div>
      )}

      {usage.resetAt && !isUnlimited && (
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
          Resets {new Date(usage.resetAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </p>
      )}
    </div>
  );
}
