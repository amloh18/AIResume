'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, CheckCircle2, XCircle, AlertTriangle,
  RefreshCw, Clock, Zap, TrendingUp, ExternalLink, Pause, Play,
  Lock, Timer, Sliders,
} from 'lucide-react';
import { CardSkeleton } from './ui-primitives';
import RunsExplorer from './RunsExplorer';
import PortalSettingsSidebar, { PortalSourceData } from './PortalSettingsSidebar';
import { CHIP_INLINE, CHIP_TONES_DARK } from '@/components/ui/chip-styles';

interface SourceHealth {
  source: string;
  enabled: boolean;
  healthy: boolean;
  healthStatus: 'healthy' | 'degraded' | 'stale' | 'failed' | 'config_error' | 'not_initialized' | 'running' | 'paused' | 'disabled';
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  consecutiveFailures: number;
  avgYield: number;
  avgDuration: number;
  nextEligibleRun: string | null;
  isDue?: boolean;
  configStatus: { ready: boolean; reason?: string };
  registryDef: {
    name: string;
    type: string;
    refreshIntervalMs: number;
    maxResults: number;
    description: string;
  } | null;
}

interface SourceHealthData {
  sources: SourceHealth[];
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    configured: number;
    unconfigured: number;
    due?: number;
    statusCounts?: Record<string, number>;
  };
  locks?: { active: number };
  health?: {
    locks: { active: number; stale: number };
    demand: { total: number; stale: number; fetching: number };
    sources: { total: number; healthy: number; unhealthy: number };
  };
  linkedinSession?: {
    status: string;
    enabled: boolean;
    profileExists: boolean;
    profileHasData: boolean;
  };
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function timeUntil(dateStr: string | null): string {
  if (!dateStr) return 'Due now';
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return 'Due now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `in ${hrs}h ${mins % 60}m`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatInterval(ms: number): string {
  const hrs = ms / (1000 * 60 * 60);
  if (hrs < 1) return `${Math.round(ms / 60000)}min`;
  return `${hrs}h`;
}

