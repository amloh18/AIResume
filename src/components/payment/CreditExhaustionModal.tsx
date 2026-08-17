'use client';

import React from 'react';
import { Crown, RefreshCcw } from 'lucide-react';
import UpgradePromptCard from '@/components/payment/UpgradePromptCard';

interface CreditExhaustionModalProps {
  isOpen: boolean;
  onClose: () => void;
  creditsRemaining: number;
  limit: number;
  resetTime?: Date;
  preselectedPlanKey?: string;
  reason?: string;
  exhaustionType?: 'meter' | 'quota' | 'gate';
}

const CreditExhaustionModal: React.FC<CreditExhaustionModalProps> = ({
  isOpen,
  onClose,
  creditsRemaining,
  limit,
  resetTime,
  preselectedPlanKey = 'pro_monthly',
  reason,
  exhaustionType = 'meter',
}) => {
  const isMeter = exhaustionType === 'meter';
  const title = exhaustionType === 'gate'
    ? 'Premium Feature'
    : exhaustionType === 'quota'
      ? 'Storage Full'
      : 'Upgrade to Continue';

  const subtitle = exhaustionType === 'gate'
    ? 'Unlock this feature with Pro'
    : exhaustionType === 'quota'
      ? 'Upgrade to store more documents'
      : 'Get unlimited AI generations and documents';

  const pct = limit > 0 ? Math.min(100, Math.round((creditsRemaining / limit) * 100)) : 0;

  return (
    <UpgradePromptCard
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={subtitle}
      icon={<Crown className="w-4 h-4" />}
      preselectedPlanKey={preselectedPlanKey}
      triggerContext="credit-exhaustion"
      primaryLabel="Upgrade Now"
      secondaryLabel="Maybe Later"
    >
      {reason && (
        <p className="mt-2.5 text-[12px] text-gray-500 dark:text-gray-400">{reason}</p>
      )}

      {isMeter && limit > 0 && (
        <div className="mt-3 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3">
          <div className="flex items-center justify-between mb-1.5 text-[12px]">
            <span className="text-gray-600 dark:text-gray-300">Credits available</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200 tabular-nums">
              {creditsRemaining} / {limit}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-[#80FF00] h-1.5 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          {resetTime && (
            <div className="mt-2 flex items-center gap-1.5 text-[12px] text-gray-500 dark:text-gray-400">
              <RefreshCcw className="w-3 h-3" />
              <span>
                Resets {resetTime.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </div>
          )}
        </div>
      )}
    </UpgradePromptCard>
  );
};

export default CreditExhaustionModal;
