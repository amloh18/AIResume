'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Clock, RefreshCw, Users, TrendingUp,
  ChevronDown, ChevronUp, ArrowUpCircle, Search, X,
} from 'lucide-react';
import { EmptyState } from './ui-primitives';
import { CHIP_INLINE, CHIP_TONES_DARK, type ChipTone } from '@/components/ui/chip-styles';
import { toast } from '@/lib/hot-toast';

interface DemandSegment {
  _id: string;
  roleFamily: string;
  country: string;
  remote: boolean;
  demandCount: number;
  uniqueUsers: number;
  priority: number;
  status: string;
  lastFetchedAt: string | null;
  lastRequestedAt: string;
}

interface DemandQueueData {
  segments: DemandSegment[];
  stats: Record<string, { count: number; avgPriority: number }>;
  staleCount: number;
  totalSegments: number;
}

const STATUS_TONES: Record<string, ChipTone> = {
  idle: 'neutral',
  queued: 'amber',
  fetching: 'blue',
  stale: 'rose',
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function DemandQueueMonitor() {
  const [data, setData] = useState<DemandQueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ingestion-monitor?view=demand');
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error('Demand queue fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const triggerRefresh = async (segmentId: string) => {
    if (triggeringId) return;
    setTriggeringId(segmentId);
    try {
      const res = await fetch('/api/admin/ingestion-monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger_demand', segmentId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      toast.success('Refresh triggered');
      setTimeout(fetchData, 1000);
    } catch (err) {
      console.error('Trigger error:', err);
      const message = err instanceof Error ? err.message : null;
      toast.error(message || "Couldn't trigger the refresh. Try again.");
    } finally {
      setTriggeringId(null);
    }
  };

  const segments = data?.segments || [];
  const stats = data?.stats || {};

  const filteredSegments = useMemo(() => {
    return segments.filter((seg) => {
      const matchesSearch = !search ||
        seg.roleFamily.toLowerCase().includes(search.toLowerCase()) ||
        seg.country.toLowerCase().includes(search.toLowerCase()) ||
        seg._id.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || seg.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [segments, search, statusFilter]);

  if (loading && !data) {
    return (
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 text-center">
        <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mx-auto mb-3" />
        <p className="text-sm text-white/50">Loading demand queue...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="bg-[#111216] border border-white/5 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4 shadow-xl">
        <div className="text-center">
          <div className="text-xl font-bold text-white tracking-tight">{data?.totalSegments || 0}</div>
          <div className="text-xs text-white/40 mt-0.5">Total Segments</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-amber-400 tracking-tight">{stats.fetching?.count || 0}</div>
          <div className="text-xs text-white/40 mt-0.5">Currently Fetching</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-red-400 tracking-tight">{data?.staleCount || 0}</div>
          <div className="text-xs text-white/40 mt-0.5">Stale (1h+)</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-emerald-400 tracking-tight">
            {stats.queued?.count || 0}
          </div>
          <div className="text-xs text-white/40 mt-0.5">Queued</div>
        </div>
      </div>

      {/* Segments Table */}
      <div className="bg-[#111216] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-5 py-3 border-b border-white/5 bg-white/[0.02]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold text-white">Demand Segments</h3>
              {search || statusFilter !== 'all' ? (
                <span className="text-[10px] text-white/40">
                  ({filteredSegments.length} of {segments.length})
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Search */}
              <div className="relative flex-1 sm:w-48">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-white/40" />
                <input
                  type="text"
                  placeholder="Search role, country..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 pl-8 pr-7 text-xs text-white focus:outline-none focus:border-emerald-500 transition-all"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2 top-2.5 text-white/30 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg py-1.5 px-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-all"
              >
                <option value="all" className="bg-[#121212]">All Status</option>
                <option value="idle" className="bg-[#121212]">Idle</option>
                <option value="queued" className="bg-[#121212]">Queued</option>
                <option value="fetching" className="bg-[#121212]">Fetching</option>
                <option value="stale" className="bg-[#121212]">Stale</option>
              </select>
              {/* Refresh */}
              <button
                onClick={fetchData}
                disabled={loading}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {segments.length === 0 ? (
          <EmptyState
            title="No demand segments yet"
            description="Demand segments appear after users search for jobs. Try searching for roles like 'Software Engineer' or 'Product Manager'."
          />
        ) : filteredSegments.length === 0 ? (
          <EmptyState
            title="No matching segments"
            description={`No segments match "${search || statusFilter}". Try a different search or filter.`}
            action={{ label: 'Clear filters', onClick: () => { setSearch(''); setStatusFilter('all'); } }}
          />
        ) : (
          <div className="divide-y divide-white/5">
            {filteredSegments.map((seg) => {
              const tone = STATUS_TONES[seg.status] || 'neutral';
              const isExpanded = expandedId === seg._id;
              return (
                <div key={seg._id} className="group">
                  {/* Row */}
                  <div
                    className="px-5 py-3 flex items-center gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : seg._id)}
                  >
                    {/* Status badge */}
                    <span className={`${CHIP_INLINE} font-bold uppercase tracking-wider ${CHIP_TONES_DARK[tone]}`}>
                      {seg.status}
                    </span>

                    {/* Role family */}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-white truncate block">
                        {seg.roleFamily.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[11px] text-white/40">
                        {seg.country || 'Global'}{seg.remote ? ' · Remote' : ''}
                      </span>
                    </div>

                    {/* Metrics */}
                    <div className="hidden md:flex items-center gap-6 text-xs text-white/50">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3 h-3" />
                        <span>{seg.uniqueUsers} users</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3 h-3" />
                        <span>{seg.demandCount} searches</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        <span>{timeAgo(seg.lastFetchedAt)}</span>
                      </div>
                    </div>

                    {/* Priority */}
                    <div className="text-right w-12">
                      <div className={`text-sm font-bold ${seg.priority >= 70 ? 'text-amber-400' : seg.priority >= 40 ? 'text-white/70' : 'text-white/40'}`}>
                        {seg.priority}
                      </div>
                      <div className="text-[10px] text-white/30">priority</div>
                    </div>

                    {/* Expand chevron */}
                    <div className="text-white/30 group-hover:text-white/60 transition-colors">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-4 pt-1 bg-white/[0.01]">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-4">
                            <div>
                              <div className="text-white/40 mb-0.5">Segment ID</div>
                              <div className="text-white font-mono text-[11px]">{seg._id}</div>
                            </div>
                            <div>
                              <div className="text-white/40 mb-0.5">Last Requested</div>
                              <div className="text-white">{timeAgo(seg.lastRequestedAt)}</div>
                            </div>
                            <div>
                              <div className="text-white/40 mb-0.5">Last Fetched</div>
                              <div className="text-white">{timeAgo(seg.lastFetchedAt)}</div>
                            </div>
                            <div>
                              <div className="text-white/40 mb-0.5">Next Eligible</div>
                              <div className="text-white">
                                {seg.lastFetchedAt
                                  ? timeAgo(new Date(new Date(seg.lastFetchedAt).getTime() + 60 * 60 * 1000).toISOString())
                                  : 'Now'}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); triggerRefresh(seg._id); }}
                            disabled={triggeringId === seg._id || seg.status === 'fetching'}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                          >
                            <ArrowUpCircle className="w-3.5 h-3.5" />
                            {triggeringId === seg._id ? 'Queuing...' : 'Trigger Refresh'}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
