'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { JobsMetrics, JobListing, JobsFilter } from '@/types/automation-schema';
import FiltersBar from './JobsDashboard/FiltersBar';
import JobsErrorState from './JobsDashboard/JobsErrorState';
import { Sparkles, Zap, Briefcase, Settings, ChevronRight, ArrowUp, Linkedin, Mic, X, Globe, RefreshCw, Loader2, Plus, Bookmark } from 'lucide-react';
import { AutoApplyPanel } from '@/components/jobs/AutoApplyPanel';
import { ApplicationsPanel } from '@/components/jobs/ApplicationsPanel';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/contexts/NotificationContext';
import { useApplyProgress } from '@/hooks/useApplyProgress';
import { useMembership } from '@/lib/hooks/useMembership';
import { ToastAction } from '@/components/ui/toast';
import { Switch } from '@/components/ui/switch';
import { JobCard } from '@/components/jobs/JobCard';
import { JobDetailModal } from '@/components/jobs/JobDetailModal';
import { detectUserCountry } from '@/components/jobs/CountrySelector';
import NaukriConnectCard from './JobsDashboard/NaukriConnectCard';
import LimitedOptionsBanner from './JobsDashboard/LimitedOptionsBanner';
import PortalConnectModal, { type PortalType } from './settings/PortalConnectModal';
import { getCachedJobs, setCachedJobs } from '@/lib/utils/jobCache';
import { EntitlementNotice, type EntitlementNoticeData } from '@/components/jobs/EntitlementNotice';
import {
  DEFAULT_CV_TAILORING_MODE,
  parseCvTailoringMode,
  type CvTailoringMode,
} from '@/lib/cv-tailoring/tailoringMode';
import type { UserEntitlements } from '@/lib/services/entitlement-service';

