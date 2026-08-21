'use client';

import React, { useMemo, useState } from 'react';
import { CheckCircle2, Crown, Info } from 'lucide-react';
import UpgradePromptCard from '@/components/payment/UpgradePromptCard';
import type { TrackerSidebarActionPayload } from './trackerSidebarConfig';
import {
  dismissTrackerCreatedStageModalForToday,
  type TrackerCreatedStagePreview,
} from '@/lib/utils/tracker-created-stage-modal';

interface TrackerCreatedStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  jobTitle?: string;
  company?: string;
  preview: TrackerCreatedStagePreview | null;
  preselectedPlanKey?: string;
  isSubmitting?: boolean;
  actionContext?: TrackerSidebarActionPayload | null;
}

export default function TrackerCreatedStageModal({
  isOpen,
  onClose,
  onConfirm,
  jobTitle,
  company,
  preview,
  preselectedPlanKey = 'focused_monthly',
  isSubmitting = false,
  actionContext = null,
}: TrackerCreatedStageModalProps) {
  const [dontShowAgainToday, setDontShowAgainToday] = useState(false);

  const allowance = useMemo(() => {
    const limit = preview?.aiCreditsLimit;
    const remaining = preview?.aiCreditsRemaining;
    if (!Number.isFinite(limit) || typeof limit !== 'number' || limit <= 0) {
      return null;
    }

    const safeRemaining = Math.max(0, remaining ?? 0);
    return {
      limit,
      remaining: safeRemaining,
      used: Math.max(0, limit - safeRemaining),
    };
  }, [preview?.aiCreditsLimit, preview?.aiCreditsRemaining]);

  const fallbackTitle = preview?.entitlementReasonCode === 'ai_credits_exhausted'
    ? 'Free limit exhausted'
    : 'You’re on Free Plan';

  const fallbackSummary = preview?.entitlementReasonCode === 'ai_credits_exhausted'
    ? 'Your tailored generation allowance is exhausted right now. We can still create fallback documents from your Master CV.'
    : 'Your documents will still be created from your Master CV, but they won’t be tailored until you upgrade.';

  const handleConfirm = async () => {
    if (dontShowAgainToday) {
      dismissTrackerCreatedStageModalForToday();
    }

    await onConfirm();
  };

  return (
    <UpgradePromptCard
      isOpen={isOpen}
      onClose={onClose}
      title={fallbackTitle}
      description={fallbackSummary}
      icon={<Crown className="w-4 h-4" />}
      preselectedPlanKey={preselectedPlanKey}
      triggerContext="tracker-created-stage"
      primaryLabel="Upgrade Now"
      secondaryLabel="Create Anyway"
      onSecondary={handleConfirm}
    >
      {(jobTitle || company) && (
        <p className="mt-2.5 text-[13px] font-medium text-gray-800 dark:text-gray-200">
          {jobTitle || 'This role'}{company ? ` at ${company}` : ''}
        </p>
      )}
      {actionContext && (
        <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-gray-400">
          Stage context: {actionContext.stage} {actionContext.entitlement.mode ? `• ${actionContext.entitlement.mode} path` : ''}
        </p>
      )}

      {/* What fallback docs mean */}
      <div className="mt-3 space-y-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 p-3">
        <div className="flex items-start gap-2 text-[12px] text-amber-800 dark:text-amber-200/80">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>CV will be created as a non-tailored copy of your Master CV.</span>
        </div>
        <div className="flex items-start gap-2 text-[12px] text-amber-800 dark:text-amber-200/80">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>Cover letter will be created as a basic draft with header only.</span>
        </div>
      </div>

      {/* Free allowance */}
      {allowance && (
        <div className="mt-3 flex items-center justify-between gap-4 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2.5">
          <div className="flex items-center gap-2 text-[12px] text-gray-600 dark:text-gray-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Tailored generations this cycle</span>
          </div>
          <span className="text-[12px] font-semibold text-gray-800 dark:text-gray-200 tabular-nums">
            {allowance.used} / {allowance.limit} used
          </span>
        </div>
      )}

      {/* Don't show again */}
      <label className="mt-3 flex items-start gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={dontShowAgainToday}
          onChange={(e) => setDontShowAgainToday(e.target.checked)}
          disabled={isSubmitting}
          className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-lime-600 focus:ring-lime-500"
        />
        <span className="text-[12px] text-gray-500 dark:text-gray-400">
          Don&apos;t show this again today — create fallback documents directly.
        </span>
      </label>
    </UpgradePromptCard>
  );
}
