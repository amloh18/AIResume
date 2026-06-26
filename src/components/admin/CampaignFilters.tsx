'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Filter, X, Users, Globe, Clock, BarChart3, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import isEqual from 'lodash/isEqual';

interface FilterProps {
  filters: any;
  onChange: (filters: any) => void;
  twoColumn?: boolean;
}

// ─── Filter Chip ─────────────────────────────────────────────────────────────
function FilterChip({
  label,
  active,
  onClick,
  onRemove,
  color = 'emerald',
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  onRemove?: () => void;
  color?: 'emerald' | 'blue' | 'amber' | 'purple' | 'rose';
}) {
  const colorMap = {
    emerald: {
      active: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300',
      inactive: 'bg-[var(--admin-filter-bg,hsl(0,0%,96%))] dark:bg-white/[0.04] border-[var(--admin-filter-border,hsl(0,0%,85%))] dark:border-white/8 text-[var(--admin-filter-text,hsl(0,0%,40%))] dark:text-white/50 hover:border-emerald-400/50 dark:hover:border-emerald-500/30 hover:text-emerald-700 dark:hover:text-emerald-300',
    },
    blue: {
      active: 'bg-blue-500/15 border-blue-500/40 text-blue-700 dark:text-blue-300',
      inactive: 'bg-[var(--admin-filter-bg,hsl(0,0%,96%))] dark:bg-white/[0.04] border-[var(--admin-filter-border,hsl(0,0%,85%))] dark:border-white/8 text-[var(--admin-filter-text,hsl(0,0%,40%))] dark:text-white/50 hover:border-blue-400/50 dark:hover:border-blue-500/30 hover:text-blue-700 dark:hover:text-blue-300',
    },
    amber: {
      active: 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300',
      inactive: 'bg-[var(--admin-filter-bg,hsl(0,0%,96%))] dark:bg-white/[0.04] border-[var(--admin-filter-border,hsl(0,0%,85%))] dark:border-white/8 text-[var(--admin-filter-text,hsl(0,0%,40%))] dark:text-white/50 hover:border-amber-400/50 dark:hover:border-amber-500/30 hover:text-amber-700 dark:hover:text-amber-300',
    },
    purple: {
      active: 'bg-purple-500/15 border-purple-500/40 text-purple-700 dark:text-purple-300',
      inactive: 'bg-[var(--admin-filter-bg,hsl(0,0%,96%))] dark:bg-white/[0.04] border-[var(--admin-filter-border,hsl(0,0%,85%))] dark:border-white/8 text-[var(--admin-filter-text,hsl(0,0%,40%))] dark:text-white/50 hover:border-purple-400/50 dark:hover:border-purple-500/30 hover:text-purple-700 dark:hover:text-purple-300',
    },
    rose: {
      active: 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300',
      inactive: 'bg-[var(--admin-filter-bg,hsl(0,0%,96%))] dark:bg-white/[0.04] border-[var(--admin-filter-border,hsl(0,0%,85%))] dark:border-white/8 text-[var(--admin-filter-text,hsl(0,0%,40%))] dark:text-white/50 hover:border-rose-400/50 dark:hover:border-rose-500/30 hover:text-rose-700 dark:hover:text-rose-300',
    },
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-semibold transition-all duration-150 ${active ? colorMap[color].active : colorMap[color].inactive}`}
    >
      {active && <CheckCircle className="w-3 h-3 shrink-0" />}
      {label}
      {active && onRemove && (
        <span
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onRemove()}
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 opacity-70 hover:opacity-100 cursor-pointer"
        >
          <X className="w-3 h-3" />
        </span>
      )}
    </button>
  );
}

// ─── Filter Section ───────────────────────────────────────────────────────────
function FilterSection({
  icon: Icon,
  label,
  children,
  count,
}: {
  icon: any;
  label: string;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <div className="rounded-xl border border-[var(--admin-border,hsl(0,0%,88%))] dark:border-white/6 bg-[var(--admin-card-bg,hsl(0,0%,99%))] dark:bg-white/[0.02] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--admin-border,hsl(0,0%,88%))] dark:border-white/5">
        <Icon className="w-3.5 h-3.5 text-[var(--admin-muted,hsl(0,0%,55%))] dark:text-white/30" />
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--admin-muted,hsl(0,0%,45%))] dark:text-white/30">
          {label}
        </span>
        {count !== undefined && count > 0 && (
          <span className="ml-auto text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
            {count} active
          </span>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ─── Active Filters Bar ───────────────────────────────────────────────────────
function ActiveFiltersBar({ filters, onClear, onRemovePlan, onClearAge, onClearRegion }: {
  filters: any;
  onClear: () => void;
  onRemovePlan: (plan: string) => void;
  onClearAge: () => void;
  onClearRegion: () => void;
}) {
  const chips: React.ReactNode[] = [];

  (filters.membershipPlans || []).forEach((plan: string) => {
    chips.push(
      <span
        key={`plan-${plan}`}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300"
      >
        {plan.charAt(0).toUpperCase() + plan.slice(1)}
        <button onClick={() => onRemovePlan(plan)} className="opacity-60 hover:opacity-100 transition-opacity">
          <X className="w-3 h-3" />
        </button>
      </span>
    );
  });

  if (filters.userAge) {
    const ageLabel = filters.userAge.type === 'new_users' ? `New ≤ ${filters.userAge.days}d` : `Veteran > ${filters.userAge.days}d`;
    chips.push(
      <span
        key="age"
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-[11px] font-semibold text-blue-700 dark:text-blue-300"
      >
        <Clock className="w-3 h-3" />
        {ageLabel}
        <button onClick={onClearAge} className="opacity-60 hover:opacity-100 transition-opacity">
          <X className="w-3 h-3" />
        </button>
      </span>
    );
  }

  if (filters.region) {
    chips.push(
      <span
        key="region"
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-[11px] font-semibold text-purple-700 dark:text-purple-300"
      >
        <Globe className="w-3 h-3" />
        {filters.region}
        <button onClick={onClearRegion} className="opacity-60 hover:opacity-100 transition-opacity">
          <X className="w-3 h-3" />
        </button>
      </span>
    );
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--admin-muted,hsl(0,0%,45%))] dark:text-white/30 shrink-0">
        Active:
      </span>
      {chips}
      <button
        onClick={onClear}
        className="ml-auto text-[10px] font-bold text-rose-500 hover:text-rose-400 transition-colors uppercase tracking-wider"
      >
        Clear all
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CampaignFilters({ filters, onChange, twoColumn = false }: FilterProps) {
  const [localFilters, setLocalFilters] = useState(() => ({
    ...(filters || {}),
    usageMetrics: filters?.usageMetrics || {},
  }));
  const [availablePlans, setAvailablePlans] = useState<string[]>([]);
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    plans: true,
    age: true,
    region: true,
    metrics: false,
    engagement: false,
  });
  const lastFiltersRef = useRef(filters);

  useEffect(() => {
    fetchAvailablePlans();
    fetchAvailableRegions();
  }, []);

  const fetchAvailablePlans = async () => {
    try {
      const response = await fetch('/api/admin/config/plans?forCampaigns=true');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const plans = data.plans || [];
          if (!plans.includes('free')) plans.unshift('free');
          setAvailablePlans(plans);
        }
      }
    } catch {
      setAvailablePlans(['free', 'pro', 'premium']);
    }
  };

  const fetchAvailableRegions = async () => {
    try {
      const response = await fetch('/api/admin/pricing-regions');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.regions) {
          setAvailableRegions(data.regions);
          return;
        }
      }
    } catch {}
    setAvailableRegions(['US', 'GB', 'IN', 'CA', 'AU', 'EU', 'SG']);
  };

  // Sync local filters with props if they change externally
  useEffect(() => {
    if (!isEqual(filters, lastFiltersRef.current)) {
      setLocalFilters({ ...(filters || {}), usageMetrics: filters?.usageMetrics || {} });
      lastFiltersRef.current = filters;
    }
  }, [filters]);

  const emit = (newFilters: any) => {
    setLocalFilters(newFilters);
    onChange(newFilters);
  };

  // ── Plan handlers ──────────────────────────────────────────────────────────
  const handlePlanChange = (plan: string, checked: boolean) => {
    const plans = localFilters.membershipPlans || [];
    const updatedPlans = checked ? [...plans, plan] : plans.filter((p: string) => p !== plan);
    emit({ ...localFilters, membershipPlans: updatedPlans.length > 0 ? updatedPlans : undefined });
  };

  const removePlan = (plan: string) => handlePlanChange(plan, false);

  // ── Age handlers ───────────────────────────────────────────────────────────
  const handleUserAgeChange = (type: 'new_users' | 'existing_users' | '', days?: number) => {
    if (!type) {
      const { userAge, ...rest } = localFilters;
      emit(rest);
      return;
    }
    emit({ ...localFilters, userAge: { type, days: days || 30 } });
  };

  const clearUserAge = () => {
    const { userAge, ...rest } = localFilters;
    emit(rest);
  };

  // ── Region handler ─────────────────────────────────────────────────────────
  const handleRegionChange = (region: string) => {
    const newFilters = { ...localFilters, region: region || undefined };
    if (!region) delete newFilters.region;
    emit(newFilters);
  };

  const clearRegion = () => {
    const { region, ...rest } = localFilters;
    emit(rest);
  };

  // ── Boolean filter ─────────────────────────────────────────────────────────
  const handleBooleanFilter = (field: string, value: boolean | null) => {
    if (value === null) {
      const { [field]: _, ...rest } = localFilters;
      emit(rest);
    } else {
      emit({ ...localFilters, [field]: value });
    }
  };

  // ── Usage metrics ──────────────────────────────────────────────────────────
  const handleUsageMetricChange = (field: string, value: string) => {
    const parsed = parseInt(value);
    const updated = {
      ...localFilters,
      usageMetrics: {
        ...(localFilters.usageMetrics || {}),
        [field]: !isNaN(parsed) && value !== '' ? parsed : undefined,
      },
    };
    // Remove empty usageMetrics object
    if (Object.values(updated.usageMetrics).every(v => v === undefined)) {
      delete updated.usageMetrics;
      updated.usageMetrics = {};
    }
    emit(updated);
  };

  const clearAllFilters = () => emit({});

  const toggleSection = (key: string) =>
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const hasActiveFilters = (localFilters.membershipPlans?.length > 0) ||
    localFilters.userAge ||
    localFilters.region ||
    localFilters.emailVerified !== undefined ||
    Object.values(localFilters.usageMetrics || {}).some(Boolean);

  const planColors: Record<string, 'emerald' | 'blue' | 'amber' | 'purple' | 'rose'> = {
    free: 'emerald',
    pro: 'blue',
    premium: 'amber',
    enterprise: 'purple',
  };

  const planCount = localFilters.membershipPlans?.length || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <Filter className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <h3 className="text-sm font-bold text-[var(--admin-text,hsl(0,0%,10%))] dark:text-white">
            Target Filters
          </h3>
          {hasActiveFilters && (
            <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full">
              Active
            </span>
          )}
        </div>
      </div>

      {/* Active Filters Bar */}
      {hasActiveFilters && (
        <div className="p-3 rounded-xl bg-[var(--admin-filter-bg,hsl(0,0%,96%))] dark:bg-white/[0.03] border border-[var(--admin-border,hsl(0,0%,88%))] dark:border-white/5">
          <ActiveFiltersBar
            filters={localFilters}
            onClear={clearAllFilters}
            onRemovePlan={removePlan}
            onClearAge={clearUserAge}
            onClearRegion={clearRegion}
          />
        </div>
      )}

      {/* ── Membership Plans ── */}
      <FilterSection icon={Users} label="Membership Tier" count={planCount}>
        <div className="flex flex-wrap gap-2">
          {availablePlans.map((plan) => {
            const isActive = localFilters.membershipPlans?.includes(plan) ?? false;
            const color = planColors[plan] || 'emerald';
            return (
              <FilterChip
                key={plan}
                label={plan.charAt(0).toUpperCase() + plan.slice(1)}
                active={isActive}
                color={color}
                onClick={() => handlePlanChange(plan, !isActive)}
                onRemove={isActive ? () => removePlan(plan) : undefined}
              />
            );
          })}
        </div>
        {availablePlans.length === 0 && (
          <p className="text-[11px] text-[var(--admin-muted,hsl(0,0%,55%))] dark:text-white/30 italic">
            Loading plans…
          </p>
        )}
      </FilterSection>

      {/* ── User Age ── */}
      <FilterSection icon={Clock} label="Registration Window" count={localFilters.userAge ? 1 : 0}>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {[
              { value: '', label: 'All Users' },
              { value: 'new_users', label: 'New Users' },
              { value: 'existing_users', label: 'Returning' },
            ].map(({ value, label }) => {
              const isActive = (localFilters.userAge?.type || '') === value;
              return (
                <FilterChip
                  key={value || 'all'}
                  label={label}
                  active={isActive}
                  color="blue"
                  onClick={() => handleUserAgeChange(value as any, localFilters.userAge?.days)}
                />
              );
            })}
          </div>

          {localFilters.userAge && (
            <div className="mt-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--admin-muted,hsl(0,0%,45%))] dark:text-white/30 block mb-2">
                Within last N days
              </label>
              <div className="flex gap-2 flex-wrap">
                {[7, 14, 30, 60, 90].map((d) => {
                  const isActive = localFilters.userAge?.days === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleUserAgeChange(localFilters.userAge.type, d)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                        isActive
                          ? 'bg-blue-500/15 border-blue-500/40 text-blue-700 dark:text-blue-300'
                          : 'bg-[var(--admin-filter-bg,hsl(0,0%,96%))] dark:bg-white/[0.04] border-[var(--admin-filter-border,hsl(0,0%,85%))] dark:border-white/8 text-[var(--admin-muted,hsl(0,0%,45%))] dark:text-white/40 hover:border-blue-400/40'
                      }`}
                    >
                      {d}d
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </FilterSection>

      {/* ── Region ── */}
      <FilterSection icon={Globe} label="Geographic Region" count={localFilters.region ? 1 : 0}>
        <div className="flex flex-wrap gap-2">
          {availableRegions.map((region) => {
            const isActive = localFilters.region === region;
            return (
              <FilterChip
                key={region}
                label={region}
                active={isActive}
                color="purple"
                onClick={() => handleRegionChange(isActive ? '' : region)}
                onRemove={isActive ? clearRegion : undefined}
              />
            );
          })}
        </div>
      </FilterSection>

      {/* ── Engagement / Verification ── */}
      <FilterSection icon={BarChart3} label="Engagement" count={localFilters.emailVerified !== undefined ? 1 : 0}>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--admin-muted,hsl(0,0%,45%))] dark:text-white/30 block mb-2">
              Email Verification
            </label>
            <div className="flex gap-2">
              {[
                { label: 'Any', value: null },
                { label: 'Verified', value: true },
                { label: 'Unverified', value: false },
              ].map(({ label, value }) => {
                const isActive = localFilters.emailVerified === value && (value !== null || localFilters.emailVerified === null);
                const activeActual = value === null
                  ? localFilters.emailVerified === undefined
                  : localFilters.emailVerified === value;
                return (
                  <FilterChip
                    key={label}
                    label={label}
                    active={activeActual}
                    color="amber"
                    onClick={() => handleBooleanFilter('emailVerified', value)}
                  />
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--admin-muted,hsl(0,0%,45%))] dark:text-white/30 block mb-2">
              Min CVs Created
            </label>
            <input
              type="number"
              min="0"
              value={localFilters.usageMetrics?.minCVsCreated ?? ''}
              onChange={(e) => handleUsageMetricChange('minCVsCreated', e.target.value)}
              placeholder="e.g. 1"
              className="w-full px-3 py-2 rounded-lg text-xs font-semibold border bg-[var(--admin-filter-bg,hsl(0,0%,97%))] dark:bg-black/30 border-[var(--admin-filter-border,hsl(0,0%,85%))] dark:border-white/8 text-[var(--admin-text,hsl(0,0%,10%))] dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder:text-[var(--admin-muted,hsl(0,0%,60%))] dark:placeholder:text-white/20 transition-all"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--admin-muted,hsl(0,0%,45%))] dark:text-white/30 block mb-2">
              Min Journeys Created
            </label>
            <input
              type="number"
              min="0"
              value={localFilters.usageMetrics?.minJourneysCompleted ?? ''}
              onChange={(e) => handleUsageMetricChange('minJourneysCompleted', e.target.value)}
              placeholder="e.g. 1"
              className="w-full px-3 py-2 rounded-lg text-xs font-semibold border bg-[var(--admin-filter-bg,hsl(0,0%,97%))] dark:bg-black/30 border-[var(--admin-filter-border,hsl(0,0%,85%))] dark:border-white/8 text-[var(--admin-text,hsl(0,0%,10%))] dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder:text-[var(--admin-muted,hsl(0,0%,60%))] dark:placeholder:text-white/20 transition-all"
            />
          </div>
        </div>
      </FilterSection>

      {/* ── Summary ── */}
      {hasActiveFilters && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Active Scope
            </span>
          </div>
          <div className="space-y-1 text-[11px] font-medium text-[var(--admin-muted,hsl(0,0%,40%))] dark:text-white/40">
            {(localFilters.membershipPlans?.length > 0) && (
              <div>Tiers: {localFilters.membershipPlans.join(', ')}</div>
            )}
            {localFilters.userAge && (
              <div>
                {localFilters.userAge.type === 'new_users' ? 'New' : 'Returning'} users within {localFilters.userAge.days} days
              </div>
            )}
            {localFilters.region && <div>Region: {localFilters.region}</div>}
            {localFilters.emailVerified !== undefined && (
              <div>Email: {localFilters.emailVerified ? 'Verified only' : 'Unverified only'}</div>
            )}
            {localFilters.usageMetrics?.minCVsCreated !== undefined && (
              <div>Min CVs created: {localFilters.usageMetrics.minCVsCreated}</div>
            )}
            {localFilters.usageMetrics?.minJourneysCompleted !== undefined && (
              <div>Min journeys: {localFilters.usageMetrics.minJourneysCompleted}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
