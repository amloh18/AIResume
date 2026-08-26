'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Zap,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Play,
  Pause,
  Server,
  Activity,
  ShieldCheck,
  ShieldX,
  Layers,
  CopyX,
  RefreshCw,
} from 'lucide-react';

interface AutomationData {
  queue: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    deadLetter: number;
    stuck: number;
  };
  history: {
    total: number;
    applied: number;
    failed: number;
    viewed: number;
    interview: number;
    offer: number;
    rejected: number;
    successRate: number;
  };
  last24h: {
    attempts: number;
    successes: number;
    failures: number;
  };
  workers: Array<{
    id: string;
    activeItems: number;
    oldestTask: string | null;
  }>;
  config: {
    globalEnabled: boolean;
    maxPerUserPerDay: number;
    monthlyCostCap: number;
    enabledUsers: number;
  };
}

export default function AutomationOverview() {
  const [data, setData] = useState<AutomationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/automation?view=overview');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const toggleKillSwitch = async () => {
    if (!data) return;
    setToggling(true);
    try {
      const res = await fetch('/api/admin/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_global', enabled: !data.config.globalEnabled }),
      });
      if (res.ok) {
        setData((prev) =>
          prev ? { ...prev, config: { ...prev.config, globalEnabled: !prev.config.globalEnabled } } : prev
        );
      }
    } finally {
      setToggling(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
        {error}
        <button onClick={fetchData} className="ml-4 underline">Retry</button>
      </div>
    );
  }

  if (!data) return null;

  const killSwitchActive = !data.config.globalEnabled;

  return (
    <div className="space-y-6">
      {/* Top Banner Control Room */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-red-500/10 via-amber-500/5 to-transparent border border-red-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            Production Control Room & Safety Supervisor
          </div>
          <h2 className="text-xl font-bold text-white">
            Autonomous Auto-Apply Fleet & Reliability Monitor
          </h2>
          <p className="text-xs text-white/50">
            Enforces strict submission proof, crash reconciliation watchdogs, and emergency circuit breakers.
          </p>
        </div>

        <button
          onClick={toggleKillSwitch}
          disabled={toggling}
          className={`px-6 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all shadow-xl disabled:opacity-50 ${
            killSwitchActive
              ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
              : 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'
          }`}
        >
          {toggling ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : killSwitchActive ? (
            <>
              <Play className="w-4 h-4" /> RESUME AUTO-APPLY
            </>
          ) : (
            <>
              <Pause className="w-4 h-4" /> EMERGENCY KILL SWITCH
            </>
          )}
        </button>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Attempts (24h)"
          value={data.last24h.attempts.toLocaleString()}
          sub="Total application jobs started"
          icon={Layers}
          color="text-white"
        />
        <KpiCard
          label="Confirmed Applied"
          value={data.last24h.successes.toLocaleString()}
          sub={`${data.history.successRate}% success rate (all time)`}
          icon={CheckCircle2}
          color="text-emerald-400"
        />
        <KpiCard
          label="Failed (24h)"
          value={data.last24h.failures.toLocaleString()}
          sub="Submission errors or rejected"
          icon={XCircle}
          color="text-red-400"
        />
        <KpiCard
          label="Queue Pending"
          value={data.queue.pending.toLocaleString()}
          sub={`${data.queue.stuck} stuck in processing`}
          icon={Clock}
          color="text-amber-400"
          highlight={data.queue.stuck > 0}
        />
        <KpiCard
          label="Active Users"
          value={data.config.enabledUsers.toLocaleString()}
          sub={`${data.history.total.toLocaleString()} total applications`}
          icon={ShieldCheck}
          color="text-emerald-400"
        />
      </div>

      {/* Worker Fleet & Watchdog Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Workers */}
        <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              Active Worker Fleet
            </h3>
            <span className="text-xs text-white/40 font-mono">
              {data.workers.length} Running
            </span>
          </div>

          <div className="space-y-3">
            {data.workers.length === 0 ? (
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-white/40 text-xs">
                No active workers currently processing
              </div>
            ) : (
              data.workers.map((w) => (
                <div
                  key={w.id}
                  className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <div>
                      <div className="font-bold text-white">{w.id}</div>
                      <div className="text-[11px] text-white/40">
                        {w.oldestTask
                          ? `Processing since ${new Date(w.oldestTask).toLocaleTimeString()}`
                          : 'Idle'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-400 font-mono">{w.activeItems} items</div>
                    <div className="text-[10px] text-white/40 uppercase">In Progress</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Queue Health */}
        <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Queue Health
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Pending', value: data.queue.pending, color: 'text-amber-400' },
              { label: 'Processing', value: data.queue.processing, color: 'text-blue-400' },
              { label: 'Completed', value: data.queue.completed, color: 'text-emerald-400' },
              { label: 'Failed', value: data.queue.failed, color: 'text-red-400' },
              { label: 'Dead Letter', value: data.queue.deadLetter, color: 'text-red-500' },
              { label: 'Stuck (>10m)', value: data.queue.stuck, color: 'text-amber-500' },
            ].map((item) => (
              <div key={item.label} className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="text-[10px] uppercase font-bold text-white/50 tracking-wider">{item.label}</div>
                <div className={`text-xl font-black ${item.color}`}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Success Rate Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-[10px] text-white/50 mb-1">
              <span>Overall Success Rate</span>
              <span className="font-bold text-emerald-400">{data.history.successRate}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${data.history.successRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  highlight = false,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  color: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-5 rounded-2xl border ${
        highlight ? 'bg-amber-500/5 border-amber-500/20' : 'bg-white/[0.03] border-white/10'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase font-bold text-white/50 tracking-wider">{label}</span>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="text-[11px] text-white/40 mt-0.5">{sub}</div>
    </div>
  );
}
