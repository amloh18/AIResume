'use client';

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { getCvScoreForDisplay, calculateCVScore } from '@/lib/utils/cv-scoring';
import JobsListView from '@/components/dashboard/jobs/JobsListView';
import { CVJourney } from '@/types/cv';
import {
  FileText,
  Briefcase,
  Send,
  CalendarCheck2,
  Target,
  Plus,
  Eye,
  Pencil,
  MoreHorizontal,
  Trash2,
  Loader2,
  ArrowUpRight,
  ArrowRight,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  BarChart3,
  Zap,
  Award,
  Layers,
  Flame,
  AlertTriangle,
  Mail,
} from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboardData } from '@/contexts/DashboardDataContext';
import { useToast } from '@/hooks/use-toast';
import UpgradeSuggestionCard from '@/components/dashboard/redesigned/UpgradeSuggestionCard';
import TopJobMatchesSection from '@/components/dashboard/redesigned/TopJobMatchesSection';
import NeedsAttentionWidget from '@/components/dashboard/redesigned/NeedsAttentionWidget';
import OnboardingChecklistWidget from '@/components/dashboard/redesigned/OnboardingChecklistWidget';
import { useJobLiveStatusStore } from '@/lib/stores/jobLiveStatusStore';
import { JobLiveStatusCard } from '@/components/jobs/JobLiveStatusCard';
import ProfileAnalyticsSidebar from '@/components/dashboard/redesigned/ProfileAnalyticsSidebar';
import CompanyLogo from '@/components/ui/CompanyLogo';
import DocumentPreviewSidebar from '@/components/dashboard/jobs/DocumentPreviewSidebar';
import JobSidebar from '@/components/dashboard/jobs/JobSidebar';
import { Skeleton } from '@/components/ui/Skeleton';
import { authenticatedFetch } from '@/lib/utils/apiUtils';
import { useEntitlements } from '@/lib/hooks/useEntitlements';
import {
  isJourneyCv,
  isJourneyCoverLetter,
  isMasterCv,
  isUserOwnedCv,
  isUserOwnedCoverLetter,
  sortCoverLettersForDisplay,
  sortCvsForDisplay,
} from '@/lib/utils/document-kind';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs === 1 ? '1 hour ago' : `${hrs} hours ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${days >= 14 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
  return `${Math.floor(months / 12)} year${months >= 24 ? 's' : ''} ago`;
}

function greetingForHour(hour: number): string {
  if (hour < 5) return 'Good evening';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function cvId(cv: any): string {
  return String(cv?.id || cv?._id || '');
}

function cvAtsScore(cv: any): number {
  return Math.round(getCvScoreForDisplay(cv) || 0);
}

function clId(coverLetter: any): string {
  return String(coverLetter?.id || coverLetter?._id || '');
}

/**
 * Cover letters carry a persisted ATS score, but it is not always under the same
 * key depending on which path produced the document. Falls back to the seeded
 * score so a generated letter does not display as unmeasured.
 */
function clAtsScore(coverLetter: any): number {
  const raw =
    coverLetter?.metadata?.atsScore ??
    coverLetter?.metadata?.seededAtsScore ??
    coverLetter?.atsScore ??
    0;
  const score = Number(raw);
  return Number.isFinite(score) ? Math.round(score) : 0;
}

function findLinkedCvForJob(job: any, cvList: any[]): any | null {
  if (!job || !cvList || cvList.length === 0) return null;
  const jobId = String(job.id || job._id || '');
  const linkedId = String(job.linkedCvId || job.linkedCv?._id || job.cvId || '');

  // 1. Direct ID link on Job
  if (linkedId) {
    const directCv = cvList.find((cv) => cvId(cv) === linkedId);
    if (directCv) return directCv;
  }

  // 2. Direct Job ID link on CV
  if (jobId) {
    const cvByJobId = cvList.find(
      (cv) =>
        String(cv.jobId || cv.targetJobId || cv.jobApplicationId || cv.metadata?.jobId || cv.metadata?.jobApplicationId || '') === jobId
    );
    if (cvByJobId) return cvByJobId;
  }

  // 3. Match by CV title / company / role patterns
  const jobTitleClean = (job.jobTitle || job.title || '').trim().toLowerCase();
  const companyClean = (job.company || '').trim().toLowerCase();

  if (jobTitleClean || companyClean) {
    const matchedCv = cvList.find((cv: any) => {
      const cvTitle = (cv.title || cv.name || '').trim().toLowerCase();
      const cvRole = (cv.role || cv.targetRole || cv.metadata?.targetRole || '').trim().toLowerCase();

      // Case: "Monzo_Chief of Staff, Group CFO | CV" matching Monzo & Chief of Staff
      if (companyClean && cvTitle.includes(companyClean)) {
        if (jobTitleClean) {
          const parts = jobTitleClean.split(/[\s,]+/);
          if (parts.some((p: string) => p.length > 2 && cvTitle.includes(p))) return true;
        }
        return true;
      }

      if (jobTitleClean && (cvTitle.includes(jobTitleClean) || (cvRole && cvRole.includes(jobTitleClean)))) {
        return true;
      }

      return false;
    });

    if (matchedCv) return matchedCv;
  }

  return null;
}

function jobLinkedCvId(job: any, cvList?: any[]): string {
  const directId = String(job?.linkedCvId || job?.linkedCv?._id || job?.cvId || '');
  if (directId) return directId;
  if (cvList && cvList.length > 0) {
    const linked = findLinkedCvForJob(job, cvList);
    if (linked) return cvId(linked);
  }
  return '';
}

/* Status → soft badge styling (extremely restrained, per spec) */
const STATUS_META: Record<string, { label: string; cls: string }> = {
  interview: {
    label: 'Interview',
    cls: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  },
  applied: {
    label: 'Applied',
    cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  },
  screening: {
    label: 'Screening',
    cls: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',
  },
  assessment: {
    label: 'Assessment',
    cls: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',
  },
  phone_screen: {
    label: 'Phone Screen',
    cls: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',
  },
  technical_test: {
    label: 'Technical Test',
    cls: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',
  },
  offer: {
    label: 'Offer',
    cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  },
  accepted: {
    label: 'Accepted',
    cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  },
  saved: {
    label: 'Saved',
    cls: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
  },
  created: {
    label: 'Saved',
    cls: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
  },
  draft: {
    label: 'Draft',
    cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  },
  rejected: {
    label: 'Rejected',
    cls: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
  },
};

function statusMeta(status?: string) {
  return STATUS_META[status || ''] || { label: status || '—', cls: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300' };
}

/* ------------------------------------------------------------------ */
/* Shared surface primitives                                           */
/* ------------------------------------------------------------------ */

function Panel({
  title,
  subtitle,
  count,
  actions,
  children,
  className = '',
  noPadding = false,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <section
      className={`bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl shadow-sm overflow-hidden ${className}`}
    >
      <header className="px-5 pt-4 pb-3 flex items-start justify-between gap-4 border-b border-[var(--border-primary)]">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="dashboard-panel-title text-[var(--text-primary)]">{title}</h2>
            {typeof count === 'number' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 tabular-nums">
                {count}
              </span>
            )}
          </div>
          {subtitle && <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
      </header>
      <div className={noPadding ? 'w-full' : 'p-5'}>{children}</div>
    </section>
  );
}

function GhostButton({
  children,
  onClick,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer ${className}`}
    >
      {children}
    </button>
  );
}

function GreenLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 px-2 py-0.5 text-xs font-medium whitespace-nowrap">
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* KPI strip                                                           */
/* ------------------------------------------------------------------ */

function computeKpiStats(cvs: any[], jobs: any[], goals: any, coverLetters: any[] = []) {
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  const cvsThisWeek = cvs.filter((cv: any) => {
    const t = new Date(cv.createdAt || cv.updatedAt).getTime();
    return !isNaN(t) && now - t < weekMs;
  }).length;

  const jobsThisWeek = jobs.filter((j: any) => {
    const t = new Date(j.createdAt || j.updatedAt).getTime();
    return !isNaN(t) && now - t < weekMs;
  }).length;

  const applications = jobs.filter((j: any) =>
    ['applied', 'screening', 'assessment', 'phone_screen', 'technical_test', 'interview', 'offer', 'accepted'].includes(j.status)
  ).length;

  // Applications submitted this week = jobs that reached an applied-like
  // status recently. Prefer the appliedAt timestamp recorded on the first
  // real status transition; fall back to updatedAt for legacy jobs. This
  // doesn't duplicate Active Jobs' "jobs added this week" (created jobs).
  const applicationsThisWeek = jobs.filter((j: any) => {
    const t = new Date(j.appliedAt || j.updatedAt || j.createdAt).getTime();
    return (
      ['applied', 'screening', 'assessment', 'phone_screen', 'technical_test', 'interview', 'offer', 'accepted'].includes(j.status) &&
      !isNaN(t) && now - t < weekMs
    );
  }).length;

  const interviews = jobs.filter((j: any) =>
    ['interview', 'offer', 'accepted'].includes(j.status)
  ).length;

  const interviewsThisWeek = jobs.filter((j: any) => {
    const t = new Date(j.updatedAt || j.createdAt).getTime();
    return (
      ['interview', 'offer', 'accepted'].includes(j.status) &&
      !isNaN(t) && now - t < weekMs
    );
  }).length;

  const scored = jobs.filter((j: any) => (j.atsScore || 0) > 0);
  const avgMatch = scored.length
    ? Math.round(scored.reduce((acc: number, j: any) => acc + (j.atsScore || 0), 0) / scored.length)
    : 0;
  const strongMatches = scored.filter((j: any) => (j.atsScore || 0) >= 70).length;

  // Calculate automated AI Journey applications / generated documents
  const journeyApplicationIds = new Set<string>();

  // Jobs that have linked journey CV, cover letter, or automated flag
  jobs.forEach((j: any) => {
    const jId = String(j.id || j._id || '');
    if (j.journeyId || j.isAutomated || j.autoApplied || j.linkedCvId || j.cvId || j.coverLetterId) {
      if (jId) journeyApplicationIds.add(jId);
    }
  });

  // Journey CVs — classified by the shared helper so this count cannot drift
  // from what the CV table and the documents page consider a journey document.
  cvs.forEach((c: any) => {
    if (isJourneyCv(c)) {
      const key = c.journeyId || c.jobId || c.targetJobId || c.metadata?.jobId || c.id || c._id;
      if (key) journeyApplicationIds.add(String(key));
    }
  });

  // Journey / AI Tailored Cover Letters
  coverLetters.forEach((cl: any) => {
    if (isJourneyCoverLetter(cl)) {
      const key = cl.journeyId || cl.jobId || cl.jobApplicationId || cl.metadata?.jobId || cl.id || cl._id;
      if (key) journeyApplicationIds.add(String(key));
    }
  });

  const aiJourneyUsage = journeyApplicationIds.size;

  // Count fresh jobs (posted in last 24 hours)
  const freshJobsToday = jobs.filter((j: any) => {
    const posted = new Date(j.postedAt || j.createdAt || j.updatedAt).getTime();
    return !isNaN(posted) && now - posted < 24 * 60 * 60 * 1000;
  }).length;

  // Count jobs needing user attention (needs_user_action, failed, etc.)
  const needsAttention = jobs.filter((j: any) =>
    j.status === 'needs_input' || 
    j.automationStatus === 'needs_user_action' ||
    j.automationStatus === 'failed' ||
    j.skipReason
  ).length;

  return {
    cvs: cvs.length,
    cvsThisWeek,
    activeJobs: jobs.length,
    jobsThisWeek,
    applications,
    applicationsThisWeek,
    interviews,
    interviewsThisWeek,
    avgMatch,
    strongMatches,
    aiJourneyUsage,
    cvsCreatedThisMonth: goals?.cvsCreatedThisMonth,
    freshJobsToday,
    needsAttention,
  };
}

