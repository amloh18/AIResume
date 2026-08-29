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
} from 'lucide-react';
import { CountrySelector } from '@/components/jobs/CountrySelector';
import CvTailoringModeToggle from '@/components/jobs/CvTailoringModeToggle';
import type { CvTailoringMode } from '@/lib/cv-tailoring/tailoringMode';
import type { UserEntitlements } from '@/lib/services/entitlement-service';
import Link from 'next/link';
import { Button, Pill, SearchInput } from '@/components/ui';

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

  const handleToggleWorkplace = (type: string) => {
    const current = filters.workplaceType || [];
    const updated = current.includes(type) ? current.filter((t) => t !== type) : [...current, type];
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
    : filters.matchScoreMin === 0
    ? 'all'
    : filters.sortBy === 'postedDate'
    ? 'latest'
    : 'recommended';

  // 1. Search Profile Data Formatting
  // Active filters override profile defaults for display; profile is the fallback.
  const targetRolesDisplay = useMemo(() => {
    if (filters.roles?.length) {
      return filters.roles.join(' · ');
    }
    if (userPreferences?.targetRoles && userPreferences.targetRoles.length > 0) {
      return userPreferences.targetRoles.join(' · ');
    }
    return 'Full Stack Developer · Software Engineer · Product Analyst';
  }, [userPreferences, filters.roles]);

  const metadataList = useMemo(() => {
    const parts: string[] = [];

    // Workplace Types — active chip filter overrides profile
    if (filters.workplaceType?.length) {
      parts.push(filters.workplaceType.map((t: string) => t.charAt(0).toUpperCase() + t.slice(1)).join(' · '));
    } else if (userPreferences?.workplaceTypes && userPreferences.workplaceTypes.length > 0) {
      parts.push(userPreferences.workplaceTypes.map((t: string) => t.charAt(0).toUpperCase() + t.slice(1)).join(' · '));
    } else if (userPreferences?.locations && userPreferences.locations.length > 0) {
      parts.push(userPreferences.locations.join(' · '));
    } else {
      parts.push('Remote · Hybrid · On-site');
    }

    // Salary Threshold (always from profile — no chip filter)
    if (userPreferences?.minSalary) {
      const cur = userPreferences.salaryCurrency;
      if (cur === 'GBP_YEAR' || cur === 'GBP' || cur === '£') {
        parts.push(`£${Number(userPreferences.minSalary).toLocaleString()} /yr+`);
      } else if (cur === 'EUR_YEAR' || cur === 'EUR' || cur === '€') {
        parts.push(`€${Number(userPreferences.minSalary).toLocaleString()} /yr+`);
      } else if (cur === 'USD_YEAR' || cur === 'USD' || cur === '$') {
        parts.push(`$${Number(userPreferences.minSalary).toLocaleString()} /yr+`);
      } else {
        parts.push(`₹${userPreferences.minSalary} LPA+`);
      }
    }

    // Experience — active chip filter overrides profile
    if (filters.experienceLevel?.length) {
      const expLabels: Record<string, string> = {
        entry: 'Entry Level',
        mid: 'Mid-level',
        senior: 'Senior',
        lead: 'Lead / Principal',
      };
      parts.push(filters.experienceLevel.map((e) => expLabels[e] || e).join(' · '));
    } else if (userPreferences?.experienceYears !== undefined && userPreferences.experienceYears > 0) {
      parts.push(`${userPreferences.experienceYears}+ yrs`);
    }

    // Availability / Notice period (always from profile)
    if (userPreferences?.maxNoticePeriodDays !== undefined) {
      if (userPreferences.maxNoticePeriodDays === 0) {
        parts.push('Available immediately');
      } else {
        parts.push(`${userPreferences.maxNoticePeriodDays}d notice`);
      }
    }

    // Search Intensity (always from profile)
    if (userPreferences?.searchIntensity) {
      const intensityLabels: Record<string, string> = {
        browsing: 'Browsing',
        exploring: 'Exploring',
        active: 'Actively Applying',
        aggressive: 'Aggressively Hunting'
      };
      parts.push(intensityLabels[userPreferences.searchIntensity] || userPreferences.searchIntensity);
    }

    // Application Volume (always from profile)
    if (userPreferences?.expectedApplicationsPerMonth) {
      parts.push(`${userPreferences.expectedApplicationsPerMonth}/mo`);
    }

    return parts;
  }, [userPreferences, filters.workplaceType, filters.experienceLevel]);

  // 2. Real Auto-Apply Status Logic (Plan-Aware & Product-First)
  const autoApplyStatus = useMemo(() => {
    const isStarter = entitlements?.plan === 'starter' || !isPaidUser;

    // A. Starter Plan (10 applications / month)
    if (isStarter) {
      const remainingMonthly = entitlements?.application?.remaining ?? 10;
      const limitMonthly = entitlements?.application?.limit ?? 10;
      const isLimitReached = remainingMonthly <= 0;

      if (isLimitReached) {
        return {
          state: 'LIMIT_REACHED',
          active: false,
          title: 'Monthly limit reached',
          subtitle: `${limitMonthly} of ${limitMonthly} applications used this month`,
          ctaText: 'Upgrade →',
          ctaAction: 'billing',
        };
      }

      if (autoApplyEnabled) {
        return {
          state: 'ACTIVE',
          active: true,
          title: 'Auto-Apply active',
          subtitle: `${remainingMonthly} applications remaining this month`,
          ctaText: 'Pause',
          ctaAction: 'toggle',
        };
      }

      return {
        state: 'PAUSED',
        active: false,
        title: 'Auto-Apply paused',
        subtitle: `${remainingMonthly} applications remaining this month`,
        ctaText: 'Resume →',
        ctaAction: 'toggle',
      };
    }

    // B. Focused Plan (50 automated applications / day)
    const remainingDaily = entitlements?.autoApply?.remaining ?? 50;
    const limitDaily = entitlements?.autoApply?.limit ?? 50;
    const isDailyLimitReached = remainingDaily <= 0;

    if (isDailyLimitReached) {
      return {
        state: 'LIMIT_REACHED',
        active: false,
        title: "Today's limit reached",
        subtitle: `${limitDaily} of ${limitDaily} applications used today`,
        ctaText: 'Apply Manually',
        ctaAction: 'settings',
      };
    }

    if (autoApplyEnabled) {
      return {
        state: 'ACTIVE',
        active: true,
        title: 'Auto-Apply active',
        subtitle: `${remainingDaily} applications remaining today`,
        ctaText: 'Pause',
        ctaAction: 'toggle',
      };
    }

    return {
      state: 'PAUSED',
      active: false,
      title: 'Auto-Apply paused',
      subtitle: `${remainingDaily} applications remaining today`,
      ctaText: 'Resume →',
      ctaAction: 'toggle',
    };
  }, [entitlements, isPaidUser, autoApplyEnabled]);

  const handleCtaClick = () => {
    if (autoApplyStatus.ctaAction === 'toggle') {
      onToggleAutoApply?.();
    } else if (autoApplyStatus.ctaAction === 'settings') {
      onOpenSettings?.();
    }
  };

  return (
    <div ref={dropdownRef} className="w-full">
      {/* Integrated Command Surface Container */}
      <div className="rounded-3xl bg-white dark:bg-[#141810] border border-gray-200/90 dark:border-white/10 p-5 sm:p-6 shadow-sm space-y-4">
        {/* ========================================================================= */}
        {/* ROW 1: Search Profile Summary & Compact Auto-Apply Strip */}
        {/* ========================================================================= */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-white/5">
          {/* Left: Personalized Search Profile */}
          <div className="space-y-1 min-w-0 flex-1">
            {/* Target Roles with Stronger Typography */}
            <div className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white leading-snug truncate">
              {targetRolesDisplay}
            </div>

            {/* Sub-Metadata Line with Subtle Separators */}
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5 flex-wrap">
              {metadataList.map((item, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className="text-gray-300 dark:text-gray-600 font-normal">·</span>}
                  <span>{item}</span>
                </React.Fragment>
              ))}
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                  <span className="w-1 h-1 rounded-full bg-amber-500" />
                  filtered
                </span>
              )}
            </div>
          </div>

          {/* Right: Auto-Apply Status + Compact Edit Preferences */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 shrink-0 self-start lg:self-center">
            {/* Real Status Strip */}
            <div className="h-10 px-3.5 rounded-xl bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/90 dark:border-white/10 flex items-center gap-3 text-xs shadow-2xs">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    autoApplyStatus.active
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-gray-400 dark:bg-gray-500'
                  }`}
                />
                <span className="font-bold text-gray-900 dark:text-white">
                  {autoApplyStatus.title}
                </span>
                <span className="text-gray-400 dark:text-gray-500 hidden sm:inline">
                  · {autoApplyStatus.subtitle}
                </span>
              </div>

              {autoApplyStatus.ctaAction === 'billing' ? (
                <Link
                  href="/dashboard/billing"
                  className="font-bold text-[#013f2e] dark:text-[#36D39B] hover:underline text-xs shrink-0"
                >
                  {autoApplyStatus.ctaText}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleCtaClick}
                  className="font-bold text-[#013f2e] dark:text-[#36D39B] hover:underline text-xs shrink-0"
                >
                  {autoApplyStatus.ctaText}
                </button>
              )}
            </div>

            {/* Edit Preferences Action */}
            <Button
              variant="secondary"
              size="md"
              onClick={onOpenSettings}
              rightIcon={<ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
            >
              Edit Preferences
            </Button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ROW 2: Wide Search Bar & Result Navigation Toolbar */}
        {/* ========================================================================= */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3">
          {/* Search Input (Expands on wide desktop viewports) */}
          <div className="relative flex-1 min-w-[280px] sm:min-w-[340px] lg:min-w-[420px]">
            <SearchInput
              value={filters.searchText || ''}
              onChange={(e) => onChange({ searchText: e.target.value || undefined })}
              onClear={() => onChange({ searchText: undefined })}
              placeholder="Search jobs, companies, skills..."
              size="md"
            />
          </div>

          {/* Center: Result Segment Navigation Switcher */}
          <div className="flex items-center bg-gray-100/90 dark:bg-white/5 p-1 rounded-xl border border-gray-200/50 dark:border-white/5 shrink-0 self-start xl:self-auto h-10 shadow-2xs">
            <button
              type="button"
              onClick={() =>
                onChange({
                  savedOnly: false,
                  sortBy: 'matchScore',
                  sortOrder: 'desc',
                  matchScoreMin: undefined,
                })
              }
              className={`h-full px-3 rounded-[8px] text-xs transition-all duration-150 ease-out flex items-center gap-1.5 ${
                currentView === 'recommended'
                  ? 'bg-white dark:bg-[#1a230f] text-gray-900 dark:text-white shadow-xs font-bold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#013f2e] dark:text-[#36D39B]" />
              <span>Recommended</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onChange({
                  savedOnly: false,
                  sortBy: 'matchScore',
                  sortOrder: 'desc',
                  matchScoreMin: 0,
                })
              }
              className={`h-full px-3 rounded-[8px] text-xs transition-all duration-150 ease-out flex items-center gap-1.5 ${
                currentView === 'all'
                  ? 'bg-white dark:bg-[#1a230f] text-gray-900 dark:text-white shadow-xs font-bold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-sky-500" />
              <span>All</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onChange({
                  savedOnly: false,
                  sortBy: 'postedDate',
                  sortOrder: 'desc',
                  matchScoreMin: undefined,
                })
              }
              className={`h-full px-3 rounded-[8px] text-xs transition-all duration-150 ease-out flex items-center gap-1.5 ${
                currentView === 'latest'
                  ? 'bg-white dark:bg-[#1a230f] text-gray-900 dark:text-white shadow-xs font-bold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span>Latest</span>
            </button>

            <button
              type="button"
              onClick={() => onChange({ savedOnly: true })}
              className={`h-full px-3 rounded-[8px] text-xs transition-all duration-150 ease-out flex items-center gap-1.5 ${
                currentView === 'saved'
                  ? 'bg-white dark:bg-[#1a230f] text-gray-900 dark:text-white shadow-xs font-bold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-500" />
              <span>Saved</span>
              {savedCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 font-black">
                  {savedCount}
                </span>
              )}
            </button>
          </div>

          {/* Right: Location Selector & Auto CV Mode */}
          <div className="flex items-center gap-2 shrink-0 h-10">
            <CountrySelector value={countries} onChange={onCountriesChange} align="right" />
            {onCvTailoringModeChange && (
              <CvTailoringModeToggle value={cvTailoringMode} onChange={onCvTailoringModeChange} />
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ROW 3: Unified Single-Row Quick Filter Bar */}
        {/* ========================================================================= */}
        <div className="pt-1 flex items-center justify-between gap-3 overflow-x-auto scrollbar-hide text-xs">
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            {/* Workplace Type Pills */}
            <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-white/5 p-1 rounded-full border border-gray-200/60 dark:border-white/5 shrink-0">
              {WORKPLACE_OPTIONS.map((wp) => {
                const active = (filters.workplaceType || []).includes(wp.id);
                return (
                  <button
                    key={wp.id}
                    type="button"
                    onClick={() => handleToggleWorkplace(wp.id)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      active
                        ? 'bg-[#013f2e] dark:bg-[#36D39B] text-white font-bold shadow-2xs'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
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
            >
              Auto-Apply supported
            </Pill>

            {/* Visa Sponsorship Chip */}
            <Pill
              selected={Boolean(filters.sponsorsVisa)}
              onClick={() => onChange({ sponsorsVisa: !filters.sponsorsVisa })}
              leftIcon={<Shield className="w-3.5 h-3.5 opacity-70" />}
            >
              Visa Sponsorship
            </Pill>

            {/* Experience Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown('exp')}
                className={`rounded-full px-3.5 py-1.5 border text-xs transition-all flex items-center gap-1.5 shrink-0 ${
                  filters.experienceLevel?.length
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-black border-transparent font-bold shadow-xs'
                    : 'border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/20 font-medium'
                }`}
              >
                <span>Experience</span>
                {filters.experienceLevel?.length ? (
                  <span className="w-4 h-4 rounded-full bg-white/20 text-white text-[10px] font-bold inline-flex items-center justify-center">
                    {filters.experienceLevel.length}
                  </span>
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                )}
              </button>

              {activeDropdown === 'exp' && (
                <div className="absolute left-0 top-full mt-2 w-56 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl z-50 p-2 animate-fadeIn space-y-1">
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
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
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
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown('date')}
                className={`rounded-full px-3.5 py-1.5 border text-xs transition-all flex items-center gap-1.5 shrink-0 ${
                  filters.datePosted && filters.datePosted !== 'all'
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-black border-transparent font-bold shadow-xs'
                    : 'border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/20 font-medium'
                }`}
              >
                <span>Date</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              {activeDropdown === 'date' && (
                <div className="absolute left-0 top-full mt-2 w-44 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl z-50 p-2 animate-fadeIn space-y-1">
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
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
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