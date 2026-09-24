'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo, useContext } from 'react';
import type { JobsMetrics, JobListing, JobsFilter } from '@/types/automation-schema';
import FiltersBar from './JobsDashboard/FiltersBar';
import JobsErrorState from './JobsDashboard/JobsErrorState';
import { Sparkles, Zap, Briefcase, Settings, ChevronRight, ArrowUp, Linkedin, Mic, X, Globe, RefreshCw, Loader2, Plus, Bookmark, FileText, Mail, LayoutDashboard, Kanban } from 'lucide-react';
import { ResumeEnhancerProvider } from '@/contexts/ResumeEnhancerContext';
import { ATSProvider } from '@/contexts/ATSContext';
import DocumentsDashboardView from '@/components/dashboard/documents/DocumentsDashboardView';
import RedesignedDashboardView from '@/components/dashboard/redesigned/RedesignedDashboardView';
import { AutoApplyPanel } from '@/components/jobs/AutoApplyPanel';
import { ApplicationsPanel } from '@/components/jobs/ApplicationsPanel';
import CommsPanel from '@/components/dashboard/jobs/CommsPanel';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useNotifications } from '@/contexts/NotificationContext';
import { useApplyProgress } from '@/hooks/useApplyProgress';
import { useEntitlements } from '@/lib/hooks/useEntitlements';
import { ToastAction } from '@/components/ui/toast';
import { Switch } from '@/components/ui/switch';
import { JobCard } from '@/components/jobs/JobCard';
import type { JobCardTrackerInfo } from '@/components/jobs/JobCard';
import {
  buildJourneyIndex,
  getJourneyDocumentsForJob,
} from '@/lib/utils/journey-documents';
import { JobDetailModal } from '@/components/jobs/JobDetailModal';
import JobSidebar from '@/components/dashboard/jobs/JobSidebar';
import { detectUserCountry } from '@/components/jobs/CountrySelector';
import { DashboardDataContext } from '@/contexts/DashboardDataContext';
import { useJobLiveStatusStore } from '@/lib/stores/jobLiveStatusStore';
import NaukriConnectCard from './JobsDashboard/NaukriConnectCard';
import IndeedConnectCard from './JobsDashboard/IndeedConnectCard';
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
import { CHIP_INLINE, CHIP_TONES, chipState } from '@/components/ui/chip-styles';

