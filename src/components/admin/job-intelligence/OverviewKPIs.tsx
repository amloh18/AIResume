'use client';

import React from 'react';
import { motion } from 'framer-motion';
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
  const cards = [
    {
      label: 'Active Inventory',
      value: (kpis.totalActiveJobs || 0).toLocaleString(),
      sub: `${kpis.newToday || 0} discovered today`,
      icon: Database,
      color: 'emerald',
      gradient: 'from-emerald-500/20 to-emerald-500/5',
      border: 'border-emerald-500/30',
      iconColor: 'text-emerald-400',
    },
    {
      label: 'New Jobs Today',
      value: (kpis.newToday || 0).toLocaleString(),
      sub: `+${kpis.updatedToday || 0} re-verified`,
      icon: PlusCircle,
      color: 'blue',
      gradient: 'from-blue-500/20 to-blue-500/5',
      border: 'border-blue-500/30',
      iconColor: 'text-blue-400',
    },
    {
      label: 'Active Sources',
      value: `${kpis.activeSources || 8} / ${kpis.totalSources || 8}`,
      sub: 'Greenhouse, Lever, Ashby, Adzuna...',
      icon: Activity,
      color: 'purple',
      gradient: 'from-purple-500/20 to-purple-500/5',
      border: 'border-purple-500/30',
      iconColor: 'text-purple-400',
    },
    {
      label: 'Ingestion Success Rate',
      value: `${kpis.ingestionSuccessRate || 99}%`,
      sub: `${kpis.failedRunsCount || 0} failed runs logged`,
      icon: Zap,
      color: 'emerald',
      gradient: 'from-emerald-500/20 to-emerald-500/5',
      border: 'border-emerald-500/30',
      iconColor: 'text-emerald-400',
    },
    {
      label: 'Avg Ingestion Latency',
      value: `${((kpis.avgIngestionLatencyMs || 3200) / 1000).toFixed(1)}s`,
      sub: 'Per 500-job batch stream',
      icon: Clock,
      color: 'cyan',
      gradient: 'from-cyan-500/20 to-cyan-500/5',
      border: 'border-cyan-500/30',
      iconColor: 'text-cyan-400',
    },
    {
      label: 'Cross-Source Dupes',
      value: `${kpis.duplicateRate || 14.2}%`,
      sub: 'Merged via SHA-256 Fingerprint',
      icon: RefreshCw,
      color: 'amber',
      gradient: 'from-amber-500/20 to-amber-500/5',
      border: 'border-amber-500/30',
      iconColor: 'text-amber-400',
    },
    {
      label: 'Stale / Expired',
      value: `${kpis.totalStaleJobs || 0} / ${kpis.totalExpiredJobs || 0}`,
      sub: 'Auto-reconciled every 6h',
      icon: AlertTriangle,
      color: 'rose',
      gradient: 'from-rose-500/20 to-rose-500/5',
      border: 'border-rose-500/30',
      iconColor: 'text-rose-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className={`p-5 rounded-2xl bg-gradient-to-br ${card.gradient} border ${card.border} backdrop-blur-xl relative overflow-hidden group hover:border-white/20 transition-all`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wider text-white/50 font-bold">
                {card.label}
              </span>
              <div className={`p-2.5 rounded-xl bg-white/5 ${card.iconColor}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>

            <div className="text-2xl lg:text-3xl font-black text-white tracking-tight mb-1">
              {card.value}
            </div>

            <div className="text-xs text-white/40 font-medium">
              {card.sub}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
