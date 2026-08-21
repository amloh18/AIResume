// @ts-nocheck
'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { JobsMetrics } from '@/types/automation-schema';
import {
  TrendingUp,
  Clock,
  Search,
  ArrowUpDown,
  Briefcase,
  Columns3,
  List,
  Plus,
  Zap,
  Trash2,
  Send,
  CalendarCheck2,
  Target
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { authenticatedFetch } from '@/lib/utils/apiUtils';
import { useUnifiedAuth, getUserIdForAPI } from '@/lib/hooks/useUnifiedAuth';
import { useUserData } from '@/lib/hooks/useUserData';
import { useMembership } from '@/lib/hooks/useMembership';
import toast from 'react-hot-toast';
import { CVJourney } from '@/types/cv';
import JobSidebar from '@/components/dashboard/jobs/JobSidebar';
import EditJobSidebar from '@/components/dashboard/jobs/EditJobSidebar';
import JobParserSidebar from '@/components/dashboard/jobs/JobParserSidebar';
import JobsListView from '@/components/dashboard/jobs/JobsListView';
import JobsKanbanView from '@/components/dashboard/jobs/JobsKanbanView';
import TrackerCreatedStageModal from '@/components/dashboard/jobs/TrackerCreatedStageModal';
import JobCreationPaywall from '@/components/payment/JobCreationPaywall';
import UpgradePromptCard from '@/components/payment/UpgradePromptCard';
import DownloadModal from '@/components/ui/DownloadModal';
import type { TrackerSidebarOpenContext } from '@/components/dashboard/jobs/trackerSidebarConfig';
import { useJobsPersistence } from '@/lib/hooks/useJobsPersistence';
import { useFocusMode } from '@/lib/hooks/useFocusMode';
import { useDebounce } from '@/hooks/useDebounce';
import { usePaymentModal } from '@/contexts/PaymentModalContext';
import {
  type TrackerCreatedStagePreview,
} from '@/lib/utils/tracker-created-stage-modal';

interface JobApplication {
  id: string;
  _id: string;
  userId: string;
  jobTitle: string;
  title?: string;
  company: string;
  status: 'draft' | 'created' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'accepted' | 'withdrawn';
  jobDescription?: string;
  description?: string;
  location?: string;
  jobUrl?: string;
  applyUrl?: string;
  sourceUrl?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: 'hourly' | 'monthly' | 'yearly';
  } | string;
  jobType?: 'full-time' | 'part-time' | 'contract' | 'internship';
  type?: string;
  source?: string;
  postedDate?: Date;
  applicationDate?: Date;
  appliedAt?: string | Date;
  deadline?: Date;
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  tags?: string[];
  sponsorship?: 'yes' | 'no' | 'unknown';
  contactDetails?: {
    name: string;
    email: string;
    phone: string;
    role: string;
  };
  interviews?: any[];
  followUps?: any[];
  attachments?: any[];
  atsScore?: number;
  matchScore?: number;
  companyLogo?: string;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApplicationsPanelProps {
  userId?: string;
  metrics?: JobsMetrics | null;
}

export function ApplicationsPanel({ userId: propUserId, metrics }: ApplicationsPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUnifiedAuth();
  const { userData } = useUserData();
  const { membership } = useMembership();
  const { openPaymentModal } = usePaymentModal();
  const { preferences, savePreferences } = useJobsPersistence();
  const { isFocusMode } = useFocusMode();

  const userId = propUserId || getUserIdForAPI(user);

  const cvId = searchParams.get('cvId');
  const stageParam = searchParams.get('stage') || searchParams.get('filter');
  const deepLinkJobId = searchParams.get('jobId') || searchParams.get('job');
  const deepLinkEdit = searchParams.get('edit') === '1';
  const deepLinkNewJob = searchParams.get('newJob') === '1' || searchParams.get('action') === 'add-job';

  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [journeys, setJourneys] = useState<CVJourney[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobApplication | null>(null);
  const [sidebarOpenContext, setSidebarOpenContext] = useState<TrackerSidebarOpenContext | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'appliedAt' | 'matchScore' | 'company' | 'lastUpdated'>('appliedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [draggedJob, setDraggedJob] = useState<string | null>(null);
  const [zoomedStage, setZoomedStage] = useState<string | null>(null);
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [showJobParserDialog, setShowJobParserDialog] = useState(false);
  const [editingJob, setEditingJob] = useState<JobApplication | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showTrackerAccessPrompt, setShowTrackerAccessPrompt] = useState(false);
  const [paywallInfo, setPaywallInfo] = useState<{ currentCount: number; limit: number } | null>(null);
  const [isUpdatingJobStatus, setIsUpdatingJobStatus] = useState<Set<string>>(new Set());
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadJobId, setDownloadJobId] = useState<string | null>(null);
  const [trackerCreatedStagePreview, setTrackerCreatedStagePreview] = useState<TrackerCreatedStagePreview | null>(null);
  const [pendingCreatedStageJob, setPendingCreatedStageJob] = useState<JobApplication | null>(null);

  useEffect(() => {
    if (preferences.mode) {
      setViewMode(preferences.mode);
    }
    if (preferences.filterStatus) {
      setFilterStatus(preferences.filterStatus);
    }
  }, []);

  useEffect(() => {
    if (stageParam) {
      if (['draft', 'created', 'applied', 'screening', 'interview', 'offer', 'rejected', 'accepted', 'withdrawn'].includes(stageParam)) {
        setFilterStatus(stageParam);
        setZoomedStage(stageParam);
      }
    }
  }, [stageParam]);

  useEffect(() => {
    if (deepLinkNewJob) {
      setShowAddJobModal(true);
    }
  }, [deepLinkNewJob]);

  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [jobsRes, journeysRes] = await Promise.all([
        fetch('/api/jobs?limit=all', { cache: 'no-store' }),
        fetch('/api/journeys?limit=all', { cache: 'no-store' }),
      ]);

      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        const rawJobs = jobsData?.data?.jobs || (Array.isArray(jobsData?.jobs) ? jobsData.jobs : []);
        setJobs(rawJobs.map((j: any) => ({
          ...j,
          id: j.id || j._id,
          jobTitle: j.jobTitle || j.title || 'Untitled Role',
          company: j.company || 'Unknown Company',
        })));
      }

      if (journeysRes.ok) {
        const journeysData = await journeysRes.json();
        const rawJourneys = journeysData?.data?.journeys || (Array.isArray(journeysData?.journeys) ? journeysData.journeys : []);
        setJourneys(rawJourneys);
      }
    } catch (err) {
      console.error('Failed to load application tracker data:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleJobUpdate = (event: CustomEvent) => {
      if (event.detail && event.detail.jobId) {
        setJobs(prevJobs => prevJobs.map(job => {
          if (job.id === event.detail.jobId || job._id === event.detail.jobId) {
            const { jobId, ...updates } = event.detail;
            return { ...job, ...updates } as JobApplication;
          }
          return job;
        }));
        return;
      }
      loadData(true);
    };

    window.addEventListener('jobUpdated', handleJobUpdate as EventListener);
    return () => {
      window.removeEventListener('jobUpdated', handleJobUpdate as EventListener);
    };
  }, [loadData]);

  const deepLinkHandledRef = useRef(false);
  useEffect(() => {
    if (!deepLinkJobId || deepLinkHandledRef.current || jobs.length === 0 || loading) return;
    const target = jobs.find((job) => (job.id || job._id) === deepLinkJobId);
    if (!target) return;
    deepLinkHandledRef.current = true;
    setSelectedJob(target);
    setSidebarOpenContext(deepLinkEdit ? { autoOpenEdit: true } : null);
    setShowModal(true);
  }, [deepLinkJobId, deepLinkEdit, jobs, loading]);

  const stats = useMemo(() => {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;

    const total = jobs.length;
    const applied = jobs.filter((j) => ['applied'].includes(j.status)).length;
    const interview = jobs.filter((j) => ['interview', 'screening', 'assessment', 'phone_screen', 'technical_test'].includes(j.status)).length;
    const offer = jobs.filter((j) => ['offer', 'accepted'].includes(j.status)).length;
    const pending = jobs.filter((j) => ['created', 'draft'].includes(j.status)).length;
    const rejected = jobs.filter((j) => ['rejected'].includes(j.status)).length;

    const jobsThisWeek = jobs.filter((j) => {
      const t = new Date(j.createdAt || j.updatedAt).getTime();
      return !isNaN(t) && now - t < weekMs;
    }).length;

    const appliedThisWeek = jobs.filter((j) => {
      const t = new Date(j.applicationDate || j.appliedAt || j.updatedAt || j.createdAt).getTime();
      return ['applied', 'screening', 'assessment', 'phone_screen', 'technical_test', 'interview', 'offer', 'accepted'].includes(j.status) && !isNaN(t) && now - t < weekMs;
    }).length;

    const scoredJobs = jobs.filter((j) => typeof (j.atsScore ?? j.matchScore) === 'number' && (j.atsScore ?? j.matchScore) > 0);
    const avgScore = scoredJobs.length > 0
      ? Math.round(scoredJobs.reduce((sum, j) => sum + (j.atsScore ?? j.matchScore ?? 0), 0) / scoredJobs.length)
      : 0;
    const strongMatches = scoredJobs.filter((j) => (j.atsScore ?? j.matchScore ?? 0) >= 70).length;

    const successRate = total > 0 ? Math.round(((interview + offer) / total) * 100) : 0;

    // AI Journey usage calculation
    const journeyAppIds = new Set<string>();
    jobs.forEach((j) => {
      const jId = String(j.id || j._id || '');
      if (j.journeyId || (j as any).isAutomated || (j as any).autoApplied || (j as any).linkedCvId || (j as any).cvId || (j as any).coverLetterId) {
        if (jId) journeyAppIds.add(jId);
      }
    });
    journeys.forEach((jy) => {
      const key = jy.id || (jy as any)._id || jy.jobId;
      if (key) journeyAppIds.add(String(key));
    });
    const aiJourneyUsage = journeyAppIds.size;

    return {
      total,
      applied,
      interview,
      offer,
      pending,
      rejected,
      avgScore,
      strongMatches,
      successRate,
      jobsThisWeek,
      appliedThisWeek,
      aiJourneyUsage,
    };
  }, [jobs, journeys]);

  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.toLowerCase();
      result = result.filter(j =>
        (j.jobTitle || j.title || '').toLowerCase().includes(q) ||
        (j.company || '').toLowerCase().includes(q) ||
        (j.location || '').toLowerCase().includes(q) ||
        (j.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }

    if (filterStatus !== 'all') {
      if (filterStatus === 'pending' || filterStatus === 'staging' || filterStatus === 'created') {
        result = result.filter(j => ['created', 'draft'].includes(j.status));
      } else if (filterStatus === 'interview') {
        result = result.filter(j => ['interview', 'screening', 'assessment', 'phone_screen', 'technical_test'].includes(j.status));
      } else if (filterStatus === 'offer') {
        result = result.filter(j => ['offer', 'accepted'].includes(j.status));
      } else {
        result = result.filter(j => j.status === filterStatus);
      }
    }

    if (sourceFilter !== 'all') {
      result = result.filter(j => (j.source || 'direct').toLowerCase().includes(sourceFilter.toLowerCase()));
    }

    result.sort((a, b) => {
      let comp = 0;
      if (sortBy === 'appliedAt') {
        const dateA = new Date(a.applicationDate || a.appliedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.applicationDate || b.appliedAt || b.createdAt || 0).getTime();
        comp = dateA - dateB;
      } else if (sortBy === 'matchScore') {
        const scoreA = a.atsScore ?? a.matchScore ?? 0;
        const scoreB = b.atsScore ?? b.matchScore ?? 0;
        comp = scoreA - scoreB;
      } else if (sortBy === 'company') {
        comp = (a.company || '').localeCompare(b.company || '');
      } else if (sortBy === 'lastUpdated') {
        const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        comp = dateA - dateB;
      }
      return sortOrder === 'desc' ? -comp : comp;
    });

    return result;
  }, [jobs, debouncedSearchQuery, filterStatus, sourceFilter, sortBy, sortOrder]);

  const jobsByStatus = useMemo(() => {
    const grouped = {
      saved: [] as JobApplication[],
      created: [] as JobApplication[],
      applied: [] as JobApplication[],
      interview: [] as JobApplication[],
      offer: [] as JobApplication[],
      rejected: [] as JobApplication[],
    };

    filteredJobs.forEach(job => {
      const status = job.status || 'saved';
      if (status === 'saved') grouped.saved.push(job);
      else if (status === 'created') grouped.created.push(job);
      else if (status === 'applied') grouped.applied.push(job);
      else if (['interview', 'screening', 'assessment', 'phone_screen', 'technical_test'].includes(status)) grouped.interview.push(job);
      else if (['offer', 'accepted'].includes(status)) grouped.offer.push(job);
      else if (status === 'rejected') grouped.rejected.push(job);
      else grouped.saved.push(job);
    });

    return grouped;
  }, [filteredJobs]);

  const getJobJourneys = useCallback((jobId: string): CVJourney[] => {
    return journeys.filter(j => j.jobId === jobId || (j as any).targetJobId === jobId);
  }, [journeys]);

  const getJourneyProgress = useCallback((journey: CVJourney): number => {
    if (!journey) return 0;
    if (journey.status === 'completed') return 100;
    const totalSteps = journey.totalSteps || 5;
    const currentStep = journey.currentStep || 1;
    return Math.round((currentStep / totalSteps) * 100);
  }, []);

  const getJourneyStatusText = useCallback((jobJourneys: CVJourney[], jobStatus?: string): string => {
    if (jobJourneys.length === 0) {
      return jobStatus === 'created' ? 'Ready to apply' : 'No journey';
    }
    const journey = jobJourneys[0];
    if (journey.status === 'completed') return 'Application ready';
    return `Step ${journey.currentStep || 1} of ${journey.totalSteps || 5}`;
  }, []);

  const handleJobClick = (job: JobApplication) => {
    setSelectedJob(job);
    setSidebarOpenContext(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedJob(null);
    setSidebarOpenContext(null);
  };

  const handleAddJob = () => {
    setEditingJob(null);
    setShowAddJobModal(true);
  };

  const handleEditJob = (job: JobApplication) => {
    setEditingJob(job);
    setShowAddJobModal(true);
  };

  const handleDeleteJob = async (job: JobApplication) => {
    const jobId = job.id || job._id;
    if (!confirm(`Are you sure you want to delete "${job.jobTitle || job.title || 'this job'}" at ${job.company || 'Unknown Company'}?`)) return;
    try {
      const res = await authenticatedFetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Job deleted successfully');
        setJobs(prev => prev.filter(j => (j.id || j._id) !== jobId));
        loadData(true);
      } else {
        toast.error('Failed to delete job');
      }
    } catch (err) {
      console.error('Error deleting job:', err);
      toast.error('Failed to delete job');
    }
  };

  const handleJobSaved = () => {
    loadData(true);
    setShowAddJobModal(false);
    setEditingJob(null);
  };

  const handleViewModeChange = (mode: 'list' | 'kanban') => {
    setViewMode(mode);
    savePreferences({ mode });
  };

  const handleJobStatusUpdate = async (jobId: string, newStatus: string) => {
    try {
      setIsUpdatingJobStatus(prev => new Set(prev).add(jobId));
      const res = await authenticatedFetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setJobs(prev => prev.map(j => (j.id === jobId || j._id === jobId) ? { ...j, status: newStatus as any } : j));
        toast.success(`Job moved to ${newStatus}`);
      } else {
        toast.error('Failed to update status');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Error updating status');
    } finally {
      setIsUpdatingJobStatus(prev => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  const handleDragStart = (e: React.DragEvent, jobId: string) => {
    setDraggedJob(jobId);
    e.dataTransfer.setData('text/plain', jobId);
  };

  const handleDragEnd = () => {
    setDraggedJob(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const jobId = draggedJob || e.dataTransfer.getData('text/plain');
    if (!jobId) return;

    const job = jobs.find(j => j.id === jobId || j._id === jobId);
    if (!job || job.status === targetStatus) return;

    if (job.status === 'draft' && targetStatus === 'created') {
      setPendingCreatedStageJob(job);
      return;
    }

    await handleJobStatusUpdate(jobId, targetStatus);
  };

  const isJobDraggable = (job: JobApplication) => true;
  const isDraggableStage = (status: string) => true;
  const handleStageClick = (status: string) => {
    setZoomedStage(zoomedStage === status ? null : status);
  };

  const handleCreateJourney = (jobId: string) => {
    router.push(`/editor?jobId=${jobId}`);
  };

  const handleImproveATS = (jobId: string) => {
    router.push(`/editor?mode=improve&jobId=${jobId}`);
  };

  const handleDownload = (jobId: string) => {
    setDownloadJobId(jobId);
    setShowDownloadModal(true);
  };

  const handleParseComplete = () => {
    setShowJobParserDialog(false);
    loadData();
  };

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

  const kpiMetrics = [
    {
      label: 'Total Applications',
      value: String(stats.total),
      icon: <Briefcase size={16} strokeWidth={1.75} />,
      trend: stats.jobsThisWeek > 0 ? `↑ ${stats.jobsThisWeek} this week` : 'Total tracked',
      trendUp: stats.jobsThisWeek > 0,
    },
    {
      label: 'Staging / Ready',
      value: String(stats.pending),
      icon: <Clock size={16} strokeWidth={1.75} />,
      trend: stats.pending > 0 ? `${stats.pending} ready to apply` : 'No staging jobs',
      trendUp: stats.pending > 0,
    },
    {
      label: 'Applied',
      value: String(stats.applied),
      icon: <Send size={16} strokeWidth={1.75} />,
      trend: stats.appliedThisWeek > 0 ? `↑ ${stats.appliedThisWeek} this week` : 'In submission',
      trendUp: stats.appliedThisWeek > 0,
    },
    {
      label: 'Interviews',
      value: String(stats.interview),
      icon: <CalendarCheck2 size={16} strokeWidth={1.75} />,
      trend: stats.interview > 0 ? `${stats.successRate}% callback rate` : 'None yet',
      trendUp: stats.interview > 0,
    },
    {
      label: 'Avg Match Score',
      value: stats.avgScore > 0 ? `${stats.avgScore}%` : '—',
      icon: <Target size={16} strokeWidth={1.75} />,
      trend: stats.strongMatches > 0 ? `${stats.strongMatches} jobs ≥ 70%` : 'No matches scored',
      trendUp: stats.strongMatches > 0,
    },
    usageMetric,
  ];

  return (
    <div className="space-y-6">
      {/* Dashboard-Style KPI Strip */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl shadow-sm grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-y md:divide-y-0 divide-[var(--border-primary)]">
        {kpiMetrics.map((m) => (
          <div key={m.label} className="px-5 py-4 flex items-center gap-3.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[var(--bg-tertiary)] dark:bg-white/5 text-[var(--text-secondary)] flex items-center justify-center shrink-0">
              {m.icon}
            </div>
            <div className="min-w-0">
              {loading ? (
                <>
                  <div className="h-5 w-10 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
                  <div className="mt-1 text-xs text-[var(--text-secondary)]">{m.label}</div>
                  <div className="mt-1 h-3 w-16 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
                </>
              ) : (
                <>
                  <div className="text-xl font-semibold tracking-tight text-[var(--text-primary)] leading-none tabular-nums">
                    {m.value}
                  </div>
                  <div className="mt-1 text-xs text-[var(--text-secondary)]">{m.label}</div>
                  <div className={`mt-0.5 text-[11px] font-medium ${m.trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-tertiary)] text-gray-500 dark:text-gray-400'}`}>
                    {m.trend}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-sm space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left Controls: Search & Filters */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by role, company, location..."
                className="w-full h-9 pl-9 pr-3 bg-gray-50 dark:bg-[#1a230f] border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-lime-500 transition-all"
              />
            </div>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="h-9 px-3 bg-gray-50 dark:bg-[#1a230f] border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-lime-500 transition-all cursor-pointer"
            >
              <option value="all">All Portals / Sources</option>
              <option value="direct">Direct ATS</option>
              <option value="naukri">Naukri.com</option>
              <option value="indeed">Indeed</option>
              <option value="greenhouse">Greenhouse ATS</option>
              <option value="lever">Lever ATS</option>
              <option value="adzuna">Adzuna</option>
              <option value="linkedin">LinkedIn</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-9 px-3 bg-gray-50 dark:bg-[#1a230f] border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-lime-500 transition-all cursor-pointer"
            >
              <option value="appliedAt">Sort by Date Applied</option>
              <option value="matchScore">Sort by Match Score</option>
              <option value="company">Sort by Company</option>
              <option value="lastUpdated">Sort by Last Updated</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              title="Toggle sort order"
              className="h-9 w-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1a230f] text-gray-700 dark:text-gray-300 hover:border-lime-500 text-xs transition-colors shrink-0"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right Controls: View Switcher & Action CTAs */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center h-9 p-1 rounded-xl bg-gray-100 dark:bg-[#1a230f] border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => handleViewModeChange('list')}
                className={`flex items-center justify-center gap-1.5 h-7 px-3 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-[#253316] text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="Table view"
              >
                <List className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
              <button
                onClick={() => handleViewModeChange('kanban')}
                className={`flex items-center justify-center gap-1.5 h-7 px-3 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'kanban'
                    ? 'bg-white dark:bg-[#253316] text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="Kanban view"
              >
                <Columns3 className="w-3.5 h-3.5" />
                <span>Kanban</span>
              </button>
            </div>

            <button
              onClick={() => setShowJobParserDialog(true)}
              className="flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1a230f] hover:border-lime-500 text-gray-800 dark:text-gray-200 text-xs font-semibold transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-lime-500" />
              <span>Parse JD</span>
            </button>
            <button
              onClick={handleAddJob}
              className="flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl bg-lime-500 hover:bg-lime-400 text-black text-xs font-bold transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Job</span>
            </button>
          </div>
        </div>

        {/* Status filter chips ONLY rendered in list view */}
        {viewMode === 'list' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide border-t border-gray-100 dark:border-white/5 pt-3">
            {[
              { id: 'all', label: 'All Applications', count: stats.total },
              { id: 'created', label: 'Staging / Ready', count: stats.pending },
              { id: 'applied', label: 'Applied', count: stats.applied },
              { id: 'interview', label: 'Interviewing', count: stats.interview },
              { id: 'offer', label: 'Offers', count: stats.offer },
              { id: 'rejected', label: 'Declined', count: stats.rejected },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                  filterStatus === tab.id
                    ? 'bg-[#0f3822] dark:bg-[#133820] text-white border border-[#1a4a2c] shadow-sm'
                    : 'bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  filterStatus === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showBulkActions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-blue-600 dark:bg-blue-500/10 backdrop-blur-md border border-blue-700 dark:border-blue-500/20 rounded-2xl p-4 text-white"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-blue-400">
                  {selectedJobs.size} job{selectedJobs.size !== 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={() => {
                    setSelectedJobs(new Set());
                    setShowBulkActions(false);
                  }}
                  className="text-blue-400 hover:text-blue-300 text-xs underline"
                >
                  Clear selection
                </button>
              </div>
              <div className="flex items-center gap-2">
                <select
                  onChange={async (e) => {
                    const status = e.target.value;
                    if (!status) return;
                    const promises = Array.from(selectedJobs).map(jobId =>
                      authenticatedFetch(`/api/jobs/${jobId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status }),
                      })
                    );
                    await Promise.all(promises);
                    loadData();
                    setSelectedJobs(new Set());
                    setShowBulkActions(false);
                    toast.success('Updated status for selected jobs');
                  }}
                  className="px-3 py-1 text-xs border border-gray-300 dark:border-lime-500/20 rounded-xl bg-gray-100 dark:bg-[#232f1c] text-gray-900 dark:text-white"
                  defaultValue=""
                >
                  <option value="" disabled>Update Status</option>
                  <option value="saved">Saved</option>
                  <option value="created">Staging</option>
                  <option value="applied">Applied</option>
                  <option value="interview">Interview</option>
                  <option value="offer">Offer</option>
                  <option value="rejected">Rejected</option>
                </select>
                <button
                  onClick={async () => {
                    if (!confirm(`Are you sure you want to delete ${selectedJobs.size} jobs?`)) return;
                    const promises = Array.from(selectedJobs).map(jobId =>
                      authenticatedFetch(`/api/jobs/${jobId}`, { method: 'DELETE' })
                    );
                    await Promise.all(promises);
                    loadData();
                    setSelectedJobs(new Set());
                    setShowBulkActions(false);
                    toast.success('Selected jobs deleted');
                  }}
                  className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {viewMode === 'list' ? (
        <JobsListView
          jobs={filteredJobs}
          loading={loading}
          selectedJobs={selectedJobs}
          setSelectedJobs={setSelectedJobs}
          setShowBulkActions={setShowBulkActions}
          onJobClick={handleJobClick}
          onEditJob={handleEditJob}
          onDeleteJob={handleDeleteJob}
          getJobJourneys={getJobJourneys}
          getJourneyProgress={getJourneyProgress}
          getJourneyStatusText={getJourneyStatusText}
        />
      ) : (
        <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-sm min-h-[500px]">
          <JobsKanbanView
            jobs={filteredJobs}
            jobsByStatus={jobsByStatus}
            loading={loading}
            selectedJobs={selectedJobs}
            setSelectedJobs={setSelectedJobs}
            setShowBulkActions={setShowBulkActions}
            draggedJob={draggedJob}
            zoomedStage={zoomedStage}
            onJobClick={handleJobClick}
            onStageClick={handleStageClick}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            isJobDraggable={isJobDraggable}
            isDraggableStage={isDraggableStage}
            getJobJourneys={getJobJourneys}
            getJourneyProgress={getJourneyProgress}
            getJourneyStatusText={getJourneyStatusText}
            isFocusMode={isFocusMode}
            journeys={journeys}
            onJobStatusUpdate={handleJobStatusUpdate}
            onCreateJourney={handleCreateJourney}
            onRefresh={() => loadData(true)}
            onImproveATS={handleImproveATS}
            onDownload={handleDownload}
          />
        </div>
      )}

      <EditJobSidebar
        isOpen={showAddJobModal}
        onClose={() => {
          setShowAddJobModal(false);
          setEditingJob(null);
        }}
        onJobSaved={handleJobSaved}
        existingJobs={jobs}
        editingJob={editingJob ? {
          id: editingJob.id,
          jobTitle: editingJob.jobTitle,
          company: editingJob.company,
          location: editingJob.location,
          jobUrl: editingJob.jobUrl,
          jobDescription: editingJob.jobDescription,
          notes: editingJob.notes,
          priority: editingJob.priority,
          status: editingJob.status,
          deadline: editingJob.deadline ? (typeof editingJob.deadline === 'string' ? editingJob.deadline : new Date(editingJob.deadline).toISOString().split('T')[0]) : undefined,
          applicationDate: editingJob.applicationDate ? (typeof editingJob.applicationDate === 'string' ? editingJob.applicationDate : new Date(editingJob.applicationDate).toISOString().split('T')[0]) : undefined,
          salary: editingJob.salary,
          sponsorship: editingJob.sponsorship,
          tags: editingJob.tags,
          contactDetails: editingJob.contactDetails || { name: '', email: '', phone: '', role: '' },
          source: editingJob.source as any,
          createdAt: editingJob.createdAt,
          updatedAt: editingJob.updatedAt
        } : null}
        userId={userId || ''}
      />

      {showModal && selectedJob && (
        <JobSidebar
          job={selectedJob}
          journeys={getJobJourneys(selectedJob.id || selectedJob._id)}
          onClose={handleCloseModal}
          onRefresh={loadData}
          openContext={sidebarOpenContext || undefined}
        />
      )}

      <JobParserSidebar
        isOpen={showJobParserDialog}
        onClose={() => setShowJobParserDialog(false)}
        onParseComplete={handleParseComplete}
      />

      {showPaywall && paywallInfo && (
        <JobCreationPaywall
          isOpen={showPaywall}
          onClose={() => setShowPaywall(false)}
          currentCount={paywallInfo.currentCount}
          limit={paywallInfo.limit}
          preselectedPlanKey="focused_monthly"
        />
      )}

      <UpgradePromptCard
        isOpen={showTrackerAccessPrompt}
        onClose={() => setShowTrackerAccessPrompt(false)}
        title="Job Tracker requires Focused"
        description="Your current plan doesn't include the job tracker. Upgrade to Focused or higher to track unlimited applications."
        icon={<Briefcase className="w-4 h-4" />}
        preselectedPlanKey="focused_monthly"
        triggerContext="job-tracker"
        primaryLabel="Upgrade to Focused"
        secondaryLabel="Maybe Later"
      />

      <TrackerCreatedStageModal
        isOpen={Boolean(pendingCreatedStageJob)}
        onClose={() => setPendingCreatedStageJob(null)}
        onConfirm={async () => {
          if (!pendingCreatedStageJob) return;
          const jobToCreate = pendingCreatedStageJob;
          setPendingCreatedStageJob(null);
          await handleJobStatusUpdate(jobToCreate.id || jobToCreate._id, 'created');
        }}
        jobTitle={pendingCreatedStageJob?.jobTitle || pendingCreatedStageJob?.title}
        company={pendingCreatedStageJob?.company}
        preview={trackerCreatedStagePreview}
        isSubmitting={Boolean(
          pendingCreatedStageJob &&
          isUpdatingJobStatus.has(pendingCreatedStageJob.id || pendingCreatedStageJob._id)
        )}
      />

      {showDownloadModal && downloadJobId && (
        <DownloadModal
          isOpen={showDownloadModal}
          onClose={() => {
            setShowDownloadModal(false);
            setDownloadJobId(null);
          }}
          onDownload={(docType, format) => {
            const journey = getJobJourneys(downloadJobId).find(j => j.id);
            if (!journey) return;
            const baseUrl = '/api/download';
            const params = new URLSearchParams();
            if (journey.cvId) params.append('cvId', journey.cvId);
            if (journey.coverLetterId) params.append('coverLetterId', journey.coverLetterId);
            params.append('type', docType);
            params.append('format', format);
            window.open(`${baseUrl}?${params.toString()}`, '_blank');
            setShowDownloadModal(false);
          }}
          onPaywallRequired={() => {
            openPaymentModal({
              preselectedPlanKey: 'focused_monthly',
              triggerContext: 'docx-export',
              returnUrl: window.location.href
            });
            setShowDownloadModal(false);
          }}
          cvType="journey"
          cvId={getJobJourneys(downloadJobId).find(j => j.cvId)?.cvId}
          coverLetterId={getJobJourneys(downloadJobId).find(j => j.coverLetterId)?.coverLetterId}
        />
      )}
    </div>
  );
}

export default ApplicationsPanel;