function greetingForHour(hour: number): string {
  if (hour < 5) return 'Good evening';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

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

// ── URL <-> filter sync ─────────────────────────────────────────────────────
// Active discover filters + tab are mirrored into the URL query string so a
// page refresh (or a shared link) restores the exact same view.

const SORT_OPTIONS = ['matchScore', 'postedDate', 'salary', 'company'];
const SORT_ORDERS = ['asc', 'desc'];
const DATE_OPTIONS = ['all', '24h', '7d', '30d'];

// Keys the discover view owns in the URL (other params like jobId / action /
// filter / stage used by the applications tab are preserved untouched).
const MANAGED_URL_KEYS = [
  'tab',
  'q',
  'workplaceType',
  'experienceLevel',
  'datePosted',
  'sponsorsVisa',
  'easyApplyOnly',
  'savedOnly',
  'unpersonalized',
  'remoteOnly',
  'sortBy',
  'sortOrder',
  'matchScoreMin',
  'matchScoreMax',
  'roles',
  'jobTypes',
  'locations',
  'companies',
  'sources',
  'atsTypes',
];

function arrayParam(values: string[] | undefined): string | undefined {
  return values && values.length > 0 ? values.join(',') : undefined;
}

function filtersToParams(filters: JobsFilter): URLSearchParams {
  const params = new URLSearchParams();
  const set = (key: string, value?: string) => {
    if (value !== undefined && value !== '') params.set(key, value);
    else params.delete(key);
  };
  set('q', filters.searchText);
  set('workplaceType', arrayParam(filters.workplaceType));
  set('experienceLevel', arrayParam(filters.experienceLevel));
  set('datePosted', filters.datePosted && filters.datePosted !== 'all' ? filters.datePosted : undefined);
  set('sponsorsVisa', filters.sponsorsVisa ? 'true' : undefined);
  set('easyApplyOnly', filters.easyApplyOnly ? 'true' : undefined);
  set('savedOnly', filters.savedOnly ? 'true' : undefined);
  set('unpersonalized', filters.unpersonalized ? 'true' : undefined);
  set('remoteOnly', filters.remoteOnly ? 'true' : undefined);
  set('sortBy', filters.sortBy && filters.sortBy !== 'matchScore' ? filters.sortBy : undefined);
  set('sortOrder', filters.sortOrder && filters.sortOrder !== 'desc' ? filters.sortOrder : undefined);
  set('matchScoreMin', filters.matchScoreMin !== undefined ? String(filters.matchScoreMin) : undefined);
  set('matchScoreMax', filters.matchScoreMax !== undefined ? String(filters.matchScoreMax) : undefined);
  set('roles', arrayParam(filters.roles));
  set('jobTypes', arrayParam(filters.jobTypes));
  set('locations', arrayParam(filters.locations));
  set('companies', arrayParam(filters.companies));
  set('sources', arrayParam(filters.sources as string[] | undefined));
  set('atsTypes', arrayParam(filters.atsTypes as string[] | undefined));
  return params;
}

function paramsToFilters(params: URLSearchParams): Partial<JobsFilter> {
  const f: Partial<JobsFilter> = {};
  const get = (key: string) => params.get(key);
  const q = get('q');
  if (q) f.searchText = q;
  const wp = get('workplaceType');
  if (wp) f.workplaceType = wp.split(',').filter(Boolean);
  const exp = get('experienceLevel');
  if (exp) f.experienceLevel = exp.split(',').filter(Boolean);
  const date = get('datePosted');
  if (date && DATE_OPTIONS.includes(date)) f.datePosted = date as JobsFilter['datePosted'];
  if (get('sponsorsVisa') === 'true') f.sponsorsVisa = true;
  if (get('easyApplyOnly') === 'true') f.easyApplyOnly = true;
  if (get('savedOnly') === 'true') f.savedOnly = true;
  if (get('unpersonalized') === 'true') f.unpersonalized = true;
  if (get('remoteOnly') === 'true') f.remoteOnly = true;
  const sortBy = get('sortBy');
  if (sortBy && SORT_OPTIONS.includes(sortBy)) f.sortBy = sortBy as JobsFilter['sortBy'];
  const sortOrder = get('sortOrder');
  if (sortOrder && SORT_ORDERS.includes(sortOrder)) f.sortOrder = sortOrder as JobsFilter['sortOrder'];
  const mmin = get('matchScoreMin');
  if (mmin !== null && !Number.isNaN(Number(mmin))) f.matchScoreMin = Number(mmin);
  const mmax = get('matchScoreMax');
  if (mmax !== null && !Number.isNaN(Number(mmax))) f.matchScoreMax = Number(mmax);
  const split = (key: string) => {
    const v = get(key);
    return v ? v.split(',').filter(Boolean) : undefined;
  };
  const roles = split('roles');
  if (roles) f.roles = roles;
  const jobTypes = split('jobTypes');
  if (jobTypes) f.jobTypes = jobTypes;
  const locations = split('locations');
  if (locations) f.locations = locations;
  const companies = split('companies');
  if (companies) f.companies = companies;
  const sources = split('sources');
  if (sources) f.sources = sources as JobsFilter['sources'];
  const atsTypes = split('atsTypes');
  if (atsTypes) f.atsTypes = atsTypes as JobsFilter['atsTypes'];
  return f;
}

/*
 * Saved-job identity helpers.
 *
 * A discover listing and the JobApplication it was saved as do not share an id:
 * the listing carries the source job's `_id`, while the saved index is keyed by
 * whatever the save path had available — sometimes the source id, sometimes the
 * apply URL, sometimes a `company___title` fallback. Every place that asks "is
 * this job saved?" or "which application is this card about?" must try the same
 * candidates in the same order, or they disagree and the bookmark silently
 * fails to appear. These three functions are that single definition; they were
 * previously inlined in four places and had already drifted.
 */

/** Normalised `company___title` key. `title` is passed explicitly because the
 *  saved index stores it as `jobTitle` while listings call it `title`. */
function jobIdentityKey(company?: string | null, title?: string | null): string {
  const comp = (company || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const tit = (title || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  return `${comp}___${tit}`;
}

/** Lower-cased, trimmed apply URL — the form the saved index is keyed by. */
function normalizeApplyUrl(url?: string | null): string {
  return url ? url.trim().toLowerCase() : '';
}

/**
 * The saved-document fields the index is built from. Structural rather than the
 * Mongoose model so it stays usable from a `lite=true` payload, which omits
 * most of the document.
 */
type SavedIndexRecord = {
  _id?: string;
  id?: string;
  jobId?: string;
  externalId?: string;
  jobUrl?: string;
  sourceUrl?: string;
  company?: string;
  jobTitle?: string;
  title?: string;
};

/**
 * Build the id set / id map from a `/api/jobs?limit=200&lite=true` payload.
 * Pure, so the mount loader and the `jobUpdated` listener share it verbatim
 * instead of each carrying their own copy of the key list.
 */
function buildSavedIndex(items: SavedIndexRecord[]): { idSet: Set<string>; idMap: Map<string, string> } {
  const idSet = new Set<string>();
  const idMap = new Map<string, string>();

  items.forEach((j) => {
    const dbId = j._id || j.id;
    /*
      A saved document always has an `_id`. Bail rather than index the derived
      keys under `undefined` — that leaves `has(key)` true while `get(key)` is
      falsy, so the bookmark and the tracker disagree about the same job.
    */
    if (!dbId) return;

    idSet.add(dbId);
    idMap.set(dbId, dbId);

    if (j.jobId) {
      idSet.add(j.jobId);
      idMap.set(j.jobId, dbId);
    }
    if (j.externalId) {
      idSet.add(j.externalId);
      idMap.set(j.externalId, dbId);
    }
    if (j.jobUrl || j.sourceUrl) {
      idMap.set(normalizeApplyUrl(j.jobUrl || j.sourceUrl), dbId);
    }
    if (j.company && (j.jobTitle || j.title)) {
      idMap.set(jobIdentityKey(j.company, j.jobTitle || j.title), dbId);
    }
  });

  return { idSet, idMap };
}

/*
 * `DashboardDataContext` types `jobs` and `journeys` as `any[]`, so the fields
 * the tracker lookup actually reads are declared here. Document readiness lives
 * on the JOURNEY (journeys carry `cvId` / `coverLetterId`) and is derived by
 * `@/lib/utils/journey-documents`, never inline.
 */
type ApplicationDocLite = {
  _id?: string;
  id?: string;
  jobId?: string;
  status?: string;
  applicationDate?: string;
  appliedAt?: string;
  updatedAt?: string;
  atsScore?: number;
};

export type JobsTabId = 'dashboard' | 'discover' | 'applications' | 'comms' | 'docs' | 'settings';

export default function JobsDashboard() {
  const [activeTab, setActiveTab] = useState<JobsTabId>('dashboard');
  const tabSetByUrl = useRef(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const firstName = session?.user?.name?.split(' ')[0] || 'there';
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return `${greetingForHour(h)}, ${firstName}`;
  }, [firstName]);
  const { toast } = useToast();
  const { updateProgress } = useNotifications();
  const queryClient = useQueryClient();
  const applyProgress = useApplyProgress();
  const { plan } = useEntitlements();
  const isPaidUser = plan !== 'free';
  const [entitlements, setEntitlements] = useState<UserEntitlements | null>(null);
  const [userPreferences, setUserPreferences] = useState<any>(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const jobIdParam = searchParams.get('jobId') || searchParams.get('job');
    const newJobParam = searchParams.get('newJob') || searchParams.get('action') === 'add-job';
    const filterParam = searchParams.get('filter') || searchParams.get('stage');

    if (jobIdParam || newJobParam || filterParam) {
      setActiveTab('applications');
      tabSetByUrl.current = true;
    } else if (tabParam) {
      if (tabParam === 'dashboard' || tabParam === 'overview') {
        setActiveTab('dashboard');
        tabSetByUrl.current = true;
      } else if (tabParam === 'discover' || tabParam === 'jobs') {
        setActiveTab('discover');
        tabSetByUrl.current = true;
      } else if (tabParam === 'applications' || tabParam === 'tracker') {
        setActiveTab('applications');
        tabSetByUrl.current = true;
      } else if (tabParam === 'comms' || tabParam === 'communications') {
        setActiveTab('comms');
        tabSetByUrl.current = true;
      } else if (tabParam === 'docs' || tabParam === 'documents') {
        setActiveTab('docs');
        tabSetByUrl.current = true;
      } else if (tabParam === 'settings') {
        setActiveTab('settings');
        tabSetByUrl.current = true;
      }
    } else {
      setActiveTab('dashboard');
      tabSetByUrl.current = true;
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
  // Initialize from the URL so a refresh / shared link restores the view
  const [filters, setFilters] = useState<JobsFilter>(() => ({
    sortBy: 'matchScore',
    sortOrder: 'desc',
    ...paramsToFilters(searchParams),
  }));

  // Mirror the active tab + filters into the URL (preserving unrelated params
  // such as jobId / action / filter / stage used by the applications tab).
  const skipFirstUrlSync = useRef(true);
  useEffect(() => {
    if (skipFirstUrlSync.current) {
      skipFirstUrlSync.current = false;
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const next = filtersToParams(filters);
    for (const [key, value] of next.entries()) params.set(key, value);
    for (const key of MANAGED_URL_KEYS) {
      if (!next.has(key)) params.delete(key);
    }
    params.set('tab', activeTab);
    const qs = params.toString();
    const target = qs ? `${pathname}?${qs}` : pathname;
    if (target !== window.location.pathname + window.location.search) {
      router.replace(target, { scroll: false });
    }
  }, [filters, activeTab, pathname, router]);
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
  const [selectedTrackerJob, setSelectedTrackerJob] = useState<any | null>(null);
  const [trackerSidebarOpen, setTrackerSidebarOpen] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [savedViaApplyIds, setSavedViaApplyIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  /** See `applyingRef` — same batched-state race, same fix. */
  const savingRef = useRef<string | null>(null);
  const [suggestedSearches, setSuggestedSearches] = useState<string[]>([]);
  const [isApplying, setIsApplying] = useState<string | null>(null);
  /**
   * Synchronous companion to `isApplying`.
   *
   * State updates are batched, so two click events dispatched in the same tick
   * both read the *pre-update* `isApplying` from their shared closure and a
   * state-only guard lets both through. A ref is mutated immediately, so the
   * second call sees it.
   */
  const applyingRef = useRef<string | null>(null);
  const [portalConnections, setPortalConnections] = useState<any[]>([]);
  const [naukriConnected, setNaukriConnected] = useState<boolean>(false);
  const [isSyncingPortals, setIsSyncingPortals] = useState<boolean>(false);
  const [connectModalOpen, setConnectModalOpen] = useState<boolean>(false);
  const [selectedConnectPortal, setSelectedConnectPortal] = useState<PortalType>('naukri');
  const [autoApplyEnabled, setAutoApplyEnabled] = useState<boolean>(false);
  const [applicationMode, setApplicationMode] = useState<string>('manual_review');
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
        // Canonical payload: `sources` (the three external accounts) plus
        // `network`. It used to be `connections` with a per-provider `status`
        // that callers had to interpret themselves.
        if (data.success && Array.isArray(data.sources)) {
          setPortalConnections(data.sources);
          const naukri = data.sources.find((c: any) => c.source === 'naukri');
          // Read the server's projection rather than re-deriving it here. The
          // local `status === 'connected' && account.email` test this replaces
          // reported a connected account as disconnected whenever no email had
          // been stored.
          setNaukriConnected(naukri?.state === 'connected');
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

    fetch('/api/job-search-profile')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.profile) {
          setUserPreferences(data.profile);
          setAutoApplyEnabled(data.profile.autoApplyEnabled === true);
          if (data.profile.applicationMode) setApplicationMode(data.profile.applicationMode);
        }
      })
      .catch(() => {});

    // Canonical tailoring mode lives on User.settings (this is what document
    // generation reads). Fall back to the legacy JobSearchProfile value so a
    // preference saved before the backfill still shows correctly.
    fetch('/api/user/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const canonical = data?.data?.settings?.cvTailoringMode;
        if (canonical) {
          setCvTailoringMode(parseCvTailoringMode(canonical));
          return;
        }
        return fetch('/api/job-search-profile')
          .then((res) => (res.ok ? res.json() : null))
          .then((legacy) => {
            const legacyMode = legacy?.cvTailoringMode || legacy?.profile?.cvTailoringMode;
            if (legacyMode) setCvTailoringMode(parseCvTailoringMode(legacyMode));
          });
      })
      .catch(() => {});
  }, [userId, fetchPortalConnections]);

  // Search Profile Data Formatting for Discover results summary
  const targetRolesDisplay = useMemo(() => {
    if (filters.roles?.length) {
      return filters.roles.join(' · ');
    }
    if (userPreferences?.targetRoles && userPreferences.targetRoles.length > 0) {
      return userPreferences.targetRoles.join(' · ');
    }
    return 'target roles';
  }, [userPreferences, filters.roles]);

  // Only criteria that actually shape the feed belong in this summary:
  // workplace setup (explicit feed filter, else the profile's standing
  // preference) and explicitly filtered experience level. Profile fields like
  // target salary, notice period, search intensity and volume are NOT applied
  // as feed filters, so listing them here misrepresented the results.
  const metadataList = useMemo(() => {
    const parts: string[] = [];

    // Workplace Types — explicit feed filter wins; otherwise the profile's
    // standing workplace preference (used for personalization when no
    // explicit workplace filter is chosen).
    if (filters.workplaceType?.length) {
      parts.push(filters.workplaceType.map((t: string) => t.charAt(0).toUpperCase() + t.slice(1)).join(' · '));
    } else if (userPreferences?.workplaceTypes && userPreferences.workplaceTypes.length > 0) {
      parts.push(userPreferences.workplaceTypes.map((t: string) => t.charAt(0).toUpperCase() + t.slice(1)).join(' · '));
    }

    // Experience — only when explicitly filtered in the feed
    if (filters.experienceLevel?.length) {
      const expLabels: Record<string, string> = {
        entry: 'Entry Level',
        mid: 'Mid-level',
        senior: 'Senior',
        lead: 'Lead / Principal',
      };
      parts.push(filters.experienceLevel.map((e) => expLabels[e] || e).join(' · '));
    }

    return parts;
  }, [userPreferences, filters.workplaceType, filters.experienceLevel]);

  // Map of discovered job ID / URL / titleKey -> MongoDB JobApplication _id
  const [savedJobIdMap, setSavedJobIdMap] = useState<Map<string, string>>(new Map());
  const [savedCount, setSavedCount] = useState(0);

  // Fetch saved job IDs on mount and userId change
  useEffect(() => {
    async function loadSavedJobIds() {
      try {
        const res = await fetch('/api/jobs?limit=200&lite=true');
        if (res.ok) {
          const data = await res.json();
          const items = data.jobs || data.data || [];
          if (Array.isArray(items)) {
            const { idSet, idMap } = buildSavedIndex(items);
            setSavedIds(idSet);
            setSavedJobIdMap(idMap);
          }
        }
        // Fetch saved-count separately (only saved status)
        const savedRes = await fetch('/api/jobs?limit=200&lite=true&status=saved');
        if (savedRes.ok) {
          const savedData = await savedRes.json();
          const savedItems = savedData.jobs || savedData.data || [];
          if (Array.isArray(savedItems)) {
            setSavedCount(savedItems.length);
          }
        }
      } catch (err) {
        console.error('Failed to load saved job IDs:', err);
      }
    }
    loadSavedJobIds();
  }, [userId]);

  /*
   * Pipeline detail for cards that represent a job already in the tracker.
   *
   * Source is the dashboard data context, not a new request: it already holds
   * every JobApplication (`/api/jobs?limit=all`) and every journey
   * (`/api/journeys?limit=all`) for this user, loaded once for the whole
   * dashboard shell. `useContext` is used directly rather than the
   * `useDashboardData` hook so that rendering outside the provider degrades to
   * "no tracker info" instead of throwing and blanking the Jobs page.
   *
   * Document readiness lives on the JOURNEY (journeys carry cvId /
   * coverLetterId), not on JobApplication — which is why both maps exist.
   */
  const dashboardData = useContext(DashboardDataContext);
  const liveStatuses = useJobLiveStatusStore((state) => state.statuses);

  /**
   * Resolve a discover-listing job to the JobApplication id it was saved as.
   *
   * The candidate chain itself lives in `jobIdentityKey` / `normalizeApplyUrl`
   * at module scope so this, `isJobSaved`, `handleSaveJob` and the card CTAs
   * cannot drift apart — they had four near-identical copies of it.
   *
   * Declared before its consumers on purpose: `trackerForJob` and the card
   * render list it in a dependency array, and referencing a `const` above its
   * declaration throws at hook-creation time.
   */
  const resolveApplicationId = useCallback(
    (job: JobListing): string | null => {
      const jobKey = jobIdentityKey(job.company, job.title);
      const url = normalizeApplyUrl(job.applyUrl);

      return (
        savedJobIdMap.get(job._id) ||
        (job.id ? savedJobIdMap.get(job.id) : null) ||
        (url ? savedJobIdMap.get(url) : null) ||
        savedJobIdMap.get(jobKey) ||
        (savedIds.has(job._id) ? job._id : null)
      );
    },
    [savedJobIdMap, savedIds]
  );

  const trackerByApplicationId = useMemo(() => {
    const map = new Map<string, JobCardTrackerInfo>();
    const jobs = dashboardData?.jobs || [];
    const journeys = dashboardData?.journeys || [];

    /*
      Keyed by the **JobApplication** id, which is what `journey.jobId` holds.

      The previous version keyed this map by `journey.jobId` but looked it up
      with `app.jobId` — a different field entirely (`JobApplication.jobId` is the
      *external source* id, e.g. the Workable posting id). The lookup therefore
      never matched, so every discover card reported "no documents" no matter
      what had been generated. `buildJourneyIndex` keeps one key space and is
      shared with the tracker, so the two pages cannot drift.
    */
    const journeyIndex = buildJourneyIndex(journeys as any, jobs as any);

    for (const app of jobs as ApplicationDocLite[]) {
      const id = String(app?._id || app?.id || '');
      if (!id) continue;
      const docs = getJourneyDocumentsForJob(journeyIndex.get(id));
      map.set(id, {
        status: String(app?.status || 'saved'),
        applicationDate:
          app?.applicationDate || app?.appliedAt || app?.updatedAt || undefined,
        atsScore: typeof app?.atsScore === 'number' ? app.atsScore : undefined,
        hasCV: docs.hasCV,
        hasCoverLetter: docs.hasCoverLetter,
      });
    }

    return map;
  }, [dashboardData?.jobs, dashboardData?.journeys]);

  // Resolve a discover-listing job to its tracker entry via the shared
  // application-id chain, which is the same one that backs the saved bookmark.
  const trackerForJob = useCallback(
    (job: JobListing): JobCardTrackerInfo | null => {
      const appId = resolveApplicationId(job);
      if (!appId) return null;
      return trackerByApplicationId.get(appId) || null;
    },
    [resolveApplicationId, trackerByApplicationId]
  );

  // Load applied job IDs from server
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    async function loadAppliedIds() {
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
    loadAppliedIds();
    return () => controller.abort();
  }, [userId]);

  // Listen for jobUpdated events to refresh savedIds when jobs are saved/updated elsewhere
  useEffect(() => {
    const handleJobUpdated = () => {
      // Re-fetch saved job IDs to stay in sync
      async function refreshSavedIds() {
        try {
          const res = await fetch('/api/jobs?limit=200&lite=true');
          if (res.ok) {
            const data = await res.json();
            const items = data.jobs || data.data || [];
            if (Array.isArray(items)) {
              const { idSet, idMap } = buildSavedIndex(items);
              setSavedIds(idSet);
              setSavedJobIdMap(idMap);
            }
          }
          // Also refresh saved count
          const savedRes = await fetch('/api/jobs?limit=200&lite=true&status=saved');
          if (savedRes.ok) {
            const savedData = await savedRes.json();
            const savedItems = savedData.jobs || savedData.data || [];
            if (Array.isArray(savedItems)) {
              setSavedCount(savedItems.length);
            }
          }
        } catch (err) {
          console.error('Failed to refresh saved job IDs:', err);
        }
      }
      refreshSavedIds();
    };

    window.addEventListener('jobUpdated', handleJobUpdated as EventListener);
    window.addEventListener('jobDeleted', handleJobUpdated as EventListener);
    return () => {
      window.removeEventListener('jobUpdated', handleJobUpdated as EventListener);
      window.removeEventListener('jobDeleted', handleJobUpdated as EventListener);
    };
  }, []);

  /**
   * Whether the listing is already in the tracker.
   *
   * Delegates to the shared candidate chain rather than repeating it, plus a
   * `savedIds` membership check on the source id: the id set and the id map are
   * built from the same payload but a listing's `id` can be in the set without a
   * usable map value, so the union is kept instead of trusting the map alone.
   */
  const isJobSaved = useCallback(
    (job: JobListing) =>
      Boolean(resolveApplicationId(job)) || (job.id ? savedIds.has(job.id) : false),
    [resolveApplicationId, savedIds]
  );

  const handleSaveJob = async (job: JobListing) => {
    // Needed by the optimistic map updates below; the resolve/toggle decision
    // goes through `resolveApplicationId` so all callers agree.
    const jobKey = jobIdentityKey(job.company, job.title);
    const url = normalizeApplyUrl(job.applyUrl);

    const dbJobId = resolveApplicationId(job);
    const currentlySaved = Boolean(dbJobId) || savedIds.has(job._id);

    if (savingRef.current === job._id) return;
    savingRef.current = job._id;
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
          setSavedCount((prev) => Math.max(0, prev - 1));
          toast({ title: 'Removed from saved jobs', company: job.company, logoUrl: job.companyLogo });
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error || 'Failed to remove saved job');
        }
      } else {
        const res = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },            body: JSON.stringify({
            jobId: job._id || job.id || undefined,
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
          setSavedCount((prev) => prev + 1);

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
            company: job.company,
            logoUrl: job.companyLogo,
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
        company: job.company,
        logoUrl: job.companyLogo,
      });
    } finally {
      savingRef.current = null;
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

    /*
      Re-entry guard. The CTA is disabled while a run is in flight, but a
      double-click can land both events before React re-renders, and the
      auto-apply endpoint enqueues a NEW ApplicationQueue row per call (its
      idempotency key includes Date.now(), so it never dedupes). Two calls
      meant two submissions and two "Application Submitted" notifications for
      one intent.
    */
    if (applyingRef.current === appId) {
      toast({
        title: 'Already in progress',
        description: `Please wait — a task is already running for ${job.title}.`,
      });
      return;
    }

    applyingRef.current = appId;
    setIsApplying(appId);

    // Start progress
    applyProgress.startApplyProgress(job.title, job.company, job._id);
    updateProgress(appId, 15, `Matching CV for ${job.title}...`, 'progress');

    try {
      // Update progress: tailoring
      applyProgress.updateToTailoring(job.title, job.company, job._id);
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
        applyProgress.cancelProgress(job._id);
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
        applyProgress.cancelProgress(job._id);
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
        applyProgress.cancelProgress(job._id);
        setEntitlementNoticeData({
          code: 'AUTHENTICATION_REQUIRED',
          jobTitle: job.title,
          company: job.company,
          applyUrl: job.applyUrl,
        });
        setEntitlementNoticeOpen(true);
        return;
      }

      // Skipped by decision engine
      if (resData.status === 'skipped') {
        applyProgress.completeApply(job.title, job.company, true, resData.message || 'This job was skipped based on your preferences.', job._id, 'skipped');
        updateProgress(appId, 100, `Skipped: ${resData.message || 'Not a match'}`, 'progress');
        return;
      }

      if (res.ok && resData.success) {
        const createdId = resData.applicationId || job._id;
        setAppliedIds((prev) => new Set(prev).add(job._id));
        // Auto-apply saves the job on the backend — mark it as saved-via-apply
        // so the card hides the explicit Save button.
        setSavedIds((prev) => new Set(prev).add(job._id));
        setSavedCount((prev) => prev + 1);
        setSavedViaApplyIds((prev) => new Set(prev).add(job._id));
        // Immediately invalidate entitlements so usage counters update in the UI
        queryClient.invalidateQueries({ queryKey: ['entitlements'] });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('jobUpdated', { detail: { jobId: createdId } }));
        }

        /*
          Already queued. The endpoint returns this instead of enqueueing a
          duplicate, so nothing new started here. Letting it fall into the
          generic branch below reports "Documents ready", which is both false
          and the same misleading-notification class this change set out to
          remove. Say what actually happened, once.
        */
        if (resData.status === 'already_queued') {
          applyProgress.completeApply(
            job.title,
            job.company,
            true,
            'This application is already queued for processing.',
            job._id,
            'queued'
          );
          updateProgress(appId, 100, `Already in progress — ${job.title} is queued`, 'progress');
          return;
        }

        // Show queued or applied feedback based on actual status
        if (resData.status === 'queued') {
          applyProgress.updateToApplying(job.company, job._id);
          updateProgress(appId, 90, `Queued for ${resData.mode || 'auto'} processing`, 'progress');
          setTimeout(() => {
            applyProgress.completeApply(job.title, job.company, true, resData.message || `Application queued for ${resData.mode || 'auto'} processing.`, job._id, 'queued');
            updateProgress(appId, 100, `Application queued for ${resData.mode || 'auto'} processing`, 'progress');
          }, 1500);
        } else if (resData.status === 'applied') {
          applyProgress.completeApply(job.title, job.company, true, resData.message, job._id, 'applied');
          updateProgress(appId, 100, `Applied to ${job.title}!`, 'progress');
        } else {
          /*
            Unrecognised status. This used to fall through to a success toast plus "Documents ready",
            so any status the endpoint added later would silently be reported as a win. Report what
            actually came back instead of guessing.
          */
          applyProgress.completeApply(
            job.title,
            job.company,
            false,
            resData.message || 'The application did not complete.',
            job._id,
            resData.status
          );
          updateProgress(appId, 100, resData.message || 'The application did not complete', 'info');
        }
      } else {
        // Genuine submission failure on employer site
        applyProgress.completeApply(job.title, job.company, false, resData.error || resData.message || "We couldn't complete the application on the employer's site.", job._id);
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
      applyProgress.completeApply(job.title, job.company, false, err.message || 'Network error occurred during submission.', job._id);
      setEntitlementNoticeData({
        code: 'APPLICATION_FAILED',
        jobTitle: job.title,
        company: job.company,
        applyUrl: job.applyUrl,
        message: err.message || 'Network error occurred during submission.',
      });
      setEntitlementNoticeOpen(true);
    } finally {
      applyingRef.current = null;
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

      if (filters.searchText) params.q = filters.searchText;
      if (filters.easyApplyOnly) params.easyApplyOnly = 'true';
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
      if (filters.unpersonalized) params.unpersonalized = 'true';

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
        /*
          A non-OK response used to `return` silently, so an outage rendered
          the plain "No jobs found" empty state — indistinguishable from a
          genuinely empty result. Surface a friendly error instead, but only
          where the view would otherwise be empty: cached results (first page
          with a cache hit) and already-loaded pages (page > 1) are kept as-is,
          so a background refresh failing never wipes what the user sees.
        */
        console.error('Job discovery request failed with status:', response.status);
        if (isFirstPage && !getCachedJobs(params)) {
          const message =
            response.status >= 500
              ? `The job service didn't respond (error ${response.status}). Please try again in a moment.`
              : response.status === 429
              ? 'Too many requests — please wait a moment and try again.'
              : `We couldn't load jobs right now (error ${response.status}). Please try again.`;
          setJobs([]);
          setError(message);
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
      setSuggestedSearches(data.suggestedSearches || []);
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
    // Persist to user's job-search profile
    fetch('/api/job-search-profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: { locations: newCountries } }),
    }).catch(() => {});
  };

  const handleFilterChange = (newFilters: Partial<JobsFilter>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters({
      sortBy: 'matchScore',
      sortOrder: 'desc',
      unpersonalized: false,
    });
    setPage(1);
  };

  const handleCvTailoringModeChange = async (mode: CvTailoringMode) => {
    const previous = cvTailoringMode;
    setCvTailoringMode(mode);
    try {
      // User.settings.cvTailoringMode is the canonical store — it is what the
      // document-generation pipeline reads via getUserCvTailoringMode().
      // Writing to JobSearchProfile instead left the toggle with no effect on
      // generated CVs, so this must stay pointed at /api/user/settings.
      //
      // PUT, not PATCH. `/api/user/settings` exports GET and PUT only, so a
      // PATCH returns 405 and the toggle silently reverted. Every other caller
      // of this route already uses PUT (dashboard/settings, Step3CV).
      const res = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { cvTailoringMode: mode } }),
      });
      if (!res.ok) {
        throw new Error(`Failed to save tailoring mode (HTTP ${res.status})`);
      }
    } catch (err) {
      console.error('Failed to save CV tailoring mode:', err);
      setCvTailoringMode(previous);
      // Surface it. A silent revert plus a console error is indistinguishable
      // from "the toggle just doesn't stick".
      toast({
        title: 'Could not save tailoring mode',
        description: 'Your change was reverted. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleAutoApply = async () => {
    const nextState = !autoApplyEnabled;
    setAutoApplyEnabled(nextState);
    try {
      const res = await fetch('/api/job-search-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: { autoApplyEnabled: nextState } }),
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

      const connectedSources = portalConnections.filter((c: any) => c.state === 'connected');

      if (connectedSources.length === 0) {
        await fetchJobs();
        toast({
          title: 'Jobs Refreshed',
          description: 'Updated with the latest roles from the AIResume job network.',
        });
        return;
      }

      const results = await Promise.all(
        connectedSources.map((conn: any) =>
          fetch(`/api/portal-connections/${encodeURIComponent(conn.source)}/sync`, {
            method: 'POST',
          })
            .then((res) => (res.ok ? res.json() : null))
            .catch(() => null)
        )
      );

      await fetchJobs();
      await fetchPortalConnections();

      /*
        ⚠️ Report what actually happened.

        The three consumer portals are session-captured account connections with
        no implemented job source, so a sync legitimately returns zero jobs and
        says so via `sourceUnavailable`. The previous copy claimed "Discover feed
        updated with latest portal roles" unconditionally — which was true only
        because the adapters returned hard-coded sample roles that got written
        into the shared job pool.
      */
      const created = results.reduce((sum, r) => sum + (r?.jobsCreated || 0), 0);
      const unavailable = results.some((r) => r?.sourceUnavailable);

      toast({
        title:
          created > 0
            ? `Sync complete — ${created} new job${created === 1 ? '' : 's'}`
            : 'Nothing new to sync',
        description:
          created > 0
            ? 'Discover feed updated with the latest roles.'
            : unavailable
              ? 'Your connected accounts are saved. Job discovery from them isn’t available yet.'
              : 'No new roles were found.',
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
    : deduplicatedJobs.filter((job) => !isJobSaved(job));

  // Comms is a fixed-height workspace: CommsPanel scrolls internally, so its
  // tab content must FILL the space between the header block and the bottom of
  // the layout frame instead of sizing to its own content.
  //
  // Filling needs a full-height chain from the frame all the way down. The frame
  // supplies its end (OptimizedDashboardLayout gives us `h-full flex flex-col`),
  // but the route shell in `app/dashboard/jobs/page.tsx` sits in between and must
  // also be definite — otherwise the chain is dead on arrival, because this
  // element's parent is then a plain content-sized block rather than a flex
  // container and `flex-1` does nothing.
  //
  // Hence `h-full` here rather than `flex-1`: this element is a child of that
  // block. Applied ONLY for comms — the root and container below are shared by
  // every tab, and constraining them unconditionally squashes the tall tabs.
  // Measured: with `flex-1 min-h-0` on a 2400px dashboard tab, the default
  // `flex-shrink: 1` compressed the content down to the viewport height instead
  // of letting it overflow and scroll, so it became unreachable.
  const isCommsTab = activeTab === 'comms';

  return (
    <div className={`w-full bg-transparent ${isCommsTab ? 'h-full min-h-0 flex flex-col' : ''}`}>
      <div
        className={`w-full max-w-[1850px] mx-auto ${
          isCommsTab ? 'flex-1 min-h-0 flex flex-col gap-6' : 'space-y-6'
        }`}
      >
        {/* Header + Tabs */}
        <div
          className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-white/10 pb-4 ${
            isCommsTab ? 'shrink-0' : ''
          }`}
        >
          <div>
            <h1 className="text-h1 font-bold text-gray-900 dark:text-white">
              {activeTab === 'dashboard'
                ? greeting
                : activeTab === 'discover'
                ? 'Jobs Hub'
                : activeTab === 'applications'
                ? 'Applications'
                : activeTab === 'comms'
                ? 'Communications'
                : activeTab === 'docs'
                ? 'Documents'
                : 'Settings'}
            </h1>
            <p className="mt-1 text-small text-gray-600 dark:text-gray-400">
              {activeTab === 'dashboard' ? (
                <>Here&apos;s what&apos;s happening with your career.</>
              ) : activeTab === 'discover' ? (
                <>
                  AI-powered job matching and automation
                  <span className={`${CHIP_INLINE} ${CHIP_TONES.green} font-medium ml-2`}>
                    BETA
                  </span>
                </>
              ) : activeTab === 'applications' ? (
                <>Track every application, from saved to offer</>
              ) : activeTab === 'comms' ? (
                <>Emails, recruiter outreach &amp; application communications</>
              ) : activeTab === 'docs' ? (
                <>Your master CV, tailored CVs &amp; cover letters</>
              ) : (
                <>Application automation &amp; search preferences</>
              )}
            </p>
          </div>

          <nav className="flex items-center md:items-end gap-1.5 sm:gap-4 md:gap-6 w-full md:w-auto justify-between md:justify-start overflow-x-auto scrollbar-hide py-1 md:py-0">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'discover', label: 'Jobs', icon: Briefcase },
              { id: 'applications', label: 'Applications', icon: Kanban },
              { id: 'comms', label: 'Comms', icon: Mail },
              { id: 'docs', label: 'Docs', icon: FileText },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  title={tab.label}
                  aria-label={tab.label}
                  className={`flex items-center justify-center gap-2 py-2 px-2.5 sm:px-0 border-b-2 font-medium text-small transition-all duration-200 outline-none hover:bg-transparent focus:ring-0 focus-visible:ring-0 focus:outline-none focus-visible:outline-none !shadow-none !outline-none hover:!shadow-none focus:!shadow-none group ${
                    isActive
                      ? 'border-lime-500 text-lime-600 dark:text-lime-400'
                      : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                  style={{ boxShadow: 'none', outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                >
                  <tab.icon className="w-4 h-4 transition-transform duration-200 group-hover:scale-110 flex-shrink-0" />
                  <span className="hidden sm:inline transition-transform duration-200 group-hover:scale-105 whitespace-nowrap">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <RedesignedDashboardView hideGreeting={true} />
          </div>
        )}

        {activeTab === 'discover' && (
          error && jobs.length === 0 ? (
            <JobsErrorState message={error} onRetry={handleRetry} />
          ) : (
          <div className="space-y-4">
            <FiltersBar
              filters={filters}
              onChange={handleFilterChange}
              onReset={handleResetFilters}
              metrics={metrics}
              countries={countries}
              onCountriesChange={handleCountriesChange}
              userId={userId}
              savedCount={savedCount}
              cvTailoringMode={cvTailoringMode}
              onCvTailoringModeChange={handleCvTailoringModeChange}
              userPreferences={userPreferences}
              autoApplyEnabled={autoApplyEnabled}
              onToggleAutoApply={handleToggleAutoApply}
              onOpenSettings={() => setActiveTab('settings')}
              entitlements={entitlements}
              isPaidUser={isPaidUser}
              portalConnections={portalConnections}
            />

            {/* Results Count & Dynamic Mode Statement */}
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5 pt-1 text-xs">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-bold text-sm text-gray-900 dark:text-white shrink-0">
                  {displayedJobs.length.toLocaleString()}{' '}
                  {filters.savedOnly
                    ? (displayedJobs.length === 1 ? 'saved job' : 'saved jobs')
                    : filters.matchScoreMin === 0 || filters.unpersonalized
                    ? (displayedJobs.length === 1 ? 'available job' : 'available jobs')
                    : filters.sortBy === 'postedDate'
                    ? (displayedJobs.length === 1 ? 'recent job' : 'recent jobs')
                    : `${displayedJobs.length === 1 ? 'matching job' : 'matching jobs'}${total > displayedJobs.length ? ` of ${total.toLocaleString()}` : ''}`}
                </span>

                <span className="text-gray-500 dark:text-gray-400">
                  {filters.savedOnly ? (
                    <span>Shortlisted opportunities ready for tailored CV generation and application</span>
                  ) : filters.matchScoreMin === 0 || filters.unpersonalized ? (
                    <span>
                      All active jobs from ingested sources across all roles and industries
                      {countries.length > 0 && <span className="font-medium text-gray-700 dark:text-gray-300"> · {countries.join(', ')}</span>}
                    </span>
                  ) : filters.sortBy === 'postedDate' ? (
                    <span>
                      Fresh job listings sorted chronologically by most recently posted
                      {countries.length > 0 && <span className="font-medium text-gray-700 dark:text-gray-300"> · {countries.join(', ')}</span>}
                    </span>
                  ) : (
                    <span>
                      Personalized based on your{' '}
                      <strong className="text-gray-800 dark:text-gray-200 font-semibold">{targetRolesDisplay}</strong>
                      {metadataList.length > 0 && (
                        <span className="text-gray-500 dark:text-gray-400 font-normal">
                          {' '}({metadataList.join(' · ')})
                        </span>
                      )}
                    </span>
                  )}
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
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#0f172a] dark:bg-[#013f2e] text-white text-sm font-semibold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                >
                  <ArrowUp className="w-4 h-4" />
                  {newJobsCount} new job{newJobsCount !== 1 ? 's' : ''}
                </button>
              </div>
            )}

            {/* Slim inline error banner — a fetch failure while cached jobs are
                still displayed must not be silently swallowed, but the grid is
                kept so the outage doesn't wipe usable content. */}
            {error && jobs.length > 0 && (
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-amber-300/70 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-xs text-amber-800 dark:text-amber-200">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="font-bold underline shrink-0 hover:no-underline"
                >
                  Retry
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
                  {displayedJobs
                    .map((job, index) => {
                      const saved = isJobSaved(job);
                      const tracker = saved ? trackerForJob(job) : null;
                      const applyKey = `apply-${job._id}`;
                      const applying = isApplying === applyKey;
                      const progressPercent = liveStatuses[applyKey]?.progress;

                      return (
                      <JobCard
                        key={job._id}
                        job={job}
                        colorIndex={index}
                        isSaved={saved}
                        isApplied={appliedIds.has(job._id)}
                        applicationMode={applicationMode}
                        saving={savingId === job._id}
                        tracker={tracker}
                        applying={applying}
                        progressPercent={progressPercent}
                        savedViaApply={savedViaApplyIds.has(job._id)}
                        progressLabel={
                          applying
                            ? `Please wait — ${progressPercent ? `${progressPercent}% done` : 'a task is already running for this job'}.`
                            : undefined
                        }
                        onOpenTracker={() => {
                          // Same chain the tracker lookup used — a bare
                          // `savedJobIdMap.get(job._id)` misses listings whose
                          // application was indexed under the source id, the
                          // apply URL or `company___title`, so the button used
                          // to land on the generic tab despite the card having
                          // rendered tracker detail.
                          const appId = resolveApplicationId(job);
                          router.push(
                            appId
                              ? `/dashboard/jobs?tab=applications&jobId=${appId}`
                              : '/dashboard/jobs?tab=applications'
                          );
                        }}
                        onOpenDocuments={() => router.push('/dashboard/jobs?tab=docs')}
                        onOpen={() => {
                          if (saved && tracker) {
                            // Saved jobs: open the full journey sidebar
                            const appId = resolveApplicationId(job);
                            setSelectedTrackerJob({
                              ...job,
                              _id: appId || job._id,
                              id: appId || job._id,
                              status: tracker.status || 'saved',
                              matchScore: job.matchScore,
                              atsScore: tracker.atsScore,
                            });
                            setTrackerSidebarOpen(true);
                          } else {
                            // Unsaved jobs: open the detail modal
                            setSelectedJob(job);
                            setModalOpen(true);
                          }
                        }}
                        onSave={() => handleSaveJob(job)}
                        /*
                          No pass action once a job is saved. A shortlisted job
                          must not be dismissible — the ✕ would silently drop a
                          job the user deliberately kept, and passing does not
                          un-save it, so the card vanished while the record
                          stayed behind. Un-saving is the explicit action.
                        */
                        onPass={saved ? undefined : () => {
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
                      );
                    })}

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
                  className="px-4 py-2 rounded-xl bg-[#013f2e] hover:bg-[#025c43] text-white font-bold text-xs transition-colors shadow-sm"
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
                {suggestedSearches.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2 mb-4">
                    {suggestedSearches.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => {
                          setFilters((prev) => ({ ...prev, searchText: suggestion }));
                          setPage(1);
                        }}
                        className={`${chipState('idle', 'lg')} font-medium cursor-pointer`}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
                {!isPaidUser && (
                  <Link
                    href="/linkedin-enhancer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#013f2e] dark:text-[#36D39B] hover:underline"
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
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#013f2e] dark:text-[#36D39B]" />
                        <span>Loading more jobs...</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPage((p) => p + 1)}
                        className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 hover:border-[#013f2e]/50 dark:hover:border-[#36D39B]/50 bg-white dark:bg-[#141810] text-xs font-bold text-gray-800 dark:text-gray-200 hover:text-[#013f2e] dark:hover:text-[#36D39B] transition-all shadow-xs"
                      >
                        Load more jobs ({displayedJobs.length} of {total})
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-xs font-medium text-gray-400 dark:text-gray-500">
                    You&apos;ve viewed all {displayedJobs.length} {filters.savedOnly ? 'saved' : 'matching'} {displayedJobs.length === 1 ? 'job' : 'jobs'}
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
              isApplied={selectedJob ? appliedIds.has(selectedJob._id) : false}
              applicationMode={applicationMode}
              saving={selectedJob ? savingId === selectedJob._id : false}
              onSave={() => selectedJob && handleSaveJob(selectedJob)}
              onApply={() => selectedJob && handleApplyJob(selectedJob)}
            />

            {/* Journey Sidebar — opens for saved/in-tracker jobs */}
            {trackerSidebarOpen && selectedTrackerJob && (() => {
              const fullJob = (dashboardData?.jobs || []).find(
                (j: any) => (j._id || j.id) === (selectedTrackerJob._id || selectedTrackerJob.id)
              ) || selectedTrackerJob;
              const jobJourneys = (dashboardData?.journeys || []).filter(
                (j: any) => j.jobId === fullJob._id || j.jobId === fullJob.id
              );
              return (
                <JobSidebar
                  job={fullJob}
                  journeys={jobJourneys}
                  onClose={() => {
                    setTrackerSidebarOpen(false);
                    setSelectedTrackerJob(null);
                  }}
                  onRefresh={() => {
                    fetchJobs(true);
                  }}
                />
              );
            })()}

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
          )
        )}

        {activeTab === 'applications' && (
          <ApplicationsPanel metrics={metrics} userId={userId} />
        )}

        {activeTab === 'comms' && (
          // Height comes from the flex chain above (`flex-1 min-h-0`), not from a
          // magic number.
          //
          // This previously read `h-[calc(100vh-320px)] min-h-[520px]`. The 320px
          // was a stale estimate of the chrome above the panel (header h-14,
          // frame py-5, header block, space-y-6, frame padding) — the real total
          // is ~192px. So the wrapper was ~122px shorter than the space actually
          // available, which is the dead area that appeared below the email list
          // and got worse as the viewport got taller. `min-h-[520px]` also
          // silently overrode the calc on shorter viewports.
          //
          // `min-h-0` is required: without it a flex item refuses to shrink below
          // its content size and the chain does nothing.
          //
          // No bottom padding here. There used to be a `pb-6`, which stacked on the
          // route shell's `py-4 md:py-6` and left 48px under the panel against the
          // 24px `gap-6` above it — measured on a 2x screenshot as 99 device px
          // (panel edge y=193 to card edge y=292). The shell already supplies the
          // bottom spacing for every tab, so this wrapper only insets horizontally.
          <div className="flex-1 min-h-0 flex flex-col px-6">
            <CommsPanel />
          </div>
        )}

        {(activeTab === 'docs' || (activeTab as string) === 'documents') && (
          <ResumeEnhancerProvider>
            <ATSProvider>
              <DocumentsDashboardView />
            </ATSProvider>
          </ResumeEnhancerProvider>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <AutoApplyPanel userId={userId} onProfileSaved={() => {
              fetch('/api/job-search-profile')
                .then((res) => (res.ok ? res.json() : null))
                .then((data) => {
                  if (data?.profile) {
                    setUserPreferences(data.profile);
                    setAutoApplyEnabled(data.profile.autoApplyEnabled === true);
                  }
                })
                .catch(() => {});
            }} />
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
