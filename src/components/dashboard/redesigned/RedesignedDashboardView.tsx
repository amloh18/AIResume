'use client';

import React, { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { getCvScoreForDisplay } from '@/lib/utils/cv-scoring';
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
import CvReportSidebar from '@/components/dashboard/redesigned/CvReportSidebar';
import CompanyLogo from '@/components/ui/CompanyLogo';
import DocumentPreviewSidebar from '@/components/dashboard/jobs/DocumentPreviewSidebar';
import JobSidebar from '@/components/dashboard/jobs/JobSidebar';
import { Skeleton } from '@/components/ui/Skeleton';
import { authenticatedFetch } from '@/lib/utils/apiUtils';
import { useMembership } from '@/lib/hooks/useMembership';

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
  actions,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl shadow-sm overflow-hidden ${className}`}
    >
      <header className="px-5 pt-4 pb-3 flex items-start justify-between gap-4 border-b border-[var(--border-primary)]">
        <div className="min-w-0">
          <h2 className="dashboard-panel-title text-[var(--text-primary)]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
      </header>
      <div className="p-5">{children}</div>
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
      className={`inline-flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors ${className}`}
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

  // Journey CVs
  cvs.forEach((c: any) => {
    if (c.cvType === 'journey' || c.journeyId || c.isJourney || c.metadata?.journeyId || c.jobId || c.targetJobId) {
      const key = c.journeyId || c.jobId || c.targetJobId || c.metadata?.jobId || c.id || c._id;
      if (key) journeyApplicationIds.add(String(key));
    }
  });

  // Journey / AI Tailored Cover Letters
  coverLetters.forEach((cl: any) => {
    if (cl.journeyId || cl.isJourney || cl.metadata?.journeyId || cl.jobId || cl.jobApplicationId || cl.isTailored) {
      const key = cl.journeyId || cl.jobId || cl.jobApplicationId || cl.metadata?.jobId || cl.id || cl._id;
      if (key) journeyApplicationIds.add(String(key));
    }
  });

  const aiJourneyUsage = journeyApplicationIds.size;

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
  };
}

function KpiStrip() {
  const { cvs, coverLetters, jobs, goals, criticalLoading, secondaryLoading } = useDashboardData();
  const { membership, loading: membershipLoading } = useMembership();
  const stats = computeKpiStats(cvs, jobs, goals, coverLetters);
  const kpisLoading = criticalLoading || membershipLoading || secondaryLoading.streak || secondaryLoading.goals || secondaryLoading.cvs || secondaryLoading.jobs;

  const planKey = membership?.planKey || 'free';
  const isStarterMonthly = planKey === 'starter_monthly' || planKey === 'free';
  const limit = 10;
  const remaining = Math.max(0, limit - stats.aiJourneyUsage);

  const usageMetric = isStarterMonthly
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

  const metrics = [
    {
      label: 'Total CVs',
      value: String(stats.cvs),
      icon: <FileText size={16} strokeWidth={1.75} />,
      trend: stats.cvsThisWeek > 0 ? `↑ ${stats.cvsThisWeek} this week` : 'Steady',
      trendUp: stats.cvsThisWeek > 0,
    },
    {
      label: 'Active Jobs',
      value: String(stats.activeJobs),
      icon: <Briefcase size={16} strokeWidth={1.75} />,
      trend: stats.jobsThisWeek > 0 ? `↑ ${stats.jobsThisWeek} this week` : 'Steady',
      trendUp: stats.jobsThisWeek > 0,
    },
    {
      label: 'Applications',
      value: String(stats.applications),
      icon: <Send size={16} strokeWidth={1.75} />,
      trend: stats.applicationsThisWeek > 0 ? `↑ ${stats.applicationsThisWeek} this week` : 'No new this week',
      trendUp: stats.applicationsThisWeek > 0,
    },
    {
      label: 'Interviews',
      value: String(stats.interviews),
      icon: <CalendarCheck2 size={16} strokeWidth={1.75} />,
      trend: stats.interviewsThisWeek > 0 ? `↑ ${stats.interviewsThisWeek} this week` : 'None yet',
      trendUp: stats.interviewsThisWeek > 0,
    },
    {
      label: 'Avg Match Score',
      value: stats.avgMatch > 0 ? `${stats.avgMatch}%` : '—',
      icon: <Target size={16} strokeWidth={1.75} />,
      trend: stats.strongMatches > 0 ? `${stats.strongMatches} jobs ≥ 70%` : 'No matches scored',
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
                <div className="text-xl font-semibold tracking-tight text-[var(--text-primary)] leading-none tabular-nums">
                  {m.value}
                </div>
                <div className="mt-1 text-xs text-[var(--text-secondary)]">{m.label}</div>
                <div className={`mt-0.5 text-[11px] font-medium ${m.trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-tertiary)]'}`}>
                  {m.trend}
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
      [...cvs].sort(
        (a: any, b: any) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()
      ),
    [cvs]
  );

  const openCv = (cv: any) => router.push(`/editor?mode=edit&cvId=${cvId(cv)}`);

  return (
    <Panel
      title="My CVs"
      subtitle="Your CVs and their performance overview."
      actions={
        <>
          <button
            onClick={() => router.push('/editor?mode=create')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-900 px-3.5 py-2 text-xs font-medium hover:bg-emerald-700 dark:hover:bg-emerald-400 transition-colors"
          >
            <Plus size={14} strokeWidth={2} />
            Create CV
          </button>
          <GhostButton onClick={() => router.push('/editor')}>
            View all <ArrowUpRight size={13} />
          </GhostButton>
        </>
      }
    >
      {sorted.length === 0 && secondaryLoading.cvs ? (
        <div className="divide-y divide-[var(--border-primary)]" aria-hidden="true">
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
        <div className="py-10 text-center text-sm text-[var(--text-tertiary)]">
          No CVs yet — create your first one.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-xs font-medium text-[var(--text-tertiary)]">
                <th className="py-2.5 pr-4 font-medium">CV Name</th>
                <th className="py-2.5 pr-4 font-medium w-[140px]">ATS Score</th>
                <th className="py-2.5 pr-4 font-medium">Linked Jobs</th>
                <th className="py-2.5 pr-4 font-medium">Last Updated</th>
                <th className="py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-primary)]">
              {sorted.slice(0, 8).map((cv: any) => {
                const isMaster = cv.metadata?.isMaster || cv.cvType === 'master';
                const score = cvAtsScore(cv);
                const linked = linkedCounts.get(cvId(cv)) || 0;
                return (
                  <tr key={cvId(cv) || cv.title} className="hover:bg-[var(--bg-tertiary)]/40 transition-colors">
                    <td className="py-3 pr-4 max-w-[280px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate font-medium text-[var(--text-primary)]" title={cv.title}>
                          {cv.title || 'Untitled CV'}
                        </span>
                        {isMaster && (
                          <span className="shrink-0 inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 px-1.5 py-0.5 text-[10px] font-medium">
                            Default
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      {score > 0 ? (
                        <div className="flex items-center gap-2.5">
                          <span className="text-[var(--text-primary)] font-medium tabular-nums w-9">{score}%</span>
                          <div className="w-16 h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[var(--accent-primary)] rounded-full"
                              style={{ width: `${Math.min(100, score)}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-[var(--text-tertiary)]">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-[var(--text-secondary)]">{linked > 0 ? linked : '—'}</td>
                    <td className="py-3 pr-4 text-[var(--text-secondary)] whitespace-nowrap">
                      {timeAgo(cv.updatedAt || cv.createdAt)}
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          onClick={() => openPreview(cv)}
                          aria-label={`Preview ${cv.title}`}
                          title="Preview"
                          className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => openCv(cv)}
                          aria-label={`Edit ${cv.title}`}
                          className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          aria-label={`More options for ${cv.title}`}
                          className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                        >
                          <MoreHorizontal size={14} />
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
        cvData={previewCv?.cvData}
        template={previewCv?.template || null}
      />
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Recent Jobs table                                                   */
/* ------------------------------------------------------------------ */

function RecentJobsPanel() {
  const router = useRouter();
  const { jobs, cvs, secondaryLoading, refreshJobs } = useDashboardData();
  const [menuJobId, setMenuJobId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const { toast } = useToast();

  const openJobMenu = (e: React.MouseEvent, job: any) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuJobId(job.id || job._id || '');
    setMenuPos({ top: rect.bottom + 4, right: Math.max(8, window.innerWidth - rect.right) });
  };

  const handleDeleteJob = async () => {
    const job = deleteTarget;
    if (!job) return;
    const id = job.id || job._id;
    if (!id) return;
    setDeleting(true);
    try {
      const res = await authenticatedFetch(`/api/jobs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await refreshJobs();
        toast({
          title: 'Job deleted',
          description: `Removed "${job.jobTitle || 'this job'}"${job.company ? ` at ${job.company}` : ''}.`,
        });
      } else {
        toast({ title: 'Delete failed', description: 'Please try again.', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Failed to delete job:', err);
      toast({ title: 'Delete failed', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
      setMenuJobId(null);
    }
  };

  const cvById = useMemo(() => {
    const map = new Map<string, any>();
    cvs.forEach((cv: any) => map.set(cvId(cv), cv));
    return map;
  }, [cvs]);

  const sorted = useMemo(
    () =>
      [...jobs].sort(
        (a: any, b: any) => new Date(b.createdAt || b.updatedAt || 0).getTime() - new Date(a.createdAt || a.updatedAt || 0).getTime()
      ),
    [jobs]
  );

  return (
    <Panel
      title="Recent Jobs"
      subtitle="Jobs you're tracking and their current status."
      actions={
        <GhostButton onClick={() => router.push('/dashboard/jobs?tab=applications')}>
          View all <ArrowUpRight size={13} />
        </GhostButton>
      }
    >
      {sorted.length === 0 && secondaryLoading.jobs ? (
        <div className="divide-y divide-[var(--border-primary)]" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3.5">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="ml-auto h-8 w-8 rounded-lg" />
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="py-10 text-center text-sm text-[var(--text-tertiary)]">
          No jobs tracked yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead>
              <tr className="text-left text-xs font-medium text-[var(--text-tertiary)]">
                <th className="py-2.5 pr-4 font-medium">Job Title</th>
                <th className="py-2.5 pr-4 font-medium">Company</th>
                <th className="py-2.5 pr-4 font-medium">Linked CV</th>
                <th className="py-2.5 pr-4 font-medium">Status</th>
                <th className="py-2.5 pr-4 font-medium">Match</th>
                <th className="py-2.5 pr-4 font-medium">Added</th>
                <th className="py-2.5 pr-4 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-primary)]">
              {sorted.slice(0, 8).map((j: any, i: number) => {
                const linkedCv = findLinkedCvForJob(j, cvs);
                const meta = statusMeta(j.status);
                const match = Math.round(j.atsScore || j.matchScore || cvAtsScore(linkedCv) || (linkedCv?.atsScore) || 0);
                return (
                  <tr key={j.id || j._id || i} className="hover:bg-[var(--bg-tertiary)]/40 transition-colors">
                    <td className="py-3 pr-4 font-medium text-[var(--text-primary)] whitespace-nowrap">{j.jobTitle || 'Untitled role'}</td>
                    <td className="py-3 pr-4 text-[var(--text-secondary)] whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <CompanyLogo company={j.company} size={18} logoUrl={j.companyLogo} jobId={j.id || j._id} />
                        <span>{j.company || '—'}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      {linkedCv ? (
                        <GreenLabel>{linkedCv.title || 'Linked CV'}</GreenLabel>
                      ) : (
                        <span className="text-[var(--text-tertiary)]">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${meta.cls}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      {match > 0 ? (
                        <span className="inline-flex items-center rounded-full border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 tabular-nums">
                          {match}%
                        </span>
                      ) : (
                        <span className="text-[var(--text-tertiary)]">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-[var(--text-secondary)] whitespace-nowrap">
                      {timeAgo(j.createdAt || j.updatedAt)}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedJob(j)}
                          aria-label={`View ${j.jobTitle}`}
                          title="View job"
                          className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/jobs?tab=applications&jobId=${j.id || j._id}&edit=1`)}
                          aria-label={`Edit ${j.jobTitle}`}
                          title="Edit job"
                          className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={(e) => openJobMenu(e, j)}
                          aria-label={`More options for ${j.jobTitle}`}
                          title="More options"
                          className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                        >
                          <MoreHorizontal size={14} />
                        </button>
                      </div>

                      {/* Row actions menu (fixed-position so the table's overflow doesn't clip it) */}
                      {menuJobId === (j.id || j._id) && menuPos && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setMenuJobId(null)} />
                          <div
                            className="fixed z-50 min-w-[160px] rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] py-1 shadow-xl"
                            style={{ top: menuPos.top, right: menuPos.right }}
                          >
                            <button
                              onClick={() => {
                                setMenuJobId(null);
                                setDeleteTarget(j);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-[var(--bg-tertiary)] transition-colors"
                            >
                              <Trash2 size={13} />
                              Delete job
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation modal (fixed-position, rendered inside the panel) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !deleting && setDeleteTarget(null)}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-[var(--border-primary)] bg-white dark:bg-[#141810] shadow-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 size={17} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Delete this job?</h3>
                <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                  &ldquo;{deleteTarget.jobTitle || 'Untitled role'}&rdquo; at {deleteTarget.company || 'this company'} will be permanently removed along with its linked documents. This can&apos;t be undone.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg border border-[var(--border-primary)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteJob}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors disabled:opacity-60"
              >
                {deleting && <Loader2 size={13} className="animate-spin" />}
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Job sidebar opened right on dashboard */}
      {selectedJob && (
        <JobSidebar
          job={{
            ...selectedJob,
            id: selectedJob.id || selectedJob._id,
          }}
          journeys={[]}
          onClose={() => setSelectedJob(null)}
          onRefresh={refreshJobs}
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
  const linkedCvId = linkedCv ? cvId(linkedCv) : '';
  const hasLinkedCv = !!linkedCv;
  const atsScore = Math.round(job?.atsScore || job?.matchScore || cvAtsScore(linkedCv) || (linkedCv?.atsScore) || 0);

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
    if (atsScore > 0 && atsScore < 70) {
      return {
        statusText: `CV linked · Match score: ${atsScore}% (Needs boost)`,
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
        statusText: `High match (${atsScore}%) · Ready to apply`,
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

  return (
    <div className="rounded-xl bg-[#faf7ef] dark:bg-white/[0.03] border border-[var(--border-primary)] p-4 flex flex-col justify-between h-full">
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
        <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
          Job added {timeAgo(job.createdAt || job.updatedAt)}
        </p>

        {dynamicStep && (
          <div className={`mt-3 flex items-center gap-1.5 text-xs font-medium ${dynamicStep.statusColor}`}>
            <dynamicStep.StatusIcon size={14} />
            <span>{dynamicStep.statusText}</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 pt-2 border-t border-black/5 dark:border-white/5">
        {dynamicStep && (
          <button
            onClick={dynamicStep.buttonAction}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-900 px-3 py-1.5 text-xs font-medium hover:bg-emerald-700 dark:hover:bg-emerald-400 transition-colors truncate"
          >
            <dynamicStep.ButtonIcon size={13} />
            <span className="truncate">{dynamicStep.buttonText}</span>
          </button>
        )}
        <button
          onClick={() => onOpenSidebar(job)}
          className="inline-flex items-center justify-center gap-1 rounded-lg border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] px-3 py-1.5 text-xs font-medium transition-colors"
        >
          View Job
        </button>
      </div>
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
/* CV Health                                                           */
/* ------------------------------------------------------------------ */

function CvHealthPanel() {
  const router = useRouter();
  const { cvs, secondaryLoading } = useDashboardData();
  const [reportCv, setReportCv] = useState<any>(null);

  const options = useMemo(() => {
    const scored = cvs.filter((cv: any) => cvAtsScore(cv) > 0);
    if (scored.length > 0) return scored;
    return cvs;
  }, [cvs]);

  const [selectedId, setSelectedId] = useState<string>('');

  const selected = useMemo(() => {
    const found = options.find((cv: any) => cvId(cv) === selectedId);
    if (found) return found;
    return (
      options.find((cv: any) => cv.metadata?.isMaster || cv.cvType === 'master') ||
      options[0] ||
      null
    );
  }, [options, selectedId]);

  const score = selected ? cvAtsScore(selected) : 0;
  const analysis = selected?.metadata?.surgeonAnalysis;
  const report = analysis?.scoreReport;

  const metrics = useMemo(() => {
    if (report) {
      const norm = (val: number, max: number) => Math.round(Math.min(100, Math.max(0, (val / max) * 100)));
      return [
        { label: 'Formatting', value: norm(report.formatting ?? score, 15) },
        { label: 'Keywords', value: norm(report.quantification ?? report.keywords ?? 0, 20) },
        { label: 'Readability', value: norm(report.readability ?? score, 20) },
        { label: 'Impact', value: norm(report.impactVerbs ?? 0, 20) },
        { label: 'Skills', value: norm(report.completeness ?? 0, 25) },
      ];
    }
    if (score > 0) {
      return [
        { label: 'Formatting', value: Math.min(100, score + 4) },
        { label: 'Keywords', value: Math.max(30, score - 4) },
        { label: 'Readability', value: Math.min(100, score + 9) },
        { label: 'Impact', value: Math.max(25, score - 13) },
        { label: 'Skills', value: Math.min(100, score + 1) },
      ];
    }
    return [
      { label: 'Formatting', value: 0 },
      { label: 'Keywords', value: 0 },
      { label: 'Readability', value: 0 },
      { label: 'Impact', value: 0 },
      { label: 'Skills', value: 0 },
    ];
  }, [report, score]);

  const radarData = metrics.map((m) => ({ subject: m.label, A: m.value, fullMark: 100 }));

  const scoreTone = score >= 80 ? 'Good score' : score >= 60 ? 'Decent score' : 'Needs work';

  const metricIcons = [<Layers key="f" size={13} />, <Target key="k" size={13} />, <FileText key="r" size={13} />, <Zap key="i" size={13} />, <Award key="s" size={13} />];

  return (
    <>
    <Panel
      title="CV Health"
      actions={
        options.length > 1 ? (
          <select
            value={selectedId || (selected ? cvId(selected) : '')}
            onChange={(e) => setSelectedId(e.target.value)}
            className="text-xs font-medium text-[var(--text-secondary)] bg-transparent border border-[var(--border-primary)] rounded-md px-2 py-1 outline-none focus:border-[var(--accent-primary)] max-w-[150px]"
          >
            {options.map((cv: any) => (
              <option key={cvId(cv)} value={cvId(cv)}>
                {cv.title || 'Untitled CV'}
              </option>
            ))}
          </select>
        ) : undefined
      }
    >
      {secondaryLoading.cvs && options.length === 0 ? (
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
      ) : !selected ? (
        <div className="py-10 text-center text-sm text-[var(--text-tertiary)]">
          Create a CV and run an ATS analysis to see its health.
        </div>
      ) : (
        <div className="mt-1">
          <div className="flex items-center gap-6">
            <div className="shrink-0">
              <div className="text-4xl font-semibold tracking-tight text-[var(--text-primary)] tabular-nums leading-none">
                {score > 0 ? `${score}%` : '—'}
              </div>
              <div className="mt-2 text-sm font-medium text-[var(--text-primary)]">{scoreTone}</div>
              <div className="text-xs text-[var(--text-secondary)]">
                {score >= 80 ? 'Keep improving!' : score > 0 ? 'Keep improving!' : 'Run an analysis'}
              </div>
            </div>

            <div className="flex-1 min-w-0 h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid stroke="var(--border-primary)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-tertiary)', fontSize: 9, fontWeight: 500 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Health" dataKey="A" stroke="var(--accent-primary)" fill="var(--accent-primary)" fillOpacity={0.14} strokeWidth={1.5} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
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

          <div className="mt-4 pt-3 border-t border-[var(--border-primary)] text-center">
            <GhostButton onClick={() => setReportCv(selected)}>
              View full analysis <ArrowUpRight size={13} />
            </GhostButton>
          </div>
        </div>
      )}

      </Panel>

      {/* Full analysis report — opens as a right-side drawer */}
      <CvReportSidebar cv={reportCv} isOpen={!!reportCv} onClose={() => setReportCv(null)} />
    </>
  );
}


/* ------------------------------------------------------------------ */
/* Root view                                                           */
/* ------------------------------------------------------------------ */

export default function RedesignedDashboardView() {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(' ')[0] || 'there';

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return `${greetingForHour(h)}, ${firstName}`;
  }, [firstName]);

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="pt-2">
        <h1 className="dashboard-greeting text-[var(--text-primary)]">{greeting}</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Here&apos;s what&apos;s happening with your career.</p>
      </div>

      {/* Compact KPI strip */}
      <KpiStrip />

      {/* Top job matches */}
      <TopJobMatchesSection />

      {/* Two-column workspace — fills the full content-area width */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left: primary workspace */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          <MyCvsPanel />
          <RecentJobsPanel />
        </div>

        {/* Right: contextual rail */}
        <div className="space-y-6 min-w-0">
          <UpgradeSuggestionCard />
          <ContinuePanel />
          <CvHealthPanel />
        </div>
      </div>
    </div>
  );
}
