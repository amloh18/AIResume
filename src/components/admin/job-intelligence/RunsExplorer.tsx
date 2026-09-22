'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, CheckCircle, XCircle, Clock, RefreshCw, ChevronLeft, ChevronRight, Square, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { CHIP_INLINE, CHIP_TONES_DARK, type ChipTone } from '@/components/ui/chip-styles';

interface SourceProgress {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  fetched: number;
  parsed: number;
  inserted: number;
  updated: number;
  duplicates: number;
  errors: number;
  error?: string;
  errorCode?: string;
  durationMs?: number;
  message?: string;
  currentSearch?: string;
  currentSearchIndex?: number;
  totalSearches?: number;
}

interface RunRecord {
  _id: string;
  runId: string;
  source: string;
  status: 'running' | 'completed' | 'completed_with_errors' | 'failed' | 'cancelled';
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  metrics?: {
    fetched: number;
    parsed: number;
    inserted: number;
    updated: number;
    duplicates: number;
    errors: number;
  };
  sources?: Record<string, SourceProgress>;
}

function SourceProgressRow({ name, progress }: { name: string; progress: SourceProgress }) {
  const statusColors = {
    pending: 'text-white/40',
    running: 'text-blue-400',
    completed: 'text-emerald-400',
    failed: 'text-rose-400',
    cancelled: 'text-amber-400',
  };

  return (
    <div className="px-3 py-1.5 text-xs font-mono">
      <div className="flex items-center gap-3">
        <span className="w-20 font-bold text-white/70 uppercase tracking-wide text-[10px]">{name}</span>
        <span className={`w-16 ${statusColors[progress.status]}`}>
          {progress.status === 'running' ? (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 animate-spin" /> run
            </span>
          ) : progress.status}
        </span>
        <span className="text-white/60 w-12 text-right">{progress.fetched}</span>
        <span className="text-emerald-400 w-12 text-right">+{progress.inserted}</span>
        <span className="text-blue-400 w-12 text-right">{progress.updated}</span>
        <span className="text-amber-400 w-12 text-right">{progress.duplicates}</span>
        <span className="text-rose-400 w-12 text-right">{progress.errors}</span>
        {progress.error && (
          <span className="text-rose-400/60 text-[10px] truncate max-w-[200px]" title={progress.error}>
            {progress.errorCode ? `[${progress.errorCode}] ` : ''}{progress.error}
          </span>
        )}
      </div>
      {/* LinkedIn-specific progress: show current search */}
      {name === 'linkedin' && progress.status === 'running' && progress.currentSearch && (
        <div className="flex items-center gap-2 mt-1 text-[10px] text-white/40">
          <span>
            Search {progress.currentSearchIndex || 1}/{progress.totalSearches || '?'}:
            {progress.currentSearch}
          </span>
        </div>
      )}
      {/* Show message for running sources */}
      {progress.status === 'running' && progress.message && !progress.currentSearch && (
        <div className="flex items-center gap-2 mt-1 text-[10px] text-white/40">
          <span>{progress.message}</span>
        </div>
      )}
    </div>
  );
}

