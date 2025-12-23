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
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);
  const isSyncingFromProps = React.useRef(false);

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
          // Always include 'free' plan if not already present
          if (!plans.includes('free')) {
            plans.unshift('free');
          }
          setAvailablePlans(plans);
        }
      }
    } catch (error) {
      console.error('Error fetching plans for campaign filters:', error);
      // Fallback to just free plan
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
          // Fallback to common regions
          setAvailableRegions(['US', 'GB', 'IN', 'CA', 'AU', 'EU']);
        }
      } else {
        // Fallback to common regions
        setAvailableRegions(['US', 'GB', 'IN', 'CA', 'AU', 'EU']);
      }
    } catch (error) {
      console.error('Error fetching regions:', error);
      // Fallback to common regions
      setAvailableRegions(['US', 'GB', 'IN', 'CA', 'AU', 'EU']);
    }
  };

  // Sync localFilters when filters prop changes (e.g., when preset is applied)
  useEffect(() => {
    isSyncingFromProps.current = true;
    setLocalFilters({
      ...(filters || {}),
      usageMetrics: filters?.usageMetrics || {},
    });
    setTimeout(() => {
      isSyncingFromProps.current = false;
    }, 0);
  }, [filters]);

  useEffect(() => {
    // Don't call onChange if we're syncing from props (to avoid infinite loop)
    if (!isSyncingFromProps.current) {
      onChange(localFilters);
    }
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

      {/* Registration Date Range - Predefined */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Registration Date</h4>
        <select
          value={localFilters.registrationDateRange?.preset || ''}
          onChange={(e) => {
            const preset = e.target.value;
            if (!preset) {
              const { registrationDateRange, ...rest } = localFilters;
              setLocalFilters(rest);
              return;
            }

            const now = new Date();
            let startDate: Date;

            switch (preset) {
              case 'last7days':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
              case 'last30days':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
              case 'thisMonth':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
              case 'lastMonth':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
                setLocalFilters({
                  ...localFilters,
                  registrationDateRange: {
                    preset,
                    startDate: startDate.toISOString(),
                    endDate: endOfLastMonth.toISOString(),
                  },
                });
                return;
              case 'lastQuarter':
                const currentQuarter = Math.floor(now.getMonth() / 3);
                const lastQuarterStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
                const lastQuarterEnd = new Date(now.getFullYear(), currentQuarter * 3, 0);
                setLocalFilters({
                  ...localFilters,
                  registrationDateRange: {
                    preset,
                    startDate: lastQuarterStart.toISOString(),
                    endDate: lastQuarterEnd.toISOString(),
                  },
                });
                return;
              case 'thisYear':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
              default:
                startDate = now;
            }

            setLocalFilters({
              ...localFilters,
              registrationDateRange: {
                preset,
                startDate: startDate.toISOString(),
                endDate: now.toISOString(),
              },
            });
          }}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400/50"
        >
          <option value="">All Time</option>
          <option value="last7days">Last 7 Days</option>
          <option value="last30days">Last 30 Days</option>
          <option value="thisMonth">This Month</option>
          <option value="lastMonth">Last Month</option>
          <option value="lastQuarter">Last Quarter</option>
          <option value="thisYear">This Year</option>
        </select>
      </div>

      {/* Last Active Range - Predefined */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Last Active</h4>
        <select
          value={localFilters.lastActiveRange?.preset || ''}
          onChange={(e) => {
            const preset = e.target.value;
            if (!preset) {
              const { lastActiveRange, ...rest } = localFilters;
              setLocalFilters(rest);
              return;
            }

            const now = new Date();
            let startDate: Date;

            switch (preset) {
              case 'last7days':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
              case 'last30days':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
              case 'last60days':
                startDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
                break;
              case 'last90days':
                startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
              case 'inactive30':
                // Users NOT active in last 30 days
                const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                setLocalFilters({
                  ...localFilters,
                  lastActiveRange: {
                    preset,
                    endDate: thirtyDaysAgo.toISOString(),
                  },
                });
                return;
              case 'inactive60':
                const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
                setLocalFilters({
                  ...localFilters,
                  lastActiveRange: {
                    preset,
                    endDate: sixtyDaysAgo.toISOString(),
                  },
                });
                return;
              default:
                startDate = now;
            }

            setLocalFilters({
              ...localFilters,
              lastActiveRange: {
                preset,
                startDate: startDate.toISOString(),
                endDate: now.toISOString(),
              },
            });
          }}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400/50"
        >
          <option value="">Any Time</option>
          <option value="last7days">Active in Last 7 Days</option>
          <option value="last30days">Active in Last 30 Days</option>
          <option value="last60days">Active in Last 60 Days</option>
          <option value="last90days">Active in Last 90 Days</option>
          <option value="inactive30">Inactive for 30+ Days</option>
          <option value="inactive60">Inactive for 60+ Days</option>
        </select>
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



      {/* Region Filter */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Region / Country</h4>
        <select
          value={localFilters.region || ''}
          onChange={(e) => handleRegionChange(e.target.value)}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400/50"
        >
          <option value="">All Regions</option>
          {availableRegions.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>
      </div>

      {/* Summary */}
      {
        hasActiveFilters && (
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
              {localFilters.region && (
                <div>• Region: {localFilters.region}</div>
              )}
            </div>
          </div>
        )
      }
    </div >
  );
}