const deduplicateJobs = (rawJobs: JobListing[]): JobListing[] => {
  const seenKeys = new Map<string, JobListing>();
  for (const job of rawJobs) {
    const normCompany = (job.company || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const normTitle = (job.title || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const normLoc = (job.location || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const key = `${normCompany}___${normTitle}___${normLoc}`;

    if (!seenKeys.has(key)) {
      seenKeys.set(key, job);
    } else {
      const existing = seenKeys.get(key)!;
      if ((job.matchScore || 0) > (existing.matchScore || 0)) {
        seenKeys.set(key, job);
      }
    }
  }
  return Array.from(seenKeys.values());
};

export default function JobsDashboard() {
  const [activeTab, setActiveTab] = useState<'discover' | 'applications' | 'settings'>('discover');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const { toast } = useToast();
  const { updateProgress } = useNotifications();
  const applyProgress = useApplyProgress();
  const { isPaidMember } = useMembership();
  const isPaidUser = isPaidMember;
  const [entitlements, setEntitlements] = useState<UserEntitlements | null>(null);
  const [userPreferences, setUserPreferences] = useState<any>(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const jobIdParam = searchParams.get('jobId') || searchParams.get('job');
    const newJobParam = searchParams.get('newJob') || searchParams.get('action') === 'add-job';
    const filterParam = searchParams.get('filter') || searchParams.get('stage');

    if (jobIdParam || newJobParam || filterParam) {
      setActiveTab('applications');
    } else if (tabParam && ['discover', 'applications', 'settings'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  const [countries, setCountries] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('morigrid_selected_countries');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCountries(parsed);
          return;
        }
      }
    } catch {}
    const detected = detectUserCountry();
    if (detected && detected.name) {
      setCountries([detected.name]);
    }
  }, []);
  const [metrics, setMetrics] = useState<JobsMetrics | null>(null);
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [filters, setFilters] = useState<JobsFilter>({
    sortBy: 'matchScore',
    sortOrder: 'desc',
  });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(() => {
    // Check if we have cached data for initial filter state
    const initialParams: Record<string, string> = {
      page: '1',
      limit: '20',
      countries: '',
      sortBy: 'matchScore',
      sortOrder: 'desc',
    };
    return !getCachedJobs(initialParams);
  });
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState<string | null>(null);
  const [portalConnections, setPortalConnections] = useState<any[]>([]);
  const [naukriConnected, setNaukriConnected] = useState<boolean>(false);
  const [naukriEmail, setNaukriEmail] = useState<string>('');
  const [indeedConnected, setIndeedConnected] = useState<boolean>(false);
  const [indeedEmail, setIndeedEmail] = useState<string>('');
  const [isSyncingPortals, setIsSyncingPortals] = useState<boolean>(false);
  const [connectModalOpen, setConnectModalOpen] = useState<boolean>(false);
  const [selectedConnectPortal, setSelectedConnectPortal] = useState<PortalType>('naukri');
  const [autoApplyEnabled, setAutoApplyEnabled] = useState<boolean>(false);
  const [cvTailoringMode, setCvTailoringMode] = useState<CvTailoringMode>(DEFAULT_CV_TAILORING_MODE);
  const [autoApplyBannerDismissed, setAutoApplyBannerDismissed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('autoapply_banner_dismissed') === 'true';
    }
    return false;
  });
  const [newJobsCount, setNewJobsCount] = useState(0);
  const [entitlementNoticeData, setEntitlementNoticeData] = useState<EntitlementNoticeData | null>(null);
  const [entitlementNoticeOpen, setEntitlementNoticeOpen] = useState(false);
  const jobsSnapshotRef = useRef<string>('');

  const fetchPortalConnections = useCallback(async () => {
    try {
      const res = await fetch('/api/portal-connections');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.connections)) {
          setPortalConnections(data.connections);
          const naukri = data.connections.find((c: any) => c.id === 'naukri');
          const indeed = data.connections.find((c: any) => c.id === 'indeed');

          const isNaukriActive = naukri?.status === 'connected' && Boolean(naukri?.account?.email);
          const isIndeedActive = indeed?.status === 'connected' && Boolean(indeed?.account?.email);

          setNaukriConnected(isNaukriActive);
          setNaukriEmail(naukri?.account?.email || '');
          setIndeedConnected(isIndeedActive);
          setIndeedEmail(indeed?.account?.email || '');
        }
      }
    } catch (e) {
      console.error('Failed to fetch portal connections in Discover:', e);
    }
  }, []);

  useEffect(() => {
    fetchPortalConnections();

    fetch('/api/entitlements')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data.entitlements) {
          setEntitlements(data.entitlements);
        }
      })
      .catch(() => {});

    fetch('/api/jobs/preferences')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.preferences) {
          setUserPreferences(data.preferences);
          setAutoApplyEnabled(data.preferences.enabled === true);
        }
        if (data?.cvTailoringMode || data?.preferences?.cvTailoringMode) {
          setCvTailoringMode(
            parseCvTailoringMode(data.cvTailoringMode || data.preferences.cvTailoringMode)
          );
        }
      })
      .catch(() => {});
  }, [userId, fetchPortalConnections]);

  // Map of discovered job ID / URL / titleKey -> MongoDB JobApplication _id
  const [savedJobIdMap, setSavedJobIdMap] = useState<Map<string, string>>(new Map());

  // Fetch saved job IDs on mount and userId change
  useEffect(() => {
    async function loadSavedJobIds() {
      try {
        const res = await fetch('/api/jobs?limit=100');
        if (res.ok) {
          const data = await res.json();
          const items = data.jobs || data.data || [];
          if (Array.isArray(items)) {
            const idSet = new Set<string>();
            const idMap = new Map<string, string>();

            items.forEach((j: any) => {
              const dbId = j._id || j.id;
              if (dbId) {
                idSet.add(dbId);
                idMap.set(dbId, dbId);
              }
              if (j.jobId) {
                idSet.add(j.jobId);
                idMap.set(j.jobId, dbId);
              }
              if (j.externalId) {
                idSet.add(j.externalId);
                idMap.set(j.externalId, dbId);
              }
              if (j.jobUrl || j.sourceUrl) {
                const u = (j.jobUrl || j.sourceUrl).trim().toLowerCase();
                idMap.set(u, dbId);
              }
              if (j.company && (j.jobTitle || j.title)) {
                const comp = (j.company || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                const tit = ((j.jobTitle || j.title) || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                idMap.set(`${comp}___${tit}`, dbId);
              }
            });

            setSavedIds(idSet);
            setSavedJobIdMap(idMap);
          }
        }
      } catch (err) {
        console.error('Failed to load saved job IDs:', err);
      }
    }
    loadSavedJobIds();
  }, [userId]);

  const isJobSaved = useCallback(
    (job: JobListing) => {
      const comp = (job.company || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      const tit = (job.title || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      const jobKey = `${comp}___${tit}`;
      const url = job.applyUrl ? job.applyUrl.trim().toLowerCase() : '';

      return (
        savedIds.has(job._id) ||
        (job.id ? savedIds.has(job.id) : false) ||
        savedJobIdMap.has(job._id) ||
        (job.id ? savedJobIdMap.has(job.id) : false) ||
        (url ? savedJobIdMap.has(url) : false) ||
        savedJobIdMap.has(jobKey)
      );
    },
    [savedIds, savedJobIdMap]
  );

  const handleSaveJob = async (job: JobListing) => {
    const comp = (job.company || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const tit = (job.title || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const jobKey = `${comp}___${tit}`;
    const url = job.applyUrl ? job.applyUrl.trim().toLowerCase() : '';

    const dbJobId =
      savedJobIdMap.get(job._id) ||
      (job.id ? savedJobIdMap.get(job.id) : null) ||
      (url ? savedJobIdMap.get(url) : null) ||
      savedJobIdMap.get(jobKey) ||
      (savedIds.has(job._id) ? job._id : null);
    const currentlySaved = Boolean(dbJobId) || savedIds.has(job._id);

    setSavingId(job._id);

    try {
      if (currentlySaved && dbJobId) {
        const res = await fetch(`/api/jobs/${dbJobId}`, { method: 'DELETE' });
        if (res.ok || res.status === 404) {
          setSavedIds((prev) => {
            const next = new Set(prev);
            next.delete(job._id);
            if (job.id) next.delete(job.id);
            next.delete(dbJobId);
            return next;
          });
          setSavedJobIdMap((prev) => {
            const next = new Map(prev);
            next.delete(job._id);
            if (job.id) next.delete(job.id);
            if (url) next.delete(url);
            next.delete(jobKey);
            next.delete(dbJobId);
            return next;
          });
          toast({ title: 'Removed from saved jobs' });
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error || 'Failed to remove saved job');
        }
      } else {
        const res = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobTitle: job.title,
            company: job.company,
            location: job.location,
            jobUrl: job.applyUrl,
            status: 'saved',
            salary:
              job.salaryMin || job.salaryMax
                ? {
                    min: job.salaryMin,
                    max: job.salaryMax,
                    currency: job.salaryCurrency || 'USD',
                    period: 'yearly',
                  }
                : undefined,
            matchScore: job.matchScore,
            source: job.source || 'manual',
            atsType: job.atsType || 'unknown',
            jobDescription: job.description || '',
            tags: job.keywords || [],
          }),
        });

        if (res.ok) {
          const resData = await res.json();
          const createdDbId =
            resData?.data?.id ||
            resData?.data?._id ||
            resData?.job?.id ||
            resData?.job?._id ||
            resData?.jobId ||
            job._id;

          setSavedIds((prev) => {
            const next = new Set(prev);
            next.add(job._id);
            if (createdDbId) next.add(createdDbId);
            return next;
          });

          setSavedJobIdMap((prev) => {
            const next = new Map(prev);
            next.set(job._id, createdDbId);
            if (job.applyUrl) next.set(job.applyUrl, createdDbId);
            next.set(jobKey, createdDbId);
            return next;
          });

          toast({
            title: 'Job saved successfully',
            description: 'Added to your applications shortlist',
          });
        } else {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || data?.message || 'Failed to save job');
        }
      }
    } catch (err: any) {
      toast({
        title: 'Error updating saved job',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleApplyJob = async (job: JobListing) => {
    // Check if Naukri job and not connected
    if (job.source === 'naukri' && !naukriConnected) {
      toast({
        title: 'Connect Naukri Account',
        description: 'Please link your Naukri account in Settings to apply automatically.',
        variant: 'destructive',
        action: (
          <ToastAction
            altText="Go to Settings"
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </ToastAction>
        ),
      });
      return;
    }

    const appId = `apply-${job._id}`;
    setIsApplying(appId);

    // Start progress toast
    applyProgress.startApplyProgress(job.title);
    updateProgress(appId, 15, `Matching CV for ${job.title}...`, 'progress');

    try {
      // Update progress: tailoring
      applyProgress.updateToTailoring(job.title, job.company);
      updateProgress(appId, 45, `Tailoring application for ${job.company}...`, 'progress');

      const res = await fetch('/api/jobs/auto-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job._id,
          title: job.title,
          company: job.company,
          location: job.location,
          source: job.source,
          jobUrl: job.applyUrl,
          description: job.description,
          atsType: job.atsType || 'unknown',
          salary: job.salaryMin || job.salaryMax ? {
            min: job.salaryMin,
            max: job.salaryMax,
            currency: job.salaryCurrency || '$',
            period: 'yearly',
          } : undefined,
          matchScore: job.matchScore,
          screeningQuestions: [],
        }),
      });

      const resData = await res.json();

      // Entitlement block / Plan restriction
      if (
        res.status === 403 ||
        resData.code === 'AUTO_APPLY_NOT_INCLUDED' ||
        resData.code === 'AUTO_APPLY_LIMIT_REACHED'
      ) {
        applyProgress.cancelProgress();
        setEntitlementNoticeData({
          code: resData.code || 'AUTO_APPLY_NOT_INCLUDED',
          jobTitle: job.title,
          company: job.company,
          applyUrl: job.applyUrl || resData.fallbackUrl,
          message: resData.message || resData.error,
          entitlements: resData.entitlements,
          recommendation: resData.recommendation,
        });
        setEntitlementNoticeOpen(true);
        return;
      }

      // Verification / Unknown outcome
      if (resData.code === 'APPLICATION_VERIFICATION_FAILED') {
        applyProgress.cancelProgress();
        setEntitlementNoticeData({
          code: 'APPLICATION_VERIFICATION_FAILED',
          jobTitle: job.title,
          company: job.company,
          applyUrl: job.applyUrl,
          message: resData.message,
        });
        setEntitlementNoticeOpen(true);
        return;
      }

      // Authentication required
      if (resData.code === 'AUTHENTICATION_REQUIRED') {
        applyProgress.cancelProgress();
        setEntitlementNoticeData({
          code: 'AUTHENTICATION_REQUIRED',
          jobTitle: job.title,
          company: job.company,
          applyUrl: job.applyUrl,
        });
        setEntitlementNoticeOpen(true);
        return;
      }

      // Update progress: submitting
      applyProgress.updateToSubmitting(job.company);
      updateProgress(appId, 80, `Submitting application to ${job.company}...`, 'progress');

      if (res.ok && resData.success) {
        const createdId = resData.applicationId || job._id;

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('jobUpdated', { detail: { jobId: createdId } }));
        }

        applyProgress.completeApply(job.title, job.company, true, resData.message);
        updateProgress(appId, 100, `Applied to ${job.title}!`, 'progress');
      } else {
        // Genuine submission failure on employer site
        applyProgress.cancelProgress();
        setEntitlementNoticeData({
          code: 'APPLICATION_FAILED',
          jobTitle: job.title,
          company: job.company,
          applyUrl: job.applyUrl,
          message: resData.error || resData.message || "We couldn't complete the application on the employer's site.",
        });
        setEntitlementNoticeOpen(true);
      }
    } catch (err: any) {
      applyProgress.cancelProgress();
      setEntitlementNoticeData({
        code: 'APPLICATION_FAILED',
        jobTitle: job.title,
        company: job.company,
        applyUrl: job.applyUrl,
        message: err.message || 'Network error occurred during submission.',
      });
      setEntitlementNoticeOpen(true);
    } finally {
      setIsApplying(null);
    }
  };

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/jobs/metrics', {});
      if (!response.ok) {
        console.warn('Failed to fetch metrics, using default values');
        setMetrics(null);
        return;
      }
      const data = await response.json();
      setMetrics(data);
    } catch (err: any) {
      console.error('Error fetching metrics:', err);
      setError(err.message);
    }
  }, []);

  const fetchJobs = useCallback(async (isBackground = false) => {
    const isFirstPage = page === 1;
    try {
      const params: Record<string, string> = {
        page: page.toString(),
        limit: pageSize.toString(),
        countries: countries.join(','),
        sortBy: filters.sortBy || 'matchScore',
        sortOrder: filters.sortOrder || 'desc',
      };

      if (filters.searchText) params.keywords = filters.searchText;
      if (filters.remoteOnly) params.remoteOnly = 'true';
      if (filters.matchScoreMin !== undefined) params.matchScoreMin = filters.matchScoreMin.toString();
      if (filters.matchScoreMax !== undefined) params.matchScoreMax = filters.matchScoreMax.toString();
      if (filters.companies?.length) params.companies = filters.companies.join(',');
      if (filters.locations?.length) params.locations = filters.locations.join(',');
      if (filters.sources?.length) params.sources = filters.sources.join(',');
      if (filters.atsTypes?.length) params.atsTypes = filters.atsTypes.join(',');
      if (filters.workplaceType?.length) params.workplaceType = filters.workplaceType.join(',');
      if (filters.roles?.length) params.roles = filters.roles.join(',');
      if (filters.jobTypes?.length) params.jobTypes = filters.jobTypes.join(',');
      if (filters.experienceLevel?.length) params.experienceLevel = filters.experienceLevel.join(',');
      if (filters.datePosted && filters.datePosted !== 'all') params.datePosted = filters.datePosted;
      if (filters.sponsorsVisa) params.sponsorsVisa = 'true';
      if (filters.savedOnly) params.savedOnly = 'true';

      // Check cache for initial page load
      if (isFirstPage) {
        const cached = getCachedJobs(params);
        if (cached) {
          setJobs(cached.jobs);
          setTotal(cached.total);
          setHasMore(cached.hasMore);
          setError(null);
          setLoading(false);
        } else if (!isBackground) {
          setLoading(true);
        }
      } else {
        setLoadingMore(true);
      }

      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`/api/jobs/discover?${queryString}`, {});

      if (!response.ok) {
        if (isFirstPage && !getCachedJobs(params)) {
          setJobs([]);
          setLoading(false);
        }
        return;
      }

      const data = await response.json();
      const incomingJobs: JobListing[] = data.jobs || [];

      if (isFirstPage) {
        setCachedJobs(params, incomingJobs, data.total, data.hasMore);
        setJobs(incomingJobs);
        jobsSnapshotRef.current = JSON.stringify({ filters, page: 1, pageSize, countries });
        setNewJobsCount(0);
      } else {
        setJobs((prev) => {
          const prevIds = new Set(prev.map((j) => j._id));
          const newJobs = incomingJobs.filter((j) => !prevIds.has(j._id));
          return [...prev, ...newJobs];
        });
      }

      setTotal(data.total);
      setHasMore(data.hasMore);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching jobs:', err);
      if (!isBackground && isFirstPage) setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, page, pageSize, countries]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      fetchJobs();
    }, 300);

    return () => clearTimeout(debounceTimeout);
  }, [fetchJobs]);

  // Infinite Scroll Intersection Observer
  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1, rootMargin: '300px' }
    );

    const el = observerTarget.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
      observer.disconnect();
    };
  }, [hasMore, loading, loadingMore]);

  const handleRetry = () => {
    setError(null);
    fetchMetrics();
    fetchJobs();
  };

  const handleCountriesChange = (newCountries: string[]) => {
    setCountries(newCountries);
    setPage(1);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('morigrid_selected_countries', JSON.stringify(newCountries));
      } catch {}
    }
  };

  const handleFilterChange = (newFilters: Partial<JobsFilter>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters({
      sortBy: 'matchScore',
      sortOrder: 'desc',
    });
    setPage(1);
  };

  const handleCvTailoringModeChange = async (mode: CvTailoringMode) => {
    const previous = cvTailoringMode;
    setCvTailoringMode(mode);
    try {
      const res = await fetch('/api/jobs/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvTailoringMode: mode }),
      });
      if (!res.ok) {
        throw new Error('Failed to save tailoring mode');
      }
    } catch (err) {
      console.error('Failed to save CV tailoring mode:', err);
      setCvTailoringMode(previous);
    }
  };

  const handleToggleAutoApply = async () => {
    const nextState = !autoApplyEnabled;
    setAutoApplyEnabled(nextState);
    try {
      const res = await fetch('/api/jobs/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextState }),
      });
      if (res.ok) {
        toast({
          title: nextState ? 'Auto-Apply Automation Enabled' : 'Auto-Apply Automation Paused',
          description: nextState
            ? 'Applications will automatically submit to high-matching jobs.'
            : 'Automation has been paused.',
        });
      }
    } catch (err) {
      console.error('Failed to toggle auto-apply:', err);
    }
  };

  const handleSyncAllPortals = async () => {
    try {
      setIsSyncingPortals(true);
      toast({
        title: 'Syncing Live Portals',
        description: 'Ingesting fresh roles from active job portal streams...',
      });

      const activePrivateConnections = portalConnections.filter(
        (c) => !c.isPublicFeed && c.status === 'connected' && (c.connectionId || c.id)
      );

      if (activePrivateConnections.length === 0) {
        await fetchJobs();
        toast({
          title: 'Jobs Refreshed',
          description: 'Updated with latest roles from direct ATS boards.',
        });
        return;
      }

      for (const conn of activePrivateConnections) {
        const targetId = conn.connectionId || conn.id;
        await fetch(`/api/portal-connections/${targetId}/sync`, {
          method: 'POST',
        }).catch(() => {});
      }

      await fetchJobs();
      await fetchPortalConnections();
      toast({
        title: 'Sync Complete',
        description: 'Discover feed updated with latest portal roles.',
      });
    } catch (err: any) {
      toast({
        title: 'Sync Error',
        description: err.message || 'Failed to sync portals',
        variant: 'destructive',
      });
    } finally {
      setIsSyncingPortals(false);
    }
  };

  const deduplicatedJobs = deduplicateJobs(jobs);
  const displayedJobs = filters.savedOnly
    ? deduplicatedJobs.filter((job) => isJobSaved(job))
    : deduplicatedJobs;

  if (error && !metrics) {
    return <JobsErrorState message={error} onRetry={handleRetry} />;
  }

  return (
    <div className="w-full bg-transparent">
      <div className="w-full max-w-[1850px] mx-auto space-y-6">
        {/* Header + Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-white/10 pb-4">
          <div>
            <h1 className="text-h1 font-bold text-gray-900 dark:text-white">
              Jobs Hub
            </h1>
            <p className="mt-1 text-small text-gray-600 dark:text-gray-400">
              AI-powered job matching and automation
              <span className="ml-2 inline-flex items-center rounded-full bg-lime-500/20 px-2.5 py-0.5 text-small font-medium text-lime-600 dark:text-lime-400">
                BETA
              </span>
            </p>
          </div>

          <nav className="flex items-end gap-6">
            {[
              { id: 'discover', label: 'Discover', icon: Sparkles },
              { id: 'applications', label: 'Applications', icon: Briefcase },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 py-2 border-b-2 font-medium text-small transition-all duration-200 outline-none hover:bg-transparent focus:ring-0 focus-visible:ring-0 focus:outline-none focus-visible:outline-none !shadow-none !outline-none hover:!shadow-none focus:!shadow-none group ${activeTab === tab.id
                  ? 'border-lime-500 text-lime-600 dark:text-lime-400'
                  : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                style={{ boxShadow: 'none', outline: 'none', WebkitTapHighlightColor: 'transparent' }}
              >
                <tab.icon className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                <span className="transition-transform duration-200 group-hover:scale-105">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'discover' && (
          <div className="space-y-4">
            {/* Search Profile & AI Match Summary */}
            <div className="rounded-3xl p-5 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 shadow-sm space-y-3.5 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-lime-600 dark:text-[#80FF00]" />
                    <span>Searching For</span>
                  </div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                    <span>{userPreferences?.targetRoles?.length ? userPreferences.targetRoles.join(' · ') : 'Full Stack Developer · Software Engineer'}</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 flex-wrap">
                    <span>📍 {userPreferences?.locations?.length ? userPreferences.locations.join(' · ') : 'Bangalore · Remote · London'}</span>
                    <span>•</span>
                    <span>💰 {userPreferences?.minSalary ? `₹${userPreferences.minSalary} LPA+` : '₹18 LPA+'}</span>
                    <span>•</span>
                    <span>💼 {userPreferences?.experienceYears ? `${userPreferences.experienceYears}+ yrs` : '3+ yrs experience'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className="px-3.5 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 hover:border-lime-500 text-xs font-bold text-gray-700 dark:text-gray-300 hover:text-lime-600 dark:hover:text-[#80FF00] transition-colors flex items-center gap-1 shadow-xs bg-gray-50 dark:bg-white/5"
                  >
                    <span>Edit Preferences</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Subtle Auto-Apply Status Strip */}
              <div className="pt-2.5 border-t border-gray-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`w-2 h-2 rounded-full ${autoApplyEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    {autoApplyEnabled ? 'Auto-Apply Active' : 'Auto-Apply Paused'}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    — {autoApplyEnabled
                      ? `Automatically submitting applications (${isPaidUser ? `${entitlements?.autoApply.remaining ?? 50} remaining today` : `${entitlements?.application.remaining ?? 10} remaining this month`})`
                      : "You're discovering and saving jobs. Automatic submissions are currently paused."}
                  </span>
                </div>

                {!autoApplyEnabled ? (
                  <button
                    type="button"
                    onClick={handleToggleAutoApply}
                    className="text-xs font-bold text-lime-600 dark:text-[#80FF00] hover:underline shrink-0"
                  >
                    Resume Auto-Apply
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleToggleAutoApply}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:underline shrink-0"
                  >
                    Pause
                  </button>
                )}
              </div>
            </div>

            <FiltersBar
              filters={filters}
              onChange={handleFilterChange}
              onReset={handleResetFilters}
              metrics={metrics}
              countries={countries}
              onCountriesChange={handleCountriesChange}
              userId={userId}
              savedCount={savedIds.size}
              cvTailoringMode={cvTailoringMode}
              onCvTailoringModeChange={handleCvTailoringModeChange}
              naukriEmail={naukriEmail || 'amarjotasl@gmail.com'}
              indeedEmail={indeedEmail || 'amarjotasl@gmail.com'}
              isSyncingPortals={isSyncingPortals}
              onSyncPortals={handleSyncAllPortals}
            />

            {/* Results Count & Match Statement */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <div>
                <span className="font-bold text-sm text-gray-900 dark:text-white">
                  {displayedJobs.length} {filters.savedOnly ? 'saved' : 'matching'} {displayedJobs.length === 1 ? 'job' : 'jobs'}
                </span>
                <span className="text-gray-500 dark:text-gray-400 ml-2 hidden sm:inline">
                  {filters.savedOnly
                    ? 'Jobs you have saved to your shortlist and staging pipeline'
                    : 'Personalized based on your target roles, locations, and compensation threshold'}
                </span>
              </div>
            </div>

            {/* New jobs indicator — subtle floating pill */}
            {newJobsCount > 0 && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slideUp">
                <button
                  type="button"
                  onClick={() => {
                    setNewJobsCount(0);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#0f172a] dark:bg-[#80FF00] text-white dark:text-black text-sm font-semibold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                >
                  <ArrowUp className="w-4 h-4" />
                  {newJobsCount} new job{newJobsCount !== 1 ? 's' : ''}
                </button>
              </div>
            )}

            {/* Job Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-4 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-xl bg-gray-200 dark:bg-gray-700" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mt-4" />
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mt-5" />
                  </div>
                ))}
              </div>
            ) : displayedJobs.length > 0 ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                  {!naukriConnected && !filters.savedOnly && (
                    <NaukriConnectCard
                      onConnected={() => {
                        setNaukriConnected(true);
                        fetchJobs();
                      }}
                    />
                  )}
                  {displayedJobs
                    .map((job, index) => (
                      <JobCard
                        key={job._id}
                        job={job}
                        colorIndex={index}
                        isSaved={isJobSaved(job)}
                        saving={savingId === job._id}
                        onOpen={() => {
                          setSelectedJob(job);
                          setModalOpen(true);
                        }}
                        onSave={() => handleSaveJob(job)}
                        onPass={() => {
                          const previousJobs = jobs;
                          setJobs((prev) => prev.filter((j) => j._id !== job._id));
                          fetch('/api/jobs/pass', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ jobId: job._id }),
                          }).then((res) => {
                            if (!res.ok) throw new Error('Failed to pass');
                            toast({
                              title: 'Job Passed',
                              description: `Dismissed ${job.title}`,
                            });
                          }).catch(() => {
                            setJobs(previousJobs);
                            toast({
                              title: 'Error',
                              description: 'Failed to dismiss job. Please try again.',
                              variant: 'destructive',
                            });
                          });
                        }}
                        onApply={() => handleApplyJob(job)}
                      />
                    ))}

                  {/* Extension card styled as a job card at the end of the loaded batch */}
                  {!filters.savedOnly && (
                    <LimitedOptionsBanner
                      onAddManually={() => {
                        router.push('/dashboard/jobs?tab=applications&action=add-job');
                      }}
                    />
                  )}
                </div>
              </div>
            ) : filters.savedOnly ? (
              <div className="text-center py-16 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl">
                <Bookmark className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-h3 font-semibold text-gray-900 dark:text-white mb-2">
                  No saved jobs yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-sm mx-auto text-xs">
                  Click the Save button on any job card in Recommended or Latest to add it to your shortlist.
                </p>
                <button
                  type="button"
                  onClick={() => handleFilterChange({ savedOnly: false, sortBy: 'matchScore' })}
                  className="px-4 py-2 rounded-xl bg-lime-500 hover:bg-lime-600 dark:bg-[#80FF00] text-white dark:text-black font-bold text-xs transition-colors"
                >
                  Browse Recommended Jobs
                </button>
              </div>
            ) : (
              <div className="text-center py-16 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl">
                <Briefcase className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-h3 font-semibold text-gray-900 dark:text-white mb-2">
                  No jobs found
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Try adjusting your search criteria or switching region
                </p>
                {!isPaidUser && (
                  <Link
                    href="/linkedin-enhancer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-lime-600 dark:text-lime-400 hover:underline"
                  >
                    <Linkedin className="w-3.5 h-3.5" />
                    Optimize your LinkedIn to attract recruiters
                  </Link>
                )}
              </div>
            )}

            {/* Streaming / Infinite Scroll Pagination Indicator */}
            {displayedJobs.length > 0 && (
              <div className="py-6 flex flex-col items-center justify-center gap-3">
                {hasMore ? (
                  <div ref={observerTarget} className="flex flex-col items-center gap-2">
                    {loadingMore ? (
                      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-700 dark:text-gray-300 shadow-xs">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-lime-500" />
                        <span>Loading more jobs...</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPage((p) => p + 1)}
                        className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 hover:border-lime-500 bg-white dark:bg-[#141810] text-xs font-bold text-gray-800 dark:text-gray-200 hover:text-lime-600 dark:hover:text-[#80FF00] transition-all shadow-xs"
                      >
                        Load more jobs ({displayedJobs.length} of {total})
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-xs font-medium text-gray-400 dark:text-gray-500">
                    You've viewed all {displayedJobs.length} {filters.savedOnly ? 'saved' : 'matching'} {displayedJobs.length === 1 ? 'job' : 'jobs'}
                  </div>
                )}
              </div>
            )}

            {/* Job Detail Modal */}
            <JobDetailModal
              job={selectedJob}
              open={modalOpen}
              onOpenChange={setModalOpen}
              isSaved={selectedJob ? isJobSaved(selectedJob) : false}
              saving={selectedJob ? savingId === selectedJob._id : false}
              onSave={() => selectedJob && handleSaveJob(selectedJob)}
              onApply={() => selectedJob && handleApplyJob(selectedJob)}
            />

            {/* Portal Connect Modal */}
            {connectModalOpen && (
              <PortalConnectModal
                portal={selectedConnectPortal}
                isOpen={connectModalOpen}
                onClose={() => setConnectModalOpen(false)}
                onSuccess={() => {
                  fetchPortalConnections();
                  fetchJobs();
                }}
              />
            )}
          </div>
        )}

        {activeTab === 'applications' && (
          <ApplicationsPanel metrics={metrics} userId={userId} />
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <AutoApplyPanel userId={userId} />
          </div>
        )}

        {/* Entitlement Notice / Outcome Modal */}
        <EntitlementNotice
          isOpen={entitlementNoticeOpen}
          onClose={() => setEntitlementNoticeOpen(false)}
          data={entitlementNoticeData}
        />
      </div>
    </div>
  );
}
