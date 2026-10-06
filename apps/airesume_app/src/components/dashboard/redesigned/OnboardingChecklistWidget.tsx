'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  X,
  ArrowRight,
  FileText,
  User,
  Briefcase,
  Wrench,
  GraduationCap,
  Target,
  Loader2,
} from 'lucide-react';
import { useDashboardData } from '@/contexts/DashboardDataContext';
import { authenticatedFetch } from '@/lib/utils/apiUtils';
import { getCvScoreForDisplay } from '@/lib/utils/cv-scoring';

/**
 * Good-enough master CV score. Once the primary/master/profile CV reaches this
 * score, the checklist is considered complete and never shows again.
 */
const GOOD_SCORE_THRESHOLD = 70;

function cvId(cv: any): string {
  return String(cv?.id || cv?._id || '');
}

function findMasterCv(cvs: any[]): any | null {
  return (
    cvs.find((cv: any) => cv.metadata?.isMaster || cv.isMaster || cv.cvType === 'master') ||
    cvs[0] ||
    null
  );
}

interface ChecklistStep {
  key: string;
  label: string;
  hint: string;
  done: boolean;
  cta: { label: string; url: string } | null;
  Icon: React.ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;
}

/**
 * OnboardingChecklistWidget — journey CV onboarding checklist shown on the
 * dashboard. Tied to the master CV:
 *
 * - steps reflect real master CV data (name/role, experience, skills, education)
 * - once the master CV score is good enough (>= 70) it permanently dismisses
 *   itself (persisted server-side) and never shows again
 * - a manual dismiss is also persisted server-side
 */
