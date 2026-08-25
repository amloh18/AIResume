'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { JobsFilter, JobsMetrics } from '@/types/automation-schema';
import {
  Search,
  X,
  ChevronDown,
  Bookmark,
  Check,
  Sparkles,
  SlidersHorizontal,
  Clock,
  Briefcase,
  DollarSign,
  Globe,
  Zap,
} from 'lucide-react';
import { CountrySelector } from '@/components/jobs/CountrySelector';
import CvTailoringModeToggle from '@/components/jobs/CvTailoringModeToggle';
import type { CvTailoringMode } from '@/lib/cv-tailoring/tailoringMode';

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
  naukriEmail?: string;
  indeedEmail?: string;
  isSyncingPortals?: boolean;
  onSyncPortals?: () => void;
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

const READINESS_OPTIONS = [
  { id: 'all', label: 'All Application Methods' },
  { id: 'auto', label: 'Auto-Apply supported' },
  { id: 'tailored', label: 'Tailored application supported' },
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
}: FiltersBarProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
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

  return (
    <div ref={dropdownRef} className="space-y-3">
      {/* 1. Main Search & Primary Controls Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={filters.searchText || ''}
            onChange={(e) => onChange({ searchText: e.target.value || undefined })}
            placeholder="Search jobs, companies, skills..."
            className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-lime-500 transition-colors shadow-xs"
          />
          {filters.searchText && (
            <button
              type="button"
              onClick={() => onChange({ searchText: undefined })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* View Segment Switcher (Recommended / All / Latest / Saved) */}
        <div className="flex items-center bg-gray-100 dark:bg-white/5 p-1 rounded-2xl border border-gray-200/60 dark:border-white/5 shrink-0 self-start md:self-auto">
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
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentView === 'recommended'
                ? 'bg-white dark:bg-[#1a230f] text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-lime-600 dark:text-[#80FF00]" />
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
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentView === 'all'
                ? 'bg-white dark:bg-[#1a230f] text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
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
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentView === 'latest'
                ? 'bg-white dark:bg-[#1a230f] text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span>Latest</span>
          </button>

          <button
            type="button"
            onClick={() => onChange({ savedOnly: true })}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentView === 'saved'
                ? 'bg-white dark:bg-[#1a230f] text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
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

        {/* Right side: Country & Tailoring Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <CountrySelector value={countries} onChange={onCountriesChange} />
          {onCvTailoringModeChange && (
            <CvTailoringModeToggle value={cvTailoringMode} onChange={onCvTailoringModeChange} />
          )}
        </div>
      </div>

      {/* 2. Secondary Filter Chips Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide text-xs">
        {/* Workplace Type (Remote / Hybrid / On-site) */}
        <div className="flex items-center gap-1 bg-white dark:bg-[#141810] p-1 rounded-full border border-gray-200 dark:border-white/10 shrink-0">
          {WORKPLACE_OPTIONS.map((wp) => {
            const active = (filters.workplaceType || []).includes(wp.id);
            return (
              <button
                key={wp.id}
                type="button"
                onClick={() => handleToggleWorkplace(wp.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  active
                    ? 'bg-lime-500 text-white dark:text-black font-bold shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                }`}
              >
                {wp.label}
              </button>
            );
          })}
        </div>

        {/* Application Readiness (Auto-Apply Supported) */}
        <button
          type="button"
          onClick={() => onChange({ easyApplyOnly: !filters.easyApplyOnly })}
          className={`rounded-full px-3.5 py-1.5 border text-xs transition-all flex items-center gap-1.5 shrink-0 ${
            filters.easyApplyOnly
              ? 'bg-emerald-600 dark:bg-[#80FF00] text-white dark:text-black border-transparent font-bold shadow-xs'
              : 'border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] text-gray-700 dark:text-gray-300 hover:border-gray-300 font-medium'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-lime-500 dark:text-current" />
          <span>Auto-Apply supported</span>
          {filters.easyApplyOnly && <Check className="w-3 h-3 ml-0.5" />}
        </button>

        {/* Visa Sponsorship */}
        <button
          type="button"
          onClick={() => onChange({ sponsorsVisa: !filters.sponsorsVisa })}
          className={`rounded-full px-3.5 py-1.5 border text-xs transition-all flex items-center gap-1.5 shrink-0 ${
            filters.sponsorsVisa
              ? 'bg-gray-900 dark:bg-white text-white dark:text-black border-transparent font-bold shadow-xs'
              : 'border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] text-gray-700 dark:text-gray-300 hover:border-gray-300 font-medium'
          }`}
        >
          <span>Visa Sponsorship</span>
          {filters.sponsorsVisa && <Check className="w-3 h-3 ml-0.5" />}
        </button>

        {/* Experience Dropdown Chip */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleDropdown('exp')}
            className={`rounded-full px-3.5 py-1.5 border text-xs transition-all flex items-center gap-1.5 shrink-0 ${
              filters.experienceLevel?.length
                ? 'bg-gray-900 dark:bg-white text-white dark:text-black border-transparent font-bold shadow-xs'
                : 'border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] text-gray-700 dark:text-gray-300 hover:border-gray-300 font-medium'
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
                        ? 'bg-lime-500/10 text-lime-700 dark:text-lime-400 font-bold'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <span>{exp.label}</span>
                    {active && <Check className="w-3.5 h-3.5 text-lime-600" />}
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
                : 'border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] text-gray-700 dark:text-gray-300 hover:border-gray-300 font-medium'
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
                        ? 'bg-lime-500/10 text-lime-700 dark:text-lime-400 font-bold'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <span>{d.label}</span>
                    {active && <Check className="w-3.5 h-3.5 text-lime-600" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Clear Filters button */}
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-gray-400 hover:text-red-500 font-semibold flex items-center gap-1 ml-auto shrink-0 transition-colors px-2 py-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
}