'use client';

import React, { useState, useEffect, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Globe, RefreshCw, ShieldAlert, TrendingUp, HeartPulse, AlertTriangle, Server, Settings } from 'lucide-react';
import OverviewKPIs from './OverviewKPIs';
import LiveJobsBrowser from './LiveJobsBrowser';
import AutomationOverview from '@/components/admin/automation/AutomationOverview';
import DemandQueueMonitor from './DemandQueueMonitor';
import SourceHealthPanel from './SourceHealthPanel';
import VpsSetupPanel from './VpsSetupPanel';
import WorkerSettingsPanel from './WorkerSettingsPanel';

// ── Error Boundary ──────────────────────────────────────────────────────────

interface ErrorBoundaryProps { children: ReactNode; fallbackTitle?: string; }
interface ErrorBoundaryState { hasError: boolean; error: Error | null; }

class DashboardErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[DashboardErrorBoundary]', error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-red-400 mb-1">{this.props.fallbackTitle || 'Component Error'}</h3>
          <p className="text-xs text-white/40 mb-4">{this.state.error?.message || 'An unexpected error occurred.'}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Dashboard ───────────────────────────────────────────────────────────────

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

  const subTabs = [
    { id: 'overview', label: 'Overview', icon: Globe },
    { id: 'demand', label: 'Demand', icon: TrendingUp },
    { id: 'health', label: 'Source Health', icon: HeartPulse },
    { id: 'queue', label: 'Queue & Triage', icon: ShieldAlert },
    { id: 'deploy', label: 'VPS Deploy', icon: Server },
    { id: 'settings', label: 'Settings', icon: Settings },
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
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
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
      <DashboardErrorBoundary fallbackTitle="Overview Error">
        {currentTab === 'overview' && (
          <div className="space-y-8">
            <OverviewKPIs kpis={data?.kpis || {}} />
            <LiveJobsBrowser />
          </div>
        )}
      </DashboardErrorBoundary>

      <DashboardErrorBoundary fallbackTitle="Demand Queue Error">
        {currentTab === 'demand' && <DemandQueueMonitor />}
      </DashboardErrorBoundary>

      <DashboardErrorBoundary fallbackTitle="Source Health Error">
        {currentTab === 'health' && <SourceHealthPanel />}
      </DashboardErrorBoundary>

      <DashboardErrorBoundary fallbackTitle="Automation Error">
        {currentTab === 'queue' && <AutomationOverview />}
      </DashboardErrorBoundary>

      <DashboardErrorBoundary fallbackTitle="VPS Setup Error">
        {currentTab === 'deploy' && <VpsSetupPanel />}
      </DashboardErrorBoundary>

      <DashboardErrorBoundary fallbackTitle="Worker Settings Error">
        {currentTab === 'settings' && <WorkerSettingsPanel />}
      </DashboardErrorBoundary>
    </div>
  );
}
