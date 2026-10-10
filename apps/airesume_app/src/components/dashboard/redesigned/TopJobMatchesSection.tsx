'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Briefcase,
  Sparkles,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Plus,
  Zap,
  Loader2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { useNotifications } from '@/contexts/NotificationContext';
import { useApplyProgress } from '@/hooks/useApplyProgress';
import { JobDetailModal } from '@/components/jobs/JobDetailModal';
import { EntitlementNotice, EntitlementNoticeData } from '@/components/jobs/EntitlementNotice';
import { JobCard } from '@/components/jobs/JobCard';
import type { JobListing } from '@/types/automation-schema';
import { toUserFacingMessage } from '@/lib/utils/user-facing-error';
import { useJobLiveStatusStore } from '@/lib/stores/jobLiveStatusStore';
import { useApplicationProgress, invalidateApplicationProgress } from '@/hooks/useApplicationProgress';
import JobParserSidebar from '@/components/dashboard/jobs/JobParserSidebar';
import JobSidebar from '@/components/dashboard/jobs/JobSidebar';
import type { JobCardTrackerInfo } from '@/components/jobs/JobCard';
import { useEntitlements } from '@/lib/hooks/useEntitlements';

export interface TopMatchJob {
  _id: string;
  title: string;
  company: string;
  location: string;
  experienceYears?: number;
  postedAgo: string;
  matchScore: number;
  skills: string[];
  companyLogo?: string;
  applyUrl: string;
  source: string;
  salary?: string;
  matchReasons?: string[];
  rawJob: JobListing;
  /** Freshness data if this job is fresh (< 24h) */
  freshness?: {
    score: number;
    ageHours: number;
  };
  /** Whether this card is a fresh match */
  isFresh?: boolean;
}

const TOP_MATCHES_CACHE_KEY = 'buildairesume_top_matches_cache_v1';
const TOP_MATCHES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// In-memory module cache for instant 0ms tab switches
let memoryTopMatchesCache: { jobs: TopMatchJob[]; timestamp: number } | null = null;

const timeAgo = (date: string | Date) => {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  const days = Math.floor(seconds / 86400);
  return days > 0 ? `${days}d ago` : 'Recently';
};

