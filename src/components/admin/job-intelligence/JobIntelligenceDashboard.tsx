'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Globe, Activity, RefreshCw, ShieldAlert } from 'lucide-react';
import OverviewKPIs from './OverviewKPIs';
import SourcesGrid from './SourcesGrid';
import RunsExplorer from './RunsExplorer';
import LiveJobsBrowser from './LiveJobsBrowser';
import AutomationOverview from '@/components/admin/automation/AutomationOverview';

interface JobIntelligenceDashboardProps {
  activeSubTab?: string;
  onSubTabChange?: (sub: string) => void;
}

export default function JobIntelligenceDashboard({
  activeSubTab = 'overview',
  onSubTabChange,
}: JobIntelligenceDashboardProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/job-intelligence?view=overview');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Job Intelligence Overview fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  // Expose refresh function for child components
  const handleSourceSaved = useCallback(() => {
    fetchOverview();
  }, []);

  const subTabs = [
    { id: 'overview', label: 'Overview', icon: Globe },
    { id: 'queue', label: 'Queue & Triage', icon: ShieldAlert },
    { id: 'sources', label: 'Sources', icon: Activity },
  ];

  const currentTab = activeSubTab || 'overview';

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b border-white/5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Globe className="w-3.5 h-3.5" />
            Continuous Job Intelligence Engine
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
            Job Ingestion & Sourcing Platform
          </h1>
          <p className="text-sm text-white/50 mt-1">
            Real-time multi-source ATS streaming, SHA-256 deduplication, and intelligent catalog management.
          </p>
        </div>

        <button
          onClick={fetchOverview}
          disabled={loading}
          className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center gap-2 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh Pipeline'}
        </button>
      </div>

      {/* Sub Tab Navigation Pill Bar */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/[0.03] border border-white/5 overflow-x-auto">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSubTabChange && onSubTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Render View */}
      {currentTab === 'overview' && (
        <div className="space-y-8">
          <OverviewKPIs kpis={data?.kpis || {}} />
          <LiveJobsBrowser />
        </div>
      )}

      {currentTab === 'queue' && <AutomationOverview />}

      {currentTab === 'sources' && (
        <div className="space-y-8">
          <SourcesGrid sources={data?.sources || []} onSourceSaved={handleSourceSaved} />
          <RunsExplorer />
        </div>
      )}
    </div>
  );
}
