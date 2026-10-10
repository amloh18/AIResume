'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { JobsMetrics, JobsFilter } from '@/types/automation-schema';
import {
  Search,
  Bookmark,
  Clock,
  Globe,
  Zap,
  Check,
  ChevronDown,
  ChevronRight,
  Shield,
  Briefcase,
  Target,
  Settings,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { CountrySelector } from '@/components/jobs/CountrySelector';
import {
  JOB_SOURCE_DESCRIPTORS,
  isConnectedState,
  type JobSourceConnectionView,
  type JobSourceProvider,
} from '@/lib/portals/connection-state';
import type { CvTailoringMode } from '@/lib/cv-tailoring/tailoringMode';
import { useEntitlements } from '@/lib/hooks/useEntitlements';
import { formatResetLabel } from '@/lib/utils/reset-countdown';
import { Pill, SearchInput } from '@/components/ui';
import { chipStateDark } from '@/components/ui/chip-styles';

interface FiltersBarProps {
  filters: JobsFilter;
  onChange: (filters: Partial<JobsFilter>) => void;
  onReset: () => void;
  metrics: JobsMetrics | null;
  countries: string[];
  onCountriesChange: (countries: string[]) => void;
  userId?: string;
  savedCount?: number;
  cvTailoringMode?: CvTailoringMode;
  onCvTailoringModeChange?: (mode: CvTailoringMode) => void;
  userPreferences?: any;
  autoApplyEnabled?: boolean;
  onToggleAutoApply?: () => void;
  onOpenSettings?: () => void;
  entitlements?: any;
  isPaidUser?: boolean;
  /** Canonical connection views from `GET /api/portal-connections`. */
  portalConnections?: JobSourceConnectionView[];
  /** Provider currently being synced (drives the spinner on the Sync button). */
  syncingPortal?: JobSourceProvider | null;
  /** Trigger an instant fetch pass for one connected portal. */
  onSyncPortal?: (provider: JobSourceProvider) => void;
}

const WORKPLACE_OPTIONS = [
  { id: 'remote', label: 'Remote' },
  { id: 'hybrid', label: 'Hybrid' },
  { id: 'onsite', label: 'On-site' },
];

const EXPERIENCE_OPTIONS = [
  { id: 'entry', label: 'Entry Level (0–2 yrs)' },
  { id: 'mid', label: 'Mid Level (3–5 yrs)' },
  { id: 'senior', label: 'Senior (5–8 yrs)' },
  { id: 'lead', label: 'Lead / Principal (8+ yrs)' },
];

const DATE_OPTIONS = [
  { id: 'all', label: 'All time' },
  { id: '24h', label: 'Past 24 hours' },
  { id: '7d', label: 'Past 7 days' },
  { id: '30d', label: 'Past month' },
];

export default function FiltersBar({
  filters,
  onChange,
  onReset,
  metrics,
  countries,
  onCountriesChange,
  userId,
  savedCount = 0,
  cvTailoringMode = 'standard',
  onCvTailoringModeChange,
  userPreferences,
  autoApplyEnabled = false,
  onToggleAutoApply,
  onOpenSettings,
  entitlements,
  isPaidUser = false,
  portalConnections = [],
  syncingPortal = null,
  onSyncPortal,
}: FiltersBarProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (name: string) => {
    setActiveDropdown((prev) => (prev === name ? null : name));
  };

  const visibleWorkplaceOptions = useMemo(() => {
    const isRemoteActive = (filters.workplaceType || []).includes('remote');
    const isOnsiteActive = (filters.workplaceType || []).includes('onsite');

    return WORKPLACE_OPTIONS.filter((wp) => {
      if (wp.id === 'onsite' && isRemoteActive) return false;
      if (wp.id === 'remote' && isOnsiteActive) return false;
      return true;
    });
  }, [filters.workplaceType]);

  const handleToggleWorkplace = (type: string) => {
    const current = filters.workplaceType || [];
    let updated: string[];
    if (current.includes(type)) {
      updated = current.filter((t) => t !== type);
    } else {
      if (type === 'remote') {
        updated = [...current.filter((t) => t !== 'onsite'), 'remote'];
      } else if (type === 'onsite') {
        updated = [...current.filter((t) => t !== 'remote'), 'onsite'];
      } else {
        updated = [...current, type];
      }
    }
    onChange({ workplaceType: updated.length ? updated : undefined });
  };

  const handleToggleExperience = (exp: string) => {
    const current = filters.experienceLevel || [];
    const updated = current.includes(exp) ? current.filter((e) => e !== exp) : [...current, exp];
    onChange({ experienceLevel: updated.length ? updated : undefined });
  };

  // Active filter counting
  const activeFilterCount = [
    Boolean(filters.searchText),
    Boolean(filters.workplaceType?.length),
    Boolean(filters.experienceLevel?.length),
    Boolean(filters.datePosted && filters.datePosted !== 'all'),
    Boolean(filters.sponsorsVisa),
    Boolean(filters.easyApplyOnly),
  ].filter(Boolean).length;

  /*
    Only genuinely-connected portals get a tab. `state` is the server's own
    projection of the stored record (`deriveJobSourceState`), so a connection
    that rotted into `attention_required` or was disconnected does not advertise
    a job feed it cannot deliver.
  */
  const connectedPortals = useMemo(
    () =>
      (portalConnections || []).filter(
        (c): c is JobSourceConnectionView => Boolean(c) && isConnectedState(c.state)
      ),
    [portalConnections]
  );

  const currentView = filters.portalSource
    ? 'portal'
    : filters.savedOnly
    ? 'saved'
    : filters.unpersonalized || filters.matchScoreMin === 0
    ? 'all'
    : 'recommended';

  /** Selecting a portal tab is the "All" view scoped to that portal's ATS/source. */
  const handleSelectPortal = (provider: JobSourceProvider) => {
    onChange({
      savedOnly: false,
      unpersonalized: true,
      matchScoreMin: 0,
      portalSource: provider,
      atsTypes: [provider] as any,
    });
  };

  /**
   * Entering the Saved view clears the discover filters first.
   *
   * `filters` (including `searchText`) is shared across the three views, and
   * the fetch applies the search term even when `savedOnly` is on. So a user
   * who searched, saved a job, then clicked "Saved" saw a filtered — often
   * empty — Saved list and concluded their save had failed.
   *
   * `onReset` replaces the whole filters object while `onChange` merges into
   * it; both are queued in this one handler, so React applies the replacement
   * first and the merge second. The merge therefore wins on the view keys and
   * nothing else survives from the previous view.
   */
  const handleSelectSavedView = () => {
    onReset();
    onChange({
      savedOnly: true,
      unpersonalized: false,
      sortBy: 'matchScore',
      sortOrder: 'desc',
      matchScoreMin: undefined,
      portalSource: undefined,
    });
  };

  // Auto-Apply quota computation using the unified entitlement engine.
  // Uses the BINDING limit for the plan (starter → monthly, focused → daily) —
  // the raw `auto_apply_monthly` bucket is uncapped (-1) on Focused and would
  // render as "13/Infinity".
  const { getAutoApplyUsage, plan: hookPlan } = useEntitlements();
  const autoApplyQuota = useMemo(() => {
    const usage = getAutoApplyUsage();
    return {
      used: usage.used,
      limit: usage.isUnlimited ? Infinity : usage.limit,
      remaining: usage.remaining,
      resetAt: usage.resetAt,
      enabled: autoApplyEnabled,
    };
  }, [getAutoApplyUsage, autoApplyEnabled]);

  /*
    Live countdown to the quota reset, re-rendered every 30s so "Resets in 5h"
    actually ticks down. The label intentionally only counts down while quota
    REMAINS; at zero remaining the pill's number itself says the limit is hit
    and the modals carry the full reset story.
  */
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!autoApplyQuota.resetAt) return;
    const t = setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, [autoApplyQuota.resetAt]);
  const resetCountdown = formatResetLabel(autoApplyQuota.resetAt, 'Resets');

  const handleAutoApplyClick = () => {
    onToggleAutoApply?.();
  };

  return (
    <div ref={dropdownRef} className="w-full">
      {/*
        ⚠️ Do NOT add `overflow-hidden` to this container.

        Every dropdown in this bar (the country selector in ROW 1, the experience
        and CV-type menus in ROW 2) is an `absolute` panel rendered INLINE by its
        child component — CountrySelector uses no portal — and each one is taller
        than the container. `overflow-hidden` here therefore clips them to the
        container's padding box.

        Measured with the project's own compiled Tailwind, hit-testing every 2px
        of the panel's height at 1280 / 768 / 390px:

            overflow: visible  ->  99% of the panel painted at every width
            overflow: hidden   ->  18% / 31% / 42% painted

        i.e. the menu is cut down to its search box and roughly one row. Nothing
        fails loudly: tsc, ESLint, the build and every unit test stay green,
        because the clipped pixels are a paint-time fact. `rounded-2xl` already
        clips the gradient background to the border radius, so nothing here
        needs `overflow-hidden`.
      */}
      <div
        className="job-search-gradient relative rounded-2xl sm:rounded-3xl border border-[var(--border-primary)] p-3.5 sm:p-5 shadow-xs space-y-3 transition-colors"
      >
        {/* Frosted layer — softens the gradient behind translucent controls. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 rounded-2xl sm:rounded-3xl backdrop-blur-[3px] pointer-events-none"
        />

        {/* ================================================================= */}
        {/* HERO ROW: Title + Auto-Apply Pill                                 */}
        {/* ================================================================= */}
        <div className="relative z-10 flex items-start justify-between gap-3 min-w-0">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-2xl font-bold text-white leading-tight">
              Find your next{' '}
              <span className="text-[#36D39B]">opportunity</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 mt-0.5">
              Search, filter and let AI find the best jobs for you.
            </p>
          </div>

          {/* Auto-Apply Pill */}
          <div
            className={`shrink-0 h-9 sm:h-10 px-1 rounded-xl border flex items-center gap-1 text-[11px] sm:text-xs font-bold transition-all shadow-2xs ${
              autoApplyQuota.enabled
                ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-300 border-emerald-300 dark:border-emerald-600/50'
                : 'bg-[var(--bg-tertiary)] dark:bg-white/5 backdrop-blur-sm text-gray-600 dark:text-gray-300 border-[var(--border-primary)]'
            }`}
          >            <button
              type="button"
              onClick={handleAutoApplyClick}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 hover:opacity-80 transition-opacity cursor-pointer"
              title={
                autoApplyQuota.enabled
                  ? `Auto-Apply Active (${autoApplyQuota.used}/${autoApplyQuota.limit}). Click to pause.`
                  : `Auto-Apply Paused (${autoApplyQuota.used}/${autoApplyQuota.limit}). Click to activate.`
              }
            >
              <Zap
                className={`w-4 h-4 transition-transform ${
                  autoApplyQuota.enabled
                    ? 'fill-emerald-600 text-emerald-600 dark:fill-lime-400 dark:text-lime-400'
                    : 'text-gray-400 dark:text-gray-500 stroke-[1.75]'
                }`}
              />
              <span className="font-extrabold tracking-tight">Auto-Apply</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[11px] font-black tracking-tight ${
                  autoApplyQuota.remaining !== null && autoApplyQuota.remaining <= 0
                    ? 'bg-red-500/20 text-red-700 dark:bg-red-400/20 dark:text-red-300'
                    : autoApplyQuota.enabled
                      ? 'bg-emerald-200/70 dark:bg-emerald-400/20 text-emerald-950 dark:text-lime-300'
                      : 'bg-gray-200/70 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                }`
              }
              >
                {autoApplyQuota.used}/{autoApplyQuota.limit === Infinity ? '∞' : autoApplyQuota.limit}
              </span>
              {resetCountdown && autoApplyQuota.limit !== Infinity && (
                <span
                  className="hidden lg:inline text-[10px] font-bold text-white/50 dark:text-lime-200/50 whitespace-nowrap"
                  title={`Quota ${resetCountdown.toLowerCase()}`}
                >
                  · {resetCountdown}
                </span>
              )}
            </button>

            <span className="h-4 w-px bg-gray-200 dark:bg-white/10" />

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenSettings?.();
              }}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
              title="Job Search & Auto-Apply Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* ROW 1: Search Bar, Country Selector & Search Button */}
        {/* Mobile: search full-width, then country + button on next line    */}
        {/* Desktop: all three inline in one row                              */}
        {/*                                                                   */}
        {/* z-30 is load-bearing, not decoration. CountrySelector renders an  */}
        {/* absolutely-positioned panel, but `absolute` + `z-[100]` can only  */}
        {/* win INSIDE the stacking context of this row. Because each sibling */}
        {/* row sets its own z-index, the rows must therefore be ordered      */}
        {/* explicitly: hero z-10 < filter chips z-20 < this row z-30 — or the */}
        {/* country panel paints under the filter chips (the reported bug).   */}
        {/* ================================================================= */}
        <div className="relative z-30 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-3 w-full">
          <div className="w-full sm:flex-1 sm:min-w-0">
            <SearchInput
              value={filters.searchText || ''}
              onChange={(e) => onChange({ searchText: e.target.value || undefined })}
              onClear={() => onChange({ searchText: undefined })}
              placeholder="Search jobs, companies, skills, or keywords..."
              size="md"
            />
          </div>
          <div className="flex items-center gap-2 sm:shrink-0">
            <CountrySelector
              value={countries}
              onChange={onCountriesChange}
              align="right"
              variant="default"
            />
            <button
              type="submit"
              className="h-10 px-5 rounded-xl bg-[var(--accent-primary)] text-white dark:text-black text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-opacity shrink-0 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* ROW 2: Filter Chips — collapsed rows on mobile, single row desktop */}
        {/* z-20: kept below ROW 1 (z-30) so the country panel overlays these  */}
        {/* chips; kept above the hero (z-10) to keep the order monotonic.     */}
        {/* ================================================================= */}
        <div className="relative z-20 space-y-2 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-2 text-xs">
          {/* Row 2a: Segment Navigation Switcher — full width on mobile */}
          <div className="flex items-center max-w-full overflow-x-auto scrollbar-hide bg-white/5 backdrop-blur-sm p-1 rounded-xl border border-white/10 shrink-0 h-9 shadow-2xs w-full sm:w-auto">
            <button
              type="button"
              onClick={() =>
                onChange({
                  savedOnly: false,
                  sortBy: 'matchScore',
                  sortOrder: 'desc',
                  matchScoreMin: undefined,
                  unpersonalized: false,
                  portalSource: undefined,
                })
              }
              className={`h-full px-3 rounded-[8px] text-xs transition-all duration-150 ease-out flex items-center gap-1.5 flex-1 sm:flex-none justify-center ${
                currentView === 'recommended'
                  ? 'bg-[#013f2e] dark:bg-lime-500 text-white dark:text-black shadow-md font-bold'
                  : 'text-white/70 hover:text-white font-medium'
              }`}
            >
              <Target className={`w-3.5 h-3.5 ${currentView === 'recommended' ? 'text-white dark:text-black' : 'text-[#36D39B]'}`} />
              <span className="hidden sm:inline">Recommended</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onChange({
                  savedOnly: false,
                  sortBy: 'matchScore',
                  sortOrder: 'desc',
                  matchScoreMin: 0,
                  unpersonalized: true,
                  portalSource: undefined,
                })
              }
              className={`h-full px-3 rounded-[8px] text-xs transition-all duration-150 ease-out flex items-center gap-1.5 flex-1 sm:flex-none justify-center ${
                currentView === 'all'
                  ? 'bg-[#013f2e] dark:bg-lime-500 text-white dark:text-black shadow-md font-bold'
                  : 'text-white/70 hover:text-white font-medium'
              }`}
            >
              <Globe className={`w-3.5 h-3.5 ${currentView === 'all' ? 'text-white dark:text-black' : 'text-sky-500'}`} />
              <span className="hidden sm:inline">All</span>
            </button>

            <button
              type="button"
              onClick={handleSelectSavedView}
              className={`h-full px-3 rounded-[8px] text-xs transition-all duration-150 ease-out flex items-center gap-1.5 flex-1 sm:flex-none justify-center ${
                currentView === 'saved'
                  ? 'bg-[#013f2e] dark:bg-lime-500 text-white dark:text-black shadow-md font-bold'
                  : 'text-white/70 hover:text-white font-medium'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${currentView === 'saved' ? 'text-white dark:text-black' : 'text-amber-500'}`} />
              <span className="hidden sm:inline">Saved</span>
              {savedCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-black">
                  {savedCount}
                </span>
              )}
            </button>

            {/*
              Connected-portal tabs (Naukri / Indeed / LinkedIn).

              Rendered ONLY for sources whose connection state is `connected`.
              They sit in the same segment switcher as Recommended / All / Saved
              because that is where the user looks for "which feed am I seeing",
              and selecting one is simply the All feed scoped to that portal's
              ATS/source (`atsTypes=[provider]`).
            */}
            {connectedPortals.map((conn) => {
              const active = filters.portalSource === conn.source;
              return (
                <button
                  key={conn.source}
                  type="button"
                  onClick={() => handleSelectPortal(conn.source)}
                  title={`Jobs from your connected ${conn.name} account`}
                  className={`h-full px-3 rounded-[8px] text-xs transition-all duration-150 ease-out flex items-center gap-1.5 flex-1 sm:flex-none justify-center ${
                    active
                      ? 'bg-[#013f2e] dark:bg-lime-500 text-white dark:text-black shadow-md font-bold'
                      : 'text-white/70 hover:text-white font-medium'
                  }`}
                >
                  <span
                    className={`w-3.5 h-3.5 rounded-[4px] flex items-center justify-center text-[9px] font-black shrink-0 ${
                      active ? 'bg-white/20 dark:bg-black/15' : 'bg-white/10'
                    }`}
                    aria-hidden="true"
                  >
                    {conn.name.charAt(0)}
                  </span>
                  <span className="hidden sm:inline">{conn.name}</span>
                </button>
              );
            })}
          </div>

          {/*
            Instant sync for the active portal. Calls the existing
            POST /api/portal-connections/:provider/sync, which runs a fetch pass
            and reports how many jobs were created/updated.
          */}
          {filters.portalSource && (
            <button
              type="button"
              onClick={() => onSyncPortal?.(filters.portalSource as JobSourceProvider)}
              disabled={syncingPortal === filters.portalSource}
              title={`Fetch the latest jobs from ${JOB_SOURCE_DESCRIPTORS[filters.portalSource as JobSourceProvider]?.name || 'this portal'}`}
              className={`h-9 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors ${
                syncingPortal === filters.portalSource
                  ? 'border-[var(--border-primary)] bg-[var(--bg-tertiary)] dark:bg-white/5 text-gray-500 cursor-wait'
                  : 'border-[var(--border-primary)] bg-white/5 backdrop-blur-sm text-white/80 hover:text-white hover:bg-white/10 cursor-pointer'
              }`}
            >
              {syncingPortal === filters.portalSource ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Sync Latest Jobs</span>
              <span className="sm:hidden">Sync</span>
            </button>
          )}

          {/* Row 2b: Quick filter chips — wrap on mobile, inline on desktop */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Workplace Type Pills */}
            <div className="flex items-center gap-1 shrink-0">
              {visibleWorkplaceOptions.map((wp) => {
                const active = (filters.workplaceType || []).includes(wp.id);
                return (
                  <button
                    key={wp.id}
                    type="button"
                    onClick={() => handleToggleWorkplace(wp.id)}
                    aria-pressed={active}
                    className={chipStateDark(active ? 'active' : 'idle', 'md')}
                  >
                    {wp.label}
                  </button>
                );
              })}
            </div>

            {/* Visa Sponsorship Chip */}
            <Pill
              surface="dark"
              selected={Boolean(filters.sponsorsVisa)}
              onClick={() => onChange({ sponsorsVisa: !filters.sponsorsVisa })}
              leftIcon={<Shield className="w-3.5 h-3.5 opacity-70" />}
              title="Only show jobs offering visa sponsorship"
            >
              <span className="hidden sm:inline">Visa Sponsorship</span>
            </Pill>

            {/* Experience Dropdown */}
            <div className="relative select-none">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDropdown('exp');
                }}
                aria-expanded={activeDropdown === 'exp'}
                className={chipStateDark(
                  Boolean(filters.experienceLevel?.length) ? 'active' : 'idle',
                  'md'
                )}
              >
                <Briefcase className="w-3.5 h-3.5 opacity-70 shrink-0" />
                <span>Experience</span>
                {Boolean(filters.experienceLevel?.length) && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 tabular-nums bg-lime-400/15 text-lime-300">
                    {filters.experienceLevel?.length}
                  </span>
                )}
                <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0" />
              </button>

              {activeDropdown === 'exp' && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 top-full mt-2 w-56 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl z-[100] p-2 animate-fadeIn space-y-1"
                >
                  <div className="text-[11px] font-bold text-gray-400 px-2 py-1 border-b border-gray-100 dark:border-white/5">
                    Seniority & Experience
                  </div>
                  {EXPERIENCE_OPTIONS.map((exp) => {
                    const active = (filters.experienceLevel || []).includes(exp.id);
                    return (
                      <button
                        key={exp.id}
                        type="button"
                        onClick={() => handleToggleExperience(exp.id)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#36D39B]/15 text-[#013f2e] dark:text-[#36D39B] font-bold'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                        }`}
                      >
                        <span>{exp.label}</span>
                        {active && <Check className="w-3.5 h-3.5 text-[#013f2e] dark:text-[#36D39B]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Date Posted Dropdown */}
            <div className="relative select-none">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDropdown('date');
                }}
                aria-expanded={activeDropdown === 'date'}
                className={chipStateDark(
                  filters.datePosted && filters.datePosted !== 'all'
                    ? 'active'
                    : 'idle',
                  'md'
                )}
              >
                <Clock className="w-3.5 h-3.5 opacity-70 shrink-0" />
                <span>
                  {filters.datePosted && filters.datePosted !== 'all'
                    ? DATE_OPTIONS.find((d) => d.id === filters.datePosted)?.label || 'Date'
                    : 'Date'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0" />
              </button>

              {activeDropdown === 'date' && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 top-full mt-2 w-44 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl z-[100] p-2 animate-fadeIn space-y-1"
                >
                  <div className="text-[11px] font-bold text-gray-400 px-2 py-1 border-b border-gray-100 dark:border-white/5">
                    Posting Recency
                  </div>
                  {DATE_OPTIONS.map((d) => {
                    const active = (filters.datePosted || 'all') === d.id;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          onChange({ datePosted: d.id as any });
                          setActiveDropdown(null);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#36D39B]/15 text-[#013f2e] dark:text-[#36D39B] font-bold'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                        }`}
                      >
                        <span>{d.label}</span>
                        {active && <Check className="w-3.5 h-3.5 text-[#013f2e] dark:text-[#36D39B]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Auto-Apply Supported Chip */}
            <Pill
              surface="dark"
              selected={Boolean(filters.easyApplyOnly)}
              onClick={() => onChange({ easyApplyOnly: !filters.easyApplyOnly })}
              leftIcon={<Zap className="w-3.5 h-3.5 text-current" />}
              title="Only show jobs where Auto-Apply is supported"
            >
              <span className="hidden sm:inline">Auto-Apply supported</span>
            </Pill>
          </div>

          {/* Reset Filters Action */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="text-xs font-semibold text-white/50 hover:text-white underline shrink-0 transition-colors"
            >
              Reset filters ({activeFilterCount})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
