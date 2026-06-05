'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Filter, X, Plus } from 'lucide-react';
import isEqual from 'lodash/isEqual';

interface FilterProps {
  filters: any;
  onChange: (filters: any) => void;
  twoColumn?: boolean;
}

export default function CampaignFilters({ filters, onChange, twoColumn = false }: FilterProps) {
  const [localFilters, setLocalFilters] = useState(() => ({
    ...(filters || {}),
    usageMetrics: filters?.usageMetrics || {},
  }));
  const [availablePlans, setAvailablePlans] = useState<string[]>([]);
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);
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
          if (!plans.includes('free')) {
            plans.unshift('free');
          }
          setAvailablePlans(plans);
        }
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      setAvailablePlans(['free']);
    }
  };

  const fetchAvailableRegions = async () => {
    try {
      const response = await fetch('/api/admin/pricing-regions');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.regions) {
          setAvailableRegions(data.regions);
        } else {
          setAvailableRegions(['US', 'GB', 'IN', 'CA', 'AU', 'EU']);
        }
      } else {
        setAvailableRegions(['US', 'GB', 'IN', 'CA', 'AU', 'EU']);
      }
    } catch (error) {
      setAvailableRegions(['US', 'GB', 'IN', 'CA', 'AU', 'EU']);
    }
  };

  // Sync local filters with props if they change externally
  useEffect(() => {
    if (!isEqual(filters, lastFiltersRef.current)) {
      const newFilters = {
        ...(filters || {}),
        usageMetrics: filters?.usageMetrics || {},
      };
      setLocalFilters(newFilters);
      lastFiltersRef.current = filters;
    }
  }, [filters]);

  // Push local changes to parent
  useEffect(() => {
    if (!isEqual(localFilters, filters)) {
      onChange(localFilters);
    }
  }, [localFilters, filters, onChange]);

  const handlePlanChange = (plan: string, checked: boolean) => {
    const plans = localFilters.membershipPlans || [];
    if (checked) {
      setLocalFilters({
        ...localFilters,
        membershipPlans: [...plans, plan],
      });
    } else {
      setLocalFilters({
        ...localFilters,
        membershipPlans: plans.filter((p: string) => p !== plan),
      });
    }
  };

  const handleUserAgeChange = (type: 'new_users' | 'existing_users', days?: number) => {
    setLocalFilters({
      ...localFilters,
      userAge: { type, days: days || 7 },
    });
  };

  const clearUserAge = () => {
    const { userAge, ...rest } = localFilters;
    setLocalFilters(rest);
  };

  const handleUsageMetricChange = (field: string, value: number) => {
    setLocalFilters({
      ...localFilters,
      usageMetrics: {
        ...(localFilters.usageMetrics || {}),
        [field]: value && !isNaN(value) ? value : undefined,
      },
    });
  };

  const handleBooleanFilter = (field: string, value: boolean | null) => {
    if (value === null) {
      const { [field]: _, ...rest } = localFilters;
      setLocalFilters(rest);
    } else {
      setLocalFilters({
        ...localFilters,
        [field]: value,
      });
    }
  };

  const handleRegionChange = (region: string) => {
    setLocalFilters({
      ...localFilters,
      region: region || undefined,
    });
  };

  const clearAllFilters = () => {
    setLocalFilters({});
  };

  const hasActiveFilters = Object.keys(localFilters).length > 0;

  return (
    <div className={twoColumn ? "grid grid-cols-2 gap-6" : "space-y-8"}>
      {!twoColumn && (
        <div className="flex items-center justify-between col-span-2">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-black text-white uppercase tracking-tight">Targeting Matrix</h3>
          </div>
          {hasActiveFilters && (
            <button onClick={clearAllFilters} className="text-[10px] font-black uppercase text-red-400 hover:text-red-300 transition-colors tracking-widest">
              Reset Sector
            </button>
          )}
        </div>
      )}

      {/* Membership Plans */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
        <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-4 ml-1">Tier Allocation</h4>
        <div className="grid grid-cols-2 gap-3">
          {availablePlans.map((plan) => {
            const isChecked = localFilters.membershipPlans?.includes(plan) ?? false;
            return (
              <label key={plan} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${isChecked ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                <input type="checkbox" checked={isChecked} onChange={(e) => handlePlanChange(plan, e.target.checked)} className="w-4 h-4 text-emerald-500 bg-black/40 border-white/10 rounded" />
                <span className={`text-xs font-bold capitalize ${isChecked ? 'text-emerald-400' : 'text-white/60'}`}>{plan}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* User Age */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
        <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-4 ml-1">Temporal Filter</h4>
        <div className="space-y-4">
          <select value={localFilters.userAge?.type || ''} onChange={(e) => handleUserAgeChange(e.target.value as any, localFilters.userAge?.days)} className="w-full px-4 py-2.5 bg-black/40 border border-white/5 text-xs font-bold text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all">
            <option value="">All Identity Types</option>
            <option value="new_users">New Recruits</option>
            <option value="existing_users">Veteran Nodes</option>
          </select>

          {localFilters.userAge && (
            <div className="flex gap-2">
              <select value={localFilters.userAge.days || 7} onChange={(e) => handleUserAgeChange(localFilters.userAge.type, parseInt(e.target.value))} className="flex-1 px-4 py-2.5 bg-black/40 border border-white/5 text-xs font-bold text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                {[7, 15, 30, 60, 90].map(d => <option key={d} value={d}>Last {d} Days</option>)}
              </select>
              <button onClick={clearUserAge} className="p-2.5 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-all"><X className="w-4 h-4" /></button>
            </div>
          )}
        </div>
      </div>

      {/* Usage Metrics */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
        <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-4 ml-1">Activity Depth</h4>
        <div className="space-y-4">
          <div>
            <label className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-2 block ml-1">Min Activity (Minutes)</label>
            <input type="number" min="0" value={localFilters.usageMetrics?.minUsageMinutes ?? ''} onChange={(e) => handleUsageMetricChange('minUsageMinutes', parseInt(e.target.value) || 0)} className="w-full px-4 py-2.5 bg-black/40 border border-white/5 text-xs font-bold text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="0" />
          </div>
        </div>
      </div>

      {/* Region Filter */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
        <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-4 ml-1">Geographic Sector</h4>
        <select value={localFilters.region || ''} onChange={(e) => handleRegionChange(e.target.value)} className="w-full px-4 py-2.5 bg-black/40 border border-white/5 text-xs font-bold text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
          <option value="">Global Broadcast</option>
          {availableRegions.map((region) => <option key={region} value={region}>{region}</option>)}
        </select>
      </div>

      {/* Summary */}
      {hasActiveFilters && (
        <div className={`bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6 ${twoColumn ? 'col-span-2' : ''}`}>
          <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" /> Active Matrix Scope
          </h4>
          <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest space-y-2">
            {localFilters.membershipPlans?.length > 0 && <div>• Tiers: {localFilters.membershipPlans.join(', ')}</div>}
            {localFilters.userAge && <div>• {localFilters.userAge.type === 'new_users' ? 'New' : 'Veteran'} ({localFilters.userAge.days}d)</div>}
            {localFilters.region && <div>• Sector: {localFilters.region}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
