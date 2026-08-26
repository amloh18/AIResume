'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Settings, CheckCircle2, AlertCircle, Clock, Database, Layers } from 'lucide-react';
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

const DEFAULT_SOURCES: SourceItem[] = [
  { name: 'greenhouse', displayName: 'Greenhouse ATS', type: 'ats', enabled: true, priority: 95, schedule: { frequencyMinutes: 30 } },
  { name: 'lever', displayName: 'Lever ATS', type: 'ats', enabled: true, priority: 90, schedule: { frequencyMinutes: 30 } },
  { name: 'ashby', displayName: 'Ashby ATS', type: 'ats', enabled: true, priority: 90, schedule: { frequencyMinutes: 30 } },
  { name: 'remotive', displayName: 'Remotive Remote API', type: 'api', enabled: true, priority: 75, schedule: { frequencyMinutes: 60 } },
  { name: 'remoteok', displayName: 'RemoteOK API', type: 'api', enabled: true, priority: 70, schedule: { frequencyMinutes: 60 } },
];

export default function SourcesGrid({ sources = [] }: { sources?: SourceItem[] }) {
  const [runningMap, setRunningMap] = useState<Record<string, boolean>>({});
  const [selectedSource, setSelectedSource] = useState<SourceItem | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activeRuns, setActiveRuns] = useState<Set<string>>(new Set());

  // Merge default sources with DB sources
  const mergedSources = DEFAULT_SOURCES.map((def) => {
    const fromDb = sources.find((s) => s.name === def.name);
    return fromDb ? { ...def, ...fromDb } : def;
  });

  // Check for active runs on mount and periodically
  React.useEffect(() => {
    const checkActiveRuns = async () => {
      try {
        const res = await fetch('/api/admin/job-intelligence?view=runs&page=1&limit=50');
        if (res.ok) {
          const data = await res.json();
          const running = new Set<string>();
          (data.runs || []).forEach((run: any) => {
            if (run.status === 'running') {
              running.add(run.source);
            }
          });
          setActiveRuns(running);
        }
      } catch {}
    };
    checkActiveRuns();
    const interval = setInterval(checkActiveRuns, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleTriggerRun = async (sourceName: string) => {
    // Duplicate protection: check if already running
    if (activeRuns.has(sourceName)) {
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
        setFeedback(`✓ Ingestion successfully queued for ${sourceName}`);
        setActiveRuns((prev) => new Set([...prev, sourceName]));
      } else {
        setFeedback(`⚠️ Error: ${data.error || 'Failed to trigger'}`);
      }
    } catch {
      setFeedback(`⚠️ Network error triggering ${sourceName}`);
    } finally {
      setTimeout(() => {
        setRunningMap((prev) => ({ ...prev, [sourceName]: false }));
      }, 3000);
      setTimeout(() => setFeedback(null), 5000);
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
          const isRunning = runningMap[source.name] || false;
          const isHealthy = source.status?.health !== 'failing' && source.status?.health !== 'circuit_open';

          return (
            <motion.div
              key={source.name}
              whileHover={{ y: -2 }}
              className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/5 text-white/60">
                    {source.type.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isHealthy ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-rose-500 animate-pulse'
                      }`}
                    />
                    <span className="text-xs font-bold text-white/70">
                      {isHealthy ? 'Healthy' : 'Degraded'}
                    </span>
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
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                <button
                  onClick={() => handleTriggerRun(source.name)}
                  disabled={isRunning || activeRuns.has(source.name)}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                  {activeRuns.has(source.name) ? 'Running...' : isRunning ? 'Starting...' : 'Run Now'}
                </button>

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
          onSaved={() => setSelectedSource(null)}
        />
      )}
    </div>
  );
}
