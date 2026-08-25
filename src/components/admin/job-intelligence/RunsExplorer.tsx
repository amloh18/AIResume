'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, CheckCircle, XCircle, Clock, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

interface RunRecord {
  _id: string;
  runId: string;
  source: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
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
  pagesProcessed?: number;
}

export default function RunsExplorer() {
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchRuns = async (p = 1) => {
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
  };

  useEffect(() => {
    fetchRuns(page);
  }, [page]);

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
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all flex items-center gap-2 text-xs font-bold"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-white/50 uppercase tracking-wider font-bold border-b border-white/5">
              <tr>
                <th className="py-3.5 px-4">Run Time</th>
                <th className="py-3.5 px-4">Source</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4">Fetched</th>
                <th className="py-3.5 px-4">New Inserted</th>
                <th className="py-3.5 px-4">Updated</th>
                <th className="py-3.5 px-4">Duplicates</th>
                <th className="py-3.5 px-4">Errors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-white/40 font-sans">
                    {loading ? 'Loading ingestion logs...' : 'No ingestion runs recorded yet.'}
                  </td>
                </tr>
              ) : (
                runs.map((run) => (
                  <tr key={run.runId} className="hover:bg-white/[0.02] transition-colors">
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
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          run.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : run.status === 'failed'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {run.status === 'completed' ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : run.status === 'failed' ? (
                          <XCircle className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3 animate-spin" />
                        )}
                        {run.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-white/60">
                      {run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-white font-bold">
                      {run.metrics?.fetched || 0}
                    </td>
                    <td className="py-3.5 px-4 text-emerald-400 font-bold">
                      +{run.metrics?.inserted || 0}
                    </td>
                    <td className="py-3.5 px-4 text-blue-400">
                      {run.metrics?.updated || 0}
                    </td>
                    <td className="py-3.5 px-4 text-amber-400">
                      {run.metrics?.duplicates || 0}
                    </td>
                    <td className="py-3.5 px-4 text-rose-400">
                      {run.metrics?.errors || 0}
                    </td>
                  </tr>
                ))
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
