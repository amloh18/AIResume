'use client';

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  Crown,
  FilePlus2,
  FileText,
  Info,
  Sparkles,
  X,
} from 'lucide-react';
import { usePaymentModal } from '@/contexts/PaymentModalContext';
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
  preselectedPlanKey = 'pro_monthly',
  isSubmitting = false,
  actionContext = null,
}: TrackerCreatedStageModalProps) {
  const { openPaymentModal } = usePaymentModal();
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

  const handleUpgrade = () => {
    openPaymentModal({
      preselectedPlanKey,
      triggerContext: 'tracker-created-stage',
      returnUrl: typeof window !== 'undefined' ? window.location.href : undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 18 }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className="relative w-full max-w-4xl rounded-[28px] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.18)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-5 right-5 z-20 p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="grid gap-6 p-8 md:grid-cols-[1.15fr_0.85fr] md:p-10">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <FilePlus2 className="w-7 h-7" />
                </div>
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-small font-semibold text-emerald-700">
                  Heads up!
                </span>
              </div>

              <div className="space-y-3">
                <h2 className="text-h1 font-bold tracking-tight text-slate-950">
                  Moving to Created Stage
                </h2>
                <p className="text-h3 leading-8 text-slate-600 max-w-2xl">
                  We&apos;ll automatically create a CV and cover letter as soon as this job is moved to the <span className="font-semibold text-emerald-600">Created</span> stage.
                </p>
                {(jobTitle || company) && (
                  <p className="text-small text-slate-500">
                    {jobTitle || 'This role'}{company ? ` at ${company}` : ''}
                  </p>
                )}
                {actionContext && (
                  <p className="text-small uppercase tracking-[0.16em] text-slate-400">
                    Stage context: {actionContext.stage} {actionContext.entitlement.mode ? `• ${actionContext.entitlement.mode} path` : ''}
                  </p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-5">
                  <h3 className="flex items-center gap-2 text-h3 font-semibold text-slate-900 mb-3">
                    <Crown className="w-5 h-5 text-emerald-600" />
                    {fallbackTitle}
                  </h3>
                  <p className="text-small leading-7 text-slate-600 mb-4">
                    {fallbackSummary}
                  </p>
                  <div className="space-y-3 text-small text-slate-600">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                      <span>CV will be created as a non-tailored copy of your Master CV.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                      <span>Cover letter will be created as a basic draft with header only.</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
                  <h3 className="flex items-center gap-2 text-h3 font-semibold text-slate-900 mb-3">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                    Upgrade for Tailored Documents
                  </h3>
                  <div className="space-y-3 text-small text-slate-600 mb-5">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />
                      <span>CV tailored to this job description</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />
                      <span>Custom, personalized cover letters</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />
                      <span>Better ATS alignment for each application</span>
                    </div>
                  </div>
                  <button
                    onClick={handleUpgrade}
                    className="w-full rounded-xl bg-[#80FF00] px-4 py-3 font-semibold text-slate-950 shadow-sm transition hover:brightness-95"
                  >
                    Upgrade Now
                    <span className="block text-small font-medium text-slate-700">Unlock tailored documents</span>
                  </button>
                </div>
              </div>

              {allowance && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="text-h3 font-semibold text-slate-900">Your Free Allowance</h4>
                    <Info className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-small font-medium text-slate-700">Tailored generations this cycle</p>
                      <p className="text-small text-emerald-600 font-semibold">{allowance.used} / {allowance.limit} used</p>
                    </div>
                    <div className="text-right">
                      <p className="text-small uppercase tracking-[0.18em] text-slate-400">Remaining</p>
                      <p className="text-h3 font-bold text-slate-900">{allowance.remaining}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col justify-between gap-6">
              <div className="min-h-[220px] rounded-[28px] bg-[radial-gradient(circle_at_top_right,_rgba(134,239,172,0.28),_transparent_42%),linear-gradient(180deg,_#ffffff,_#f7fbf4)] border border-emerald-100 relative overflow-hidden">
                <div className="absolute left-10 top-10 rotate-[-10deg] rounded-3xl bg-white px-8 py-8 shadow-[0_16px_36px_rgba(15,23,42,0.12)] border border-slate-100">
                  <p className="text-h2 font-bold text-slate-900 mb-4">CV</p>
                  <div className="space-y-3">
                    <div className="h-3 w-24 rounded-full bg-slate-200" />
                    <div className="h-3 w-28 rounded-full bg-slate-200" />
                    <div className="h-3 w-20 rounded-full bg-slate-200" />
                    <div className="h-3 w-24 rounded-full bg-emerald-200" />
                  </div>
                </div>
                <div className="absolute right-8 bottom-8 rotate-[12deg] rounded-3xl bg-white px-7 py-7 shadow-[0_16px_36px_rgba(15,23,42,0.12)] border border-slate-100">
                  <p className="text-h3 font-bold text-slate-900 mb-4">Cover Letter</p>
                  <div className="space-y-3">
                    <div className="h-3 w-24 rounded-full bg-slate-200" />
                    <div className="h-3 w-20 rounded-full bg-slate-200" />
                    <div className="h-3 w-16 rounded-full bg-emerald-200" />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dontShowAgainToday}
                    onChange={(e) => setDontShowAgainToday(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <p className="text-small font-medium text-slate-900">Don’t show this again today</p>
                    <p className="text-small text-slate-500">We’ll continue creating fallback documents directly for the rest of today.</p>
                  </div>
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={handleConfirm}
                    disabled={isSubmitting}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 font-semibold transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    Create Anyway
                    <span className="block text-small font-medium text-slate-500">Use fallback documents</span>
                  </button>
                  <button
                    onClick={handleUpgrade}
                    className="rounded-xl bg-[#80FF00] px-4 py-3 text-slate-950 font-semibold transition hover:brightness-95"
                  >
                    Upgrade Now
                    <span className="block text-small font-medium text-slate-700">Get tailored documents</span>
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-start gap-3 text-small text-slate-500">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Free access includes a non-tailored CV from your Master CV and a basic cover letter draft with header only.</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
