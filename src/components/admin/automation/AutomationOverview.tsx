'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';

export default function AutomationOverview() {
  const [killSwitchActive, setKillSwitchActive] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const toggleKillSwitch = () => {
    const nextState = !killSwitchActive;
    setKillSwitchActive(nextState);
    setFeedback(
      nextState
        ? '🛑 EMERGENCY KILL SWITCH ACTIVATED: All Auto-Apply workers halted.'
        : '✓ Auto-Apply workers resumed normal operation.'
    );
    setTimeout(() => setFeedback(null), 5000);
  };

  const primaryKPIs = [
    {
      label: 'Attempts (24h)',
      value: '1,240',
      sub: 'Total application jobs started',
      icon: Layers,
      color: 'text-white',
    },
    {
      label: 'Confirmed Applied',
      value: '1,190',
      sub: 'Positive evidence verified (96.0%)',
      icon: CheckCircle2,
      color: 'text-emerald-400',
    },
    {
      label: 'False Applied Rate',
      value: '0',
      sub: 'Zero unverified Applied states',
      icon: ShieldCheck,
      color: 'text-emerald-400',
      highlight: true,
    },
    {
      label: 'Duplicate Submissions',
      value: '0',
      sub: '14 prevented by Idempotency Key',
      icon: CopyX,
      color: 'text-emerald-400',
      highlight: true,
    },
    {
      label: 'Needs Review',
      value: '18',
      sub: 'Unknown form safety exit',
      icon: AlertTriangle,
      color: 'text-amber-400',
    },
  ];

  const workers = [
    { id: 'Worker-01', status: 'healthy', pid: '4102', processedToday: 48, currentJob: 'Greenhouse: Linear Staff Backend' },
    { id: 'Worker-02', status: 'healthy', pid: '4108', processedToday: 52, currentJob: 'Lever: Stripe Senior Fullstack' },
    { id: 'Worker-03', status: 'degraded', pid: '4114', processedToday: 42, currentJob: 'Idle / Reconnecting proxy' },
  ];

  const platformPerformance = [
    {
      platform: 'Greenhouse',
      attempts24h: 1240,
      confirmed: 1190,
      failed: 32,
      unknown: 18,
      rate: '96.0%',
      rateNum: 96.0,
      last7dConfirmed: 7420,
      health: 'healthy',
    },
    {
      platform: 'Lever',
      attempts24h: 860,
      confirmed: 815,
      failed: 27,
      unknown: 18,
      rate: '94.8%',
      rateNum: 94.8,
      last7dConfirmed: 5120,
      health: 'healthy',
    },
    {
      platform: 'Ashby',
      attempts24h: 420,
      confirmed: 346,
      failed: 48,
      unknown: 26,
      rate: '82.4%',
      rateNum: 82.4,
      last7dConfirmed: 2180,
      health: 'degraded',
    },
    {
      platform: 'Workday',
      attempts24h: 180,
      confirmed: 75,
      failed: 83,
      unknown: 22,
      rate: '41.7%',
      rateNum: 41.7,
      last7dConfirmed: 430,
      health: 'failing',
    },
  ];

  const [stuckApps, setStuckApps] = useState([
    { id: 'APP-901', role: 'Product Manager', company: 'Monzo', state: 'Processing', duration: '18m', action: 'Investigate' },
    { id: 'APP-877', role: 'Software Engineer', company: 'Checkout.com', state: 'Verification', duration: '9m', action: 'Reconcile' },
    { id: 'APP-864', role: 'Data Analyst', company: 'Deliveroo', state: 'Queued', duration: '42m', action: 'Retry' },
  ]);

  const handleAction = (id: string) => {
    setStuckApps((prev) => prev.filter((a) => a.id !== id));
    setFeedback(`Action executed for ${id}`);
    setTimeout(() => setFeedback(null), 3000);
  };

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
          className={`px-6 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all shadow-xl ${
            killSwitchActive
              ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
              : 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'
          }`}
        >
          {killSwitchActive ? (
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

      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-white/5 border border-white/10 text-white text-xs font-bold"
        >
          {feedback}
        </motion.div>
      )}

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {primaryKPIs.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className={`p-5 rounded-2xl border ${
                kpi.highlight
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : 'bg-white/[0.03] border-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold text-white/50 tracking-wider">
                  {kpi.label}
                </span>
                <Icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <div className="text-2xl font-black text-white">{kpi.value}</div>
              <div className="text-[11px] text-white/40 mt-0.5">{kpi.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Platform Performance & Confirmation Breakdown */}
      <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Platform Confirmation Breakdown & Conversion Metrics
            </h3>
            <p className="text-xs text-white/40">
              Defined as: Confirmation Rate = Confirmed Submissions / Total Attempts
            </p>
          </div>
          <span className="text-xs text-white/50 font-mono">Last 24 Hours & 7 Days</span>
        </div>

        <div className="rounded-2xl border border-white/5 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-white/50 uppercase font-bold text-[10px] tracking-wider border-b border-white/5">
              <tr>
                <th className="py-3 px-4">Platform</th>
                <th className="py-3 px-4">Attempts (24h)</th>
                <th className="py-3 px-4">Confirmed (24h)</th>
                <th className="py-3 px-4">Failed</th>
                <th className="py-3 px-4">Unknown / Review</th>
                <th className="py-3 px-4">Confirmation Rate</th>
                <th className="py-3 px-4">Confirmed (7d)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-[11px]">
              {platformPerformance.map((p) => (
                <tr key={p.platform} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-4 font-sans font-bold text-white flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        p.health === 'healthy'
                          ? 'bg-emerald-500'
                          : p.health === 'degraded'
                          ? 'bg-amber-400'
                          : 'bg-red-500'
                      }`}
                    />
                    {p.platform}
                  </td>
                  <td className="py-3 px-4 text-white/80">{p.attempts24h.toLocaleString()}</td>
                  <td className="py-3 px-4 text-emerald-400 font-bold">{p.confirmed.toLocaleString()}</td>
                  <td className="py-3 px-4 text-red-400">{p.failed}</td>
                  <td className="py-3 px-4 text-amber-300">{p.unknown}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold ${
                        p.rateNum >= 90
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : p.rateNum >= 80
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {p.rate}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-white/60">{p.last7dConfirmed.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Worker Fleet & Watchdog Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Workers */}
        <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              Active Playwright Worker Fleet
            </h3>
            <span className="text-xs text-white/40 font-mono">3 Running Nodes</span>
          </div>

          <div className="space-y-3">
            {workers.map((w) => (
              <div
                key={w.id}
                className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      w.status === 'healthy' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                  <div>
                    <div className="font-bold text-white">{w.id} (PID {w.pid})</div>
                    <div className="text-[11px] text-white/40">{w.currentJob}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-400 font-mono">{w.processedToday} apps</div>
                  <div className="text-[10px] text-white/40 uppercase">Processed</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stuck Applications Watchdog Table */}
        <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Watchdog: Stuck Applications Triage
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-xs">
              {stuckApps.length} Flagged
            </span>
          </div>

          <div className="rounded-2xl border border-white/5 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-white/50 uppercase font-bold text-[10px] tracking-wider border-b border-white/5">
                <tr>
                  <th className="py-2.5 px-3">App ID</th>
                  <th className="py-2.5 px-3">Role & Company</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {stuckApps.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3 font-mono text-emerald-400 font-bold">
                      {item.id}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-white">{item.role}</div>
                      <div className="text-[10px] text-white/40">{item.company}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-amber-300">
                      {item.duration}
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => handleAction(item.id)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-[11px] transition-all"
                      >
                        {item.action}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
