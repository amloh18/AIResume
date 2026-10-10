// @ts-nocheck pre-existing type escape — removal tracked as R14 in docs/application-automation/fix-tasks.md
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
import { Button, IconButton, Pill, SearchInput, Dropdown } from '@/components/ui';
import { authenticatedFetch } from '@/lib/utils/apiUtils';
import type { BadgeActionId } from '@/lib/utils/application-status-badge';
import { formatQueueEta } from '@/lib/utils/queue-eta';
import { useUnifiedAuth, getUserIdForAPI } from '@/lib/hooks/useUnifiedAuth';
import { useUserData } from '@/lib/hooks/useUserData';
import { useEntitlements } from '@/lib/hooks/useEntitlements';
import toast from '@/lib/hot-toast';
import { CVJourney } from '@/types/cv';
import JobSidebar from '@/components/dashboard/jobs/JobSidebar';
import { readSessionCache, writeSessionCache } from '@/lib/utils/session-cache';
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
import { isJourneyCv, isJourneyCoverLetter } from '@/lib/utils/document-kind';
import {
  buildJourneyIndex,
  getJobJourneysFromIndex,
} from '@/lib/utils/journey-documents';
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
  const { plan, getLimit } = useEntitlements();
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
  const [cvs, setCvs] = useState<any[]>([]);
  const [coverLetters, setCoverLetters] = useState<any[]>([]);
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
  /** In-flight guard + loading flag for the bulk status/delete controls. */
  const [bulkUpdating, setBulkUpdating] = useState(false);
  /**
   * Re-entry guard for bulk operations. React batches same-tick state updates,
   * so two fast clicks both read the pre-update `bulkUpdating`; a ref sees the
   * first click synchronously (same pattern as `creatingJourneysRef` below).
   */
  const bulkUpdatingRef = useRef(false);
  const [draggedJob, setDraggedJob] = useState<string | null>(null);
  const [zoomedStage, setZoomedStage] = useState<string | null>(null);
  const [showJobParserDialog, setShowJobParserDialog] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showTrackerAccessPrompt, setShowTrackerAccessPrompt] = useState(false);
  const [paywallInfo, setPaywallInfo] = useState<{ currentCount: number; limit: number } | null>(null);
  const [isUpdatingJobStatus, setIsUpdatingJobStatus] = useState<Set<string>>(new Set());
  /**
   * Job ids with a document-generation request in flight.
   *
   * This has to live here rather than in the card: `loadData` replaces the
   * `jobs` array as soon as the request starts, so the cards remount and any
   * card-local in-flight flag is wiped — which is exactly how the user was able
   * to fire the same request repeatedly and stack up duplicate "application
   * submitted" notifications.
   */
  const [creatingJourneys, setCreatingJourneys] = useState<Set<string>>(new Set());
  /**
   * Authoritative re-entry guard. React batches same-tick state updates, so two
   * clicks in the same frame both read the pre-update `creatingJourneys`; a ref
   * is the only thing that sees the first click synchronously.
   */
  const creatingJourneysRef = useRef<Set<string>>(new Set());
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
      setShowJobParserDialog(true);
    }
  }, [deepLinkNewJob]);

  // Namespaced by user: the session cache is process-wide, so a constant key
  // would hand one account's tracker to the next sign-in without a reload.
  const trackerCacheKey = `tracker:${userId}`;

  const loadData = useCallback(async (silent = false, signal?: AbortSignal) => {
    try {
      if (!silent) setLoading(true);
      const [jobsRes, journeysRes, cvsRes, coverLettersRes] = await Promise.all([
        fetch('/api/jobs?limit=all', { cache: 'no-store', signal }),
        fetch('/api/journeys?limit=all', { cache: 'no-store', signal }),
        fetch('/api/cvs?projection=summary', { cache: 'no-store', signal }),
        fetch('/api/cover-letters', { cache: 'no-store', signal }),
      ]);

      // Collect into locals first, publish once at the end. Writing the cache
      // inside the individual `if (res.ok)` blocks would let a partially-failed
      // load store a snapshot with empty collections, and the next mount would
      // then hydrate "no data" and look like data loss.
      let nextJobs: any[] | null = null;
      let nextJourneys: any[] | null = null;
      let nextCvs: any[] | null = null;
      let nextCoverLetters: any[] | null = null;

      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        const rawJobs = jobsData?.data?.jobs || (Array.isArray(jobsData?.jobs) ? jobsData.jobs : []);
        nextJobs = rawJobs.map((j: any) => ({
          ...j,
          id: j.id || j._id,
          jobTitle: j.jobTitle || j.title || 'Untitled Role',
          company: j.company || 'Unknown Company',
        }));
        setJobs(nextJobs);
      }

      if (journeysRes.ok) {
        const journeysData = await journeysRes.json();
        nextJourneys = journeysData?.data?.journeys || (Array.isArray(journeysData?.journeys) ? journeysData.journeys : []);
        setJourneys(nextJourneys);
      }

      if (cvsRes.ok) {
        const cvsData = await cvsRes.json();
        nextCvs = Array.isArray(cvsData) ? cvsData : cvsData?.data?.cvs || [];
        setCvs(nextCvs);
      }

      if (coverLettersRes.ok) {
        const clData = await coverLettersRes.json();
        nextCoverLetters = Array.isArray(clData) ? clData : clData?.data?.coverLetters || [];
        setCoverLetters(nextCoverLetters);
      }

      if (nextJobs && nextJourneys && nextCvs && nextCoverLetters) {
        writeSessionCache(trackerCacheKey, {
          jobs: nextJobs,
          journeys: nextJourneys,
          cvs: nextCvs,
          coverLetters: nextCoverLetters,
        });
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Failed to load application tracker data:', err);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [trackerCacheKey]);

  useEffect(() => {
    // A snapshot already taken during this page load: render it straight away
    // rather than refetching, so revisiting the tab is instant. A browser
    // refresh starts with an empty store — that is what keeps the "refresh
    // reloads" half of the contract intact. Explicit updates still refetch
    // (see the `jobUpdated` listener below), which is the other half.
    const cached = readSessionCache<any>(trackerCacheKey);
    if (cached) {
      setJobs(cached.jobs);
      setJourneys(cached.journeys);
      setCvs(cached.cvs);
      setCoverLetters(cached.coverLetters);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    loadData(false, controller.signal);
    return () => controller.abort();
  }, [loadData, trackerCacheKey]);

  // Mirror the live collection into the snapshot on every change — a load, an
  // optimistic `jobUpdated` patch, a status change. Without this the cache would
  // keep the pre-update rows and a later mount would silently show stale data.
  // Only ever updates an entry that already exists, so it can never create a
  // snapshot before the first successful load.
  useEffect(() => {
    const cached = readSessionCache<any>(trackerCacheKey);
    if (cached) writeSessionCache(trackerCacheKey, { ...cached, jobs });
  }, [jobs, trackerCacheKey]);

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

    const scoredJobs = jobs.filter((j) => typeof j.matchScore === 'number' && j.matchScore > 0);
    const avgScore = scoredJobs.length > 0
      ? Math.round(scoredJobs.reduce((sum, j) => sum + (j.matchScore ?? 0), 0) / scoredJobs.length)
      : 0;
    const strongMatches = scoredJobs.filter((j) => (j.matchScore ?? 0) >= 70).length;

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
    cvs.forEach((c: any) => {
      if (isJourneyCv(c)) {
        const key = c.journeyId || c.jobId || c.targetJobId || c.metadata?.jobId || c.id || c._id;
        if (key) journeyAppIds.add(String(key));
      }
    });
    coverLetters.forEach((cl: any) => {
      if (isJourneyCoverLetter(cl)) {
        const key = cl.journeyId || cl.jobId || cl.jobApplicationId || cl.metadata?.jobId || cl.id || cl._id;
        if (key) journeyAppIds.add(String(key));
      }
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
  }, [jobs, journeys, cvs, coverLetters]);

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
        const scoreA = a.matchScore ?? 0;
        const scoreB = b.matchScore ?? 0;
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

  /*
    ONE journey index for the kanban, the list and the sidebar.

    All three used to call `getJobJourneys()` over a list fetched from
    `/api/journeys?limit=all` — a request that carried no `userId` and was
    rejected with a 400, so the list was always empty and every card read
    "Partially generated" / "no documents". The sidebar looked correct only
    because it happens to self-fetch `/api/application-journey?jobId=…`.

    The route now resolves the user from the session, and this index additionally
    falls back to the journey `/api/jobs` embeds on each application, so a list
    that is slow, cached-stale or failing degrades to slightly less detail
    instead of to "no documents at all".
  */
  const journeyIndex = useMemo(
    () => buildJourneyIndex(journeys, jobs as any),
    [journeys, jobs],
  );

  const getJobJourneys = useCallback((jobId: string): CVJourney[] => {
    const fromIndex = getJobJourneysFromIndex(journeyIndex, jobId);
    if (fromIndex.length > 0) return fromIndex;
    // Legacy rows keyed by `targetJobId` rather than the application id.
    return journeys.filter(j => (j as any).targetJobId === jobId);
  }, [journeyIndex, journeys]);

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
    setShowJobParserDialog(true);
  };

  const handleEditJob = (job: JobApplication) => {
    setSelectedJob(job);
    setSidebarOpenContext({ autoOpenEdit: true });
    setShowModal(true);
  };

  const handleDeleteJob = async (job: JobApplication) => {
    const jobId = job.id || job._id;
    if (!confirm(`Are you sure you want to delete "${job.jobTitle || job.title || 'this job'}" at ${job.company || 'Unknown Company'}?`)) return;
    try {
      const res = await authenticatedFetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Job deleted successfully');
        setJobs(prev => prev.filter(j => (j.id || j._id) !== jobId));
        window.dispatchEvent(new CustomEvent('jobDeleted', { detail: { jobId } }));
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
  };

  const handleViewModeChange = (mode: 'list' | 'kanban') => {
    setViewMode(mode);
    savePreferences({ mode });
  };

  const handleJobStatusUpdate = async (jobId: string, newStatus: string, silent = false) => {
    try {
      setIsUpdatingJobStatus(prev => new Set(prev).add(jobId));
      const res = await authenticatedFetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setJobs(prev => prev.map(j => (j.id === jobId || j._id === jobId) ? { ...j, status: newStatus as any } : j));
        window.dispatchEvent(new CustomEvent('jobUpdated', { detail: { jobId, status: newStatus } }));
        if (!silent) toast.success(`Job moved to ${newStatus}`);
      } else {
        if (!silent) toast.error('Failed to update status');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      if (!silent) toast.error('Error updating status');
    } finally {
      setIsUpdatingJobStatus(prev => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  /*
    Shared control for a parked/failed application (list, kanban and sidebar
    all route through here): approve lets the worker submit automatically,
    retry re-runs a failed attempt, dismiss cancels the queue item and hands
    the application to the user — opening the posting so they can apply.

    A rejected call usually means the state moved under us (the worker picked
    the item up, or the row is no longer parked): reload so the chip and its
    action re-derive instead of going stale.
  */
  const handleAutomationAction = async (job: any, actionId: BadgeActionId) => {
    const jobId = job.id || job._id;
    if (!jobId) return;

    if (actionId === 'enter_code') {
      const code = window.prompt(
        'Enter the 8-character verification code sent to your email by Greenhouse:'
      );
      if (!code || code.trim().length < 4) return;

      const toastId = `automation-code-${jobId}`;
      toast.loading('Submitting verification code…', { id: toastId });
      try {
        const res = await authenticatedFetch(`/api/applications/${jobId}/automation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'submit_code', code: code.trim() }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to submit verification code');

        toast.success('Verification code submitted! Submitting application now...', { id: toastId });
        window.dispatchEvent(new CustomEvent('jobUpdated', { detail: { jobId } }));
        loadData();
      } catch (err: any) {
        toast.error(err?.message || 'Failed to submit verification code', { id: toastId });
        loadData();
      }
      return;
    }

    const busy =
      actionId === 'approve' ? 'Approving submission…'
      : actionId === 'retry' ? 'Retrying submission…'
      : 'Stopping automation…';
    const toastId = `automation-${jobId}`;
    toast.loading(busy, { id: toastId });
    try {
      const res = await authenticatedFetch(`/api/applications/${jobId}/automation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Request failed');

      const eta =
        typeof data.etaSeconds === 'number'
          ? ` Estimated completion ${formatQueueEta(data.etaSeconds)}.`
          : '';
      toast.success(`${data.message || 'Done'}${eta}`, { id: toastId });
      window.dispatchEvent(new CustomEvent('jobUpdated', { detail: { jobId } }));
      loadData();
      if (actionId === 'dismiss') {
        const url = job.jobUrl || job.applyUrl || job.sourceUrl;
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Request failed', { id: toastId });
      loadData();
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

    if ((job.status === 'draft' || job.status === 'saved') && targetStatus === 'created') {
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

  const handleCreateJourney = async (jobOrId: JobApplication | string) => {
    const job = typeof jobOrId === 'string'
      ? jobs.find(j => (j.id || j._id) === jobOrId) || null
      : jobOrId;
    const jobId = typeof jobOrId === 'string' ? jobOrId : (jobOrId.id || jobOrId._id);
    if (!job) return;

    // Re-entry guard. Without it, a double-click (or a click while the first
    // request is still in flight) creates two journeys and two sets of
    // documents for the same job.
    if (creatingJourneysRef.current.has(jobId)) {
      toast('Already in progress', {
        id: `journey-${jobId}`,
        description: 'Documents for this job are already being generated. Please wait.',
      });
      return;
    }
    creatingJourneysRef.current.add(jobId);
    setCreatingJourneys(new Set(creatingJourneysRef.current));

    try {
      toast.loading('Creating journey & generating documents…', { id: `journey-${jobId}` });

      // 1. Move job to 'created' status first (API rejects 'saved' jobs)
      await handleJobStatusUpdate(jobId, 'created', true);

      // 2. Create the journey via API (triggers async CV/CL generation)
      const res = await authenticatedFetch('/api/application-journey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          jobTitle: job.jobTitle || job.title,
          company: job.company,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create journey');
      }

      // 3. Refresh data to pick up the new journey
      await loadData(true);
      window.dispatchEvent(new CustomEvent('jobUpdated', { detail: { jobId, journeyCreated: true } }));

      toast.success('Journey created — documents generating in background', { id: `journey-${jobId}` });
    } catch (err: any) {
      console.error('Error creating journey:', err);
      toast.error(err.message || 'Failed to create journey', { id: `journey-${jobId}` });
    } finally {
      // Release the guard once the request settles. The card keeps showing
      // progress from `journeys` state after this — the guard only exists to
      // stop duplicate requests, not to be the progress source of truth.
      creatingJourneysRef.current.delete(jobId);
      setCreatingJourneys(new Set(creatingJourneysRef.current));
    }
  };

  const handleImproveATS = (jobId: string) => {
    router.push(`/editor?mode=improve&jobId=${jobId}`);
  };

  /**
   * Stable identity matters: `JobKanbanCard`'s poll effect lists this in its
   * dependency array, so a fresh arrow on every render would tear down and
   * restart the interval on each progress tick — the 3s poll would never fire
   * and the 5-minute deadline would never be reached.
   */
  const handleRefresh = useCallback(() => {
    loadData(true);
  }, [loadData]);

  const handleDownload = (jobId: string) => {
    setDownloadJobId(jobId);
    setShowDownloadModal(true);
  };

  const handleParseComplete = async (data?: any) => {
    setShowJobParserDialog(false);
    if (!data) {
      loadData(true);
      return;
    }

    try {
      const payload = {
        jobTitle: data.jobTitle || 'Untitled Role',
        company: data.company || 'Unknown Company',
        location: data.location || 'Remote',
        jobUrl: data.jobUrl || '',
        jobDescription: data.jobDescription || data.jobDescriptionRaw || '',
        salary: data.salary,
        experienceLevel: data.experienceLevel,
        tags: data.tags || [],
        sponsorship: data.sponsorship,
        benefits: data.benefits,
        status: 'created',
        source: 'manual',
      };

      const res = await authenticatedFetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success('Job application created successfully!');
        window.dispatchEvent(new CustomEvent('creditsUpdated'));
        window.dispatchEvent(new CustomEvent('jobUpdated'));
        loadData(true);
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || errorData.message || 'Failed to save job application');
      }
    } catch (err) {
      console.error('Failed to create job application:', err);
      toast.error('Failed to create job application');
    }
  };

  // Use the authoritative auto_apply_monthly limit from the entitlement engine
  const autoApplyLimit = getLimit('auto_apply_monthly');
  const isUnlimited = autoApplyLimit?.remaining === null;
  const limit = isUnlimited ? Infinity : (autoApplyLimit?.limit ?? (plan === 'free' ? 10 : 25));
  const used = autoApplyLimit?.used ?? stats.aiJourneyUsage;
  const remaining = isUnlimited ? null : Math.max(0, limit - used);

  const usageMetric = isUnlimited
    ? {
        label: 'Usage',
        value: `${used} used`,
        icon: <Zap size={16} strokeWidth={1.75} />,
        trend: 'Unlimited',
        trendUp: true,
      }
    : {
        label: 'Usage',
        value: `${used} / ${limit}`,
        icon: <Zap size={16} strokeWidth={1.75} />,
        trend: `${remaining} left`,
        trendUp: used < limit,
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
                  <div className="text-xl font-semibold tracking-tight text-[var(--text-primary)] leading-none tabular-nums block">
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

      <div className="bg-white dark:bg-[#141810] border border-gray-200/90 dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Left Controls: Search & Filters */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <SearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
                placeholder="Search by role, company, location..."
                size="md"
              />
            </div>

            <Dropdown
              size="md"
              value={sourceFilter}
              onChange={setSourceFilter}
              options={[
                { id: 'all', label: 'All Portals / Sources' },
                { id: 'direct', label: 'Direct ATS' },
                { id: 'naukri', label: 'Naukri.com' },
                { id: 'indeed', label: 'Indeed' },
                { id: 'greenhouse', label: 'Greenhouse ATS' },
                { id: 'lever', label: 'Lever ATS' },
                { id: 'adzuna', label: 'Adzuna' },
                { id: 'linkedin', label: 'LinkedIn' },
              ]}
            />

            <Dropdown
              size="md"
              value={sortBy}
              onChange={(val) => setSortBy(val as any)}
              options={[
                { id: 'appliedAt', label: 'Sort by Date Applied' },
                { id: 'matchScore', label: 'Sort by Match Score' },
                { id: 'company', label: 'Sort by Company' },
                { id: 'lastUpdated', label: 'Sort by Last Updated' },
              ]}
            />

            <IconButton
              variant="secondary"
              size="md"
              tooltip={sortOrder === 'desc' ? 'Sort Ascending' : 'Sort Descending'}
              aria-label="Toggle sort order"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            >
              <ArrowUpDown className="w-4 h-4" />
            </IconButton>
          </div>

          {/* Right Controls: View Switcher & Action CTAs */}
          <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-auto h-10">
            <div className="flex items-center h-10 p-1 rounded-xl bg-gray-100/90 dark:bg-white/5 border border-gray-200/50 dark:border-white/5 shadow-2xs">
              <button
                type="button"
                onClick={() => handleViewModeChange('list')}
                className={`h-full px-3.5 rounded-[8px] text-xs font-semibold transition-all duration-150 ease-out flex items-center gap-1.5 ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-[#1a230f] text-gray-900 dark:text-white shadow-xs font-bold'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium'
                }`}
                title="Table view"
              >
                <List className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange('kanban')}
                className={`h-full px-3.5 rounded-[8px] text-xs font-semibold transition-all duration-150 ease-out flex items-center gap-1.5 ${
                  viewMode === 'kanban'
                    ? 'bg-white dark:bg-[#1a230f] text-gray-900 dark:text-white shadow-xs font-bold'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium'
                }`}
                title="Kanban view"
              >
                <Columns3 className="w-3.5 h-3.5" />
                <span>Kanban</span>
              </button>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={handleAddJob}
              leftIcon={<Plus className="w-4 h-4 stroke-[2.5]" />}
            >
              Add Job
            </Button>
          </div>
        </div>

        {/* Status filter chips ONLY rendered in list view */}
        {viewMode === 'list' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide border-t border-gray-100 dark:border-white/5 pt-3">
            {[
              { id: 'all', label: 'All Applications', count: stats.total },
              { id: 'created', label: 'Staging / Ready', count: stats.pending },
              { id: 'applied', label: 'Applied', count: stats.applied },
              { id: 'interview', label: 'Interviewing', count: stats.interview },
              { id: 'offer', label: 'Offers', count: stats.offer },
              { id: 'rejected', label: 'Declined', count: stats.rejected },
            ].map((tab) => (
              <Pill
                key={tab.id}
                size="md"
                selected={filterStatus === tab.id}
                onClick={() => setFilterStatus(tab.id)}
                badgeCount={tab.count}
              >
                {tab.label}
              </Pill>
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
                    if (bulkUpdatingRef.current) return;
                    bulkUpdatingRef.current = true;
                    setBulkUpdating(true);
                    const ids = Array.from(selectedJobs);
                    try {
                      const results = await Promise.all(
                        ids.map(jobId =>
                          authenticatedFetch(`/api/jobs/${jobId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status }),
                          })
                        )
                      );
                      const failed = results.filter((r) => !r.ok).length;
                      if (failed === 0) {
                        toast.success('Updated status for selected jobs');
                        // Only clear the selection on full success so failed
                        // rows stay selected and can be retried.
                        setSelectedJobs(new Set());
                        setShowBulkActions(false);
                      } else {
                        toast.error(`Couldn't update ${failed} of ${ids.length} jobs`);
                      }
                      loadData();
                    } catch {
                      toast.error(`Couldn't update ${ids.length} jobs`);
                    } finally {
                      bulkUpdatingRef.current = false;
                      setBulkUpdating(false);
                    }
                  }}
                  disabled={bulkUpdating}
                  className="px-3 py-1 text-xs border border-gray-300 dark:border-lime-500/20 rounded-xl bg-gray-100 dark:bg-[#232f1c] text-gray-900 dark:text-white disabled:opacity-60"
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
                {bulkUpdating && (
                  <span className="text-xs font-medium text-blue-200 animate-pulse">
                    Updating...
                  </span>
                )}
                <button
                  onClick={async () => {
                    if (bulkUpdatingRef.current) return;
                    if (!confirm(`Are you sure you want to delete ${selectedJobs.size} jobs?`)) return;
                    bulkUpdatingRef.current = true;
                    setBulkUpdating(true);
                    const ids = Array.from(selectedJobs);
                    try {
                      const results = await Promise.all(
                        ids.map(jobId =>
                          authenticatedFetch(`/api/jobs/${jobId}`, { method: 'DELETE' })
                        )
                      );
                      const failed = results.filter((r) => !r.ok).length;
                      if (failed === 0) {
                        toast.success('Selected jobs deleted');
                        // Only clear the selection on full success so failed
                        // rows stay selected and can be retried.
                        setSelectedJobs(new Set());
                        setShowBulkActions(false);
                      } else {
                        toast.error(`Couldn't delete ${failed} of ${ids.length} jobs`);
                      }
                      loadData();
                    } catch {
                      toast.error(`Couldn't delete ${ids.length} jobs`);
                    } finally {
                      bulkUpdatingRef.current = false;
                      setBulkUpdating(false);
                    }
                  }}
                  disabled={bulkUpdating}
                  className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Trash2 size={13} />
                  <span>{bulkUpdating ? 'Deleting...' : 'Delete'}</span>
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
          onAutomationAction={handleAutomationAction}
          getJobJourneys={getJobJourneys}
          getJourneyProgress={getJourneyProgress}
          getJourneyStatusText={getJourneyStatusText}
        />
      ) : (
        <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-sm" style={{ minHeight: 'calc(100vh - 320px)' }}>
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
            onRefresh={handleRefresh}
            pendingJourneyJobIds={creatingJourneys}
            onImproveATS={handleImproveATS}
            onDownload={handleDownload}
            onAutomationAction={handleAutomationAction}
          />
        </div>
      )}

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
          await handleCreateJourney(jobToCreate);
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
