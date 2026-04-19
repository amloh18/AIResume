'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Target } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import SegmentedToggle from '@/components/ui/SegmentedToggle';

interface ApplicationStats {
  totalApplications: number;
  appliedApplications: number;
  pendingApplications: number;
  rejectedApplications: number;
  interviewApplications: number;
  offerApplications: number;
  // Spider chart data
  draft?: number;
  created?: number;
  applied?: number;
  accepted?: number;
  rejected?: number;
}

interface ApplicationStatsWidgetProps {
  userId: string;
}

const ApplicationStatsWidget: React.FC<ApplicationStatsWidgetProps> = ({ userId }) => {
  const [stats, setStats] = useState<ApplicationStats>({
    totalApplications: 0,
    appliedApplications: 0,
    pendingApplications: 0,
    rejectedApplications: 0,
    interviewApplications: 0,
    offerApplications: 0,
    draft: 0,
    created: 0,
    applied: 0,
    accepted: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

  useEffect(() => {
    fetchApplicationStats();
  }, [userId, timeRange]);

  const fetchApplicationStats = async () => {
    if (!userId) {
      console.warn('ApplicationStatsWidget: No userId provided');
      setStats(generateMockStats());
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Note: userId is passed but API uses authentication - keeping for backward compatibility
      const response = await fetch(`/api/analytics/applications?userId=${userId}&range=${timeRange}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          console.log('Application Stats API Response:', result.data);
          // Always use real data, even if all values are zero - this is the actual user data
          setStats(result.data);
        } else {
          console.warn('Application Stats API returned unsuccessful response:', result);
          // Only use mock data if API explicitly failed
          setStats(generateMockStats());
        }
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('Failed to fetch application stats:', response.status, errorText);
        // Only use mock data on actual API failure
        setStats(generateMockStats());
      }
    } catch (error) {
      // Safely handle error - check if it's an Event object
      if (error instanceof Error) {
        console.error('Error fetching application stats:', error.message);
      } else if (error && typeof error === 'object' && 'target' in error) {
        console.error('Error fetching application stats: Event object received');
      } else {
        console.error('Error fetching application stats:', String(error));
      }
      setStats(generateMockStats());
    } finally {
      setLoading(false);
    }
  };

  const generateMockStats = (): ApplicationStats => {
    const base = timeRange === '7d' ? 5 : timeRange === '30d' ? 20 : 60;
    return {
      totalApplications: base + Math.floor(Math.random() * 10),
      appliedApplications: Math.floor(base * 0.8) + Math.floor(Math.random() * 5),
      pendingApplications: Math.floor(base * 0.3) + Math.floor(Math.random() * 3),
      rejectedApplications: Math.floor(base * 0.2) + Math.floor(Math.random() * 2),
      interviewApplications: Math.floor(base * 0.15) + Math.floor(Math.random() * 2),
      offerApplications: Math.floor(base * 0.05) + Math.floor(Math.random() * 1),
      draft: Math.floor(base * 0.1) + Math.floor(Math.random() * 2),
      created: Math.floor(base * 0.3) + Math.floor(Math.random() * 3),
      applied: Math.floor(base * 0.4) + Math.floor(Math.random() * 4),
      accepted: Math.floor(base * 0.1) + Math.floor(Math.random() * 2),
      rejected: Math.floor(base * 0.2) + Math.floor(Math.random() * 2),
    };
  };

  // Prepare data for spider/radar chart - memoized to prevent duplicate renders
  const { radarData, maxValue } = useMemo(() => {
    const values = [
      stats.draft || 0,
      stats.created || 0,
      stats.applied || 0,
      stats.accepted || 0,
      stats.rejected || 0,
    ];
    const max = Math.max(...values, 0);

    const data = [
      {
        metric: 'Draft',
        value: stats.draft || 0,
        fullMark: max,
      },
      {
        metric: 'Created',
        value: stats.created || 0,
        fullMark: max,
      },
      {
        metric: 'Applied',
        value: stats.applied || 0,
        fullMark: max,
      },
      {
        metric: 'Accepted',
        value: stats.accepted || 0,
        fullMark: max,
      },
      {
        metric: 'Rejected',
        value: stats.rejected || 0,
        fullMark: max,
      },
    ];

    return { radarData: data, maxValue: max };
  }, [stats.draft, stats.created, stats.applied, stats.accepted, stats.rejected]);

  // Generate custom ticks based on max value to avoid duplicates
  const customTicks = useMemo(() => {
    if (maxValue === 0) {
      return [0];
    } else if (maxValue === 1) {
      return [0, 1];
    } else if (maxValue <= 5) {
      return Array.from({ length: maxValue + 1 }, (_, i) => i);
    } else if (maxValue <= 10) {
      return [0, Math.ceil(maxValue / 2), maxValue];
    } else {
      const step = Math.ceil(maxValue / 5);
      return Array.from({ length: 6 }, (_, i) => i * step).filter(v => v <= maxValue);
    }
  }, [maxValue]);


  return (
    <div
      className="bg-white dark:bg-[#111317] rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-white/5 h-full flex flex-col w-full"
      data-analytics-widget="application-stats"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-400/20 to-purple-500/20 rounded-xl flex items-center justify-center">
            <Target className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Application Stats</h2>
            <p className="text-[11px] text-gray-600 dark:text-white/60">Success metrics</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <SegmentedToggle
              value={timeRange}
              onChange={(value) => setTimeRange(value as '7d' | '30d' | '90d')}
              options={[
                { value: '7d', label: '7D' },
                { value: '30d', label: '30D' },
                { value: '90d', label: '90D' },
              ]}
              theme="purple"
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* Spider/Radar Chart */}
      <div className="bg-white/5 dark:bg-gray-800/30 rounded-lg flex flex-col p-2 flex-1 justify-center">
        <div className="flex items-center justify-center w-full h-[220px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#6b7280" strokeOpacity={0.4} />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }}
                  className="dark:[&_text]:fill-gray-400"
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={maxValue === 0 ? [0, 1] : [0, maxValue]}
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  tickFormatter={(value) => Math.round(value).toString()}
                  ticks={maxValue === 0 ? ([0] as any) : (customTicks as any)}
                  className="dark:[&_text]:fill-gray-500"
                />
                <Radar
                  name="Applications"
                  dataKey="value"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.6}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplicationStatsWidget;
