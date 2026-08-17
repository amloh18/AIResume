'use client';

import React, { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
  Clock,
  Sparkles,
  Activity,
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
import CvReportSidebar from '@/components/dashboard/redesigned/CvReportSidebar';
import CompanyLogo from '@/components/ui/CompanyLogo';
import DocumentPreviewSidebar from '@/components/dashboard/jobs/DocumentPreviewSidebar';
import { Skeleton } from '@/components/ui/Skeleton';
import { authenticatedFetch } from '@/lib/utils/apiUtils';

interface ActivityItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  time?: string | null;
}

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
  return Math.round(cv?.metadata?.atsScore || cv?.cv_score_master || 0);
}

function jobLinkedCvId(job: any): string {
  return String(job?.linkedCvId || job?.linkedCv?._id || job?.cvId || '');
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

function computeKpiStats(cvs: any[], jobs: any[], goals: any) {
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
    cvsCreatedThisMonth: goals.cvsCreatedThisMonth,
  };
}

function KpiStrip() {
  const { cvs, jobs, goals, criticalLoading, secondaryLoading } = useDashboardData();
  const stats = computeKpiStats(cvs, jobs, goals);
  const kpisLoading = criticalLoading || secondaryLoading.streak || secondaryLoading.goals || secondaryLoading.cvs || secondaryLoading.jobs;

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
  ];

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl shadow-sm grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 divide-x divide-y md:divide-y-0 divide-[var(--border-primary)]">
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
      const id = jobLinkedCvId(j);
      if (id) map.set(id, (map.get(id) || 0) + 1);
    });
    return map;
  }, [jobs]);

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
        <GhostButton onClick={() => router.push('/dashboard/tracker')}>
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
                const linkedCv = cvById.get(jobLinkedCvId(j));
                const meta = statusMeta(j.status);
                const match = Math.round(j.atsScore || j.matchScore || 0);
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
                          onClick={() => router.push(`/dashboard/tracker?jobId=${j.id || j._id}`)}
                          aria-label={`View ${j.jobTitle}`}
                          title="View job"
                          className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/tracker?jobId=${j.id || j._id}&edit=1`)}
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
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Continue where you left off                                         */
/* ------------------------------------------------------------------ */

function ContinuePanel() {
  const router = useRouter();
  const { jobs, cvs, secondaryLoading } = useDashboardData();
  const [activeIndex, setActiveIndex] = useState(0);

  // Up to 5 most recent jobs, shown one at a time in a vertical carousel.
  const recentJobs = useMemo(() => {
    const sorted = [...jobs].sort(
      (a: any, b: any) => new Date(b.createdAt || b.updatedAt || 0).getTime() - new Date(a.createdAt || a.updatedAt || 0).getTime()
    );
    return sorted.slice(0, 5);
  }, [jobs]);

  // Clamp without state churn so the index stays valid while data loads.
  const safeIndex = recentJobs.length > 0 ? Math.min(activeIndex, recentJobs.length - 1) : 0;
  const nextJob = recentJobs[safeIndex] || null;

  const hasLinkedCv = useMemo(() => {
    if (!nextJob) return false;
    const id = jobLinkedCvId(nextJob);
    return !!id && cvs.some((cv: any) => cvId(cv) === id);
  }, [nextJob, cvs]);

  const goTo = (i: number) => setActiveIndex(Math.max(0, Math.min(i, recentJobs.length - 1)));

  if (!nextJob && secondaryLoading.jobs) {
    return (
      <Panel title="Continue where you left off">
        <div className="space-y-3" aria-hidden="true">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      </Panel>
    );
  }

  if (!nextJob) {
    return (
      <Panel title="Continue where you left off">
        <div className="py-8 text-center text-sm text-[var(--text-tertiary)]">
          Add a job to keep your momentum going.
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title="Continue where you left off"
      actions={
        recentJobs.length > 1 ? (
          <span className="rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center px-2 py-0.5 text-[10px] font-semibold tabular-nums">
            {safeIndex + 1}/{recentJobs.length}
          </span>
        ) : undefined
      }
    >
      <div className="relative">
        {/* Card stack — slides vertically as you move through the jobs */}
        <div className="min-h-[180px]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={nextJob.id || nextJob._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              // Swipe/drag up or down on the card to move through the stack
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.15}
              dragTransition={{ bounceStiffness: 400, bounceDamping: 30 }}
              whileDrag={{ scale: 0.99 }}
              onDragEnd={(_e, info) => {
                if (Math.abs(info.offset.y) < 40) return; // below threshold → springs back
                goTo(safeIndex + (info.offset.y < 0 ? 1 : -1));
              }}
            >
              <div className="rounded-lg bg-[#faf7ef] dark:bg-white/[0.03] border border-[var(--border-primary)] p-4 pr-8">
                <div className="flex items-start gap-2 min-w-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--text-primary)] leading-snug">{nextJob.jobTitle || 'Untitled role'}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                      <CompanyLogo company={nextJob.company} size={14} logoUrl={nextJob.companyLogo} jobId={nextJob.id || nextJob._id} />
                      <span className="truncate">
                        {nextJob.company || 'Company'} {nextJob.location ? `· ${nextJob.location}` : ''}
                      </span>
                    </p>
                    <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">Job added {timeAgo(nextJob.createdAt || nextJob.updatedAt)}</p>

                    <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                      <AlertCircle size={14} />
                      {hasLinkedCv ? 'CV linked — ready to apply' : 'CV not created yet'}
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <button
                        onClick={() => router.push(hasLinkedCv ? `/editor?mode=edit&cvId=${jobLinkedCvId(nextJob)}` : '/editor?mode=create')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-900 px-3.5 py-2 text-xs font-medium hover:bg-emerald-700 dark:hover:bg-emerald-400 transition-colors"
                      >
                        <Plus size={14} />
                        Create CV
                      </button>
                      <button
                        onClick={() => router.push('/dashboard/tracker')}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] px-3.5 py-2 text-xs font-medium transition-colors"
                      >
                        View Job
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Vertical pagination dots on the right of the card */}
        {recentJobs.length > 1 && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5">
            {recentJobs.map((j: any, i: number) => (
              <button
                key={j.id || j._id || i}
                onClick={() => goTo(i)}
                aria-label={`Go to job ${i + 1} of ${recentJobs.length}`}
                aria-current={i === safeIndex ? 'true' : undefined}
                className="group p-0.5"
              >
                <span
                  className={`block rounded-full transition-all duration-200 ${
                    i === safeIndex
                      ? 'h-3.5 w-1.5 bg-[var(--accent-primary)]'
                      : 'h-2 w-2 bg-[var(--text-secondary)] opacity-60 group-hover:bg-[var(--accent-primary)] group-hover:opacity-100'
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </Panel>
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
/* Recent Activity                                                     */
/* ------------------------------------------------------------------ */

function ActivityPanel() {
  const router = useRouter();
  const { activities, secondaryLoading } = useDashboardData();

  const items = useMemo<ActivityItem[]>(
    () =>
      activities.slice(0, 6).map((a: any, i: number) => {
        const type = a.type || '';
        let icon = <Activity size={14} />;
        let title = a.title || a.description || 'Activity';
        let subtitle: string | undefined;

        if (type.includes('cover')) {
          icon = <FileText size={14} />;
          title = 'Cover letter generated';
          subtitle = a.description || 'For a recent application';
        } else if (type.includes('cv') || type.includes('improve') || type.includes('score')) {
          icon = <Sparkles size={14} />;
          title = a.title || 'You improved your CV';
          subtitle = a.description;
        } else if (type.includes('appl')) {
          icon = <Send size={14} />;
          title = a.title || 'Application submitted';
          subtitle = a.description;
        } else if (type.includes('job')) {
          icon = <Briefcase size={14} />;
          title = a.title || 'Job added';
          subtitle = a.description;
        } else if (type.includes('interview')) {
          icon = <CalendarCheck2 size={14} />;
          title = a.title || 'Interview scheduled';
          subtitle = a.description;
        }

        return { id: a.id || a._id || `activity-${i}`, icon, title, subtitle, time: a.timestamp || a.createdAt || a.updatedAt };
      }),
    [activities]
  );

  return (
    <Panel
      title="Recent Activity"
      actions={
        <GhostButton onClick={() => router.push('/dashboard/tracker')}>
          View all <ArrowUpRight size={13} />
        </GhostButton>
      }
    >
      {items.length === 0 && secondaryLoading.activities ? (
        <div className="divide-y divide-[var(--border-primary)]" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="py-3 flex items-start gap-3">
              <Skeleton className="mt-0.5 h-6 w-6 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-10 text-center text-sm text-[var(--text-tertiary)]">
          No activity yet.
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border-primary)]">
          {items.map((item) => (
            <li key={item.id} className="py-3 flex items-start gap-3">
              <span className="mt-0.5 w-6 h-6 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] flex items-center justify-center shrink-0">
                {item.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--text-primary)] leading-snug">{item.title}</p>
                {item.subtitle && <p className="mt-0.5 text-xs text-[var(--text-secondary)] leading-snug">{item.subtitle}</p>}
              </div>
              <span className="shrink-0 text-[11px] text-[var(--text-tertiary)] whitespace-nowrap">{timeAgo(item.time)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
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
          <ActivityPanel />
        </div>
      </div>
    </div>
  );
}
