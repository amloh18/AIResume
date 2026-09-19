'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useEntitlements, FeatureKey } from '@/lib/hooks/useEntitlements';
import { getPlanLabel } from '@/lib/entitlements/catalog';

interface UpgradePromptProps {
  feature: FeatureKey;
  /** Show usage meter alongside the prompt */
  showUsage?: boolean;
  /** Custom CTA text override */
  ctaText?: string;
  /** Custom title override */
  title?: string;
  /** Show as compact inline vs full card */
  compact?: boolean;
  className?: string;
  /** Callback when CTA is clicked */
  onUpgrade?: () => void;
}

/**
 * Upgrade prompt shown when a feature is locked or limit reached.
 *
 * Usage:
 *   <UpgradePrompt feature="track.interview_coach" />
 *   <UpgradePrompt feature="apply.auto" showUsage compact />
 */
export function UpgradePrompt({
  feature,
  showUsage = false,
  ctaText,
  title,
  compact = false,
  className = '',
  onUpgrade,
}: UpgradePromptProps) {
  const router = useRouter();
  const { getFeature, getUpgradePlan, loading } = useEntitlements();
  const info = getFeature(feature);

  if (loading) return null;

  const { state, name, upgradeMessage, requiredPlanLabel, usage, usagePercent } = info;
  const upgradePlan = getUpgradePlan(feature);

  // Don't show if feature is available
  if (state === 'available' || state === 'loading') return null;

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
      return;
    }
    router.push('/dashboard/settings?tab=membership');
  };

  if (compact) {
    return (
      <div className={`flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="flex items-center gap-2 min-w-0">
          {state === 'limit_reached' ? (
            <span className="text-red-500 text-xs font-medium shrink-0">Limit reached</span>
          ) : (
            <span className="text-gray-500 text-xs font-medium shrink-0">Requires {requiredPlanLabel}</span>
          )}
          <span className="text-xs text-gray-400 truncate">{name}</span>
        </div>
        <button
          onClick={handleUpgrade}
          className="shrink-0 ml-2 px-2 py-1 text-[11px] font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
        >
          {ctaText ?? 'Upgrade'}
        </button>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            {title ?? (state === 'limit_reached' ? `${name} Limit Reached` : name)}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {upgradeMessage || `${name} requires ${requiredPlanLabel}.`}
          </p>
        </div>
        <div className="shrink-0">
          {state === 'plan_locked' ? (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              {requiredPlanLabel}
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
              Limit
            </span>
          )}
        </div>
      </div>

      {showUsage && usage && (
        <div className="mb-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500">Usage</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {usage.remaining === null ? 'Unlimited' : `${usage.used} / ${usage.limit}`}
            </span>
          </div>
          {usage.limit > 0 && usage.remaining !== null && (
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-1.5 rounded-full ${(usagePercent ?? 0) >= 90 ? 'bg-red-500' : 'bg-amber-500'}`}
                style={{ width: `${usagePercent ?? 0}%` }}
              />
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleUpgrade}
        className="w-full py-2 px-3 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
      >
        {ctaText ?? `Upgrade to ${getPlanLabel(upgradePlan)}`}
      </button>
    </div>
  );
}
