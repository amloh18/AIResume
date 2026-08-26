'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Settings, CheckCircle2, AlertCircle, Clock, Database, Layers, Square } from 'lucide-react';
import SourceConfigModal from './SourceConfigModal';

interface SourceItem {
  name: string;
  displayName: string;
  type: string;
  enabled?: boolean;
  priority?: number;
  status?: {
    health?: string;
    lastRunAt?: string;
    lastSuccessAt?: string;
    consecutiveFailures?: number;
    lastErrorMessage?: string;
  };
  statistics?: {
    totalRuns?: number;
    totalJobsFound?: number;
    totalJobsInserted?: number;
    totalJobsUpdated?: number;
  };
  schedule?: {
    frequencyMinutes?: number;
  };
}

interface ActiveRunData {
  runId: string;
  source: string;
  fetched: number;
  inserted: number;
  startedAt?: string;
}

const DEFAULT_SOURCES: SourceItem[] = [
  { name: 'greenhouse', displayName: 'Greenhouse ATS', type: 'ats', enabled: true, priority: 95, schedule: { frequencyMinutes: 30 } },
  { name: 'lever', displayName: 'Lever ATS', type: 'ats', enabled: true, priority: 90, schedule: { frequencyMinutes: 30 } },
  { name: 'ashby', displayName: 'Ashby ATS', type: 'ats', enabled: true, priority: 90, schedule: { frequencyMinutes: 30 } },
  { name: 'workday', displayName: 'Workday ATS', type: 'ats', enabled: true, priority: 85, schedule: { frequencyMinutes: 45 } },
  { name: 'remotive', displayName: 'Remotive Remote API', type: 'api', enabled: true, priority: 75, schedule: { frequencyMinutes: 60 } },
  { name: 'remoteok', displayName: 'RemoteOK API', type: 'api', enabled: true, priority: 70, schedule: { frequencyMinutes: 60 } },
  { name: 'adzuna', displayName: 'Adzuna Job API', type: 'api', enabled: true, priority: 65, schedule: { frequencyMinutes: 90 } },
  { name: 'jobspy', displayName: 'JobSpy Aggregator', type: 'aggregator', enabled: true, priority: 60, schedule: { frequencyMinutes: 120 } },
];

// Config requirements for each source
const SOURCE_CONFIG_STATUS: Record<string, { ready: boolean; label: string }> = {
  greenhouse: { ready: true, label: 'Ready' },
  lever: { ready: true, label: 'Ready' },
  ashby: { ready: true, label: 'Ready' },
  workday: { ready: true, label: 'Ready' },
  remotive: { ready: true, label: 'Ready' },
  remoteok: { ready: true, label: 'Ready' },
  adzuna: { ready: true, label: 'Ready' },
  jobspy: { ready: true, label: 'Requires python3 + jobspy' },
};