function KpiStrip() {
  const { cvs, coverLetters, jobs, goals, criticalLoading, secondaryLoading } = useDashboardData();
  const { plan, loading: membershipLoading } = useEntitlements();
  const stats = computeKpiStats(cvs, jobs, goals, coverLetters);
  const kpisLoading = criticalLoading || membershipLoading || secondaryLoading.streak || secondaryLoading.goals || secondaryLoading.cvs || secondaryLoading.jobs;

  const isFreePlan = plan === 'free';
  const limit = isFreePlan ? 3 : 10;
  const remaining = Math.max(0, limit - stats.aiJourneyUsage);

  const usageMetric = isFreePlan
    ? {
        label: 'Usage',
        value: `${stats.aiJourneyUsage} / ${limit}`,
        icon: <Zap size={16} strokeWidth={1.75} />,
        trend: `${remaining} left`,
        trendUp: stats.aiJourneyUsage < limit,
      }
    : {
        label: 'Usage',
        value: 'Unlimited',
        icon: <Zap size={16} strokeWidth={1.75} />,
        trend: `${stats.aiJourneyUsage} generated`,
        trendUp: true,
      };

  const metrics: Array<{
    label: string;
    value: string;
    icon: React.ReactNode;
    trend: string;
    trendUp: boolean;
    trendIcon?: React.ReactNode;
    trendExtra?: string;
  }> = [
    {
      label: 'Auto Usage',
      value: String(stats.aiJourneyUsage),
      icon: <Zap size={16} strokeWidth={1.75} />,
      trend: stats.cvsThisWeek > 0 ? `↑ ${stats.cvsThisWeek} this week` : 'Documents generated',
      trendUp: stats.cvsThisWeek > 0,
    },
    {
      label: 'Active Jobs',
      value: String(stats.activeJobs),
      icon: <Briefcase size={16} strokeWidth={1.75} />,
      trend: stats.jobsThisWeek > 0 ? `↑ ${stats.jobsThisWeek} this week` : 'Steady',
      trendUp: stats.jobsThisWeek > 0,
      trendIcon: stats.freshJobsToday > 0 ? <Flame size={10} className="text-orange-500" /> : undefined,
      trendExtra: stats.freshJobsToday > 0 ? `${stats.freshJobsToday} fresh today` : undefined,
    },
    {
      label: 'Applications',
      value: String(stats.applications),
      icon: <Send size={16} strokeWidth={1.75} />,
      trend: stats.applicationsThisWeek > 0 ? `↑ ${stats.applicationsThisWeek} this week` : 'No new this week',
      trendUp: stats.applicationsThisWeek > 0,
      trendIcon: stats.needsAttention > 0 ? <AlertTriangle size={10} className="text-amber-500" /> : undefined,
      trendExtra: stats.needsAttention > 0 ? `${stats.needsAttention} awaiting input` : undefined,
    },
    {
      label: 'Interviews',
      value: String(stats.interviews),
      icon: <CalendarCheck2 size={16} strokeWidth={1.75} />,
      trend: stats.interviewsThisWeek > 0 ? `↑ ${stats.interviewsThisWeek} this week` : 'None yet',
      trendUp: stats.interviewsThisWeek > 0,
    },
    {
      label: 'Avg ATS Score',
      value: stats.avgMatch > 0 ? `${stats.avgMatch}%` : '—',
      icon: <Target size={16} strokeWidth={1.75} />,
      trend: stats.strongMatches > 0 ? `${stats.strongMatches} documents ≥ 70%` : 'No documents scored',
      trendUp: stats.strongMatches > 0,
    },
    usageMetric,
  ];

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl shadow-sm grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-y md:divide-y-0 divide-[var(--border-primary)]">
      {metrics.map((m) => (
        <div key={m.label} className="px-5 py-4 flex items-center gap-3.5 min-w-0">
          <div className="w-9 h-9 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] flex items-center justify-center shrink-0">
            {m.icon}
          </div>
          <div className="min-w-0">
            {kpisLoading ? (
              <>
                <Skeleton className="h-6 w-10" />
                <div className="mt-1.5 text-xs text-[var(--text-secondary)]">{m.label}</div>
                <Skeleton className="mt-1.5 h-3 w-16" />
              </>
            ) : (
              <>
                <div className="text-xl font-semibold tracking-tight text-[var(--text-primary)] leading-none tabular-nums block">
                  {m.value}
                </div>
                <div className="mt-1 text-xs text-[var(--text-secondary)]">{m.label}</div>
                <div className={`mt-0.5 text-[11px] font-medium ${m.trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-tertiary)]'}`}>
                  {m.trendIcon && <span className="inline-flex items-center gap-0.5">{m.trendIcon}</span>}
                  {m.trend}
                  {m.trendExtra && (
                    <span className="text-[var(--text-tertiary)]"> | {m.trendExtra}</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* My CVs table                                                        */
/* ------------------------------------------------------------------ */

function MyCvsPanel() {
  const router = useRouter();
  const { cvs, jobs, secondaryLoading } = useDashboardData();
  const [previewCv, setPreviewCv] = useState<any>(null);

  // Load the full CV (with template) on demand and open the existing preview sidebar
  const openPreview = async (cv: any) => {
    const id = cvId(cv);
    if (!id) return;
    try {
      const res = await authenticatedFetch(`/api/cvs/${id}`);
      const result = await res.json();
      if (result.success && result.data?.cv) {
        setPreviewCv(result.data.cv);
      }
    } catch (err) {
      console.error('Failed to load CV for preview:', err);
    }
  };

  const linkedCounts = useMemo(() => {
    const map = new Map<string, number>();
    jobs.forEach((j: any) => {
      const id = jobLinkedCvId(j, cvs);
      if (id) map.set(id, (map.get(id) || 0) + 1);
    });
    return map;
  }, [jobs, cvs]);

  const sorted = useMemo(
    () =>
      /*
        Journey CVs are excluded: they are generated per job, already surfaced
        in the application tracker, and listing them here made the table look
        like it was full of duplicates of one CV. `sortCvsForDisplay` also pins
        the Profile CV to the top, so the user's canonical CV is always the
        first row regardless of when it was last edited.
      */
      sortCvsForDisplay(cvs.filter(isUserOwnedCv)),
    [cvs]
  );

  const openCv = (cv: any) => router.push(`/editor?mode=edit&cvId=${cvId(cv)}`);

  return (
    <Panel
      title="My CVs"
      subtitle="Your CVs and their performance overview."
      noPadding
      actions={
        <>
          <button
            onClick={() => router.push('/editor?action=create&tab=cvs')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#013f2e] text-white font-bold px-3.5 py-2 text-xs hover:bg-[#025c43] transition-colors shadow-sm cursor-pointer"
          >
            <Plus size={14} strokeWidth={2} />
            Create CV
          </button>
          <GhostButton onClick={() => router.push('/editor')}>
            <span>View all</span>
            {cvs.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 tabular-nums">
                {cvs.length}
              </span>
            )}
            <ArrowUpRight size={13} />
          </GhostButton>
        </>
      }
    >
      {sorted.length === 0 && secondaryLoading.cvs ? (
        <div className="divide-y divide-gray-100 dark:divide-white/5 p-4" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3.5">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="ml-auto h-8 w-8 rounded-lg" />
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="py-16 px-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-3 text-gray-400">
            <FileText className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
            No CVs yet
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Create your first master CV to start matching and applying to jobs.
          </p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-5">CV Name</th>
                <th className="py-3 px-4 w-[140px]">ATS Score</th>
                <th className="py-3 px-4">Linked Jobs</th>
                <th className="py-3 px-4">Last Updated</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-medium">
              {sorted.slice(0, 10).map((cv: any) => {
                const isMaster = isMasterCv(cv);
                const score = cvAtsScore(cv);
                const linked = linkedCounts.get(cvId(cv)) || 0;
                return (
                  <tr key={cvId(cv) || cv.title} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors cursor-pointer group" onClick={() => openCv(cv)}>
                    <td className="py-3 px-5 max-w-[280px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate font-semibold text-gray-900 dark:text-white text-xs group-hover:text-lime-600 dark:group-hover:text-lime-400 transition-colors" title={cv.title}>
                          {cv.title || 'Untitled CV'}
                        </span>
                        {isMaster && (
                          <span className="shrink-0 inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 px-1.5 py-0.5 text-[10px] font-medium border border-emerald-200 dark:border-emerald-800/40">
                            Default
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {score > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${score >= 70 ? 'bg-lime-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-400'}`} />
                          <span className="font-bold text-gray-900 dark:text-white text-xs tabular-nums">{score}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500 italic">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400 text-xs">
                      {linked > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {linked} {linked === 1 ? 'Job' : 'Jobs'}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500 italic">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                      {timeAgo(cv.updatedAt || cv.createdAt)}
                    </td>
                    <td className="py-3 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openPreview(cv)}
                          aria-label={`Preview ${cv.title}`}
                          title="Preview"
                          className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-lime-600 dark:hover:text-lime-400 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openCv(cv)}
                          aria-label={`Edit ${cv.title}`}
                          title="Edit CV"
                          className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* CV preview sidebar — reuses the existing DocumentPreviewSidebar */}
      <DocumentPreviewSidebar
        isOpen={!!previewCv}
        onClose={() => setPreviewCv(null)}
        documentType="cv"
        documentData={previewCv?.cvData || previewCv}
        documentId={previewCv?._id || previewCv?.id}
        documentTitle={previewCv?.title}
        cvData={previewCv?.cvData}
        template={previewCv?.template || null}
      />
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Cover Letters table                                                 */
/* ------------------------------------------------------------------ */

/**
 * The cover-letter counterpart to the CV table, rendered directly beneath it.
 *
 * Journey cover letters are excluded for the same reason journey CVs are: they
 * are generated per job application, already reachable from the tracker, and
 * listing them here turns the panel into a wall of near-identical documents.
 * What remains is the set of cover letters the user owns.
 */
function CoverLettersPanel() {
  const router = useRouter();
  const { coverLetters, secondaryLoading } = useDashboardData();
  const { toast } = useToast();
  const [previewCl, setPreviewCl] = useState<any>(null);

  const sorted = useMemo(
    () => sortCoverLettersForDisplay(coverLetters.filter(isUserOwnedCoverLetter)),
    [coverLetters]
  );

  const openEditor = (cl: any) => {
    const id = clId(cl);
    router.push(id ? `/editor?mode=edit-cover-letter&coverLetterId=${id}` : '/editor?tab=cover-letter');
  };

  const openPreview = async (cl: any) => {
    const id = clId(cl);
    if (!id) return;
    try {
      const res = await authenticatedFetch(`/api/cover-letters/${id}`);
      const result = await res.json();
      // The route returns `{ success, coverLetter }`, not `data.coverLetter`.
      const letter = result?.coverLetter || result?.data?.coverLetter;
      if (letter) {
        setPreviewCl(letter);
        return;
      }
      /*
        A preview button that silently does nothing is indistinguishable from a
        broken button. Say why instead.
      */
      toast({
        title: 'Could not open preview',
        description:
          result?.error || 'The cover letter could not be loaded. Please try again.',
        variant: 'destructive',
      });
    } catch (err) {
      console.error('Failed to load cover letter for preview:', err);
      toast({
        title: 'Could not open preview',
        description:
          err instanceof Error ? err.message : 'The cover letter could not be loaded. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Panel
      title="My Cover Letters"
      subtitle="Your saved cover letters and their performance overview."
      noPadding
      actions={
        <>
          <button
            onClick={() => router.push('/editor?tab=cover-letter')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#013f2e] text-white font-bold px-3.5 py-2 text-xs hover:bg-[#025c43] transition-colors shadow-sm cursor-pointer"
          >
            <Plus size={14} strokeWidth={2} />
            Create Cover Letter
          </button>
          <GhostButton onClick={() => router.push('/editor?tab=cover-letter')}>
            <span>View all</span>
            {sorted.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 tabular-nums">
                {sorted.length}
              </span>
            )}
            <ArrowUpRight size={13} />
          </GhostButton>
        </>
      }
    >
      {sorted.length === 0 && secondaryLoading.coverLetters ? (
        <div className="divide-y divide-gray-100 dark:divide-white/5 p-4" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3.5">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="ml-auto h-8 w-8 rounded-lg" />
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="py-16 px-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-3 text-gray-400">
            <Mail className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
            No cover letters yet
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Write a cover letter to pair with your CV, or let a job application generate one for you.
          </p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-5">Cover Letter</th>
                <th className="py-3 px-4 w-[140px]">ATS Score</th>
                <th className="py-3 px-4">Target Role</th>
                <th className="py-3 px-4">Last Updated</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-medium">
              {sorted.slice(0, 10).map((cl: any) => {
                const score = clAtsScore(cl);
                const targetPosition = cl.metadata?.targetPosition || '';
                const targetCompany = cl.metadata?.targetCompany || '';
                const targetLabel = [targetPosition, targetCompany].filter(Boolean).join(' · ');

                return (
                  <tr
                    key={clId(cl) || cl.title}
                    className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors cursor-pointer group"
                    onClick={() => openEditor(cl)}
                  >
                    <td className="py-3 px-5 max-w-[280px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                        <span
                          className="truncate font-semibold text-gray-900 dark:text-white text-xs group-hover:text-lime-600 dark:group-hover:text-lime-400 transition-colors"
                          title={cl.title}
                        >
                          {cl.title || 'Untitled Cover Letter'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {score > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${score >= 70 ? 'bg-lime-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-400'}`} />
                          <span className="font-bold text-gray-900 dark:text-white text-xs tabular-nums">{score}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500 italic">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400 text-xs max-w-[200px]">
                      {targetLabel ? (
                        <span className="truncate block" title={targetLabel}>{targetLabel}</span>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500 italic">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                      {timeAgo(cl.updatedAt || cl.createdAt)}
                    </td>
                    <td className="py-3 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openPreview(cl)}
                          aria-label={`Preview ${cl.title}`}
                          title="Preview"
                          className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-lime-600 dark:hover:text-lime-400 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditor(cl)}
                          aria-label={`Edit ${cl.title}`}
                          title="Edit Cover Letter"
                          className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <DocumentPreviewSidebar
        isOpen={!!previewCl}
        onClose={() => setPreviewCl(null)}
        documentType="coverLetter"
        documentData={previewCl}
        documentId={clId(previewCl)}
        documentTitle={previewCl?.title}
      />
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Recent Jobs table                                                   */
/* ------------------------------------------------------------------ */

function RecentJobsPanel() {
  const router = useRouter();
  const { jobs: contextJobs, journeys: contextJourneys, secondaryLoading, refreshJobs, refreshJourneys } = useDashboardData();
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const handleJobUpdate = () => {
      refreshJobs();
      refreshJourneys();
    };
    window.addEventListener('jobUpdated', handleJobUpdate);
    return () => window.removeEventListener('jobUpdated', handleJobUpdate);
  }, [refreshJobs, refreshJourneys]);

  const effectiveJobs = contextJobs;
  const effectiveLoading = secondaryLoading.jobs;

  const sorted = useMemo(
    () =>
      [...effectiveJobs].sort(
        (a: any, b: any) =>
          new Date(b.createdAt || b.updatedAt || 0).getTime() -
          new Date(a.createdAt || a.updatedAt || 0).getTime()
      ),
    [effectiveJobs]
  );

  const getJobJourneys = useCallback(
    (jobId: string): CVJourney[] => {
      const foundInContext = contextJourneys.filter(
        (j) => j.jobId === jobId || (j as any).targetJobId === jobId
      );
      if (foundInContext.length > 0) return foundInContext;

      const job = effectiveJobs.find((j: any) => (j._id?.toString() || j.id?.toString()) === jobId);
      if (job?.journey) {
        return [job.journey as any];
      }
      return [];
    },
    [contextJourneys, effectiveJobs]
  );

  const getJourneyProgress = useCallback((journey: CVJourney): number => {
    if (!journey) return 0;
    if (journey.status === 'completed') return 100;
    const totalSteps = journey.totalSteps || 5;
    const currentStep = journey.currentStep || 1;
    return Math.round(((currentStep - 1) / totalSteps) * 100);
  }, []);

  const getJourneyStatusText = useCallback((jobJourneys: CVJourney[], jobStatus?: string): string => {
    if (jobJourneys && jobJourneys.length > 0) {
      const journey = jobJourneys[0];
      if (journey.status === 'completed') return 'Ready to apply';
      if (journey.status === 'ready') return 'Documents prepared';
      if (journey.status === 'processing_documents') return 'Generating documents...';
      return `Step ${journey.currentStep || 1} of 5`;
    }
    if (jobStatus === 'applied') return 'Applied';
    if (jobStatus === 'created') return 'Ready to apply';
    return 'Saved';
  }, []);

  const handleDeleteJob = async (job: any) => {
    const id = job.id || job._id;
    if (!id) return;
    try {
      const res = await authenticatedFetch(`/api/jobs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await refreshJobs();
        await refreshJourneys();
        toast({
          title: 'Job deleted',
          description: `Removed "${job.jobTitle || 'this job'}"${job.company ? ` at ${job.company}` : ''}.`,
        });
      }
    } catch (err) {
      console.error('Failed to delete job:', err);
    }
  };

  return (
    <Panel
      title="Recent Jobs"
      subtitle="Jobs you're tracking and their current status."
      noPadding
      actions={
        <GhostButton onClick={() => router.push('/dashboard/jobs?tab=applications')}>
          <span>View all</span>
          {effectiveJobs.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 tabular-nums">
              {effectiveJobs.length}
            </span>
          )}
          <ArrowUpRight size={13} />
        </GhostButton>
      }
    >
      <div className="w-full overflow-hidden">
        <JobsListView
          jobs={sorted.slice(0, 10)}
          loading={effectiveLoading}
          onJobClick={(job) => setSelectedJob(job)}
          onEditJob={(job) => router.push(`/dashboard/jobs?tab=applications&jobId=${job.id || job._id}&edit=1`)}
          onDeleteJob={handleDeleteJob}
          getJobJourneys={getJobJourneys}
          getJourneyProgress={getJourneyProgress}
          getJourneyStatusText={getJourneyStatusText}
          borderless
          hideSelection
          hideActions
        />
      </div>

      {/* Slide-in Job Sidebar */}
      {selectedJob && (
        <JobSidebar
          job={selectedJob}
          journeys={getJobJourneys(selectedJob.id || selectedJob._id)}
          onClose={() => setSelectedJob(null)}
          onRefresh={() => {
            refreshJobs();
            refreshJourneys();
          }}
        />
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Continue where you left off                                         */
/* ------------------------------------------------------------------ */

interface ContinueJobCardProps {
  job: any;
  cvs: any[];
  onOpenSidebar: (job: any) => void;
}

function ContinueJobCard({ job, cvs, onOpenSidebar }: ContinueJobCardProps) {
  const router = useRouter();
  const linkedCv = useMemo(() => findLinkedCvForJob(job, cvs), [job, cvs]);
  const linkedCvId = linkedCv ? cvId(linkedCv) : String(job?.linkedCvId || job?.linkedCv?._id || job?.cvId || job?.journey?.cvId || '');
  const hasLinkedCv = !!linkedCv || !!linkedCvId;
  // ATS score must come from an ATS measurement. `job.matchScore` is a job-fit
  // metric and must never be surfaced under an ATS/match label here.
  const linkedCvScore = cvAtsScore(linkedCv);
  const atsScore = typeof job?.atsScore === 'number' ? job.atsScore
    : linkedCvScore > 0 ? linkedCvScore
      : 0;

  const dynamicStep = useMemo(() => {
    if (!job) return null;
    const status = String(job.status || '').toLowerCase();

    // 1. If no CV created/linked yet
    if (!hasLinkedCv) {
      return {
        statusText: 'CV not created yet',
        statusColor: 'text-amber-700 dark:text-amber-400',
        StatusIcon: AlertCircle,
        buttonText: 'Create Tailored CV',
        ButtonIcon: Plus,
        buttonAction: () => {
          const params = new URLSearchParams({
            mode: 'create',
            jobId: String(job.id || job._id || ''),
            jobTitle: job.jobTitle || '',
            company: job.company || '',
          });
          router.push(`/editor?${params.toString()}`);
        },
      };
    }

    // 2. If status is advanced stage (interviewing, applied, etc.)
    if (['applied', 'interviewing', 'interview_scheduled', 'technical_round'].includes(status)) {
      return {
        statusText: 'Applied · Track interview prep',
        statusColor: 'text-blue-700 dark:text-blue-400',
        StatusIcon: Sparkles,
        buttonText: 'Interview Prep',
        ButtonIcon: Sparkles,
        buttonAction: () => onOpenSidebar(job),
      };
    }

    if (['offer', 'offer_received', 'accepted'].includes(status)) {
      return {
        statusText: 'Offer Received · Review terms',
        statusColor: 'text-emerald-700 dark:text-emerald-400',
        StatusIcon: CheckCircle2,
        buttonText: 'Review Offer',
        ButtonIcon: Briefcase,
        buttonAction: () => onOpenSidebar(job),
      };
    }

    // 3. CV is linked: check ATS score
    // 3. CV is linked but nothing has been measured yet — say so honestly.
    if (atsScore <= 0) {
      return {
        statusText: 'CV linked · ATS score not measured yet',
        statusColor: 'text-[var(--text-secondary)]',
        StatusIcon: Target,
        buttonText: 'Measure ATS Score',
        ButtonIcon: Target,
        buttonAction: () => {
          router.push(`/editor?mode=edit&cvId=${linkedCvId}&jobId=${job.id || job._id}`);
        },
      };
    }

    if (atsScore > 0 && atsScore < 70) {
      return {
        statusText: `CV linked · ATS score: ${atsScore}% (Needs boost)`,
        statusColor: 'text-amber-700 dark:text-amber-400',
        StatusIcon: Target,
        buttonText: 'Improve ATS Score',
        ButtonIcon: Target,
        buttonAction: () => {
          router.push(`/editor?mode=edit&cvId=${linkedCvId}&jobId=${job.id || job._id}`);
        },
      };
    }

    if (atsScore >= 70) {
      return {
        statusText: `Strong ATS fit (${atsScore}%) · Ready to apply`,
        statusColor: 'text-emerald-700 dark:text-emerald-400',
        StatusIcon: CheckCircle2,
        buttonText: 'Review & Apply',
        ButtonIcon: ArrowRight,
        buttonAction: () => {
          if (job.applyUrl || job.jobUrl) {
            window.open(job.applyUrl || job.jobUrl, '_blank', 'noopener,noreferrer');
          } else {
            onOpenSidebar(job);
          }
        },
      };
    }

    // 4. Default: CV linked
    return {
      statusText: 'CV linked · Ready to improve ATS',
      statusColor: 'text-emerald-700 dark:text-emerald-400',
      StatusIcon: Sparkles,
      buttonText: 'Improve ATS Score',
      ButtonIcon: Target,
      buttonAction: () => {
        router.push(`/editor?mode=edit&cvId=${linkedCvId}&jobId=${job.id || job._id}`);
      },
    };
  }, [job, hasLinkedCv, linkedCvId, atsScore, router, onOpenSidebar]);

  const jobId = String(job?.id || job?._id || '');
  const liveStatus = useJobLiveStatusStore((state) => (jobId ? state.statuses[jobId] : undefined));
  const { clearStatus } = useJobLiveStatusStore();

  return (
    <div
      onClick={() => onOpenSidebar(job)}
      className="rounded-xl bg-[#faf7ef] dark:bg-white/[0.03] border border-[var(--border-primary)] p-4 flex flex-col justify-between h-full cursor-pointer hover:shadow-md transition-all"
    >
      <div>
        <p className="text-sm font-semibold text-[var(--text-primary)] leading-snug line-clamp-1">
          {job.jobTitle || 'Untitled role'}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--text-secondary)] truncate">
          <CompanyLogo company={job.company} size={14} logoUrl={job.companyLogo} jobId={job.id || job._id} />
          <span className="truncate">
            {job.company || 'Company'} {job.location ? `· ${job.location}` : ''}
          </span>
        </p>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-[var(--text-tertiary)]">
            Added {timeAgo(job.createdAt || job.updatedAt)}
          </span>
          {atsScore > 0 && (
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
              atsScore >= 80 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
              atsScore >= 60 ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' :
              'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
            }`}>
              {atsScore}% match
            </span>
          )}
          {job.freshness?.score >= 80 && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
              <Flame size={9} /> Fresh
            </span>
          )}
          {job.isTargetCompany && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              Target
            </span>
          )}
        </div>

        {liveStatus ? (
          <div className="mt-3">
            <JobLiveStatusCard
              status={liveStatus}
              onClose={() => clearStatus(jobId)}
              inline={true}
              compact={true}
            />
          </div>
        ) : (
          dynamicStep && (
            <div className={`mt-3 flex items-center gap-1.5 text-xs font-medium ${dynamicStep.statusColor}`}>
              <dynamicStep.StatusIcon size={14} />
              <span>{dynamicStep.statusText}</span>
            </div>
          )
        )}
      </div>

      {!liveStatus && (
        <div className="mt-4 flex items-center gap-2 pt-2 border-t border-black/5 dark:border-white/5">
          {dynamicStep && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                dynamicStep.buttonAction();
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#013f2e] text-white font-bold px-3 py-1.5 text-xs hover:bg-[#025c43] transition-colors truncate shadow-sm"
            >
              <dynamicStep.ButtonIcon size={13} />
              <span className="truncate">{dynamicStep.buttonText}</span>
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenSidebar(job);
            }}
            className="inline-flex items-center justify-center gap-1 rounded-lg border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] px-3 py-1.5 text-xs font-medium transition-colors"
          >
            View Job
          </button>
        </div>
      )}
    </div>
  );
}

function ContinuePanel() {
  const { jobs, cvs, secondaryLoading, refreshJobs } = useDashboardData();
  const [selectedSidebarJob, setSelectedSidebarJob] = useState<any | null>(null);
  const [pageIndex, setPageIndex] = useState(0);

  const sortedJobs = useMemo(() => {
    return [...jobs].sort(
      (a: any, b: any) => new Date(b.createdAt || b.updatedAt || 0).getTime() - new Date(a.createdAt || a.updatedAt || 0).getTime()
    );
  }, [jobs]);

  const totalPairs = Math.ceil(sortedJobs.length / 2);
  const safePage = Math.max(0, Math.min(pageIndex, Math.max(0, totalPairs - 1)));
  const currentPair = sortedJobs.slice(safePage * 2, safePage * 2 + 2);

  if (sortedJobs.length === 0 && secondaryLoading.jobs) {
    return (
      <Panel title="Continue where you left off">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-hidden="true">
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
        </div>
      </Panel>
    );
  }

  if (sortedJobs.length === 0) {
    return (
      <Panel title="Continue where you left off">
        <div className="py-8 text-center text-sm text-[var(--text-tertiary)]">
          Add a job to keep your momentum going.
        </div>
      </Panel>
    );
  }

  return (
    <>
      <Panel
        title="Continue where you left off"
        actions={
          totalPairs > 1 ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-[var(--text-tertiary)] tabular-nums mr-1">
                {safePage + 1}/{totalPairs}
              </span>
              <button
                type="button"
                onClick={() => setPageIndex((prev) => Math.max(0, prev - 1))}
                disabled={safePage === 0}
                className="w-5 h-5 rounded flex items-center justify-center text-xs border border-[var(--border-primary)] text-[var(--text-secondary)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)]"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => setPageIndex((prev) => Math.min(totalPairs - 1, prev + 1))}
                disabled={safePage >= totalPairs - 1}
                className="w-5 h-5 rounded flex items-center justify-center text-xs border border-[var(--border-primary)] text-[var(--text-secondary)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)]"
              >
                ›
              </button>
            </div>
          ) : undefined
        }
      >
        <div className={`grid gap-3.5 ${currentPair.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
          {currentPair.map((job) => (
            <ContinueJobCard
              key={job.id || job._id}
              job={job}
              cvs={cvs}
              onOpenSidebar={(j) => setSelectedSidebarJob(j)}
            />
          ))}
        </div>
      </Panel>

      {/* Job sidebar opened right on dashboard */}
      {selectedSidebarJob && (
        <JobSidebar
          job={{
            ...selectedSidebarJob,
            id: selectedSidebarJob.id || selectedSidebarJob._id,
          }}
          journeys={[]}
          onClose={() => setSelectedSidebarJob(null)}
          onRefresh={refreshJobs}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Profile Analytics (Master CV)                                       */
/* ------------------------------------------------------------------ */

function ProfileAnalyticsPanel() {
  const router = useRouter();
  const { cvs, secondaryLoading } = useDashboardData();
  const [profileSidebarCv, setProfileSidebarCv] = useState<any>(null);
  const [selectedId, setSelectedId] = useState<string>('');

  const masterProfile = useMemo(() => {
    if (selectedId) {
      const matched = cvs.find((cv: any) => cvId(cv) === selectedId);
      if (matched) return matched;
    }
    return (
      cvs.find((cv: any) => cv.metadata?.isMaster || cv.isMaster || cv.cvType === 'master') ||
      cvs[0] ||
      null
    );
  }, [cvs, selectedId]);

  // Real, server-persisted score only. Never invent a plausible-looking number —
  // an unmeasured profile must read as "not measured", not as a fake 78.
  const score = masterProfile ? cvAtsScore(masterProfile) : 0;
  const analysis = masterProfile?.metadata?.surgeonAnalysis || masterProfile?.metadata?.aiAnalysis;
  const report = analysis?.scoreReport;

  // Deterministic, locally-computed breakdown straight from the CV content.
  // This is a real measurement from the same engine the server uses, so it is
  // safe to display even before anything has been persisted.
  const cvBreakdown = useMemo(() => {
    const cvData = masterProfile?.cvData;
    if (!cvData) return null;
    try {
      return calculateCVScore(cvData);
    } catch {
      return null;
    }
  }, [masterProfile]);

  const candidateRole = masterProfile?.cvData?.basics?.label || 
                        masterProfile?.cvData?.personalInfo?.jobTitle || 
                        masterProfile?.cvData?.work?.[0]?.position || 
                        masterProfile?.title || 
                        'Career Profile';

  const metrics = useMemo(() => {
    // Every branch below returns a REAL measurement. There is deliberately no
    // fallback that synthesises bars from the headline score or from hardcoded
    // constants — a fabricated breakdown is indistinguishable from a measured
    // one once it is on screen, and that is exactly what we must not ship.
    const norm = (val: number, max: number) => Math.round(Math.min(100, Math.max(0, (val / max) * 100)));

    // Priority 1: the LLM review report, when it exists.
    if (report) {
      return [
        { label: 'Formatting', value: norm(report.formatting ?? 0, 20), source: 'review' as const },
        { label: 'Quantification', value: norm(report.quantification ?? report.keywords ?? 0, 20), source: 'review' as const },
        { label: 'Readability', value: norm(report.readability ?? 0, 20), source: 'review' as const },
        { label: 'Impact Verbs', value: norm(report.impactVerbs ?? 0, 20), source: 'review' as const },
        { label: 'Completeness', value: norm(report.completeness ?? 0, 25), source: 'review' as const },
      ];
    }

    // Priority 2: the deterministic engine's own component scores.
    if (cvBreakdown) {
      return [
        { label: 'Formatting', value: norm(cvBreakdown.formatting, 20), source: 'measured' as const },
        { label: 'Quantification', value: norm(cvBreakdown.quantification, 20), source: 'measured' as const },
        { label: 'Readability', value: norm(cvBreakdown.readability, 20), source: 'measured' as const },
        { label: 'Impact Verbs', value: norm(cvBreakdown.impactVerbs, 20), source: 'measured' as const },
        { label: 'Completeness', value: norm(cvBreakdown.completeness, 25), source: 'measured' as const },
      ];
    }

    // Nothing real to show — render an honest empty state instead of fake bars.
    return null;
  }, [report, cvBreakdown]);

  const radarData = (metrics ?? []).map((m) => ({ subject: m.label, A: m.value, fullMark: 100 }));

  const scoreTone = score <= 0
    ? 'Not measured yet'
    : score >= 85 ? 'High-Impact Profile' : score >= 70 ? 'Competitive Profile' : 'Optimization Recommended';

  const scoreSubLabel = score <= 0
    ? 'Run an analysis to measure'
    : score >= 80 ? 'Application Ready' : 'Optimization Suggested';

  // The panel must not claim verification it has not performed.
  const hasMeasuredScore = score > 0;
  const breakdownIsReview = !!report;

  const metricIcons = [<Layers key="f" size={13} />, <Target key="k" size={13} />, <FileText key="r" size={13} />, <Zap key="i" size={13} />, <Award key="s" size={13} />];

  return (
    <>
      <Panel
        title="Profile Analytics"
        actions={
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#36D39B]/15 text-[#013f2e] dark:text-[#36D39B] border border-[#36D39B]/30">
            Master Profile
          </span>
        }
      >
        {secondaryLoading.cvs && cvs.length === 0 ? (
          <div className="pt-1 space-y-4" aria-hidden="true">
            <div className="flex items-center gap-6">
              <div className="space-y-2">
                <Skeleton className="h-9 w-16" />
                <Skeleton className="h-3.5 w-24" />
              </div>
              <Skeleton className="h-[150px] flex-1 rounded-xl" />
            </div>
            <div className="space-y-2.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-1 flex-1 rounded-full" />
                  <Skeleton className="h-3 w-9" />
                </div>
              ))}
            </div>
          </div>
        ) : !masterProfile ? (
          <div className="py-8 text-center space-y-3">
            <p className="text-sm text-[var(--text-tertiary)]">
              No Profile found. Create or import your master profile to see deep ATS analytics.
            </p>
            <button
              onClick={() => router.push('/welcome')}
              className="px-4 py-2 bg-[#013f2e] hover:bg-[#025c43] text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              Set Up Profile
            </button>
          </div>
        ) : (
          <div className="mt-1 space-y-4">
            {/* Target Role & Profile Badge */}
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-primary)]">
              <div className="min-w-0">
                <h4 className="text-xs font-extrabold text-[var(--text-primary)] truncate">{candidateRole}</h4>
                <p className="text-[10px] text-[var(--text-secondary)] truncate">Primary career asset</p>
              </div>
              {/* Only claim verification when a real score has actually been measured. */}
              {hasMeasuredScore ? (
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
                  {breakdownIsReview ? 'AI Reviewed' : 'ATS Measured'}
                </span>
              ) : (
                <span className="text-[10px] font-bold text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded-md border border-[var(--border-primary)]">
                  Not measured
                </span>
              )}
            </div>

            {/* Score & Radar Visualization */}
            <div className="flex items-center gap-6">
              <div className="shrink-0">
                <div className="text-4xl font-semibold tracking-tight text-[var(--text-primary)] tabular-nums leading-none">
                  {score > 0 ? `${score}%` : '—'}
                </div>
                <div className="mt-2 text-xs font-bold text-[var(--text-primary)]">{scoreTone}</div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  {scoreSubLabel}
                </div>
              </div>

              <div className="flex-1 min-w-0 h-[150px]">
                {metrics ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                      <PolarGrid stroke="var(--border-primary)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-tertiary)', fontSize: 9, fontWeight: 500 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="Profile Health" dataKey="A" stroke="var(--accent-primary)" fill="var(--accent-primary)" fillOpacity={0.14} strokeWidth={1.5} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-center px-4">
                    <p className="text-[11px] text-[var(--text-tertiary)] leading-relaxed">
                      No breakdown available yet. Run an analysis to measure this profile.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Breakdown Progress Bars */}
            {metrics ? (
              <div className="space-y-2.5 pt-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                  {breakdownIsReview ? 'AI Review Breakdown' : 'Measured Breakdown'}
                </div>
                {metrics.map((m, i) => (
                  <div key={m.label} className="flex items-center gap-2.5">
                    <span className="w-4 text-[var(--text-tertiary)] shrink-0">{metricIcons[i]}</span>
                    <span className="w-20 text-xs text-[var(--text-secondary)] shrink-0">{m.label}</span>
                    <div className="flex-1 h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent-primary)] rounded-full"
                        style={{ width: `${Math.min(100, m.value)}%` }}
                      />
                    </div>
                    <span className="w-9 text-right text-xs font-medium text-[var(--text-primary)] tabular-nums shrink-0">
                      {m.value}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="pt-1">
                <button
                  onClick={() => {
                    const id = cvId(masterProfile);
                    if (id) router.push(`/editor?mode=edit-master&cvId=${id}&improve=true`);
                    else router.push('/editor?doc=master-cv&mode=improve');
                  }}
                  className="w-full py-2 px-3 rounded-xl border border-dashed border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] text-xs font-bold text-[var(--text-secondary)] transition-colors"
                >
                  Run an analysis to get your breakdown
                </button>
              </div>
            )}

            {/* CTA to open Profile Analytics Sidebar */}
            <div className="pt-3 border-t border-[var(--border-primary)] text-center flex items-center justify-between gap-2">
              <button
                onClick={() => setProfileSidebarCv(masterProfile)}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-xs font-extrabold text-[var(--text-primary)] flex items-center justify-center gap-1.5 transition-colors"
              >
                View Profile Details <ArrowUpRight size={13} />
              </button>
              <button
                onClick={() => {
                  const id = cvId(masterProfile);
                  if (id) router.push(`/editor?mode=edit-master&cvId=${id}&improve=true`);
                  else router.push('/editor?doc=master-cv&mode=improve');
                }}
                className="py-2 px-3 rounded-xl bg-[#013f2e] hover:bg-[#025c43] text-white text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-sm"
              >
                Edit
              </button>
            </div>
          </div>
        )}
      </Panel>

      {/* Graphical Profile Analytics Sidebar */}
      <ProfileAnalyticsSidebar 
        cv={profileSidebarCv} 
        isOpen={!!profileSidebarCv} 
        onClose={() => setProfileSidebarCv(null)} 
      />
    </>
  );
}


/* ------------------------------------------------------------------ */
/* Root view                                                           */
/* ------------------------------------------------------------------ */

export default function RedesignedDashboardView({ hideGreeting = false }: { hideGreeting?: boolean } = {}) {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(' ')[0] || 'there';

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return `${greetingForHour(h)}, ${firstName}`;
  }, [firstName]);

  return (
    <div className="space-y-6">
      {/* Greeting */}
      {!hideGreeting && (
        <div className="pt-2">
          <h1 className="dashboard-greeting text-[var(--text-primary)]">{greeting}</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Here&apos;s what&apos;s happening with your career.</p>
        </div>
      )}

      {/* Journey CV onboarding checklist — hides permanently once the master CV
          reaches a good enough score */}
      <OnboardingChecklistWidget />

      {/* Compact KPI strip */}
      <KpiStrip />

      {/* Top job matches */}
      <TopJobMatchesSection />

      {/* Mobile-only reorder container: Continue → Profile Analytics → Recent Jobs → My CVs → Cover Letters */}
      <div className="lg:hidden space-y-6">
        <ContinuePanel />
        <ProfileAnalyticsPanel />
        <RecentJobsPanel />
        <MyCvsPanel />
        <CoverLettersPanel />
      </div>

      {/* Desktop two-column workspace */}
      <div className="hidden lg:grid grid-cols-3 gap-6 items-start">
        {/* Left: primary workspace */}
        <div className="col-span-2 space-y-6 min-w-0">
          <RecentJobsPanel />
          <MyCvsPanel />
          <CoverLettersPanel />
        </div>

        {/* Right: contextual rail */}
        <div className="space-y-6 min-w-0">
          <UpgradeSuggestionCard />
          <ContinuePanel />
          <ProfileAnalyticsPanel />
        </div>
      </div>

      {/* Needs attention — items requiring user intervention */}
      <NeedsAttentionWidget limit={3} />
    </div>
  );
}
