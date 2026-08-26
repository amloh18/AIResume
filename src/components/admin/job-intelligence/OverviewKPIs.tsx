'use client';

import React from 'react';
import { Database, PlusCircle, RefreshCw, AlertTriangle, Activity, Zap, Clock, ShieldAlert } from 'lucide-react';

interface OverviewKPIsProps {
  kpis: {
    totalActiveJobs: number;
    totalStaleJobs: number;
    totalExpiredJobs: number;
    newToday: number;
    updatedToday: number;
    activeSources: number;
    totalSources: number;
    ingestionSuccessRate: number;
    avgIngestionLatencyMs: number;
    duplicateRate: number;
    failedRunsCount: number;
  };
}

export default function OverviewKPIs({ kpis }: OverviewKPIsProps) {
  const metrics = [
    {
      label: 'Active Jobs',
      value: (kpis.totalActiveJobs || 0).toLocaleString(),
      icon: <Database size={16} strokeWidth={1.75} />,
      trend: `${kpis.newToday || 0} new today`,
      trendUp: (kpis.newToday || 0) > 0,
    },
    {
      label: 'New Today',
      value: (kpis.newToday || 0).toLocaleString(),
      icon: <PlusCircle size={16} strokeWidth={1.75} />,
      trend: `+${kpis.updatedToday || 0} re-verified`,
      trendUp: (kpis.newToday || 0) > 0,
    },
    {
      label: 'Active Sources',
      value: `${kpis.activeSources || 0}/${kpis.totalSources || 0}`,
      icon: <Activity size={16} strokeWidth={1.75} />,
      trend: 'Greenhouse, Lever, Ashby...',
      trendUp: true,
    },
    {
      label: 'Success Rate',
      value: `${kpis.ingestionSuccessRate || 99}%`,
      icon: <Zap size={16} strokeWidth={1.75} />,
      trend: `${kpis.failedRunsCount || 0} failed runs`,
      trendUp: (kpis.ingestionSuccessRate || 99) >= 95,
    },
    {
      label: 'Avg Latency',
      value: `${((kpis.avgIngestionLatencyMs || 3200) / 1000).toFixed(1)}s`,
      icon: <Clock size={16} strokeWidth={1.75} />,
      trend: 'Per 500-job batch',
      trendUp: true,
    },
    {
      label: 'Cross-Source Dupes',
      value: `${kpis.duplicateRate || 0}%`,
      icon: <RefreshCw size={16} strokeWidth={1.75} />,
      trend: 'SHA-256 merged',
      trendUp: false,
    },
  ];

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl shadow-sm grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-y md:divide-y-0 divide-white/5">
      {metrics.map((m) => (
        <div key={m.label} className="px-5 py-4 flex items-center gap-3.5 min-w-0">
          <div className="w-9 h-9 rounded-full bg-white/5 text-emerald-400 flex items-center justify-center shrink-0">
            {m.icon}
          </div>
          <div className="min-w-0">
            <div className="text-xl font-semibold tracking-tight text-white leading-none tabular-nums">
              {m.value}
            </div>
            <div className="mt-1 text-xs text-white/50">{m.label}</div>
            <div className={`mt-0.5 text-[11px] font-medium ${m.trendUp ? 'text-emerald-400' : 'text-white/30'}`}>
              {m.trend}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
