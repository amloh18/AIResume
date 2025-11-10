'use client';

import React, { useState, useEffect } from 'react';
import { Filter, X, Plus } from 'lucide-react';

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

  useEffect(() => {
    fetchAvailablePlans();
  }, []);

  const fetchAvailablePlans = async () => {
    try {
      const response = await fetch('/api/admin/config/plans?forCampaigns=true');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAvailablePlans(data.plans || []);
        }
      }
    } catch (error) {
      console.error('Error fetching plans for campaign filters:', error);
      // Fallback to empty array
      setAvailablePlans([]);
    }
  };

  useEffect(() => {
    onChange(localFilters);
  }, [localFilters]);

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

  const handleDateRangeChange = (field: string, type: 'startDate' | 'endDate', value: string) => {
    setLocalFilters({
      ...localFilters,
      [field]: {
        ...(localFilters[field] || {}),
        [type]: value ? new Date(value).toISOString() : undefined,
      },
    });
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

  const clearAllFilters = () => {
    setLocalFilters({});
  };

  const hasActiveFilters = Object.keys(localFilters).length > 0;

  return (
    <div className={twoColumn ? "grid grid-cols-2 gap-4" : "space-y-6"}>
      {!twoColumn && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between col-span-2">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-lime-400" />
              <h3 className="text-lg font-semibold text-white">Target Audience Filters</h3>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
        </>
      )}

      {/* Membership Plans */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Membership Plans</h4>
        <div className="grid grid-cols-2 gap-3">
          {availablePlans.length > 0 ? (
            availablePlans.map((plan) => {
            const isChecked = localFilters.membershipPlans?.includes(plan) ?? false;
            return (
              <label
                key={plan}
                className="flex items-center gap-2 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => handlePlanChange(plan, e.target.checked)}
                  className="w-4 h-4 text-lime-500 bg-white/10 border-white/20 rounded focus:ring-lime-400"
                />
                <span className="text-white capitalize">{plan}</span>
              </label>
            );
            })
          ) : (
            <div className="col-span-2 text-sm text-gray-400">Loading plans...</div>
          )}
        </div>
      </div>

      {/* User Age */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3">User Age</h4>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <select
              value={localFilters.userAge?.type || ''}
              onChange={(e) => handleUserAgeChange(e.target.value as any, localFilters.userAge?.days)}
              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400/50"
            >
              <option value="">Select user type...</option>
              <option value="new_users">New Users</option>
              <option value="existing_users">Existing Users</option>
            </select>
            
            {localFilters.userAge && (
              <>
                <select
                  value={localFilters.userAge.days || 7}
                  onChange={(e) => handleUserAgeChange(localFilters.userAge.type, parseInt(e.target.value))}
                  className="px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={15}>Last 15 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={60}>Last 60 days</option>
                  <option value={90}>Last 90 days</option>
                </select>
                <button
                  onClick={clearUserAge}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-red-400" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Registration Date Range */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Registration Date Range</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">From</label>
            <input
              type="date"
              value={localFilters.registrationDateRange?.startDate ? localFilters.registrationDateRange.startDate.split('T')[0] : ''}
              onChange={(e) => handleDateRangeChange('registrationDateRange', 'startDate', e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400/50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">To</label>
            <input
              type="date"
              value={localFilters.registrationDateRange?.endDate ? localFilters.registrationDateRange.endDate.split('T')[0] : ''}
              onChange={(e) => handleDateRangeChange('registrationDateRange', 'endDate', e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400/50"
            />
          </div>
        </div>
      </div>

      {/* Last Active Range */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Last Active Range</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">From</label>
            <input
              type="date"
              value={localFilters.lastActiveRange?.startDate ? localFilters.lastActiveRange.startDate.split('T')[0] : ''}
              onChange={(e) => handleDateRangeChange('lastActiveRange', 'startDate', e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400/50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">To</label>
            <input
              type="date"
              value={localFilters.lastActiveRange?.endDate ? localFilters.lastActiveRange.endDate.split('T')[0] : ''}
              onChange={(e) => handleDateRangeChange('lastActiveRange', 'endDate', e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400/50"
            />
          </div>
        </div>
      </div>

      {/* Usage Metrics */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Usage Metrics</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Min CVs Created</label>
            <input
              type="number"
              min="0"
              value={localFilters.usageMetrics?.minCVsCreated ?? ''}
              onChange={(e) => handleUsageMetricChange('minCVsCreated', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400/50"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Max CVs Created</label>
            <input
              type="number"
              min="0"
              value={localFilters.usageMetrics?.maxCVsCreated ?? ''}
              onChange={(e) => handleUsageMetricChange('maxCVsCreated', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400/50"
              placeholder="999"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Min Journeys Completed</label>
            <input
              type="number"
              min="0"
              value={localFilters.usageMetrics?.minJourneysCompleted ?? ''}
              onChange={(e) => handleUsageMetricChange('minJourneysCompleted', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400/50"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Max Journeys Completed</label>
            <input
              type="number"
              min="0"
              value={localFilters.usageMetrics?.maxJourneysCompleted ?? ''}
              onChange={(e) => handleUsageMetricChange('maxJourneysCompleted', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400/50"
              placeholder="999"
            />
          </div>
        </div>
      </div>

      {/* Boolean Filters */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Additional Filters</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Email Verified</label>
            <select
              value={
                localFilters.emailVerified === true
                  ? 'true'
                  : localFilters.emailVerified === false
                  ? 'false'
                  : ''
              }
              onChange={(e) =>
                handleBooleanFilter(
                  'emailVerified',
                  e.target.value === '' ? null : e.target.value === 'true'
                )
              }
              className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400/50"
            >
              <option value="">Any</option>
              <option value="true">Verified</option>
              <option value="false">Not Verified</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Include Deleted Users</label>
            <select
              value={
                localFilters.isDeleted === true
                  ? 'true'
                  : localFilters.isDeleted === false
                  ? 'false'
                  : ''
              }
              onChange={(e) =>
                handleBooleanFilter(
                  'isDeleted',
                  e.target.value === '' ? null : e.target.value === 'true'
                )
              }
              className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400/50"
            >
              <option value="">Active Users Only</option>
              <option value="true">Deleted Users Only</option>
              <option value="false">Active Users</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary */}
      {hasActiveFilters && (
        <div className={`bg-lime-500/10 border border-lime-500/20 rounded-lg p-4 ${twoColumn ? 'col-span-2' : ''}`}>
          <h4 className="text-sm font-medium text-lime-400 mb-2">Active Filters</h4>
          <div className="text-xs text-gray-300 space-y-1">
            {localFilters.membershipPlans?.length > 0 && (
              <div>• Plans: {localFilters.membershipPlans.join(', ')}</div>
            )}
            {localFilters.userAge && (
              <div>
                • {localFilters.userAge.type === 'new_users' ? 'New' : 'Existing'} users (last{' '}
                {localFilters.userAge.days} days)
              </div>
            )}
            {localFilters.emailVerified !== undefined && (
              <div>• Email {localFilters.emailVerified ? 'verified' : 'not verified'}</div>
            )}
            {localFilters.isDeleted !== undefined && (
              <div>• {localFilters.isDeleted ? 'Deleted' : 'Active'} users</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

