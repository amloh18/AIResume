'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { JobsFilter, JobsMetrics, JobSource, ATSType } from '@/types/automation-schema';
import {
  Search,
  X,
  ArrowUpDown,
  ChevronDown,
  MapPin,
  Building2,
  Bookmark,
  Check,
  Globe,
  Briefcase,
  Layers,
  Sparkles
} from 'lucide-react';
import { CountrySelector } from '@/components/jobs/CountrySelector';
import { QuotaIndicator } from '@/components/jobs/QuotaIndicator';

interface FiltersBarProps {
  filters: JobsFilter;
  onChange: (filters: Partial<JobsFilter>) => void;
  onReset: () => void;
  metrics: JobsMetrics | null;
  countries: string[];
  onCountriesChange: (countries: string[]) => void;
  userId?: string;
  savedCount?: number;
}

const sortOptions: { value: NonNullable<JobsFilter['sortBy']>; label: string }[] = [
  { value: 'matchScore', label: 'Best match' },
  { value: 'postedDate', label: 'Newest first' },
  { value: 'salary', label: 'Highest salary' },
  { value: 'company', label: 'Company A–Z' },
];

const ATS_OPTIONS: { id: ATSType; label: string; tag: string }[] = [
  { id: 'greenhouse', label: 'Greenhouse ATS', tag: 'Direct' },
  { id: 'lever', label: 'Lever ATS', tag: 'Direct' },
  { id: 'workable', label: 'Workable', tag: 'Direct' },
  { id: 'naukri', label: 'Naukri.com', tag: 'Portal' },
  { id: 'indeed', label: 'Indeed', tag: 'Portal' },
  { id: 'adzuna', label: 'Adzuna', tag: 'Index' },
  { id: 'workday', label: 'Workday ATS', tag: 'Enterprise' },
];

const LOCATIONS_OPTIONS = [
  'Remote',
  'Bangalore',
  'London',
  'Mumbai',
  'Hyderabad',
  'New York',
  'Pune',
  'Delhi / NCR',
  'San Francisco',
  'Berlin',
];

const WORKPLACE_OPTIONS = [
  { id: 'remote', label: 'Remote' },
  { id: 'hybrid', label: 'Hybrid' },
  { id: 'onsite', label: 'On-site' },
];

const ROLE_OPTIONS = [
  'Full Stack',
  'Frontend',
  'Backend',
  'React Developer',
  'DevOps / Cloud',
  'Data / AI Engineer',
  'Mobile (iOS/Android)',
];