export default function SourcesGrid({ sources = [], onSourceSaved }: { sources?: SourceItem[]; onSourceSaved?: () => void }) {
  const [runningMap, setRunningMap] = useState<Record<string, boolean>>({});
  const [cancellingMap, setCancellingMap] = useState<Record<string, boolean>>({});
  const [selectedSource, setSelectedSource] = useState<SourceItem | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activeRunsMap, setActiveRunsMap] = useState<Record<string, ActiveRunData>>({});

  // Merge default sources with DB sources
  const mergedSources = DEFAULT_SOURCES.map((def) => {
    const fromDb = sources.find((s) => s.name === def.name);
    return fromDb ? { ...def, ...fromDb } : def;
  });

  const checkActiveRuns = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/job-intelligence?view=runs&page=1&limit=50');
      if (res.ok) {
        const data = await res.json();
        const runMap: Record<string, ActiveRunData> = {};

        (data.runs || []).forEach((run: any) => {
          if (run.status === 'running') {
            const srcName = (run.source || '').toLowerCase();
            let liveFetched = run.metrics?.fetched || 0;
            let liveInserted = run.metrics?.inserted || 0;

            if (run.sources && run.sources[srcName]) {
              liveFetched = Math.max(liveFetched, run.sources[srcName].fetched || 0);
              liveInserted = Math.max(liveInserted, run.sources[srcName].inserted || 0);
            }

            if (srcName && srcName !== 'all') {
              runMap[srcName] = {
                runId: run.runId,
                source: srcName,
                fetched: liveFetched,
                inserted: liveInserted,
                startedAt: run.startedAt,
              };
            } else if (srcName === 'all' && run.sources) {
              Object.entries(run.sources).forEach(([sName, sProg]: [string, any]) => {
                if (sProg.status === 'running') {
                  runMap[sName.toLowerCase()] = {
                    runId: run.runId,
                    source: sName,
                    fetched: sProg.fetched || 0,
                    inserted: sProg.inserted || 0,
                    startedAt: run.startedAt,
                  };
                }
              });
            }
          }
        });

        setActiveRunsMap(runMap);
      }
    } catch {}
  }, []);

  // Poll for active runs (fast polling when running, otherwise stop when idle)
  // Pause polling entirely when tab is hidden to save network
  const hasAnyActive = Object.keys(activeRunsMap).length > 0;
  useEffect(() => {
    checkActiveRuns();
    // Stop polling entirely when idle and tab is hidden; poll fast when active
    if (!hasAnyActive) return; // No active runs = no polling needed
    const interval = setInterval(() => {
      if (!document.hidden) checkActiveRuns();
    }, hasAnyActive ? 2500 : 8000);
    return () => clearInterval(interval);
  }, [hasAnyActive, checkActiveRuns]);

  const handleTriggerRun = async (sourceName: string) => {
    const key = sourceName.toLowerCase();
    // Duplicate protection: check if already running
    if (activeRunsMap[key]) {
      setFeedback(`⚠️ Ingestion already running for ${sourceName}`);
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    setRunningMap((prev) => ({ ...prev, [sourceName]: true }));
    setFeedback(`Ingestion triggered for ${sourceName}...`);

    try {
      const res = await fetch('/api/admin/job-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger_run', sourceName }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback(`✓ Ingestion successfully started for ${sourceName}`);
        setActiveRunsMap((prev) => ({
          ...prev,
          [key]: {
            runId: data.runId || `run-${sourceName}`,
            source: key,
            fetched: 0,
            inserted: 0,
            startedAt: new Date().toISOString(),
          },
        }));
        setTimeout(checkActiveRuns, 800);
      } else {
        setFeedback(`⚠️ Error: ${data.error || 'Failed to trigger'}`);
      }
    } catch {
      setFeedback(`⚠️ Network error triggering ${sourceName}`);
    } finally {
      setTimeout(() => {
        setRunningMap((prev) => ({ ...prev, [sourceName]: false }));
      }, 2000);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleStopRun = async (sourceName: string, runId?: string) => {
    const key = sourceName.toLowerCase();
    setCancellingMap((prev) => ({ ...prev, [sourceName]: true }));
    setFeedback(`Stopping ingestion for ${sourceName}...`);

    try {
      const res = await fetch('/api/admin/ingest', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', source: sourceName, runId }),
      });
      if (res.ok) {
        setFeedback(`✓ Ingestion stopped for ${sourceName}`);
        setActiveRunsMap((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        setTimeout(checkActiveRuns, 1000);
      } else {
        setFeedback(`⚠️ Failed to stop ${sourceName}`);
      }
    } catch {
      setFeedback(`⚠️ Network error stopping ${sourceName}`);
    } finally {
      setCancellingMap((prev) => ({ ...prev, [sourceName]: false }));
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            Ingestion Sources
          </h2>
        </div>

        {feedback && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold"
          >
            {feedback}
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {mergedSources.map((source) => {
          const key = source.name.toLowerCase();
          const activeRun = activeRunsMap[key] || activeRunsMap[source.name];
          const isTriggering = runningMap[source.name] || false;
          const isStopping = cancellingMap[source.name] || false;
          const isHealthy = source.status?.health !== 'failing' && source.status?.health !== 'circuit_open';

          return (
            <motion.div
              key={source.name}
              whileHover={{ y: -2 }}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                activeRun
                  ? 'bg-emerald-500/[0.03] border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                  : 'bg-white/[0.03] border-white/10 hover:border-white/20'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/5 text-white/60">
                    {source.type.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {activeRun ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase">
                        <Clock className="w-3 h-3 animate-spin" /> Live Ingesting
                      </span>
                    ) : (
                      <>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isHealthy ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-rose-500 animate-pulse'
                          }`}
                        />
                        <span className="text-xs font-bold text-white/70">
                          {isHealthy ? 'Healthy' : 'Degraded'}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-white mb-1">
                  {source.displayName}
                </h3>
                <div className="flex items-center gap-2 text-xs text-white/40 mb-4">
                  <Clock className="w-3.5 h-3.5" />
                  Every {source.schedule?.frequencyMinutes || 30} mins
                </div>

                {/* Metrics */}
                {activeRun ? (
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/25 text-xs mb-4">
                    <div>
                      <div className="text-[10px] text-emerald-300/80 uppercase font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        Live Fetched
                      </div>
                      <div className="font-mono font-extrabold text-emerald-300 text-sm mt-0.5">
                        {(activeRun.fetched || 0).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-white/50 uppercase font-bold">Inserted</div>
                      <div className="font-mono font-extrabold text-white text-sm mt-0.5">
                        +{(activeRun.inserted || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-black/40 border border-white/5 text-xs mb-4">
                    <div>
                      <div className="text-[10px] text-white/40 uppercase">Total Yield</div>
                      <div className="font-bold text-white">
                        {(source.statistics?.totalJobsFound || 0).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-white/40 uppercase">Priority</div>
                      <div className="font-bold text-emerald-400">
                        {source.priority || 80}/100
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Config status badge */}
              <div className="mt-2">
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    SOURCE_CONFIG_STATUS[source.name]?.ready
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-amber-500/10 text-amber-400'
                  }`}
                >
                  {SOURCE_CONFIG_STATUS[source.name]?.label || 'Ready'}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                {activeRun ? (
                  <button
                    onClick={() => handleStopRun(source.name, activeRun.runId)}
                    disabled={isStopping}
                    className="flex-1 py-2 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shadow-sm"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    {isStopping ? 'Stopping...' : 'Stop Ingestion'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleTriggerRun(source.name)}
                    disabled={isTriggering}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <Play className={`w-3.5 h-3.5 ${isTriggering ? 'animate-spin' : ''}`} />
                    {isTriggering ? 'Starting...' : 'Run Now'}
                  </button>
                )}

                <button
                  onClick={() => setSelectedSource(source)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all"
                  title="Configure Source"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {selectedSource && (
        <SourceConfigModal
          source={selectedSource}
          onClose={() => setSelectedSource(null)}
          onSaved={() => {
            setSelectedSource(null);
            onSourceSaved?.();
          }}
        />
      )}
    </div>
  );
}
