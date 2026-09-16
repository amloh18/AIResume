'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { JobsMetrics, JobsFilter } from '@/types/automation-schema';
import {
  Search,
  Sparkles,
  Bookmark,
  Clock,
  Globe,
  X,
  Zap,
  Check,
  ChevronDown,
  ChevronRight,
  Shield,
  Briefcase,
  MapPin,
  DollarSign,
  Settings,
  Target,
} from 'lucide-react';
import { CountrySelector } from '@/components/jobs/CountrySelector';
import CvTailoringModeToggle from '@/components/jobs/CvTailoringModeToggle';
import type { CvTailoringMode } from '@/lib/cv-tailoring/tailoringMode';
import type { UserEntitlements } from '@/lib/services/entitlement-service';
import Link from 'next/link';
import { Pill, SearchInput } from '@/components/ui';

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
  entitlements?: UserEntitlements | null;
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

  // 2. Real Auto-Apply Quota & State Logic
  const autoApplyQuota = useMemo(() => {
    const isStarter = entitlements?.plan === 'starter' || !isPaidUser;
    if (isStarter) {
      const limit = entitlements?.application?.limit ?? 10;
      const remaining = entitlements?.application?.remaining ?? 10;
      const used = Math.max(0, limit - remaining);
      return {
        used,
        limit,
        enabled: autoApplyEnabled,
        isStarter: true,
        label: 'Monthly',
        isLimitReached: remaining <= 0,
      };
    }

    // Focused / Pro plan
    const limit = entitlements?.autoApply?.limit ?? 50;
    const remaining = entitlements?.autoApply?.remaining ?? 50;
    const used = Math.max(0, limit - remaining);
    return {
      used,
      limit,
      enabled: autoApplyEnabled,
      isStarter: false,
      label: 'Daily',
      isLimitReached: remaining <= 0,
    };
  }, [entitlements, isPaidUser, autoApplyEnabled]);

  const handleAutoApplyClick = () => {
    if (autoApplyQuota.isLimitReached) {
      onOpenSettings?.();
    } else {
      onToggleAutoApply?.();
    }
  };

  return (
    <div ref={dropdownRef} className="w-full">
      {/* Integrated Command Surface Container — clean card background matching dashboard */}
      <div
        className="job-search-gradient relative rounded-2xl sm:rounded-3xl border border-[var(--border-primary)] p-4 sm:p-5 shadow-xs space-y-3.5 transition-colors"
      >
        {/* Frosted layer.
            The controls below are translucent (the search field is
            `bg-gray-50/80`), so the orange zigzag pattern showed through them
            and made the text noisy. `backdrop-filter` blurs everything painted
            behind the element — including this container's own gradient — so an
            absolutely-positioned child is what softens the pattern.
            `pointer-events-none` keeps it from swallowing clicks. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 rounded-2xl sm:rounded-3xl backdrop-blur-[3px] pointer-events-none"
        />

        {/* ========================================================================= */}
        {/* ROW 1: Search Bar & Country Button Inline */}
        {/* ========================================================================= */}
        <div className="relative z-10 flex items-center gap-2 sm:gap-3 w-full">
          <div className="flex-1 min-w-0">
            <SearchInput
              value={filters.searchText || ''}
              onChange={(e) => onChange({ searchText: e.target.value || undefined })}
              onClear={() => onChange({ searchText: undefined })}
              placeholder="Search jobs, companies, skills..."
              size="md"
            />
          </div>
          <CountrySelector
            value={countries}
            onChange={onCountriesChange}
            align="right"
            variant="default"
          />
        </div>

        {/* ========================================================================= */}
        {/* ROW 2: Navigation Switcher & Action Controls (Auto-Apply, Location, Mode) */}
        {/* ========================================================================= */}
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Result Segment Navigation Switcher (icon-only on the smallest screens) */}
          <div className="flex items-center max-w-full overflow-x-auto scrollbar-hide bg-[var(--bg-tertiary)] dark:bg-white/5 backdrop-blur-sm p-1 rounded-xl border border-[var(--border-primary)] shrink-0 self-start lg:self-auto h-10 shadow-2xs">
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
              className={`h-full px-3 rounded-[8px] text-xs transition-all duration-150 ease-out flex items-center gap-1.5 ${
                currentView === 'recommended'
                  ? 'bg-[#013f2e] dark:bg-lime-500 text-white dark:text-black shadow-md font-bold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium'
              }`}
            >
              <Target className={`w-3.5 h-3.5 ${currentView === 'recommended' ? 'text-white dark:text-black' : 'text-[#013f2e] dark:text-[#36D39B]'}`} />
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
              className={`h-full px-3 rounded-[8px] text-xs transition-all duration-150 ease-out flex items-center gap-1.5 ${
                currentView === 'all'
                  ? 'bg-[#013f2e] dark:bg-lime-500 text-white dark:text-black shadow-md font-bold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium'
              }`}
            >
              <Globe className={`w-3.5 h-3.5 ${currentView === 'all' ? 'text-white dark:text-black' : 'text-sky-500'}`} />
              <span className="hidden sm:inline">All</span>
            </button>

            <button
              type="button"
              onClick={() => onChange({ savedOnly: true, unpersonalized: false })}
              className={`h-full px-3 rounded-[8px] text-xs transition-all duration-150 ease-out flex items-center gap-1.5 ${
                currentView === 'saved'
                  ? 'bg-[#013f2e] dark:bg-lime-500 text-white dark:text-black shadow-md font-bold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${currentView === 'saved' ? 'text-white dark:text-black' : 'text-amber-500'}`} />
              <span className="hidden sm:inline">Saved</span>
              {savedCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 font-black">
                  {savedCount}
                </span>
              )}
            </button>
          </div>

          {/* Right: Auto-Apply Pill with Settings Icon + Location Selector + Auto CV Mode */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
            {/* Auto-Apply Button with Settings Icon */}
            <div
              className={`h-10 px-3 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all shadow-2xs ${
                autoApplyQuota.enabled
                  ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-300 border-emerald-300 dark:border-emerald-600/50'
                  : 'bg-[var(--bg-tertiary)] dark:bg-white/5 backdrop-blur-sm text-gray-600 dark:text-gray-300 border-[var(--border-primary)]'
              }`}
            >
              {/* Toggle action */}
              <button
                type="button"
                onClick={handleAutoApplyClick}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
                title={
                  autoApplyQuota.enabled
                    ? `Auto-Apply Active (${autoApplyQuota.used}/${autoApplyQuota.limit} used ${autoApplyQuota.label.toLowerCase()}). Click to pause.`
                    : `Auto-Apply Paused (${autoApplyQuota.used}/${autoApplyQuota.limit} used ${autoApplyQuota.label.toLowerCase()}). Click to activate.`
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

              {/* Divider */}
              <span className="h-4 w-px bg-gray-200 dark:bg-white/10" />

              {/* Settings icon */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenSettings?.();
                }}
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
                title="Job Search & Auto-Apply Preferences"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* CV Tailoring Mode */}
            {onCvTailoringModeChange && (
              <CvTailoringModeToggle value={cvTailoringMode} onChange={onCvTailoringModeChange} />
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ROW 3: Unified Single-Row Quick Filter Bar */}
        {/* ========================================================================= */}
        <div className="relative z-10 pt-0.5 flex flex-wrap items-center justify-between gap-2.5 text-xs">
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
                    className={`h-8 px-3 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                      active
                        ? 'bg-[#013f2e] dark:bg-[#36D39B] text-white dark:text-black border-transparent font-bold shadow-2xs'
                        : 'bg-white dark:bg-[#141810] border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    {wp.label}
                  </button>
                );
              })}
            </div>

            {/* Auto-Apply Supported Chip */}
            <Pill
              selected={Boolean(filters.easyApplyOnly)}
              onClick={() => onChange({ easyApplyOnly: !filters.easyApplyOnly })}
              leftIcon={<Zap className="w-3.5 h-3.5 text-current" />}
              title="Only show jobs where Auto-Apply is supported"
            >
              <span className="hidden sm:inline">Auto-Apply supported</span>
            </Pill>

            {/* Visa Sponsorship Chip */}
            <Pill
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
                className={`h-8 rounded-full px-3 border text-xs transition-all flex items-center gap-1.5 shrink-0 focus:outline-none cursor-pointer duration-150 active:scale-[0.985] hover:scale-[1.015] ${
                  filters.experienceLevel?.length || activeDropdown === 'exp'
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-black border-transparent font-bold shadow-xs'
                    : 'border-gray-200 dark:border-white/10 bg-white/90 dark:bg-white/[0.06] text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/20 font-medium'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5 opacity-70 shrink-0" />
                <span>Experience</span>
                {Boolean(filters.experienceLevel?.length) && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold shrink-0 tabular-nums ${
                      filters.experienceLevel?.length || activeDropdown === 'exp'
                        ? 'bg-white/20 dark:bg-black/20 text-current'
                        : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400'
                    }`}
                  >
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
                className={`h-8 rounded-full px-3 border text-xs transition-all flex items-center gap-1.5 shrink-0 focus:outline-none cursor-pointer duration-150 active:scale-[0.985] hover:scale-[1.015] ${
                  (filters.datePosted && filters.datePosted !== 'all') || activeDropdown === 'date'
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-black border-transparent font-bold shadow-xs'
                    : 'border-gray-200 dark:border-white/10 bg-white/90 dark:bg-white/[0.06] text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/20 font-medium'
                }`}
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
          </div>

          {/* Reset Filters Action */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="text-xs font-semibold text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline shrink-0 transition-colors"
            >
              Reset filters ({activeFilterCount})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