const JOB_TYPE_OPTIONS = [
  { id: 'fulltime', label: 'Full-time' },
  { id: 'contract', label: 'Contract' },
  { id: 'parttime', label: 'Part-time' },
  { id: 'internship', label: 'Internship' },
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
  { id: '7d', label: 'Past week (7d)' },
  { id: '30d', label: 'Past month (30d)' },
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
}: FiltersBarProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [companySearch, setCompanySearch] = useState('');
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

  const handleToggleAts = (atsId: ATSType) => {
    const current = filters.atsTypes || [];
    const updated = current.includes(atsId)
      ? current.filter((a) => a !== atsId)
      : [...current, atsId];
    onChange({ atsTypes: updated.length ? updated : undefined });
  };

  const handleToggleLocation = (loc: string) => {
    const current = filters.locations || [];
    const updated = current.includes(loc) ? current.filter((l) => l !== loc) : [...current, loc];
    onChange({ locations: updated.length ? updated : undefined });
  };

  const handleToggleWorkplace = (wp: string) => {
    const current = filters.workplaceType || [];
    const updated = current.includes(wp) ? current.filter((w) => w !== wp) : [...current, wp];
    onChange({
      workplaceType: updated.length ? updated : undefined,
      remoteOnly: updated.includes('remote') && updated.length === 1 ? true : filters.remoteOnly,
    });
  };

  const handleToggleRole = (role: string) => {
    const current = filters.roles || [];
    const updated = current.includes(role) ? current.filter((r) => r !== role) : [...current, role];
    onChange({ roles: updated.length ? updated : undefined });
  };

  const handleToggleJobType = (type: string) => {
    const current = filters.jobTypes || [];
    const updated = current.includes(type) ? current.filter((t) => t !== type) : [...current, type];
    onChange({ jobTypes: updated.length ? updated : undefined });
  };

  const handleToggleCompany = (company: string) => {
    const current = filters.companies || [];
    const updated = current.includes(company)
      ? current.filter((c) => c !== company)
      : [...current, company];
    onChange({ companies: updated.length ? updated : undefined });
  };

  const handleToggleExperience = (exp: string) => {
    const current = filters.experienceLevel || [];
    const updated = current.includes(exp) ? current.filter((e) => e !== exp) : [...current, exp];
    onChange({ experienceLevel: updated.length ? updated : undefined });
  };

  const handleToggleSource = (source: JobSource) => {
    const current = filters.sources || [];
    const updated = current.includes(source)
      ? current.filter((s) => s !== source)
      : [...current, source];
    onChange({ sources: updated.length ? updated : undefined });
  };

  const activeFilterCount =
    (filters.remoteOnly ? 1 : 0) +
    (filters.companies?.length ? 1 : 0) +
    (filters.locations?.length ? 1 : 0) +
    (filters.workplaceType?.length ? 1 : 0) +
    (filters.roles?.length ? 1 : 0) +
    (filters.jobTypes?.length ? 1 : 0) +
    (filters.experienceLevel?.length ? 1 : 0) +
    (filters.sources?.length ? 1 : 0) +
    (filters.sponsorsVisa ? 1 : 0) +
    (filters.datePosted && filters.datePosted !== 'all' ? 1 : 0) +
    (filters.savedOnly ? 1 : 0) +
    (filters.atsTypes?.length ? 1 : 0) +
    (filters.sortBy && filters.sortBy !== 'matchScore' ? 1 : 0) +
    (filters.matchScoreMin !== undefined || filters.matchScoreMax !== undefined ? 1 : 0);

  // Top companies list
  const companyOptions = [
    ...(metrics?.topCompanies.map((c) => c.company) || []),
    'Monzo',
    'Stripe',
    'Revolut',
    'Figma',
    'Airbnb',
    'Deliveroo',
    'GitLab',
    'Amazon',
    'Google',
    'Swiggy',
    'Zomato',
  ].filter((v, i, a) => a.indexOf(v) === i);

  const filteredCompanies = companyOptions.filter((c) =>
    c.toLowerCase().includes(companySearch.toLowerCase())
  );

  return (
    <div
      ref={dropdownRef}
      className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-4 space-y-3.5 shadow-sm"
    >
      {/* Top Search / Country / ATS Platform Dropdown / Quota Row */}
      <div className="flex flex-wrap items-center gap-3">
        <CountrySelector value={countries} onChange={onCountriesChange} />
        
        <div className="flex-1 min-w-[220px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title, company, skill..."
            value={filters.searchText || ''}
            onChange={(e) => onChange({ searchText: e.target.value })}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-[#1a230f] border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-500 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>

        {/* ATS Platform Multi-Select Dropdown next to search */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleDropdown('ats')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-all shrink-0 border ${
              filters.atsTypes?.length
                ? 'bg-[#0f3822] dark:bg-[#133820] text-white border-[#1a4a2c] font-semibold shadow-sm'
                : 'bg-gray-50 dark:bg-[#1a230f] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 font-medium'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-lime-600" />
            <span>
              {filters.atsTypes?.length
                ? `ATS (${filters.atsTypes.length})`
                : 'ATS Platform'}
            </span>
            {filters.atsTypes?.length ? (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onChange({ atsTypes: undefined });
                }}
                className="p-0.5 rounded-full hover:bg-white/20 ml-0.5"
              >
                <X className="w-3 h-3" />
              </span>
            ) : (
              <ChevronDown className="w-3 h-3 opacity-70" />
            )}
          </button>

          {/* ATS Platform Dropdown Menu */}
          {activeDropdown === 'ats' && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl z-50 p-2 animate-fadeIn space-y-1">
              <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-gray-400 border-b border-gray-100 dark:border-white/5 mb-1">
                <span>Select ATS Platforms</span>
                {filters.atsTypes?.length ? (
                  <button
                    type="button"
                    onClick={() => onChange({ atsTypes: undefined })}
                    className="text-red-500 hover:underline text-[10px]"
                  >
                    Clear All
                  </button>
                ) : null}
              </div>

              {ATS_OPTIONS.map((ats) => {
                const active = (filters.atsTypes || []).includes(ats.id);
                return (
                  <button
                    key={ats.id}
                    type="button"
                    onClick={() => handleToggleAts(ats.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      active
                        ? 'bg-lime-500/10 text-lime-700 dark:text-lime-400 font-semibold'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                          active
                            ? 'bg-lime-500 border-lime-500 text-white'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {active && <Check className="w-2.5 h-2.5" />}
                      </div>
                      <span>{ats.label}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono">{ats.tag}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="hidden sm:block">
          <QuotaIndicator userId={userId} />
        </div>
      </div>

      {/* Quick Chips Filter Bar (All Inline) */}
      <div className="relative flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide pt-0.5 select-none">
        {/* 1. Date Chip */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleDropdown('date')}
            className={`rounded-full px-3 py-1.5 border text-xs transition-all flex items-center gap-1.5 shrink-0 ${
              filters.datePosted && filters.datePosted !== 'all'
                ? 'bg-[#0f3822] dark:bg-[#133820] text-white border-[#1a4a2c] font-semibold'
                : 'border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] text-gray-700 dark:text-gray-300 hover:border-gray-400 font-medium'
            }`}
          >
            <span>
              {filters.datePosted && filters.datePosted !== 'all'
                ? `Date: ${DATE_OPTIONS.find((d) => d.id === filters.datePosted)?.label || filters.datePosted}`
                : 'Date'}
            </span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>

          {activeDropdown === 'date' && (
            <div className="absolute left-0 top-full mt-2 w-44 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl z-50 p-1.5 animate-fadeIn">
              {DATE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange({ datePosted: opt.id as any });
                    setActiveDropdown(null);
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                    (filters.datePosted || 'all') === opt.id
                      ? 'bg-lime-500/10 text-lime-700 dark:text-lime-400 font-semibold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                  }`}
                >
                  <span>{opt.label}</span>
                  {(filters.datePosted || 'all') === opt.id && (
                    <Check className="w-3.5 h-3.5 text-lime-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. Best Match / Sort Chip (Inline) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleDropdown('sort')}
            className={`rounded-full px-3 py-1.5 border text-xs transition-all flex items-center gap-1.5 shrink-0 ${
              filters.sortBy && filters.sortBy !== 'matchScore'
                ? 'bg-[#0f3822] dark:bg-[#133820] text-white border-[#1a4a2c] font-semibold'
                : 'border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] text-gray-700 dark:text-gray-300 hover:border-gray-400 font-medium'
            }`}
          >
            <ArrowUpDown className="w-3 h-3 opacity-70" />
            <span>
              {sortOptions.find((s) => s.value === (filters.sortBy || 'matchScore'))?.label ||
                'Best match'}
            </span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>

          {activeDropdown === 'sort' && (
            <div className="absolute left-0 top-full mt-2 w-48 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl z-50 p-1.5 animate-fadeIn space-y-1">
              {sortOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange({
                      sortBy: opt.value,
                      sortOrder: opt.value === 'salary' ? 'desc' : filters.sortOrder,
                    });
                    setActiveDropdown(null);
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                    (filters.sortBy || 'matchScore') === opt.value
                      ? 'bg-lime-500/10 text-lime-700 dark:text-lime-400 font-semibold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                  }`}
                >
                  <span>{opt.label}</span>
                  {(filters.sortBy || 'matchScore') === opt.value && (
                    <Check className="w-3.5 h-3.5 text-lime-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 3. Remote Only Chip (Inline) */}
        <button
          type="button"
          onClick={() => onChange({ remoteOnly: !filters.remoteOnly })}
          className={`rounded-full px-3 py-1.5 border text-xs transition-all flex items-center gap-1.5 shrink-0 ${
            filters.remoteOnly
              ? 'bg-[#0f3822] dark:bg-[#133820] text-white border-[#1a4a2c] font-semibold'
              : 'border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] text-gray-700 dark:text-gray-300 hover:border-gray-400 font-medium'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              filters.remoteOnly ? 'bg-lime-400 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          />
          <span>Remote only</span>
          {filters.remoteOnly && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange({ remoteOnly: false });
              }}
              className="p-0.5 rounded-full hover:bg-white/20 ml-0.5"
            >
              <X className="w-3 h-3" />
            </span>
          )}
        </button>

        {/* Divider */}
        <div className="h-4 w-px bg-gray-200 dark:bg-white/10 shrink-0 mx-0.5" />

        {/* 4. Location Chip */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleDropdown('location')}
            className={`rounded-full px-3 py-1.5 border text-xs transition-all flex items-center gap-1.5 shrink-0 ${
              filters.locations?.length
                ? 'bg-[#0f3822] dark:bg-[#133820] text-white border-[#1a4a2c] font-semibold'
                : 'border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] text-gray-700 dark:text-gray-300 hover:border-gray-400 font-medium'
            }`}
          >
            <MapPin className="w-3 h-3 opacity-80" />
            <span>Location</span>
            {filters.locations?.length ? (
              <>
                <span className="w-4 h-4 rounded-full bg-white/20 text-white text-[10px] font-bold inline-flex items-center justify-center">
                  {filters.locations.length}
                </span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange({ locations: undefined });
                  }}
                  className="p-0.5 rounded-full hover:bg-white/20"
                >
                  <X className="w-3 h-3" />
                </span>
              </>
            ) : (
              <ChevronDown className="w-3 h-3 opacity-70" />
            )}
          </button>

          {activeDropdown === 'location' && (
            <div className="absolute left-0 top-full mt-2 w-52 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl z-50 p-2 animate-fadeIn space-y-1">
              <div className="text-[11px] font-semibold text-gray-400 px-2 py-1">Filter Locations</div>
              {LOCATIONS_OPTIONS.map((loc) => {
                const active = (filters.locations || []).includes(loc);
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => handleToggleLocation(loc)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      active
                        ? 'bg-lime-500/10 text-lime-700 dark:text-lime-400 font-semibold'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <span>{loc}</span>
                    {active && <Check className="w-3.5 h-3.5 text-lime-600" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 8. Degree Level / Max Experience Chip */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleDropdown('experience')}
            className={`rounded-full px-3 py-1.5 border text-xs transition-all flex items-center gap-1.5 shrink-0 ${
              filters.experienceLevel?.length
                ? 'bg-[#0f3822] dark:bg-[#133820] text-white border-[#1a4a2c] font-semibold'
                : 'border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] text-gray-700 dark:text-gray-300 hover:border-gray-400 font-medium'
            }`}
          >
            <span>Degree / Experience</span>
            {filters.experienceLevel?.length ? (
              <>
                <span className="w-4 h-4 rounded-full bg-white/20 text-white text-[10px] font-bold inline-flex items-center justify-center">
                  {filters.experienceLevel.length}
                </span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange({ experienceLevel: undefined });
                  }}
                  className="p-0.5 rounded-full hover:bg-white/20"
                >
                  <X className="w-3 h-3" />
                </span>
              </>
            ) : (
              <ChevronDown className="w-3 h-3 opacity-70" />
            )}
          </button>

          {activeDropdown === 'experience' && (
            <div className="absolute left-0 top-full mt-2 w-52 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl z-50 p-2 animate-fadeIn space-y-1">
              {EXPERIENCE_OPTIONS.map((exp) => {
                const active = (filters.experienceLevel || []).includes(exp.id);
                return (
                  <button
                    key={exp.id}
                    type="button"
                    onClick={() => handleToggleExperience(exp.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      active
                        ? 'bg-lime-500/10 text-lime-700 dark:text-lime-400 font-semibold'
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

        {/* 9. Sponsors Visa Chip */}
        <button
          type="button"
          onClick={() => onChange({ sponsorsVisa: !filters.sponsorsVisa })}
          className={`rounded-full px-3 py-1.5 border text-xs transition-all flex items-center gap-1.5 shrink-0 ${
            filters.sponsorsVisa
              ? 'bg-[#0f3822] dark:bg-[#133820] text-white border-[#1a4a2c] font-semibold'
              : 'border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] text-gray-700 dark:text-gray-300 hover:border-gray-400 font-medium'
          }`}
        >
          <span>Sponsors Visa</span>
          {filters.sponsorsVisa && <Check className="w-3 h-3 text-lime-400" />}
        </button>

        {/* Divider */}
        <div className="h-4 w-px bg-gray-200 dark:bg-white/10 shrink-0 mx-0.5" />

        {/* 10. Role Chip */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleDropdown('role')}
            className={`rounded-full px-3 py-1.5 border text-xs transition-all flex items-center gap-1.5 shrink-0 ${
              filters.roles?.length
                ? 'bg-[#0f3822] dark:bg-[#133820] text-white border-[#1a4a2c] font-semibold'
                : 'border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] text-gray-700 dark:text-gray-300 hover:border-gray-400 font-medium'
            }`}
          >
            <span>Role</span>
            {filters.roles?.length ? (
              <>
                <span className="w-4 h-4 rounded-full bg-white/20 text-white text-[10px] font-bold inline-flex items-center justify-center">
                  {filters.roles.length}
                </span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange({ roles: undefined });
                  }}
                  className="p-0.5 rounded-full hover:bg-white/20"
                >
                  <X className="w-3 h-3" />
                </span>
              </>
            ) : (
              <ChevronDown className="w-3 h-3 opacity-70" />
            )}
          </button>

          {activeDropdown === 'role' && (
            <div className="absolute left-0 top-full mt-2 w-52 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl z-50 p-2 animate-fadeIn space-y-1">
              {ROLE_OPTIONS.map((role) => {
                const active = (filters.roles || []).includes(role);
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleToggleRole(role)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      active
                        ? 'bg-lime-500/10 text-lime-700 dark:text-lime-400 font-semibold'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <span>{role}</span>
                    {active && <Check className="w-3.5 h-3.5 text-lime-600" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 11. Job Type Chip */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleDropdown('jobType')}
            className={`rounded-full px-3 py-1.5 border text-xs transition-all flex items-center gap-1.5 shrink-0 ${
              filters.jobTypes?.length
                ? 'bg-[#0f3822] dark:bg-[#133820] text-white border-[#1a4a2c] font-semibold'
                : 'border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] text-gray-700 dark:text-gray-300 hover:border-gray-400 font-medium'
            }`}
          >
            <span>Job Type</span>
            {filters.jobTypes?.length ? (
              <>
                <span className="w-4 h-4 rounded-full bg-white/20 text-white text-[10px] font-bold inline-flex items-center justify-center">
                  {filters.jobTypes.length}
                </span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange({ jobTypes: undefined });
                  }}
                  className="p-0.5 rounded-full hover:bg-white/20"
                >
                  <X className="w-3 h-3" />
                </span>
              </>
            ) : (
              <ChevronDown className="w-3 h-3 opacity-70" />
            )}
          </button>

          {activeDropdown === 'jobType' && (
            <div className="absolute left-0 top-full mt-2 w-44 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl z-50 p-2 animate-fadeIn space-y-1">
              {JOB_TYPE_OPTIONS.map((jt) => {
                const active = (filters.jobTypes || []).includes(jt.id);
                return (
                  <button
                    key={jt.id}
                    type="button"
                    onClick={() => handleToggleJobType(jt.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      active
                        ? 'bg-lime-500/10 text-lime-700 dark:text-lime-400 font-semibold'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <span>{jt.label}</span>
                    {active && <Check className="w-3.5 h-3.5 text-lime-600" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 12. Saved Jobs Chip */}
        <button
          type="button"
          onClick={() => onChange({ savedOnly: !filters.savedOnly })}
          className={`rounded-full px-3 py-1.5 border text-xs transition-all flex items-center gap-1.5 shrink-0 ${
            filters.savedOnly
              ? 'bg-[#0f3822] dark:bg-[#133820] text-white border-[#1a4a2c] font-semibold'
              : 'border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] text-gray-700 dark:text-gray-300 hover:border-gray-400 font-medium'
          }`}
        >
          <Bookmark className="w-3 h-3 opacity-80" />
          <span>Saved</span>
          <span className="w-4 h-4 rounded-full bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-[10px] font-bold inline-flex items-center justify-center">
            {savedCount}
          </span>
        </button>

        {/* 13. Clear Action Link */}
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-gray-400 hover:text-red-500 font-medium flex items-center gap-0.5 ml-auto shrink-0 transition-colors"
          >
            <X className="w-3 h-3" />
            <span>Clear</span>
          </button>
        )}
      </div>
    </div>
  );
}