'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useEntitlements } from '@/lib/hooks/useEntitlements';

interface TrialBannerProps {
  className?: string;
}

function computeDaysLeft(trialEnd: Date | string | undefined): number | null {
  if (!trialEnd) return null;
  const diff = new Date(trialEnd).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Shows trial status and expiration countdown.
 * Only visible when user is in a trial (including launch trial).
 *
 * Usage:
 *   <TrialBanner />
 */
export function TrialBanner({ className = '' }: TrialBannerProps) {
  const router = useRouter();
  const { isTrialing, isLaunchTrial, entitlements, loading } = useEntitlements();

  const trialEnd = entitlements?.isLaunchTrial
    ? entitlements.limits?.active_jobs?.resetAt
    : undefined;

  const daysLeft = useMemo(() => computeDaysLeft(trialEnd), [trialEnd]);

  if (loading || !isTrialing) return null;

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-emerald-600 dark:text-emerald-400 text-sm">✨</span>
        <div>
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
            {isLaunchTrial ? 'Starter Trial — Free through Dec 31, 2026' : 'Trial Active'}
          </p>
          {daysLeft !== null && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              {daysLeft} {daysLeft === 1 ? 'day' : 'days'} remaining
            </p>
          )}
        </div>
      </div>
      <button
        onClick={() => router.push('/dashboard/settings?tab=membership')}
        className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-800/40 px-2 py-1 rounded-full hover:bg-emerald-200 dark:hover:bg-emerald-700/40 transition-colors"
      >
        {entitlements?.plan === 'starter' ? 'Starter' : 'Free'} Trial
      </button>
    </div>
  );
}
