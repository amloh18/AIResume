'use client';

import React from 'react';
import type { JobsMetrics } from '@/types/automation-schema';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';

interface ChartsRowProps {
  metrics: JobsMetrics;
  loading: boolean;
}

const COLORS = ['#84cc16', '#22c55e', '#3b82f6', '#a855f7', '#f59e0b'];

export default function ChartsRow({ metrics, loading }: ChartsRowProps) {
  if (loading) {
    return null;
  }

  const matchDistribution = metrics.matchDistribution || {};
  
  const matchDistributionData = [
    { name: '0-20', count: matchDistribution.low || 0, fill: '#ef4444' },
    { name: '20-40', count: matchDistribution.fair || 0, fill: '#f59e0b' },
    { name: '40-60', count: matchDistribution.moderate || 0, fill: '#eab308' },
    { name: '60-80', count: matchDistribution.good || 0, fill: '#84cc16' },
    { name: '80-100', count: matchDistribution.excellent || 0, fill: '#22c55e' },
  ];

  const sourceDistribution = metrics.sourceDistribution || {};
  const sourceData = Object.entries(sourceDistribution).map(
    ([name, value]) => ({
      name: name.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      value,
    })
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Match Score Distribution */}
      <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Match Score Distribution
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={matchDistributionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
            <XAxis
              dataKey="name"
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
            />
            <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
              {matchDistributionData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Source Breakdown */}
      <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Source Breakdown
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={sourceData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) =>
                `${name}: ${((percent || 0) * 100).toFixed(0)}%`
              }
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {sourceData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Top Companies */}
      <div className="glass-widget-premium rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Top Companies
        </h3>
        <div className="space-y-3">
          {metrics.topCompanies.slice(0, 8).map((company, index) => (
            <div key={company.company} className="flex items-center gap-3">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 w-6">
                #{index + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {company.company}
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {company.count} jobs
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-lime-400 to-lime-500 rounded-full"
                    style={{
                      width: `${(company.count / metrics.totalJobsMatched) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Applications Trend */}
      <div className="glass-widget-premium rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Applications Trend (30 Days)
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={metrics.trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              style={{ fontSize: '10px' }}
              tickFormatter={(date) => {
                const d = new Date(date);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
            />
            <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Area
              type="monotone"
              dataKey="applications"
              stroke="#84cc16"
              fill="url(#colorApplications)"
              strokeWidth={2}
            />
            <defs>
              <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#84cc16" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#84cc16" stopOpacity={0.1} />
              </linearGradient>
            </defs>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
