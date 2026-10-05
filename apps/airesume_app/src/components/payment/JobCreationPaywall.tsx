'use client';

import React from 'react';
import { Briefcase, Check } from 'lucide-react';
import UpgradePromptCard from '@/components/payment/UpgradePromptCard';

interface JobCreationPaywallProps {
  isOpen: boolean;
  onClose: () => void;
  currentCount: number;
  limit: number;
  preselectedPlanKey?: string;
}

const JobCreationPaywall: React.FC<JobCreationPaywallProps> = ({
  isOpen,
  onClose,
  currentCount,
  limit,
  preselectedPlanKey = 'focused_monthly',
}) => {
  const pct = limit > 0 ? Math.min(100, Math.round((currentCount / limit) * 100)) : 0;

  return (
    <UpgradePromptCard
      isOpen={isOpen}
      onClose={onClose}
      title="Job Limit Reached"
      description={`You've reached your job limit (${limit} jobs). Archive or delete a job to add more, or upgrade for unlimited jobs.`}
      icon={<Briefcase className="w-4 h-4" />}
      preselectedPlanKey={preselectedPlanKey}
      triggerContext="job-creation-limit"
      primaryLabel="Upgrade to Focused"
      secondaryLabel="Maybe Later"
    >
      {/* Job usage meter */}
      <div className="mt-3 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3">
        <div className="flex items-center justify-between mb-1.5 text-[12px]">
          <span className="text-gray-600 dark:text-gray-300">Jobs in tracker</span>
          <span className="font-semibold text-gray-800 dark:text-gray-200 tabular-nums">
            {currentCount} / {limit}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
          <div
            className="bg-[#013f2e] h-1.5 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Existing work stays accessible */}
      <div className="mt-2.5 flex items-start gap-2 text-[12px] text-gray-500 dark:text-gray-400">
        <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-lime-600 dark:text-lime-400" />
        <span>Your existing jobs and CVs stay fully accessible — the limit only applies to creating new jobs.</span>
      </div>
    </UpgradePromptCard>
  );
};

export default JobCreationPaywall;