export default function OnboardingChecklistWidget() {
  const router = useRouter();
  const { cvs } = useDashboardData();
  const [dismissed, setDismissed] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [statusLoaded, setStatusLoaded] = useState(false);

  // Load persisted dismissal state + link the master CV as the primary CV if needed
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authenticatedFetch('/api/user/onboarding');
        const json = await res.json();
        if (cancelled || !json.success) return;
        const onboarding = json.data?.onboarding || {};
        if (onboarding.cv_checklist_dismissed) {
          setDismissed(true);
        }
        // Robust linking: if a master CV exists but is not yet recorded as the
        // user's primary CV, persist the link so the checklist stays anchored.
        const master = findMasterCv(cvs);
        const masterId = master ? cvId(master) : '';
        const primaryId = String(onboarding.primary_cv_id || '');
        if (masterId && primaryId !== masterId && /^[0-9a-fA-F]{24}$/.test(masterId)) {
          authenticatedFetch('/api/user/onboarding', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ onboarding: { primary_cv_id: masterId } }),
          }).catch(() => {});
        }
      } catch {
        // Non-fatal: widget just shows until a good score is reached
      }
      if (!cancelled) setStatusLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [cvs]);

  const masterCv = useMemo(() => findMasterCv(cvs), [cvs]);
  const score = masterCv ? Math.round(getCvScoreForDisplay(masterCv) || 0) : 0;
  const scoreReached = !!masterCv && score >= GOOD_SCORE_THRESHOLD;

  const persistDismiss = useCallback(async (reason: 'score' | 'manual') => {
    try {
      await authenticatedFetch('/api/user/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onboarding: { cv_checklist_dismissed: true, cv_checklist_dismiss_reason: reason },
        }),
      });
    } catch {
      // Non-fatal
    }
  }, []);

  // Never show again once the master CV has a good enough score
  useEffect(() => {
    if (!statusLoaded) return;
    if (dismissed) return;
    if (scoreReached) {
      persistDismiss('score').finally(() => setDismissed(true));
    }
  }, [statusLoaded, dismissed, scoreReached, persistDismiss]);

  const handleManualDismiss = useCallback(() => {
    if (dismissing) return;
    setDismissing(true);
    persistDismiss('manual').finally(() => {
      setDismissed(true);
      setDismissing(false);
    });
  }, [dismissing, persistDismiss]);

  const steps: ChecklistStep[] = useMemo(() => {
    const cvData = masterCv?.cvData || {};
    const basics = cvData.basics || {};
    const work = cvData.work || cvData.experience || [];
    const skills = cvData.skills || [];
    const education = cvData.education || [];

    const hasName = !!(basics.name || basics.fullName || cvData.personalInfo?.fullName);
    const hasRole = !!(basics.label || cvData.personalInfo?.jobTitle || masterCv?.title);
    const hasWork = Array.isArray(work) && work.some((w: any) => w && (w.company || w.position || w.name));
    const hasSkills = Array.isArray(skills) && skills.length > 0;
    const hasEducation = Array.isArray(education) && education.length > 0;

    return [
      {
        key: 'master-cv',
        label: 'Create your Master CV',
        hint: masterCv ? 'Your primary career document is ready.' : 'Start with a single source of truth for your career.',
        done: !!masterCv,
        cta: masterCv ? null : { label: 'Create Master CV', url: '/editor?mode=create&master=true' },
        Icon: FileText,
      },
      {
        key: 'profile',
        label: 'Add your name & target role',
        hint: 'Recruiters and ATS systems match on your headline.',
        done: hasName && hasRole,
        cta: { label: 'Edit profile', url: masterCv ? `/editor?mode=edit-master&cvId=${cvId(masterCv)}` : '/editor?mode=create&master=true' },
        Icon: User,
      },
      {
        key: 'experience',
        label: 'Add work experience',
        hint: 'Include companies, roles and measurable achievements.',
        done: hasWork,
        cta: { label: 'Add experience', url: masterCv ? `/editor?mode=edit-master&cvId=${cvId(masterCv)}` : '/editor?mode=create&master=true' },
        Icon: Briefcase,
      },
      {
        key: 'skills',
        label: 'Add your skills',
        hint: 'Skills drive keyword matches against job descriptions.',
        done: hasSkills,
        cta: { label: 'Add skills', url: masterCv ? `/editor?mode=edit-master&cvId=${cvId(masterCv)}` : '/editor?mode=create&master=true' },
        Icon: Wrench,
      },
      {
        key: 'education',
        label: 'Add education',
        hint: 'Degrees, certifications and courses.',
        done: hasEducation,
        cta: { label: 'Add education', url: masterCv ? `/editor?mode=edit-master&cvId=${cvId(masterCv)}` : '/editor?mode=create&master=true' },
        Icon: GraduationCap,
      },
      {
        key: 'score',
        label: `Reach a strong score (${GOOD_SCORE_THRESHOLD}%+)`,
        hint: masterCv ? `Current master CV score: ${score}%.` : 'A strong master CV unlocks matching and tailoring.',
        done: scoreReached,
        cta: scoreReached ? null : { label: 'Boost score', url: masterCv ? `/editor?mode=edit-master&cvId=${cvId(masterCv)}&improve=true` : '/editor?mode=create&master=true' },
        Icon: Target,
      },
    ];
  }, [masterCv, score, scoreReached]);

  if (!statusLoaded) return null;
  if (dismissed) return null;

  const completed = steps.filter((s) => s.done).length;
  const nextStep = steps.find((s) => !s.done) || null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-sky-200/80 dark:border-sky-400/15 shadow-xs bg-[linear-gradient(120deg,#f2f8fe_0%,#e3effd_40%,#cfe6fc_72%,#bcddff_100%)] dark:bg-[linear-gradient(120deg,#0a1b30_0%,#0d2440_55%,#10305a_100%)]">
      {/* Soft glow accents behind the content */}
      <div className="pointer-events-none absolute -top-24 -left-16 h-60 w-60 rounded-full bg-sky-300/25 dark:bg-sky-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-[28%] h-60 w-60 rounded-full bg-blue-300/25 dark:bg-blue-400/10 blur-3xl" />

      {/* Illustration — positioned on the right and masked gracefully */}
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden sm:block w-[150px] md:w-[210px] lg:w-[270px] xl:w-[320px] select-none">
        <img
          src="/images/onboarding/welcome-hands.png"
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover object-center opacity-90 dark:opacity-75 [mask-image:linear-gradient(to_left,rgba(0,0,0,0.95)_15%,rgba(0,0,0,0.6)_45%,transparent_95%)]"
        />
      </div>

      <div className="relative z-10 p-4 sm:p-5 sm:pr-[160px] md:pr-[220px] lg:pr-[280px] xl:pr-[330px]">
        {/* Dismiss — absolute top-right */}
        <button
          onClick={handleManualDismiss}
          disabled={dismissing}
          aria-label="Dismiss onboarding checklist"
          title="Dismiss"
          className="absolute top-3 right-3 z-20 w-6 h-6 inline-flex items-center justify-center rounded-full bg-white/60 dark:bg-white/10 text-sky-900/80 dark:text-white/70 hover:text-sky-950 dark:hover:text-white hover:bg-white dark:hover:bg-white/20 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {dismissing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
        </button>

        {/* Boost score — absolute bottom-right */}
        {!scoreReached && (
          <button
            onClick={() => router.push(masterCv ? `/editor?mode=edit-master&cvId=${cvId(masterCv)}&improve=true` : '/editor?mode=create&master=true')}
            className="absolute bottom-3 right-3 z-20 inline-flex items-center gap-2 rounded-xl bg-[#1b66c9] hover:bg-[#1556ad] text-white text-sm font-bold px-5 py-2.5 shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            Boost score
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {/* Title + Profile Score inline */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <h3 className="text-base sm:text-lg font-bold tracking-tight text-[#0b2c4a] dark:text-white">
            Welcome to AIResume.
          </h3>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 rounded-full bg-white/80 dark:bg-white/10 border border-white/80 dark:border-white/10 px-2.5 py-0.5 text-[11px] font-bold text-sky-700 dark:text-sky-300 shadow-2xs">
              <Target className="w-3 h-3 text-sky-600 dark:text-sky-300" />
              <span>Profile Score</span>
            </div>
            <div className="flex items-center gap-2 w-28 sm:w-36">
              <div className="flex-1 h-1.5 bg-white/80 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 dark:bg-sky-400 rounded-full transition-all duration-500"
                  style={{ width: `${score}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-sky-800/80 dark:text-sky-300 tabular-nums">
                {score}%
              </span>
            </div>
          </div>
        </div>

        {/* Subtitle + CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <p className="text-xs text-[#1d4a72] dark:text-sky-200/90 leading-snug">
            Set up your Profile to unlock AI job matching, tailored resumes, and automated applications.
          </p>

          {nextStep?.cta && nextStep.key !== 'score' && (
            <button
              onClick={() => router.push(nextStep.cta!.url)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1b66c9] hover:bg-[#1556ad] text-white text-xs font-bold px-3.5 py-1.5 shadow-xs transition-all active:scale-[0.98] cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <span>{nextStep.done ? 'Fill profile' : nextStep.cta.label}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Compact Steps Grid — 1 col on mobile, 2 cols on tablet, 3 cols on desktop/large screens */}
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
          {steps.filter(s => s.key !== 'score').map((step) => {
            const StepIcon = step.Icon;
            return (
              <li
                key={step.key}
                className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 transition-colors ${
                  step.done
                    ? 'bg-white/40 dark:bg-white/5 border-white/50 dark:border-white/10'
                    : 'bg-white/80 dark:bg-white/10 border-white/90 dark:border-white/15 shadow-2xs'
                }`}
              >
                <div className="shrink-0">
                  {step.done ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  ) : (
                    <StepIcon className="w-3.5 h-3.5 text-sky-500/80 dark:text-sky-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
                  <span
                    className={`text-[11px] font-semibold truncate ${
                      step.done
                        ? 'text-[#2f6085]/70 dark:text-sky-300/60 line-through decoration-sky-300/60'
                        : 'text-[#0b2c4a] dark:text-sky-100'
                    }`}
                  >
                    {step.label}
                  </span>
                  {!step.done && step.cta && (
                    <button
                      onClick={() => router.push(step.cta!.url)}
                      className="shrink-0 text-[10px] font-bold text-sky-700 dark:text-sky-300 hover:text-sky-950 dark:hover:text-white transition-colors cursor-pointer flex items-center"
                      title={step.cta.label}
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}