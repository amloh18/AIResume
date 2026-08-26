'use client';

import React from 'react';
import {
  X,
  Zap,
  ArrowRight,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import type { UserEntitlements, UpgradeRecommendation } from '@/lib/services/entitlement-service';

interface ContextualLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  entitlements: UserEntitlements | null;
  recommendation?: UpgradeRecommendation | null;
  triggerType?: 'application' | 'auto_apply';
  onManualApplyFallback?: () => void;
}

export const ContextualLimitModal: React.FC<ContextualLimitModalProps> = ({
  isOpen,
  onClose,
  entitlements,
  recommendation,
  triggerType = 'application',
  onManualApplyFallback,
}) => {
  if (!isOpen || !entitlements) return null;

  const isStarter = entitlements.plan === 'starter';
  const resetDateStr = entitlements.application.resetAt
    ? new Date(entitlements.application.resetAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'next billing cycle';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-[#141810] rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 sm:p-7 space-y-5">
          {/* Header Icon */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-center text-amber-600 dark:text-[#013f2e]">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                {isStarter
                  ? "You've reached your monthly limit"
                  : "Today's auto-apply limit is reached"}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isStarter
                  ? 'Starter Plan · 10 applications / month'
                  : 'Focused Plan · 50 automated applications / day'}
              </p>
            </div>
          </div>

          {/* Contextual Explanation */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 text-xs text-gray-700 dark:text-gray-300 space-y-1.5">
            {isStarter ? (
              <p className="leading-relaxed">
                You've used all <strong>10 applications</strong> included with your Starter plan this month.
              </p>
            ) : (
              <p className="leading-relaxed">
                You've used all <strong>50 automated applications</strong> available today. Your daily auto-apply limit resets tomorrow at midnight.
              </p>
            )}
          </div>

          {/* Upgrade Path for Starter -> Focused */}
          {isStarter && recommendation && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-gray-900 via-gray-950 to-black text-white border border-white/10 shadow-md space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#013f2e]" />
                  <span className="font-extrabold text-xs text-[#013f2e] tracking-wide uppercase">
                    Recommended
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300 font-bold">
                  50 / day
                </span>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm">Focused Plan</h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  Built for active job seekers. Unlock 50 automated applications per day and unlimited manual tracking.
                </p>
              </div>

              <div className="space-y-1.5 text-[11px] text-gray-300 pt-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#013f2e]" />
                  <span>50 automated applications every day (1,500/mo)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#013f2e]" />
                  <span>Unlimited manual job applications & tracking</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#013f2e]" />
                  <span>Instant AI Resume tailoring & cover letters</span>
                </div>
              </div>

              <Link
                href="/dashboard/billing"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl text-xs font-black bg-[#013f2e] hover:brightness-95 text-black shadow-md transition-all flex items-center justify-center gap-1.5 mt-2"
              >
                <span>Upgrade to Focused</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* Fallback actions for Focused users reaching daily 50 cap */}
          {!isStarter && (
            <div className="space-y-2">
              <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#013f2e]" />
                  <span>Manual actions are never blocked</span>
                </div>
                <p className="text-[11px] text-gray-600 dark:text-gray-400">
                  You can still save jobs, tailor custom CVs, answer questionnaires, and submit manual applications directly.
                </p>
              </div>

              {onManualApplyFallback && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onManualApplyFallback();
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-gray-900 hover:bg-black dark:bg-[#013f2e] text-white dark:text-black transition-all flex items-center justify-center gap-1.5"
                >
                  Apply Manually Instead
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Reset Date Footer */}
          <div className="pt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-1 text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span>Resets on {resetDateStr}</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              Continue Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContextualLimitModal;
