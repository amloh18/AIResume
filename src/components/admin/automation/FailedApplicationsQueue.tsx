'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, XCircle, ExternalLink, CheckCircle, RotateCcw } from 'lucide-react';

interface FailedItem {
  _id: string;
  userId: string;
  jobId: string;
  jobTitle: string;
  company: string;
  source: string;
  status: string;
  lastError: string;
  retryCount: number;
  maxRetries: number;
  updatedAt: string;
  applicationStatus?: string;
  matchScore?: number;
}

interface ReviewResponse {
  items: FailedItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export default function FailedApplicationsQueue() {
  const [data, setData] = useState<ReviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/automation?view=review&page=${page}&limit=15`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (id: string, action: 'dismiss_failed' | 'retry_failed') => {
    setActionLoading(id);
    try {
      const res = await fetch('/api/admin/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, queueId: id }),
      });
      if (res.ok) {
        setData((prev) =>
          prev ? { ...prev, items: prev.items.filter((i) => i._id !== id), pagination: { ...prev.pagination, total: prev.pagination.total - 1 } } : prev
        );
      }
    } finally {
      setActionLoading(null);
    }
  };

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            Review & Triage Queue
          </h2>
          <p className="text-sm text-white/50">
            Applications that halted automated submission due to unsupported fields, custom Captchas, or auth challenges.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-white/60 hover:text-emerald-400 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/5 text-white/50 uppercase tracking-wider font-bold border-b border-white/5">
            <tr>
              <th className="py-3.5 px-4">Job & Company</th>
              <th className="py-3.5 px-4">Platform</th>
              <th className="py-3.5 px-4">Error</th>
              <th className="py-3.5 px-4">Retries</th>
              <th className="py-3.5 px-4">Time</th>
              <th className="py-3.5 px-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {!loading && data?.items.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-white/40">
                  No failed or review-required applications in queue.
                </td>
              </tr>
            )}
            {data?.items.map((item) => (
              <tr key={item._id} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4">
                  <div className="font-bold text-white">{item.jobTitle || 'Untitled'}</div>
                  <div className="text-[11px] text-white/50">{item.company || 'Unknown'}</div>
                </td>
                <td className="py-3.5 px-4 font-mono text-[11px] text-emerald-400">
                  {item.source || 'unknown'}
                </td>
                <td className="py-3.5 px-4 text-amber-300 max-w-xs truncate">
                  {item.lastError || 'No error message'}
                </td>
                <td className="py-3.5 px-4 font-mono text-white/60">
                  {item.retryCount}/{item.maxRetries}
                </td>
                <td className="py-3.5 px-4 text-white/50">
                  {formatTime(item.updatedAt)}
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAction(item._id, 'retry_failed')}
                      disabled={actionLoading === item._id || item.retryCount >= item.maxRetries}
                      className="px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs transition-all disabled:opacity-40"
                    >
                      <RotateCcw className="w-3 h-3 inline mr-1" />
                      Retry
                    </button>
                    <button
                      onClick={() => handleAction(item._id, 'dismiss_failed')}
                      disabled={actionLoading === item._id}
                      className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-xs transition-all disabled:opacity-40"
                    >
                      Dismiss
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {loading && (
              <tr>
                <td colSpan={6} className="py-8 text-center">
                  <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin mx-auto" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-white/50">
          <span>
            Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} items)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
              disabled={page >= data.pagination.totalPages}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
