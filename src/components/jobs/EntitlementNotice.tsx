'use client';

import React from 'react';
import {
  X,
  Zap,
  ArrowRight,
  Clock,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import type { UserEntitlements, UpgradeRecommendation } from '@/lib/services/entitlement-service';

export type EntitlementOutcomeCode =
  | 'AUTO_APPLY_NOT_INCLUDED'
  | 'AUTO_APPLY_LIMIT_REACHED'
  | 'APPLICATION_FAILED'
  | 'APPLICATION_VERIFICATION_FAILED'
  | 'AUTHENTICATION_REQUIRED'
  | 'MANUAL_REVIEW_REQUIRED'
  | 'APPLICATION_SUBMITTED';

export interface EntitlementNoticeData {
  code: EntitlementOutcomeCode;
  jobTitle?: string;
  company?: string;
  applyUrl?: string;
  message?: string;
  entitlements?: UserEntitlements | null;
  recommendation?: UpgradeRecommendation | null;
}

interface EntitlementNoticeProps {
  isOpen: boolean;
  onClose: () => void;
  data: EntitlementNoticeData | null;
  onManualApply?: () => void;
  onRetry?: () => void;
}

export const EntitlementNotice: React.FC<EntitlementNoticeProps> = ({
  isOpen,
  onClose,
  data,
  onManualApply,
  onRetry,
}) => {
  if (!isOpen || !data) return null;

  const { code, jobTitle, company, applyUrl, message } = data;

  const handleManualApply = () => {
    onClose();
    if (onManualApply) {
      onManualApply();
    } else if (applyUrl) {
      window.open(applyUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // 1. AUTO_APPLY_NOT_INCLUDED (Starter Plan)
  if (code === 'AUTO_APPLY_NOT_INCLUDED') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="relative w-full max-w-md bg-white dark:bg-[#141810] rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden">
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-6 sm:p-7 space-y-5">
            {/* Header Icon */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-lime-500/15 border border-lime-500/30 flex items-center justify-center text-lime-700 dark:text-[#80FF00]">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  Auto-Apply isn&apos;t included in your plan
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {jobTitle && company ? `${jobTitle} · ${company}` : 'Starter Plan'}
                </p>
              </div>
            </div>

            {/* Context Explanation */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 text-xs text-gray-700 dark:text-gray-300 space-y-1.5 leading-relaxed">
              <p>
                Your Starter plan includes job discovery and application preparation. Automatic submission is available on Focused.
              </p>
            </div>

            {/* Focused Upgrade Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-gray-900 via-gray-950 to-black text-white border border-white/10 shadow-md space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#80FF00]" />
                  <span className="font-extrabold text-xs text-[#80FF00] tracking-wide uppercase">
                    Focused Plan
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300 font-bold">
                  50 / day
                </span>
              </div>

              <div className="space-y-1.5 text-[11px] text-gray-300">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#80FF00]" />
                  <span>50 automated applications every day</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#80FF00]" />
                  <span>Automatic screening questionnaire resolution</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#80FF00]" />
                  <span>Instant tailored CVs & cover letters</span>
                </div>
              </div>

              <Link
                href="/dashboard/billing"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl text-xs font-black bg-[#80FF00] hover:brightness-95 text-black shadow-md transition-all flex items-center justify-center gap-1.5 mt-2"
              >
                <span>Upgrade to Focused</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Manual Fallback */}
            <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-white/5">
              <button
                type="button"
                onClick={handleManualApply}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-900 dark:text-white transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Apply Manually to {company || 'Job'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. AUTO_APPLY_LIMIT_REACHED (Focused Daily 50 cap)
  if (code === 'AUTO_APPLY_LIMIT_REACHED') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="relative w-full max-w-md bg-white dark:bg-[#141810] rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  Today&apos;s Auto-Apply limit is reached
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Focused Plan · 50 / 50 used today
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 text-xs text-gray-700 dark:text-gray-300 space-y-1.5 leading-relaxed">
              <p>
                You&apos;ve used all <strong>50 automated applications</strong> available today. Your daily limit resets tomorrow at midnight.
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-[11px]">
                Manual applications, CV tailoring, and job saves are never blocked.
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleManualApply}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#0f172a] hover:bg-[#1e293b] dark:bg-[#80FF00] text-white dark:text-black transition-all flex items-center justify-center gap-1.5"
              >
                <span>Apply Manually Instead</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors text-center"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. APPLICATION_VERIFICATION_FAILED (Unknown Submission State)
  if (code === 'APPLICATION_VERIFICATION_FAILED') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="relative w-full max-w-md bg-white dark:bg-[#141810] rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  Application needs verification
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {jobTitle} · {company}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
              <p>
                We submitted your application, but could not confirm receipt from the employer portal yet. Please check your Application Tracker or verify directly on their site before retrying.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/jobs?tab=applications"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#0f172a] hover:bg-[#1e293b] dark:bg-[#80FF00] text-white dark:text-black transition-all text-center"
              >
                Check Application
              </Link>
              <button
                type="button"
                onClick={handleManualApply}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300"
              >
                Open Site
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. AUTHENTICATION_REQUIRED
  if (code === 'AUTHENTICATION_REQUIRED') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="relative w-full max-w-md bg-white dark:bg-[#141810] rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  Your job account needs to be reconnected
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Authentication session expired
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
              <p>
                Your session with this job portal has expired. Please re-authenticate your connected account in Settings to resume automated submission.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/jobs?tab=settings"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#0f172a] hover:bg-[#1e293b] dark:bg-[#80FF00] text-white dark:text-black transition-all text-center"
              >
                Reconnect in Settings
              </Link>
              <button
                type="button"
                onClick={handleManualApply}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300"
              >
                Apply Manually
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 5. APPLICATION_FAILED (Genuine failure on employer's site)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-[#141810] rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 sm:p-7 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                Application couldn&apos;t be completed
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {jobTitle} · {company}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
            <p>
              {message || "We couldn't complete the application on the employer's site. Your documents are saved, and you can submit directly."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualApply}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#0f172a] hover:bg-[#1e293b] dark:bg-[#80FF00] text-white dark:text-black transition-all flex items-center justify-center gap-1.5"
            >
              <span>Apply Manually</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            {onRetry && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRetry();
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Try Again</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EntitlementNotice;
