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
} from 'lucide-react';
import { CountrySelector } from '@/components/jobs/CountrySelector';
import type { CvTailoringMode } from '@/lib/cv-tailoring/tailoringMode';
import { useEntitlements } from '@/lib/hooks/useEntitlements';
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
  portalConnections?: any[];
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

  const currentView = filters.savedOnly
    ? 'saved'
    : filters.unpersonalized || filters.matchScoreMin === 0
    ? 'all'
    : 'recommended';

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
    });
  };

  // Auto-Apply quota computation using the unified entitlement engine
  const { getLimit, plan: hookPlan } = useEntitlements();
  const autoApplyQuota = useMemo(() => {
    const autoApplyLimit = getLimit('auto_apply_monthly');
    if (autoApplyLimit) {
      const isUnlimited = autoApplyLimit.remaining === null;
      return {
        used: autoApplyLimit.used,
        limit: isUnlimited ? Infinity : autoApplyLimit.limit,
        enabled: autoApplyEnabled,
      };
    }
    // Fallback to legacy entitlements if hook not ready
    const isStarter = entitlements?.plan === 'starter' || !isPaidUser;
    if (isStarter) {
      const limit = entitlements?.application?.limit ?? 10;
      const remaining = entitlements?.application?.remaining ?? 10;
      const used = Math.max(0, limit - remaining);
      return { used, limit, enabled: autoApplyEnabled };
    }
    const limit = entitlements?.autoApply?.limit ?? 50;
    const remaining = entitlements?.autoApply?.remaining ?? 50;
    const used = Math.max(0, limit - remaining);
    return { used, limit, enabled: autoApplyEnabled };
  }, [getLimit, entitlements, isPaidUser, autoApplyEnabled]);

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
          >
            <button
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
                  autoApplyQuota.enabled
                    ? 'bg-emerald-200/70 dark:bg-emerald-400/20 text-emerald-950 dark:text-lime-300'
                    : 'bg-gray-200/70 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                }`}
              >
                {autoApplyQuota.used}/{autoApplyQuota.limit}
              </span>
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
          </div>

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