export default function RunsExplorer() {
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  const fetchRuns = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/job-intelligence?view=runs&page=${p}&limit=15`);
      if (res.ok) {
        const data = await res.json();
        setRuns(data.runs || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error('Fetch runs error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRuns(page);
  }, [page, fetchRuns]);

  // Auto-refresh: 10s general poll + 2.5s when jobs are running
  // Pause polling when tab is hidden to save network
  const hasRunning = runs.some((r) => r.status === 'running');
  useEffect(() => {
    const intervalMs = hasRunning ? 2500 : 10_000;
    const interval = setInterval(() => {
      if (!document.hidden) fetchRuns(page);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [hasRunning, page, fetchRuns]);

  const handleCancel = async (runId: string, source: string) => {
    setCancelling(runId);
    try {
      const res = await fetch('/api/admin/ingest', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', source }),
      });
      if (res.ok) {
        setRuns((prev) =>
          prev.map((r) =>
            r.runId === runId ? { ...r, status: 'cancelled' as const, finishedAt: new Date().toISOString() } : r
          )
        );
      }
    } finally {
      setCancelling(null);
    }
  };

  const getLiveMetrics = (run: RunRecord) => {
    let fetched = run.metrics?.fetched || 0;
    let inserted = run.metrics?.inserted || 0;
    let updated = run.metrics?.updated || 0;
    let duplicates = run.metrics?.duplicates || 0;
    let errors = run.metrics?.errors || 0;

    if (run.sources && Object.keys(run.sources).length > 0) {
      const sourceEntries = Object.values(run.sources);
      const sumFetched = sourceEntries.reduce((acc, s) => acc + (s.fetched || 0), 0);
      const sumInserted = sourceEntries.reduce((acc, s) => acc + (s.inserted || 0), 0);
      const sumUpdated = sourceEntries.reduce((acc, s) => acc + (s.updated || 0), 0);
      const sumDuplicates = sourceEntries.reduce((acc, s) => acc + (s.duplicates || 0), 0);
      const sumErrors = sourceEntries.reduce((acc, s) => acc + (s.errors || 0), 0);

      fetched = Math.max(fetched, sumFetched);
      inserted = Math.max(inserted, sumInserted);
      updated = Math.max(updated, sumUpdated);
      duplicates = Math.max(duplicates, sumDuplicates);
      errors = Math.max(errors, sumErrors);
    }

    return { fetched, inserted, updated, duplicates, errors };
  };

  const statusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { icon: CheckCircle, tone: 'emerald' as ChipTone };
      case 'completed_with_errors':
        return { icon: AlertTriangle, tone: 'amber' as ChipTone };
      case 'failed':
        return { icon: XCircle, tone: 'rose' as ChipTone };
      case 'cancelled':
        return { icon: Square, tone: 'amber' as ChipTone };
      default:
        return { icon: Clock, tone: 'blue' as ChipTone };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            Ingestion Runs History
          </h2>
          <p className="text-sm text-white/50">
            Real-time flight recorder logs of all background ingestion cycles and batches.
          </p>
        </div>

        <button
          onClick={() => fetchRuns(page)}
          disabled={loading}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all flex items-center gap-2 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-white/50 uppercase tracking-wider font-bold border-b border-white/5">
              <tr>
                <th className="py-3.5 px-4 w-8"></th>
                <th className="py-3.5 px-4">Run Time</th>
                <th className="py-3.5 px-4">Source</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4">Fetched</th>
                <th className="py-3.5 px-4">Inserted</th>
                <th className="py-3.5 px-4">Updated</th>
                <th className="py-3.5 px-4">Dupes</th>
                <th className="py-3.5 px-4">Errors</th>
                <th className="py-3.5 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-white/40 font-sans">
                    {loading ? 'Loading ingestion logs...' : 'No ingestion runs recorded yet.'}
                  </td>
                </tr>
              ) : (
                runs.map((run) => {
                  const isMultiSource = run.source.toLowerCase() === 'all' && run.sources && Object.keys(run.sources).length > 1;
                  const isExpanded = isMultiSource && expandedRun === run.runId;
                  const { icon: StatusIcon, tone } = statusConfig(run.status);
                  const metrics = getLiveMetrics(run);

                  return (
                    <React.Fragment key={run.runId}>
                      <tr className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-2">
                          {isMultiSource ? (
                            <button
                              onClick={() => setExpandedRun(isExpanded ? null : run.runId)}
                              className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white transition-all"
                              title="Toggle source breakdown"
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          ) : (
                            <span className="w-3.5 block" />
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-white/70">
                          {new Date(run.startedAt).toLocaleString('en-GB', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3.5 px-4 font-sans font-bold text-white uppercase tracking-wide text-[11px]">
                          {run.source}
                        </td>
                        <td className="py-3.5 px-4 font-sans">
                          <span
                            className={`${CHIP_INLINE} font-bold uppercase ${CHIP_TONES_DARK[tone]}`}
                          >
                            <StatusIcon className={`w-3 h-3 ${run.status === 'running' ? 'animate-spin' : ''}`} />
                            {run.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-white/60">
                          {run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-white font-bold">
                          {run.status === 'running' && metrics.fetched > 0 ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              {metrics.fetched.toLocaleString()}
                            </span>
                          ) : (
                            metrics.fetched.toLocaleString()
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-emerald-400 font-bold">
                          +{metrics.inserted.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-blue-400">
                          {metrics.updated.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-amber-400">
                          {metrics.duplicates.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-rose-400">
                          {metrics.errors.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4">
                          {run.status === 'running' && (
                            <button
                              onClick={() => handleCancel(run.runId, run.source)}
                              disabled={cancelling === run.runId}
                              className="px-3 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs transition-all disabled:opacity-40 flex items-center gap-1.5 border border-red-500/20 shadow-sm"
                            >
                              <Square className="w-3 h-3 fill-current" />
                              {cancelling === run.runId ? 'Stopping...' : 'Stop'}
                            </button>
                          )}
                        </td>
                      </tr>
                      {/* Expanded source-level progress only for multi-source batch runs */}
                      <AnimatePresence>
                        {isExpanded && run.sources && (
                          <tr>
                            <td colSpan={11} className="p-0">
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="bg-black/30 border-t border-white/5 py-2">
                                  <div className="flex items-center gap-3 px-7 mb-1 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                                    <span className="w-20">Source</span>
                                    <span className="w-16">Status</span>
                                    <span className="w-12 text-right">Fetched</span>
                                    <span className="w-12 text-right">Inserted</span>
                                    <span className="w-12 text-right">Updated</span>
                                    <span className="w-12 text-right">Dupes</span>
                                    <span className="w-12 text-right">Errors</span>
                                  </div>
                                  {Object.entries(run.sources).map(([name, progress]) => (
                                    <SourceProgressRow key={name} name={name} progress={progress} />
                                  ))}
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-white/5 flex items-center justify-between text-xs text-white/50">
          <div>
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
