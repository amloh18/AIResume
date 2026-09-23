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
import { CHIP_INLINE, CHIP_TONES_DARK } from '@/components/ui/chip-styles';

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
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Job Ingestion & Sourcing Platform
            <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live Stream
            </span>
          </h1>
          <p className="text-xs text-white/40 mt-0.5">
            Real-time multi-source ATS streaming, SHA-256 deduplication, and intelligent catalog management
          </p>
        </div>

        <button
          onClick={fetchOverview}
          disabled={loading}
          className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center gap-1.5 text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh Pipeline'}
        </button>
      </div>

      {/* Sub Tab Navigation Pill Bar */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-[#111216] border border-white/5 overflow-x-auto">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSubTabChange && onSubTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Render View */}
      <DashboardErrorBoundary fallbackTitle="Overview Error">
        {currentTab === 'overview' && (
          <div className="space-y-5">
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
