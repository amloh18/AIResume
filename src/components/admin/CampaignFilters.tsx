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
      active: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400',
      inactive: 'bg-white/5 border-white/10 text-white/50 hover:border-emerald-400/50 hover:text-white',
    },
    blue: {
      active: 'bg-blue-500/15 border-blue-500/40 text-blue-400',
      inactive: 'bg-white/5 border-white/10 text-white/50 hover:border-blue-400/50 hover:text-white',
    },
    amber: {
      active: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
      inactive: 'bg-white/5 border-white/10 text-white/50 hover:border-amber-400/50 hover:text-white',
    },
    purple: {
      active: 'bg-purple-500/15 border-purple-500/40 text-purple-400',
      inactive: 'bg-white/5 border-white/10 text-white/50 hover:border-purple-400/50 hover:text-white',
    },
    rose: {
      active: 'bg-rose-500/15 border-rose-500/40 text-rose-400',
      inactive: 'bg-white/5 border-white/10 text-white/50 hover:border-rose-400/50 hover:text-white',
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
    <div className="rounded-2xl border border-white/10 bg-[#111111] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
        <Icon className="w-3.5 h-3.5 text-white/30" />
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
          {label}
        </span>
        {count !== undefined && count > 0 && (
          <span className="ml-auto text-[9px] font-bold bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full">
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
      setAvailablePlans(['free', 'starter_monthly', 'focused_monthly']);
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
      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-4 bg-[#111111] border border-white/10 p-5 rounded-2xl">
        {/* Tier Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] font-black uppercase text-white/30 tracking-wider">Tier</label>
          <select
            value={localFilters.membershipPlans?.[0] || ""}
            onChange={(e) => {
              const val = e.target.value;
              emit({
                ...localFilters,
                membershipPlans: val ? [val] : undefined
              });
            }}
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold min-w-[120px]"
          >
            <option value="">All Tiers</option>
            {availablePlans.map(p => (
              <option key={p} value={p}>{p.toUpperCase()}</option>
            ))}
          </select>
        </div>

        {/* Registration Window */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] font-black uppercase text-white/30 tracking-wider">Registration</label>
          <select
            value={localFilters.userAge ? `${localFilters.userAge.type}-${localFilters.userAge.days}` : ""}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) {
                const { userAge, ...rest } = localFilters;
                emit(rest);
              } else {
                const [type, days] = val.split('-');
                emit({
                  ...localFilters,
                  userAge: { type, days: parseInt(days) }
                });
              }
            }}
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold min-w-[150px]"
          >
            <option value="">All Users</option>
            <option value="new_users-7">New (last 7 days)</option>
            <option value="new_users-30">New (last 30 days)</option>
            <option value="existing_users-30">Returning (30+ days)</option>
            <option value="existing_users-90">Returning (90+ days)</option>
          </select>
        </div>

        {/* Region Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] font-black uppercase text-white/30 tracking-wider">Region</label>
          <select
            value={localFilters.region || ""}
            onChange={(e) => handleRegionChange(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold min-w-[110px]"
          >
            <option value="">All Regions</option>
            {availableRegions.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Email Verification */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] font-black uppercase text-white/30 tracking-wider">Email Status</label>
          <select
            value={localFilters.emailVerified === undefined ? "" : String(localFilters.emailVerified)}
            onChange={(e) => {
              const val = e.target.value;
              handleBooleanFilter('emailVerified', val === "" ? null : val === "true");
            }}
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold min-w-[120px]"
          >
            <option value="">All Statuses</option>
            <option value="true">Verified Only</option>
            <option value="false">Unverified Only</option>
          </select>
        </div>

        {/* Min CVs */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] font-black uppercase text-white/30 tracking-wider">Min CVs</label>
          <input
            type="number"
            min="0"
            value={localFilters.usageMetrics?.minCVsCreated ?? ''}
            onChange={(e) => handleUsageMetricChange('minCVsCreated', e.target.value)}
            placeholder="0"
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold w-20 text-center"
          />
        </div>

        {/* Min Journeys */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] font-black uppercase text-white/30 tracking-wider">Min Journeys</label>
          <input
            type="number"
            min="0"
            value={localFilters.usageMetrics?.minJourneysCompleted ?? ''}
            onChange={(e) => handleUsageMetricChange('minJourneysCompleted', e.target.value)}
            placeholder="0"
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold w-20 text-center"
          />
        </div>

        {/* Clear Button */}
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="self-end px-4 py-2 border border-red-500/20 hover:border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-black uppercase tracking-wider text-[9px] rounded-xl transition-all h-8.5 mt-auto"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Active Scope Summary */}
      {hasActiveFilters && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">
              Active Scope:
            </span>
            <div className="flex flex-wrap gap-x-3 text-[10px] font-bold text-white/50">
              {localFilters.membershipPlans?.length > 0 && <span>Tiers: {localFilters.membershipPlans.join(', ')}</span>}
              {localFilters.userAge && <span>{localFilters.userAge.type === 'new_users' ? 'New' : 'Returning'} ({localFilters.userAge.days}d)</span>}
              {localFilters.region && <span>Region: {localFilters.region}</span>}
              {localFilters.emailVerified !== undefined && <span>Email: {localFilters.emailVerified ? 'Verified' : 'Unverified'}</span>}
              {localFilters.usageMetrics?.minCVsCreated > 0 && <span>Min CVs: {localFilters.usageMetrics.minCVsCreated}</span>}
              {localFilters.usageMetrics?.minJourneysCompleted > 0 && <span>Min Journeys: {localFilters.usageMetrics.minJourneysCompleted}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