export default function SourceHealthPanel() {
  const [data, setData] = useState<SourceHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggeringSource, setTriggeringSource] = useState<string | null>(null);
  const [selectedSourceForConfig, setSelectedSourceForConfig] = useState<PortalSourceData | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [runningAll, setRunningAll] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ingestion-monitor?view=health');
      if (res.ok) {
        setData(await res.json());
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error('Source health fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!autoRefresh) return;
    const iv = setInterval(fetchData, 30000);
    return () => clearInterval(iv);
  }, [autoRefresh, fetchData]);

  const triggerSource = async (sourceName: string) => {
    setTriggeringSource(sourceName);
    try {
      await fetch('/api/admin/ingestion-monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger_source', sourceName }),
      });
      setTimeout(fetchData, 2000);
    } catch (err) {
      console.error('Trigger source error:', err);
    } finally {
      setTriggeringSource(null);
    }
  };

  const triggerAllSources = async () => {
    setRunningAll(true);
    try {
      // POST with no source triggers all sources via /api/admin/ingest
      await fetch('/api/admin/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      // Poll for results — runs take time, check every 5s for 2 min
      for (let i = 0; i < 24; i++) {
        await new Promise(r => setTimeout(r, 5000));
        fetchData();
      }
    } catch (err) {
      console.error('Run all error:', err);
    } finally {
      setRunningAll(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="text-center space-y-1.5">
              <div className="h-8 bg-white/5 rounded-lg animate-pulse mx-auto w-16" />
              <div className="h-3 bg-white/5 rounded w-16 mx-auto animate-pulse" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  const sources = data?.sources || [];
  const summary = data?.summary;

  return (
    <div className="space-y-6">
      {/* Auto-refresh indicator bar */}
      <div className="flex items-center justify-between text-xs text-white/40">
        <div className="flex items-center gap-2">
          {lastRefreshed && (
            <span>Last refreshed: {lastRefreshed.toLocaleTimeString()}</span>
          )}
          {loading && <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />}
        </div>
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors ${
            autoRefresh
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'
          }`}
        >
          {autoRefresh ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          Auto-refresh {autoRefresh ? 'on' : 'off'}
        </button>
      </div>

      {/* System Health Overview (Locks & Queue Status) */}
      {data?.health && (
        <div className="bg-[#111216] border border-white/5 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold text-white">System Ingestion & Lock Health</h3>
            </div>
            {data.locks && (
              <span className="text-[10px] text-white/40 font-mono">
                Active Locks: {data.locks.active}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2 text-center">
              <div className={`text-lg font-bold ${data.health.locks.stale > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {data.health.locks.active}
              </div>
              <div className="text-[10px] text-white/40 mt-0.5">Active Locks</div>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2 text-center">
              <div className="text-lg font-bold text-white">{data.health.demand.total}</div>
              <div className="text-[10px] text-white/40 mt-0.5">Demand Segments</div>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2 text-center">
              <div className="text-lg font-bold text-blue-400">{data.health.sources.healthy}</div>
              <div className="text-[10px] text-white/40 mt-0.5">Healthy Sources</div>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2 text-center">
              <div className={`text-lg font-bold ${data.health.demand.fetching > 0 ? 'text-blue-400' : 'text-white/60'}`}>
                {data.health.demand.fetching}
              </div>
              <div className="text-[10px] text-white/40 mt-0.5">Fetching Now</div>
            </div>
          </div>
        </div>
      )}

      {/* Stale Locks Warning */}
      {data?.health && data.health.locks.stale > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 flex items-start gap-3">
          <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-amber-400">Stale Locks Detected</h4>
            <p className="text-xs text-white/50 mt-0.5">
              {data.health.locks.stale} lock{data.health.locks.stale > 1 ? 's' : ''} have expired but not been cleaned up.
              The next scheduler cycle will automatically clear them.
            </p>
          </div>
        </div>
      )}

      {/* Summary Bar */}
      {summary && (
        <div className="bg-[#111216] border border-white/5 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-6 gap-3 shadow-xl">
          <div className="text-center">
            <div className="text-xl font-bold text-white tracking-tight">{summary.total}</div>
            <div className="text-xs text-white/40 mt-0.5">Total Sources</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-emerald-400 tracking-tight">{summary.healthy}</div>
            <div className="text-xs text-white/40 mt-0.5">Healthy</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-amber-400 tracking-tight">
              {summary.statusCounts?.degraded || 0}
            </div>
            <div className="text-xs text-white/40 mt-0.5">Degraded</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-red-400 tracking-tight">{summary.unhealthy - (summary.statusCounts?.degraded || 0)}</div>
            <div className="text-xs text-white/40 mt-0.5">Unhealthy</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-400 tracking-tight">{summary.configured}</div>
            <div className="text-xs text-white/40 mt-0.5">Configured</div>
          </div>
          <div className="text-center">
            <div className={`text-xl font-bold tracking-tight ${summary.due && summary.due > 0 ? 'text-amber-400' : 'text-white/60'}`}>
              {summary.due ?? sources.filter((s) => s.enabled && (s.isDue || (s.nextEligibleRun && new Date(s.nextEligibleRun).getTime() <= Date.now()))).length}
            </div>
            <div className="text-xs text-white/40 mt-0.5">Due Now</div>
          </div>
        </div>
      )}

      {/* LinkedIn Session Status Banner */}
      {data?.linkedinSession && data.linkedinSession.enabled && data.linkedinSession.status !== 'PROFILE_EXISTS' && data.linkedinSession.status !== 'SESSION_OK' && (
        <div className={`rounded-2xl p-4 flex items-start gap-3 ${
          data.linkedinSession.status === 'NEEDS_REAUTH' || data.linkedinSession.status === 'BLOCKED' || data.linkedinSession.status === 'CHALLENGE'
            ? 'bg-red-500/5 border border-red-500/10'
            : 'bg-amber-500/5 border border-amber-500/10'
        }`}>
          <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${
            data.linkedinSession.status === 'NEEDS_REAUTH' || data.linkedinSession.status === 'BLOCKED' || data.linkedinSession.status === 'CHALLENGE'
              ? 'text-red-400'
              : 'text-amber-400'
          }`} />
          <div>
            <h4 className={`text-sm font-bold ${
              data.linkedinSession.status === 'NEEDS_REAUTH' || data.linkedinSession.status === 'BLOCKED' || data.linkedinSession.status === 'CHALLENGE'
                ? 'text-red-400'
                : 'text-amber-400'
            }`}>
              LinkedIn: {data.linkedinSession.status.replace(/_/g, ' ')}
            </h4>
            <p className="text-xs text-white/50 mt-1">
              {data.linkedinSession.status === 'PROFILE_MISSING' && 'Browser profile directory not found on VPS. Create it and run login_linkedin.py.'}
              {data.linkedinSession.status === 'PROFILE_EMPTY' && 'Browser profile exists but has no session data. Run login_linkedin.py on the VPS to authenticate.'}
              {data.linkedinSession.status === 'NEEDS_REAUTH' && 'LinkedIn session expired. Run login_linkedin.py again to re-authenticate.'}
              {data.linkedinSession.status === 'NOT_CONFIGURED' && 'LinkedIn is not enabled. Set LINKEDIN_ENABLED=true and enable in Worker Settings.'}
            </p>
            <p className="text-[10px] text-white/30 mt-1.5 font-mono">
              VPS: scripts/linkedin-worker/login_linkedin.py
            </p>
          </div>
        </div>
      )}

      {/* Run All Button */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-white">Source Workers</span>
        <button
          onClick={triggerAllSources}
          disabled={runningAll}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-all disabled:opacity-30"
        >
          <Zap className={`w-4 h-4 ${runningAll ? 'animate-pulse' : ''}`} />
          {runningAll ? 'Running All Workers...' : 'Run All Sources'}
        </button>
      </div>

      {/* Source Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sources.map((src) => {
          const def = src.registryDef;
          const hasFailures = src.consecutiveFailures > 0;
          const isConfigured = src.configStatus.ready;
          const isDue = src.isDue || (src.enabled && src.nextEligibleRun && new Date(src.nextEligibleRun).getTime() <= Date.now());
          const lastRunAgo = timeAgo(src.lastRunAt);
          const lastSuccessAgo = timeAgo(src.lastSuccessAt);
          const nextDueIn = timeUntil(src.nextEligibleRun);

          return (
            <motion.div
              key={src.source}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-[#111216] border rounded-2xl p-4 transition-all shadow-xl hover:border-white/10 ${
                hasFailures ? 'border-red-500/20' : isDue && src.enabled ? 'border-amber-500/20 bg-amber-500/[0.02]' : 'border-white/5'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    {src.healthStatus === 'healthy' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : src.healthStatus === 'degraded' || src.healthStatus === 'stale' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    ) : src.healthStatus === 'running' ? (
                      <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                    ) : src.healthStatus === 'config_error' || src.healthStatus === 'not_initialized' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    ) : src.healthStatus === 'disabled' ? (
                      <XCircle className="w-4 h-4 text-white/30" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <h4 className="text-sm font-bold text-white capitalize">{def?.name || src.source}</h4>
                  </div>
                  {def?.description && (
                    <p className="text-[11px] text-white/40 mt-1 line-clamp-1">{def.description}</p>
                  )}
                  {/* Health status badge */}
                  <div className="mt-1.5">
                    <span className={`${CHIP_INLINE} font-bold uppercase tracking-wider ${
                      src.healthStatus === 'healthy' ? CHIP_TONES_DARK.emerald :
                      src.healthStatus === 'degraded' ? CHIP_TONES_DARK.amber :
                      src.healthStatus === 'stale' ? CHIP_TONES_DARK.neutral :
                      src.healthStatus === 'running' ? CHIP_TONES_DARK.blue :
                      src.healthStatus === 'config_error' ? CHIP_TONES_DARK.amber :
                      src.healthStatus === 'not_initialized' ? CHIP_TONES_DARK.neutral :
                      src.healthStatus === 'disabled' ? `${CHIP_TONES_DARK.neutral} opacity-60` :
                      CHIP_TONES_DARK.rose
                    }`}>
                      {src.healthStatus === 'config_error' ? 'Config Required' :
                       src.healthStatus === 'not_initialized' ? 'Not Initialized' :
                       src.healthStatus}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isDue && src.enabled && (
                    <span className={`${CHIP_INLINE} font-bold uppercase tracking-wider ${CHIP_TONES_DARK.amber}`}>
                      <Timer className="w-2.5 h-2.5" /> Due
                    </span>
                  )}
                  <span className={`${CHIP_INLINE} font-bold uppercase tracking-wider ${
                    src.enabled ? CHIP_TONES_DARK.emerald : CHIP_TONES_DARK.neutral
                  }`}>
                    {src.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/[0.03] rounded-xl px-3 py-2">
                  <div className="flex items-center gap-1.5 text-white/40 text-[10px] mb-0.5">
                    <Clock className="w-3 h-3" /> Last Run
                  </div>
                  <div className="text-xs font-semibold text-white">{lastRunAgo}</div>
                </div>
                <div className="bg-white/[0.03] rounded-xl px-3 py-2">
                  <div className="flex items-center gap-1.5 text-white/40 text-[10px] mb-0.5">
                    <Timer className="w-3 h-3" /> Next Due
                  </div>
                  <div className={`text-xs font-semibold ${isDue && src.enabled ? 'text-amber-400 font-bold' : 'text-white'}`}>
                    {nextDueIn}
                  </div>
                </div>
                <div className="bg-white/[0.03] rounded-xl px-3 py-2">
                  <div className="flex items-center gap-1.5 text-white/40 text-[10px] mb-0.5">
                    <CheckCircle2 className="w-3 h-3" /> Last Success
                  </div>
                  <div className="text-xs font-semibold text-white">{lastSuccessAgo}</div>
                </div>
                <div className="bg-white/[0.03] rounded-xl px-3 py-2">
                  <div className="flex items-center gap-1.5 text-white/40 text-[10px] mb-0.5">
                    <Zap className="w-3 h-3" /> Avg Yield
                  </div>
                  <div className="text-xs font-semibold text-white">{src.avgYield} jobs</div>
                </div>
                <div className="bg-white/[0.03] rounded-xl px-3 py-2">
                  <div className="flex items-center gap-1.5 text-white/40 text-[10px] mb-0.5">
                    <Activity className="w-3 h-3" /> Avg Duration
                  </div>
                  <div className="text-xs font-semibold text-white">{formatDuration(src.avgDuration)}</div>
                </div>
                <div className="bg-white/[0.03] rounded-xl px-3 py-2">
                  <div className="flex items-center gap-1.5 text-white/40 text-[10px] mb-0.5">
                    <Clock className="w-3 h-3" /> Interval
                  </div>
                  <div className="text-xs font-semibold text-white">
                    {def?.refreshIntervalMs ? formatInterval(def.refreshIntervalMs) : 'Default'}
                  </div>
                </div>
              </div>

              {/* Failure Warning */}
              {hasFailures && (
                <div className="bg-red-500/5 border border-red-500/10 rounded-xl px-3 py-2 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span className="text-[11px] text-red-400">
                    {src.consecutiveFailures} consecutive failure{src.consecutiveFailures > 1 ? 's' : ''}
                    {src.lastFailureAt && ` (last: ${timeAgo(src.lastFailureAt)})`}
                  </span>
                </div>
              )}

              {/* Config Warning */}
              {!isConfigured && (
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl px-3 py-2 mb-3">
                  <span className="text-[11px] text-amber-400">
                    {src.configStatus.reason || 'Not configured'}
                  </span>
                </div>
              )}

              {/* LinkedIn Session Status */}
              {src.source === 'linkedin' && data?.linkedinSession && src.enabled && (
                <div className={`rounded-xl px-3 py-2 mb-3 flex items-center gap-2 ${
                  data.linkedinSession.status === 'PROFILE_EXISTS' || data.linkedinSession.status === 'SESSION_OK'
                    ? 'bg-emerald-500/5 border border-emerald-500/10'
                    : 'bg-amber-500/5 border border-amber-500/10'
                }`}>
                  <span className={`text-[11px] font-bold ${
                    data.linkedinSession.status === 'PROFILE_EXISTS' || data.linkedinSession.status === 'SESSION_OK'
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}>
                    Session: {data.linkedinSession.status.replace(/_/g, ' ')}
                  </span>
                </div>
              )}

              {/* Refresh Interval & Limits info */}
              {def && (
                <div className="flex items-center justify-between text-[10px] text-white/30 mb-3">
                  <span>Type: <span className="text-white/50 uppercase">{def.type}</span></span>
                  <span>Max: {def.maxResults} jobs/run</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => triggerSource(src.source)}
                  disabled={!src.enabled || !isConfigured || triggeringSource === src.source}
                  className="flex-1 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${triggeringSource === src.source ? 'animate-spin' : ''}`} />
                  {triggeringSource === src.source ? 'Running...' : 'Run Now'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSourceForConfig(src as any)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors"
                  title="Configure Portal Settings"
                >
                  <Sliders className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Ingestion Runs History */}
      <RunsExplorer />

      {/* Portal Settings Sidebar */}
      <PortalSettingsSidebar
        isOpen={!!selectedSourceForConfig}
        source={selectedSourceForConfig}
        onClose={() => setSelectedSourceForConfig(null)}
        onSaved={fetchData}
      />
    </div>
  );
}
