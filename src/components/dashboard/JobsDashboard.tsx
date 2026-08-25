'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { JobsMetrics, JobListing, JobsFilter } from '@/types/automation-schema';
import FiltersBar from './JobsDashboard/FiltersBar';
import JobsErrorState from './JobsDashboard/JobsErrorState';
import { Sparkles, Zap, Briefcase, Settings, ChevronRight, ArrowUp, Linkedin, Mic, X } from 'lucide-react';
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
import PortalIntegrationsPanel from './settings/PortalIntegrationsPanel';
import { getCachedJobs, setCachedJobs } from '@/lib/utils/jobCache';

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
  const [pageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(() => {
    // Check if we have cached data for initial filter state
    const initialParams: Record<string, string> = {
      page: '1',
      limit: '50',
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
  const [naukriConnected, setNaukriConnected] = useState<boolean>(true);
  const [autoApplyEnabled, setAutoApplyEnabled] = useState<boolean>(false);
  const [autoApplyBannerDismissed, setAutoApplyBannerDismissed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('autoapply_banner_dismissed') === 'true';
    }
    return false;
  });
  const [newJobsCount, setNewJobsCount] = useState(0);
  const jobsSnapshotRef = useRef<string>('');

  useEffect(() => {
    fetch('/api/integrations/naukri/session')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) {
          setNaukriConnected(data.sessionStatus === 'active');
        }
      })
      .catch(() => {});

    fetch('/api/jobs/preferences')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.preferences) {
          setAutoApplyEnabled(data.preferences.enabled === true);
        }
      })
      .catch(() => {});
  }, [userId]);

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
              if (j.jobUrl || j.sourceUrl) {
                idMap.set(j.jobUrl || j.sourceUrl, dbId);
              }
              if (j.company && (j.jobTitle || j.title)) {
                const key = `${j.company.toLowerCase()}-${(j.jobTitle || j.title).toLowerCase()}`;
                idMap.set(key, dbId);
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
      const jobKey = `${(job.company || '').toLowerCase()}-${(job.title || '').toLowerCase()}`;
      return (
        savedIds.has(job._id) ||
        savedJobIdMap.has(job._id) ||
        (job.applyUrl ? savedJobIdMap.has(job.applyUrl) : false) ||
        savedJobIdMap.has(jobKey)
      );
    },
    [savedIds, savedJobIdMap]
  );

  const handleSaveJob = async (job: JobListing) => {
    const jobKey = `${(job.company || '').toLowerCase()}-${(job.title || '').toLowerCase()}`;
    const dbJobId =
      savedJobIdMap.get(job._id) ||
      (job.applyUrl ? savedJobIdMap.get(job.applyUrl) : null) ||
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
            next.delete(dbJobId);
            return next;
          });
          setSavedJobIdMap((prev) => {
            const next = new Map(prev);
            next.delete(job._id);
            if (job.applyUrl) next.delete(job.applyUrl);
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
            source: 'manual',
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

      // Update progress: submitting
      applyProgress.updateToSubmitting(job.company);
      updateProgress(appId, 80, `Submitting application to ${job.company}...`, 'progress');

      const resData = await res.json();

      if (res.ok && resData.success) {
        const createdId = resData.applicationId || job._id;

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('jobUpdated', { detail: { jobId: createdId } }));
        }

        // Complete with success
        applyProgress.completeApply(job.title, job.company, true, resData.message);
        updateProgress(appId, 100, `Applied to ${job.title}!`, 'progress');
      } else {
        // Complete with queued status
        applyProgress.completeApply(job.title, job.company, true, resData.message || 'Application has been queued for processing');
        updateProgress(appId, 100, `Application queued`, 'progress');
      }
    } catch (err: any) {
      // Complete with error
      applyProgress.completeApply(job.title, job.company, false, err.message || 'Something went wrong');
      updateProgress(appId, 100, `Application failed`, 'progress');
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

      // Check cache first — show cached data instantly
      const cached = getCachedJobs(params);
      if (cached) {
        setJobs(cached.jobs);
        setTotal(cached.total);
        setHasMore(cached.hasMore);
        setError(null);
        setLoading(false);
        // Still fetch fresh data in background
      } else if (!isBackground) {
        setLoading(true);
      }

      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`/api/jobs/discover?${queryString}`, {});

      if (!response.ok) {
        if (!cached) {
          setJobs([]);
          setLoading(false);
        }
        return;
      }

      const data = await response.json();
      const incomingJobs: JobListing[] = data.jobs || [];

      // Update cache
      setCachedJobs(params, incomingJobs, data.total, data.hasMore);

      setJobs((prev) => {
        // First load or filter change — replace entirely
        if (prev.length === 0 || jobsSnapshotRef.current !== JSON.stringify({ filters, page, pageSize, countries })) {
          jobsSnapshotRef.current = JSON.stringify({ filters, page, pageSize, countries });
          setNewJobsCount(0);
          return incomingJobs;
        }

        // Background refresh — merge new jobs silently
        const prevIds = new Set(prev.map((j) => j._id));
        const newJobs = incomingJobs.filter((j) => !prevIds.has(j._id));

        if (newJobs.length > 0) {
          setNewJobsCount((c) => c + newJobs.length);
        }

        return [...prev, ...newJobs];
      });

      setTotal(data.total);
      setHasMore(data.hasMore);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching jobs:', err);
      if (!isBackground) setError(err.message);
    } finally {
      setLoading(false);
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
            {/* Global Auto-Apply Banner — always visible unless dismissed */}
            {!autoApplyBannerDismissed && (
              <div className={`rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-fadeIn border transition-colors duration-300 ${
                autoApplyEnabled
                  ? 'bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30 dark:border-emerald-500/20'
                  : 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/30 dark:border-amber-500/20'
              }`}>
                <div className="flex items-start gap-3.5">
                  <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 transition-colors duration-300 ${
                    autoApplyEnabled
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  }`}>
                    <Zap className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                        Global Auto-Apply Automation
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 transition-colors duration-300 ${
                        autoApplyEnabled
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                          autoApplyEnabled ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                        }`} />
                        {autoApplyEnabled ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed max-w-3xl">
                      {autoApplyEnabled
                        ? 'Auto-apply is running. Applications submit automatically to high-matching jobs from connected portals.'
                        : 'Automatically matches your Master CV against live job streams from connected portals, tailors resumes, answers recruiter questionnaires, and submits applications with safe throttling.'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end sm:items-center gap-2 shrink-0 self-end sm:self-center">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <Switch
                        checked={autoApplyEnabled}
                        onCheckedChange={handleToggleAutoApply}
                      />
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        {autoApplyEnabled ? 'On' : 'Enable'}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setAutoApplyBannerDismissed(true);
                        localStorage.setItem('autoapply_banner_dismissed', 'true');
                      }}
                      className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                      title="Dismiss"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className="text-xs text-gray-500 hover:text-lime-600 dark:text-gray-400 dark:hover:text-lime-400 font-medium hover:underline transition-colors flex items-center gap-0.5"
                  >
                    <span>{autoApplyEnabled ? 'Configure settings' : 'Configure in settings'}</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            <FiltersBar
              filters={filters}
              onChange={handleFilterChange}
              onReset={handleResetFilters}
              metrics={metrics}
              countries={countries}
              onCountriesChange={handleCountriesChange}
              userId={userId}
              savedCount={savedIds.size}
            />

            {/* Premium feature hints — only for free/starter users */}
            {!isPaidUser && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0 font-medium">Level up:</span>
                <Link
                  href="/dashboard/interview"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-[11px] font-medium text-gray-600 dark:text-gray-300 hover:border-lime-500 hover:text-lime-600 dark:hover:text-lime-400 transition-colors shrink-0"
                >
                  <Mic className="w-3 h-3" />
                  AI Interview Coach
                </Link>
                <Link
                  href="/linkedin-enhancer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-[11px] font-medium text-gray-600 dark:text-gray-300 hover:border-lime-500 hover:text-lime-600 dark:hover:text-lime-400 transition-colors shrink-0"
                >
                  <Linkedin className="w-3 h-3" />
                  LinkedIn Enhancer
                </Link>
              </div>
            )}

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
            ) : jobs.length > 0 ? (
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
                  {jobs
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
                </div>

                {/* Limited options banner */}
                <LimitedOptionsBanner
                  onAddManually={() => {
                    router.push('/dashboard/jobs?tab=applications&action=add-job');
                  }}
                />
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

            {/* Pagination */}
            <div className="flex items-center justify-between pt-1">
              <div className="text-small text-gray-500 dark:text-gray-400">
                Showing {jobs.length} of {total} jobs
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-small border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Previous
                </button>
                <span className="text-small text-gray-600 dark:text-gray-400">
                  Page {page}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={!hasMore}
                  className="px-3 py-1 text-small border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Next
                </button>
              </div>
            </div>

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
          </div>
        )}

        {activeTab === 'applications' && (
          <ApplicationsPanel metrics={metrics} userId={userId} />
        )}

        {activeTab === 'settings' && (
          <div className="space-y-8">
            {/* 1. Integrations & Job Portals Section (FIRST) */}
            <div className="space-y-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-lime-500" />
                  <span>Integrations & Job Portals</span>
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Connect and authenticate your accounts with Naukri.com, Indeed, Greenhouse ATS, and Adzuna.
                </p>
              </div>
              <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
                <PortalIntegrationsPanel
                  onConnectionChange={(connected) => setNaukriConnected(connected)}
                />
              </div>
            </div>

            {/* 2. Global Auto-Apply & Criteria Section (SECOND) */}
            <div className="space-y-3 pt-6 border-t border-gray-200 dark:border-white/10">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-lime-500" />
                  <span>Auto-Apply & Matching Criteria</span>
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Configure universal target roles, locations, salary bounds, daily limits, and auto-submission rules.
                </p>
              </div>
              <AutoApplyPanel />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
