'use client';

import React from 'react';
import type { JobsMetrics } from '@/types/automation-schema';
import {
  Briefcase,
  TrendingUp,
  CheckCircle,
  Clock,
  Calendar,
  Building2,
  MapPin,
  DollarSign,
} from 'lucide-react';

interface MetricsGridProps {
  metrics: JobsMetrics | null;
  loading: boolean;
}

export default function MetricsGrid({ metrics, loading }: MetricsGridProps) {
  if (loading || !metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-6 animate-pulse"
          >
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-24 mb-4"></div>
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  const metricCards = [
    {
      label: 'Total Jobs Matched',
      value: metrics.totalJobsMatched || 0,
      icon: Briefcase,
      color: 'text-lime-500',
      bgColor: 'bg-lime-500/20',
    },
    {
      label: 'Average Match Score',
      value: `${metrics.averageMatchScore || 0}%`,
      icon: TrendingUp,
      color:
        (metrics.averageMatchScore || 0) >= 70
          ? 'text-green-400'
          : 'text-yellow-400',
      bgColor:
        (metrics.averageMatchScore || 0) >= 70
          ? 'bg-green-400/20'
          : 'bg-yellow-400/20',
    },
    {
      label: 'Application Success Rate',
      value: `${metrics.applicationSuccessRate || 0}%`,
      icon: CheckCircle,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/20',
    },
    {
      label: 'Pending Applications',
      value: metrics.pendingApplications || 0,
      icon: Clock,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/20',
    },
    {
      label: 'Applied This Week',
      value: metrics.appliedThisWeek || 0,
      icon: Calendar,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/20',
      trend:
        metrics.appliedLastWeek !== undefined
          ? metrics.appliedThisWeek > metrics.appliedLastWeek
            ? 'up'
            : metrics.appliedThisWeek < metrics.appliedLastWeek
            ? 'down'
            : 'stable'
          : undefined,
    },
    {
      label: 'Companies Hiring',
      value: metrics.companiesCount || 0,
      icon: Building2,
      color: 'text-orange-400',
      bgColor: 'bg-orange-400/20',
    },
    {
      label: 'Job Locations',
      value: metrics.locationsCount || 0,
      icon: MapPin,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-400/20',
    },
    {
      label: 'Average Salary',
      value: `£${Math.round(metrics.salaryStats?.average || metrics.salaryStats?.median || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'text-amber-400',
      bgColor: 'bg-amber-400/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metricCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-6 hover:shadow-lg hover:scale-105 transition-all duration-200"
            style={{
              animation: `fadeIn 0.5s ease-in-out ${index * 0.1}s both`,
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              {card.trend && (
                <div
                  className={`text-xs font-medium ${
                    card.trend === 'up'
                      ? 'text-green-500'
                      : card.trend === 'down'
                      ? 'text-red-500'
                      : 'text-gray-500'
                  }`}
                >
                  {card.trend === 'up' ? '↑' : card.trend === 'down' ? '↓' : '→'}
                </div>
              )}
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {card.value}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {card.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