export default function TopJobMatchesSection() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const { updateProgress } = useNotifications();
  const applyProgress = useApplyProgress();
  const { statuses, clearStatus } = useJobLiveStatusStore();
  /*
    Live progress comes from the shared cache, so this carousel, the Discover
    feed, the tracker and the journey sidebar all show the same step of the same
    application — and all advance together as the worker moves.
  */
  const { getForJob } = useApplicationProgress();
  const queryClient = useQueryClient();
  /*
    Apply re-entry guard (pattern from JobsDashboard `handleApplyJob`): the CTA
    is disabled while a run is in flight, but a double-click can land both
    events before React re-renders, and `POST /api/jobs/auto-apply` enqueues a
    NEW ApplicationQueue row per call — two calls meant two submissions.
    The ref is the only thing that sees the first click synchronously.
  */
  const applyingRef = useRef(false);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);

  const [jobs, setJobs] = useState<TopMatchJob[]>(() => {
    // 1. Check memory cache first (instant 0ms on tab switches)
    if (
      memoryTopMatchesCache &&
      Date.now() - memoryTopMatchesCache.timestamp < TOP_MATCHES_CACHE_TTL
    ) {
      return memoryTopMatchesCache.jobs;
    }
    // 2. Check sessionStorage (instant 0ms on page reload / navigation)
    if (typeof window !== 'undefined') {
      try {
        const raw = sessionStorage.getItem(TOP_MATCHES_CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (
            parsed &&
            Array.isArray(parsed.jobs) &&
            Date.now() - parsed.timestamp < TOP_MATCHES_CACHE_TTL
          ) {
            memoryTopMatchesCache = parsed;
            return parsed.jobs;
          }
        }
      } catch {}
    }
    return [];
  });

  const [hasCachedData] = useState<boolean>(() => {
    if (
      memoryTopMatchesCache &&
      memoryTopMatchesCache.jobs.length > 0 &&
      Date.now() - memoryTopMatchesCache.timestamp < TOP_MATCHES_CACHE_TTL
    ) {
      return true;
    }
    if (typeof window !== 'undefined') {
      try {
        const raw = sessionStorage.getItem(TOP_MATCHES_CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (
            parsed &&
            Array.isArray(parsed.jobs) &&
            parsed.jobs.length > 0 &&
            Date.now() - parsed.timestamp < TOP_MATCHES_CACHE_TTL
          ) {
            return true;
          }
        }
      } catch {}
    }
    return false;
  });

  const [loading, setLoading] = useState<boolean>(!hasCachedData);
  const [hasFetched, setHasFetched] = useState<boolean>(hasCachedData);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [trackerSidebarOpen, setTrackerSidebarOpen] = useState(false);
  const [selectedTrackerJob, setSelectedTrackerJob] = useState<any | null>(null);
  const [trackerAppMap, setTrackerAppMap] = useState<Map<string, any>>(new Map());
  const [isParserOpen, setIsParserOpen] = useState(false);
  const [isApplyingAll, setIsApplyingAll] = useState(false);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [applicationMode, setApplicationMode] = useState<string>('manual_review');
  const [entitlementNoticeData, setEntitlementNoticeData] = useState<EntitlementNoticeData | null>(null);
  const [entitlementNoticeOpen, setEntitlementNoticeOpen] = useState(false);
  const { getAutoApplyUsage } = useEntitlements();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll, jobs]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const cardWidth = el.querySelector<HTMLElement>(':scope > div')?.offsetWidth || 280;
    el.scrollBy({ left: direction === 'left' ? -(cardWidth + 16) : cardWidth + 16, behavior: 'smooth' });
  };

  // Load saved & tracker applications for this user
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    async function loadSaved() {
      try {
        const res = await fetch('/api/jobs?limit=100&lite=true', { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          const items = data.jobs || data.data || [];
          if (Array.isArray(items)) {
            const set = new Set<string>();
            const appMap = new Map<string, any>();
            const appliedSet = new Set<string>();
            items.forEach((j: any) => {
              const dbId = j._id || j.id;
              if (dbId) {
                appMap.set(dbId, j);
                if (j.jobId) appMap.set(j.jobId, j);
                if (j.externalId) appMap.set(j.externalId, j);
                if (j.jobUrl || j.sourceUrl) {
                  appMap.set(String(j.jobUrl || j.sourceUrl).trim().toLowerCase(), j);
                }
                const comp = (j.company || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                const tit = (j.jobTitle || j.title || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                if (comp && tit) {
                  appMap.set(`${comp}___${tit}`, j);
                }
              }
              const isSavedOnly = j.status === 'saved' || j.status === 'draft';
              if (isSavedOnly) {
                if (j._id) set.add(j._id);
                if (j.id) set.add(j.id);
                if (j.jobId) set.add(j.jobId);
              } else if (j.status) {
                if (j._id) appliedSet.add(j._id);
                if (j.id) appliedSet.add(j.id);
                if (j.jobId) appliedSet.add(j.jobId);
              }
            });
            setSavedIds(set);
            setTrackerAppMap(appMap);
            if (appliedSet.size > 0) {
              setAppliedIds((prev) => new Set([...prev, ...appliedSet]));
            }
          }
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.warn('Failed to load saved jobs in TopMatches:', err);
        }
      }
    }
    loadSaved();
    return () => controller.abort();
  }, [userId]);

  // Load applied job IDs and application mode from server
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    async function loadApplied() {
      try {
        const res = await fetch('/api/jobs/applied-ids', { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          if (data.appliedIds) {
            setAppliedIds(new Set(data.appliedIds));
          }
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.warn('Failed to load applied IDs:', err);
        }
      }
    }
    async function loadMode() {
      try {
        const res = await fetch('/api/job-search-profile', { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          if (data.applicationMode) setApplicationMode(data.applicationMode);
        }
      } catch {}
    }
    loadApplied();
    loadMode();
    return () => controller.abort();
  }, [userId]);

  // Listen for jobUpdated events to refresh savedIds and trackerAppMap when jobs are saved/updated elsewhere
  useEffect(() => {
    const handleJobUpdated = () => {
      async function refreshSaved() {
        try {
          const res = await fetch('/api/jobs?limit=100&lite=true');
          if (res.ok) {
            const data = await res.json();
            const items = data.jobs || data.data || [];
            if (Array.isArray(items)) {
              const set = new Set<string>();
              const appMap = new Map<string, any>();
              const appliedSet = new Set<string>();
              items.forEach((j: any) => {
                const dbId = j._id || j.id;
                if (dbId) {
                  appMap.set(dbId, j);
                  if (j.jobId) appMap.set(j.jobId, j);
                  if (j.externalId) appMap.set(j.externalId, j);
                  if (j.jobUrl || j.sourceUrl) {
                    appMap.set(String(j.jobUrl || j.sourceUrl).trim().toLowerCase(), j);
                  }
                  const comp = (j.company || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                  const tit = (j.jobTitle || j.title || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                  if (comp && tit) {
                    appMap.set(`${comp}___${tit}`, j);
                  }
                }
                const isSavedOnly = j.status === 'saved' || j.status === 'draft';
                if (isSavedOnly) {
                  if (j._id) set.add(j._id);
                  if (j.id) set.add(j.id);
                  if (j.jobId) set.add(j.jobId);
                } else if (j.status) {
                  if (j._id) appliedSet.add(j._id);
                  if (j.id) appliedSet.add(j.id);
                  if (j.jobId) appliedSet.add(j.jobId);
                }
              });
              setSavedIds(set);
              setTrackerAppMap(appMap);
              if (appliedSet.size > 0) {
                setAppliedIds((prev) => new Set([...prev, ...appliedSet]));
              }
            }
          }
        } catch (err: any) {
          if (err?.name !== 'AbortError') {
            console.warn('Failed to refresh saved jobs in TopMatches:', err);
          }
        }
      }
      refreshSaved();
    };

    window.addEventListener('jobUpdated', handleJobUpdated as EventListener);
    window.addEventListener('jobDeleted', handleJobUpdated as EventListener);
    return () => {
      window.removeEventListener('jobUpdated', handleJobUpdated as EventListener);
      window.removeEventListener('jobDeleted', handleJobUpdated as EventListener);
    };
  }, []);

  const resolveTrackerApp = useCallback(
    (jobId: string, rawJob?: JobListing) => {
      const comp = (rawJob?.company || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      const tit = (rawJob?.title || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      const normUrl = rawJob?.applyUrl ? String(rawJob.applyUrl).trim().toLowerCase() : '';

      return (
        trackerAppMap.get(jobId) ||
        (rawJob?.id ? trackerAppMap.get(rawJob.id) : null) ||
        (rawJob?._id ? trackerAppMap.get(rawJob._id) : null) ||
        (normUrl ? trackerAppMap.get(normUrl) : null) ||
        (comp && tit ? trackerAppMap.get(`${comp}___${tit}`) : null) ||
        null
      );
    },
    [trackerAppMap]
  );

  const trackerForJob = useCallback(
    (jobId: string, rawJob?: JobListing): JobCardTrackerInfo | null => {
      const app = resolveTrackerApp(jobId, rawJob);
      if (!app) return null;
      return {
        status: String(app.status || 'saved'),
        applicationDate: app.applicationDate || app.appliedAt || app.updatedAt,
        atsScore: typeof app.atsScore === 'number' ? app.atsScore : undefined,
        hasCV: false,
        hasCoverLetter: false,
      };
    },
    [resolveTrackerApp]
  );

  const fetchTopMatches = useCallback(async (signal?: AbortSignal, retryCount = 0) => {
    const MAX_RETRIES = 2;
    const RETRY_DELAY_MS = 1500;

    try {
      if (!memoryTopMatchesCache || memoryTopMatchesCache.jobs.length === 0) {
        setLoading(true);
      }
      setError(null);

      // Single consolidated request for fast retrieval & scoring
      const res = await fetch('/api/jobs/discover?limit=15&sortBy=matchScore', {
        signal,
        headers: { 'Cache-Control': 'max-age=60' },
      });

      if (signal?.aborted) return;

      if (!res.ok) {
        throw new Error(`Discover returned ${res.status}`);
      }

      const data = await res.json();
      const rawList: JobListing[] = data.jobs || data.data || [];
      const now = Date.now();

      const enriched: TopMatchJob[] = rawList.map((j) => {
        const salaryText =
          j.salaryMin || j.salaryMax
            ? `${j.salaryCurrency || '$'}${j.salaryMin ? j.salaryMin.toLocaleString() : ''}${
                j.salaryMin && j.salaryMax ? ' - ' : ''
              }${j.salaryMax ? `${j.salaryMax.toLocaleString()}` : ''}`
            : undefined;

        const postedMs = j.postedDate ? new Date(j.postedDate).getTime() : 0;
        const ageHours = postedMs > 0 ? (now - postedMs) / (1000 * 60 * 60) : 999;
        const isFresh = ageHours < 48;

        return {
          _id: j._id || j.id || '',
          title: j.title || 'Untitled Role',
          company: j.company || 'Confidential',
          location: j.location || (j.remote ? 'Remote' : 'Location Not Specified'),
          experienceYears: j.experienceYears,
          postedAgo: j.postedDate ? timeAgo(j.postedDate) : 'Recently',
          matchScore: j.matchScore || 50,
          skills: (j.keywords && j.keywords.length > 0 ? j.keywords : ['Software', 'Tech']).slice(0, 3),
          companyLogo: j.companyLogo,
          applyUrl: j.applyUrl || '',
          source: j.source || 'Aggregator',
          salary: salaryText,
          matchReasons: (j as any).matchReasons || (isFresh ? ['Recently posted opportunity'] : ['Strong skills match with your profile']),
          rawJob: j,
          isFresh,
          freshness: isFresh
            ? {
                score: ageHours < 1 ? 98 : ageHours < 6 ? 90 : ageHours < 24 ? 75 : 50,
                ageHours,
              }
            : undefined,
        };
      });

      if (signal?.aborted) return;

      // Update both in-memory and sessionStorage caches for instant 0ms loads
      memoryTopMatchesCache = { jobs: enriched, timestamp: Date.now() };
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(TOP_MATCHES_CACHE_KEY, JSON.stringify(memoryTopMatchesCache));
        } catch {}
      }

      setJobs(enriched);
      setHasFetched(true);
    } catch (err: any) {
      if (err?.name === 'AbortError' || signal?.aborted) return;

      if (retryCount < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (retryCount + 1)));
        if (!signal?.aborted) {
          return fetchTopMatches(signal, retryCount + 1);
        }
        return;
      }

      console.error('Failed to load top job matches:', err);
      // Only show full error UI if no cached data was already rendered
      if (!memoryTopMatchesCache || memoryTopMatchesCache.jobs.length === 0) {
        setError(err.message || 'Failed to load top matches');
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchTopMatches(controller.signal);
    return () => controller.abort();
  }, [fetchTopMatches]);

  const handlePass = (jobId: string, e: React.MouseEvent, job?: TopMatchJob) => {
    e.stopPropagation();
    setJobs((prev) => prev.filter((j) => j._id !== jobId));
    toast({
      title: 'Job hidden',
      description: 'We won\'t show this match again.',
      company: job?.company,
      logoUrl: job?.companyLogo,
    });
  };

  const handleSaveToggle = async (job: TopMatchJob, e: React.MouseEvent) => {
    e.stopPropagation();
    const jobId = job._id;
    const isCurrentlySaved = savedIds.has(jobId) || (job.rawJob?.id ? savedIds.has(job.rawJob.id) : false);
    const app = resolveTrackerApp(jobId, job.rawJob);

    setSavingId(jobId);
    try {
      if (isCurrentlySaved) {
        const dbId = app?._id || jobId;
        const res = await fetch(`/api/jobs/${dbId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to unsave');
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(jobId);
          if (job.rawJob?.id) next.delete(job.rawJob.id);
          if (dbId) next.delete(dbId);
          return next;
        });
        toast({ title: 'Removed from saved jobs', company: job.company, logoUrl: job.companyLogo });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('jobDeleted', { detail: { jobId: dbId } }));
        }
      } else {
        const res = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId: job._id,
            title: job.title,
            company: job.company,
            location: job.location,
            source: job.source,
            jobUrl: job.applyUrl,
            status: 'saved',
            matchScore: job.matchScore,
          }),
        });
        if (!res.ok) throw new Error('Failed to save');
        const resData = await res.json().catch(() => ({}));
        const createdId = resData?.data?._id || resData?.data?.id || resData?.job?._id || resData?.job?.id || jobId;
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.add(jobId);
          if (job.rawJob?.id) next.add(job.rawJob.id);
          if (createdId) next.add(createdId);
          return next;
        });
        toast({ title: 'Job saved to your tracker!', company: job.company, logoUrl: job.companyLogo });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('jobUpdated', { detail: { jobId: createdId } }));
        }
      }
    } catch (err: any) {
      toast({
        title: 'Error saving job',
        description: err.message || 'Please try again',
        variant: 'destructive',
        company: job.company,
        logoUrl: job.companyLogo,
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleApply = async (job: TopMatchJob | JobListing, e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    const targetJob = 'rawJob' in job ? job.rawJob : job;
    const jobId = targetJob._id || targetJob.id || '';

    // Re-entry guard — see `applyingRef` above.
    if (applyingRef.current) {
      toast({
        title: 'Already in progress',
        description: 'Please wait — an application is already being submitted.',
      });
      return;
    }
    applyingRef.current = true;
    setApplyingJobId(jobId);

    // Start progress — saving stage
    applyProgress.startApplyProgress(targetJob.title, targetJob.company, jobId);

    try {
      // Tailoring CV stage
      applyProgress.updateToTailoringCV(targetJob.title, targetJob.company, jobId);

      // Tailoring cover letter stage (brief, then move to applying)
      setTimeout(() => {
        applyProgress.updateToTailoringCoverLetter(targetJob.title, targetJob.company, jobId);
      }, 600);

      const res = await fetch('/api/jobs/auto-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          title: targetJob.title,
          company: targetJob.company,
          location: targetJob.location,
          source: targetJob.source,
          jobUrl: targetJob.applyUrl,
          description: targetJob.description,
          atsType: targetJob.atsType || 'unknown',
          salary: targetJob.salaryMin || targetJob.salaryMax ? {
            min: targetJob.salaryMin,
            max: targetJob.salaryMax,
            currency: targetJob.salaryCurrency || '$',
            period: 'yearly',
          } : undefined,
          matchScore: targetJob.matchScore,
          screeningQuestions: [],
        }),
      });

      const resData = await res.json();

      // Check for entitlement / plan block outcome
      if (res.status === 403 || resData.code === 'AUTO_APPLY_NOT_INCLUDED' || resData.code === 'AUTO_APPLY_LIMIT_REACHED') {
        applyProgress.cancelProgress(jobId);
        setEntitlementNoticeData({
          code: resData.code || 'AUTO_APPLY_NOT_INCLUDED',
          jobTitle: targetJob.title,
          company: targetJob.company,
          applyUrl: targetJob.applyUrl || resData.fallbackUrl,
          message: resData.message || resData.error,
          entitlements: resData.entitlements,
          recommendation: resData.recommendation,
        });
        setEntitlementNoticeOpen(true);
        return;
      }

      // Verification / Unknown outcome
      if (resData.code === 'APPLICATION_VERIFICATION_FAILED') {
        applyProgress.cancelProgress(jobId);
        setEntitlementNoticeData({
          code: 'APPLICATION_VERIFICATION_FAILED',
          jobTitle: targetJob.title,
          company: targetJob.company,
          applyUrl: targetJob.applyUrl,
          message: resData.message,
        });
        setEntitlementNoticeOpen(true);
        return;
      }

      // Skipped by decision engine
      if (resData.status === 'skipped') {
        applyProgress.completeApply(targetJob.title, targetJob.company, true, resData.message || 'This job was skipped based on your preferences.', jobId, 'skipped');
        return;
      }

      if (res.ok && resData.success) {
        const createdId = resData.applicationId || jobId;
        setAppliedIds((prev) => {
          const next = new Set(prev);
          next.add(jobId);
          if (targetJob.id) next.add(targetJob.id);
          if (createdId) next.add(createdId);
          return next;
        });

        // Immediately invalidate entitlements so usage counters update
        queryClient.invalidateQueries({ queryKey: ['entitlements'] });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('jobUpdated', { detail: { jobId: createdId } }));
        }

        /*
          Already queued — the endpoint deduped instead of enqueueing again.
          The generic branch below would claim "Documents ready", which is
          false; report the real state once.
        */
        if (resData.status === 'already_queued') {
          applyProgress.completeApply(
            targetJob.title,
            targetJob.company,
            true,
            'This application is already queued for processing.',
            jobId,
            'queued'
          );
          return;
        }

        // Show queued or applied feedback based on actual status
        if (resData.status === 'queued') {
          applyProgress.updateToApplying(targetJob.company, jobId);
          setTimeout(() => {
            applyProgress.completeApply(targetJob.title, targetJob.company, true, resData.message || `Application queued for ${resData.mode || 'auto'} processing.`, jobId, 'queued');
          }, 1500);
        } else if (resData.status === 'applied') {
          applyProgress.completeApply(targetJob.title, targetJob.company, true, resData.message, jobId, 'applied');
        } else {
          applyProgress.completeApply(
            targetJob.title,
            targetJob.company,
            false,
            resData.message || 'The application did not complete.',
            jobId,
            resData.status
          );
        }
      } else {
        // Genuine submission failure. Sanitize: raw infra errors (DB/network)
        // must never be shown to the user.
        const failureMessage = toUserFacingMessage(
          resData.error || resData.message,
          "We couldn't complete the application on the employer's site."
        );
        applyProgress.completeApply(targetJob.title, targetJob.company, false, failureMessage, jobId);
        setEntitlementNoticeData({
          code: 'APPLICATION_FAILED',
          jobTitle: targetJob.title,
          company: targetJob.company,
          applyUrl: targetJob.applyUrl,
          message: failureMessage,
        });
        setEntitlementNoticeOpen(true);
      }
    } catch (err: any) {
      const failureMessage = toUserFacingMessage(err, 'Network error occurred during submission.');
      applyProgress.completeApply(targetJob.title, targetJob.company, false, failureMessage, jobId);
      setEntitlementNoticeData({
        code: 'APPLICATION_FAILED',
        jobTitle: targetJob.title,
        company: targetJob.company,
        applyUrl: targetJob.applyUrl,
        message: failureMessage,
      });
      setEntitlementNoticeOpen(true);
    } finally {
      applyingRef.current = false;
      setApplyingJobId(null);
    }
  };

  const handleOpenDetail = (job: TopMatchJob) => {
    const rawId = job.rawJob?.id;
    const app = resolveTrackerApp(job._id, job.rawJob);
    const isAppSaved = savedIds.has(job._id) || (rawId ? savedIds.has(rawId) : false);
    const isAppApplied =
      appliedIds.has(job._id) ||
      (rawId ? appliedIds.has(rawId) : false) ||
      Boolean(app?.status && app.status !== 'saved' && app.status !== 'draft');

    if (app || isAppSaved || isAppApplied) {
      setSelectedTrackerJob({
        ...job.rawJob,
        _id: app?._id || job._id,
        id: app?._id || job._id,
        jobTitle: job.title,
        company: job.company,
        status: app?.status || (isAppApplied ? 'applied' : 'saved'),
        matchScore: job.matchScore,
        atsScore: app?.atsScore,
      });
      setTrackerSidebarOpen(true);
    } else {
      setSelectedJob(job.rawJob);
      setModalOpen(true);
    }
  };

  const handleParseComplete = async (parsedData?: any) => {
    setIsParserOpen(false);
    if (!parsedData) return;

    try {
      const payload = {
        jobTitle: parsedData.jobTitle || 'Untitled Role',
        company: parsedData.company || 'Unknown Company',
        location: parsedData.location || 'Remote',
        jobUrl: parsedData.jobUrl || '',
        jobDescription: parsedData.jobDescription || parsedData.jobDescriptionRaw || '',
        salary: parsedData.salary,
        experienceLevel: parsedData.experienceLevel,
        tags: parsedData.tags || [],
        sponsorship: parsedData.sponsorship,
        benefits: parsedData.benefits,
        status: 'created',
        source: 'manual',
      };

      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast({
          title: 'Job Analyzed & Added',
          description: `Added "${payload.jobTitle}" at ${payload.company} to your applications.`,
        });
        window.dispatchEvent(new CustomEvent('creditsUpdated'));
        window.dispatchEvent(new CustomEvent('jobUpdated'));
        fetchTopMatches();
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast({
          title: 'Failed to Save Job',
          description: errorData.error || errorData.message || 'Could not save parsed job.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      console.error('Failed to save parsed job:', err);
      toast({
        title: 'Error',
        description: 'Failed to save parsed job application.',
        variant: 'destructive',
      });
    }
  };

  const handleApplyAll = async () => {
    // Only target unapplied jobs in the display list
    const unappliedList = jobs.filter((j) => !appliedIds.has(j._id) && !(j.rawJob?.id && appliedIds.has(j.rawJob.id)));

    if (unappliedList.length === 0) {
      toast({
        title: 'Already Applied',
        description: 'You have already applied to all recommended jobs in this list.',
      });
      return;
    }

    // Check quota / entitlements
    const quota = getAutoApplyUsage();
    if (!quota.isUnlimited && quota.remaining !== null && quota.remaining <= 0) {
      setEntitlementNoticeData({
        code: 'AUTO_APPLY_LIMIT_REACHED',
        jobTitle: unappliedList[0]?.title || 'Recommended Jobs',
        company: unappliedList[0]?.company || 'Target Companies',
        applyUrl: unappliedList[0]?.applyUrl || '',
        message: 'Your daily auto-apply allowance has been reached for today. Upgrade your plan to increase limits.',
      });
      setEntitlementNoticeOpen(true);
      return;
    }

    setIsApplyingAll(true);
    let successfulCount = 0;
    let stoppedEarly = false;

    toast({
      title: 'Applying to Matches',
      description: `Starting auto-applications for ${unappliedList.length} top job matches…`,
    });

    for (let i = 0; i < unappliedList.length; i++) {
      const matchJob = unappliedList[i];
      const targetJob = matchJob.rawJob || matchJob;
      const jobId = matchJob._id || targetJob.id || targetJob._id;

      // Check remaining quota before each submission
      const currentQuota = getAutoApplyUsage();
      if (!currentQuota.isUnlimited && currentQuota.remaining !== null && currentQuota.remaining <= 0) {
        stoppedEarly = true;
        setEntitlementNoticeData({
          code: 'AUTO_APPLY_LIMIT_REACHED',
          jobTitle: matchJob.title,
          company: matchJob.company,
          applyUrl: matchJob.applyUrl,
          message: `Daily auto-apply limit reached after submitting ${successfulCount} application(s).`,
        });
        setEntitlementNoticeOpen(true);
        break;
      }

      setApplyingJobId(jobId);
      try {
        const payload = {
          jobId,
          title: matchJob.title,
          company: matchJob.company,
          jobUrl: matchJob.applyUrl,
          description: targetJob.description || '',
          location: matchJob.location || '',
          salary: matchJob.salary || '',
          atsType: matchJob.source || targetJob.atsType || 'unknown',
          source: matchJob.source || 'discover',
          mode: 'automatic',
        };

        const res = await fetch('/api/jobs/auto-apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const resData = await res.json().catch(() => ({}));

        if (res.status === 403 || resData.code === 'AUTO_APPLY_LIMIT_REACHED' || resData.code === 'AUTO_APPLY_LIFETIME_REACHED') {
          stoppedEarly = true;
          setEntitlementNoticeData({
            code: resData.code || 'AUTO_APPLY_LIMIT_REACHED',
            jobTitle: matchJob.title,
            company: matchJob.company,
            applyUrl: matchJob.applyUrl,
            message: resData.message || 'Auto-apply quota exhausted.',
          });
          setEntitlementNoticeOpen(true);
          break;
        }

        if (res.ok && resData.success) {
          successfulCount++;
          setAppliedIds((prev) => new Set(prev).add(jobId));
          queryClient.invalidateQueries({ queryKey: ['entitlements'] });
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('jobUpdated', { detail: { jobId } }));
          }
        }
      } catch (err) {
        console.warn(`Apply All failed for ${matchJob.title}:`, err);
      }

      // Small delay between successive requests to prevent burst flooding
      await new Promise((resolve) => setTimeout(resolve, 600));
    }

    setIsApplyingAll(false);
    setApplyingJobId(null);

    if (successfulCount > 0) {
      toast({
        title: 'Batch Applications Queued',
        description: `Successfully queued ${successfulCount} application(s) for automated submission.${
          stoppedEarly ? ' Stopped when account limit was reached.' : ''
        }`,
      });
    }
  };

  if ((loading || !hasFetched) && jobs.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Top job matches
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Jobs selected for you based on your profile and preferences.
            </p>
          </div>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200/80 dark:border-white/10 p-4 animate-pulse bg-white dark:bg-[#141810] min-w-[290px] max-w-[290px] min-h-[240px] shrink-0"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-2 flex-1">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                </div>
                <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700" />
              </div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
              <div className="flex gap-1 mb-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full w-14" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full w-16" />
              </div>
              <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex justify-between items-center">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded-xl w-14" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Top job matches
          </h2>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] p-8 text-center flex flex-col items-center justify-center">
          <AlertCircle className="w-9 h-9 text-amber-500 mb-3" />
          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
            Couldn&apos;t load your recommendations
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mb-4">
            Your job matches are still available in Discover.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchTopMatches()}
              className="px-4 py-2 rounded-xl bg-[#0f172a] hover:bg-[#1e293b] dark:bg-[#013f2e] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Try Again</span>
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard/jobs?tab=discover')}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 transition-all"
            >
              Open Discover
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayJobs = jobs.slice(0, 10);

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Top job matches
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Jobs selected for you based on your profile and preferences.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {displayJobs.length > 3 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => scroll('left')}
                disabled={!canScrollLeft}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scroll('right')}
                disabled={!canScrollRight}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsParserOpen(true)}
            className="px-3.5 py-1.5 rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] text-gray-700 dark:text-gray-300 text-xs font-semibold hover:border-gray-400 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white transition-all flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add job</span>
          </button>
          <button
            type="button"
            onClick={handleApplyAll}
            disabled={isApplyingAll || displayJobs.length === 0}
            className="px-3.5 py-1.5 rounded-full bg-[#013f2e] hover:bg-[#02523c] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isApplyingAll ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Applying all…</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                <span>Apply all</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/jobs?tab=discover')}
            className="px-3.5 py-1.5 rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] text-gray-700 dark:text-gray-300 text-xs font-semibold hover:border-gray-400 dark:hover:border-white/20 transition-all flex items-center gap-1.5 shadow-xs"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Browse jobs</span>
          </button>
        </div>
      </div>

      {/* Cards Carousel or Empty State UI */}
      {displayJobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] p-8 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-[#36D39B]/15 flex items-center justify-center mb-3 text-[#013f2e] dark:text-[#36D39B]">
            <Sparkles className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
            You&apos;re all caught up
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mb-4">
            New matching jobs will appear here as they&apos;re found.
          </p>
          <button
            type="button"
            onClick={() => router.push('/dashboard/jobs?tab=discover')}
            className="px-4 py-2 rounded-xl bg-[#013f2e] hover:bg-[#025c43] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Browse All Jobs</span>
          </button>
        </div>
      ) : (
        <div className="relative">
          <div
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {displayJobs.map((job, index) => {
              const tracker = trackerForJob(job._id, job.rawJob);
              const rawId = job.rawJob?.id;
              const isSaved = savedIds.has(job._id) || (rawId ? savedIds.has(rawId) : false);
              const isApplied =
                appliedIds.has(job._id) ||
                (rawId ? appliedIds.has(rawId) : false) ||
                Boolean(tracker?.status && tracker.status !== 'saved' && tracker.status !== 'draft');

              return (
              <div
                key={job._id}
                className="min-w-[280px] max-w-[280px] shrink-0 [&>*]:h-full"
              >
                <JobCard
                  job={{ ...job.rawJob, matchScore: job.matchScore }}
                  isSaved={isSaved}
                  isApplied={isApplied}
                  applicationMode={applicationMode}
                  saving={savingId === job._id}
                  tracker={tracker}
                  onOpen={() => handleOpenDetail(job)}
                  onOpenTracker={() => handleOpenDetail(job)}
                  onSave={() => handleSaveToggle(job, { stopPropagation: () => {} } as any)}
                  onApply={() => handleApply(job)}
                  onPass={() => {
                    // Preserve the old dual behaviour of the ✕: while a live
                    // progress bar is showing it dismisses the progress; in
                    // any other state it hides the match.
                    if (statuses[job._id]) {
                      clearStatus(job._id);
                    } else {
                      handlePass(job._id, { stopPropagation: () => {} } as any, job);
                    }
                  }}
                  colorIndex={index}
                  // Per-job, not section-wide: JobCard's `applying` renders a
                  // spinner, so setting it for every card during one apply
                  // would show "Working…" across the row. Concurrent submits
                  // stay blocked by the applyingRef guard in handleApply.
                  applying={applyingJobId === job._id}
                  // Same shared cache the Discover feed, the tracker and the
                  // sidebar read — so this carousel cannot disagree with them.
                  progress={getForJob(job._id) ?? null}
                />
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Job Detail Modal */}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          open={modalOpen}
          onOpenChange={setModalOpen}
          isSaved={Boolean((selectedJob._id && savedIds.has(selectedJob._id)) || (selectedJob.id && savedIds.has(selectedJob.id)))}
          isApplied={Boolean((selectedJob._id && appliedIds.has(selectedJob._id)) || (selectedJob.id && appliedIds.has(selectedJob.id)))}
          applicationMode={applicationMode}
          saving={Boolean((selectedJob._id && savingId === selectedJob._id) || (selectedJob.id && savingId === selectedJob.id))}
          onSave={() => {
            const matchJob = jobs.find((j) => j._id === selectedJob._id || (selectedJob.id && j._id === selectedJob.id));
            if (matchJob) handleSaveToggle(matchJob, { stopPropagation: () => {} } as any);
          }}
          onApply={() => selectedJob && handleApply(selectedJob)}
        />
      )}

      {/* Journey Sidebar — opens for tracked/applied/saved jobs on Analysis tab */}
      {trackerSidebarOpen && selectedTrackerJob && (
        <JobSidebar
          job={selectedTrackerJob}
          journeys={[]}
          openContext={{ initialTab: 'analytics' }}
          onClose={() => {
            setTrackerSidebarOpen(false);
            setSelectedTrackerJob(null);
          }}
          onRefresh={() => {
            fetchTopMatches();
          }}
        />
      )}

      {/* Entitlement & Outcome Notice Modal */}
      <EntitlementNotice
        isOpen={entitlementNoticeOpen}
        onClose={() => setEntitlementNoticeOpen(false)}
        data={entitlementNoticeData}
      />

      {/* Smart Job Analysis Sidebar */}
      <JobParserSidebar
        isOpen={isParserOpen}
        onClose={() => setIsParserOpen(false)}
        onParseComplete={handleParseComplete}
      />
    </div>
  );
}
