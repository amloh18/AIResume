'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Save, Shield, Clock, Sliders, CheckCircle2,
  AlertTriangle, RefreshCw, Activity, Zap,
  Key, Cpu, Timer, Eye, EyeOff
} from 'lucide-react';

export interface PortalSourceData {
  source: string;
  name?: string;
  displayName?: string;
  enabled: boolean;
  healthy: boolean;
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
  priority?: number;
  schedule?: {
    frequencyMinutes?: number;
    cooldownMinutes?: number;
  };
  limits?: {
    maxJobsPerRun?: number;
    concurrency?: number;
    timeoutMs?: number;
    retryCount?: number;
  };
  credentials?: {
    apiKey?: string;
    appId?: string;
  };
}

interface PortalSettingsSidebarProps {
  isOpen: boolean;
  source: PortalSourceData | null;
  onClose: () => void;
  onSaved: () => void;
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

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function PortalSettingsSidebar({
  isOpen,
  source,
  onClose,
  onSaved,
}: PortalSettingsSidebarProps) {
  const [enabled, setEnabled] = useState(true);
  const [frequencyMinutes, setFrequencyMinutes] = useState(180);
  const [cooldownMinutes, setCooldownMinutes] = useState(10);
  const [priority, setPriority] = useState(80);
  const [maxJobs, setMaxJobs] = useState(500);
  const [concurrency, setConcurrency] = useState(5);
  const [timeoutSeconds, setTimeoutSeconds] = useState(30);
  const [retryCount, setRetryCount] = useState(3);
  const [apiKey, setApiKey] = useState('');
  const [appId, setAppId] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  const [activeTab, setActiveTab] = useState<'general' | 'schedule' | 'limits' | 'auth'>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [triggerSuccess, setTriggerSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state when source prop changes
  useEffect(() => {
    if (source) {
      setEnabled(source.enabled !== false);
      const defaultFreqMs = source.registryDef?.refreshIntervalMs || 3 * 60 * 60 * 1000;
      setFrequencyMinutes(source.schedule?.frequencyMinutes || Math.round(defaultFreqMs / 60000));
      setCooldownMinutes(source.schedule?.cooldownMinutes || 10);
      setPriority(source.priority || 80);
      setMaxJobs(source.limits?.maxJobsPerRun || source.registryDef?.maxResults || 500);
      setConcurrency(source.limits?.concurrency || 5);
      setTimeoutSeconds(Math.round((source.limits?.timeoutMs || 30000) / 1000));
      setRetryCount(source.limits?.retryCount || 3);
      setApiKey(source.credentials?.apiKey || '');
      setAppId(source.credentials?.appId || '');
      setSaveSuccess(false);
      setTriggerSuccess(false);
      setErrorMessage(null);
    }
  }, [source]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !source) return null;

  const sourceName = source.source || (source as any).name || 'portal';
  const displayName = source.registryDef?.name || source.displayName || sourceName;
  const sourceType = source.registryDef?.type || 'api';
  const isApiKeySource = sourceType === 'api_key' || source.configStatus?.ready === false;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const payload = {
        action: 'update_source',
        sourceName,
        sourceConfig: {
          enabled,
          priority: Number(priority),
          schedule: {
            frequencyMinutes: Number(frequencyMinutes),
            cooldownMinutes: Number(cooldownMinutes),
          },
          limits: {
            maxJobsPerRun: Number(maxJobs),
            concurrency: Number(concurrency),
            timeoutMs: Number(timeoutSeconds) * 1000,
            retryCount: Number(retryCount),
          },
          credentials: {
            apiKey: apiKey.trim(),
            appId: appId.trim(),
          },
        },
      };

      const res = await fetch('/api/admin/job-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success !== false) {
        setSaveSuccess(true);
        setTimeout(() => {
          onSaved();
          setSaveSuccess(false);
        }, 1200);
      } else {
        setErrorMessage(data.error || 'Failed to save portal settings');
      }
    } catch (err: any) {
      console.error('Save portal settings error:', err);
      setErrorMessage(err.message || 'Network error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerRun = async () => {
    setIsTriggering(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/admin/ingestion-monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger_source', sourceName }),
      });

      const data = await res.json();

      if (res.ok) {
        setTriggerSuccess(true);
        setTimeout(() => {
          onSaved();
          setTriggerSuccess(false);
        }, 2000);
      } else {
        setErrorMessage(data.error || 'Failed to trigger ingestion run');
      }
    } catch (err: any) {
      console.error('Trigger run error:', err);
      setErrorMessage(err.message || 'Network error occurred');
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex justify-end">
        {/* Backdrop Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        />

        {/* Slide-over Sidebar */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="relative w-full max-w-xl bg-[#0d120a] border-l border-white/10 text-white shadow-2xl flex flex-col h-full z-10 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 bg-[#12190e]/80 backdrop-blur-md shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white tracking-tight">{displayName}</h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/5 text-white/50 border border-white/10">
                      {sourceType}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 mt-0.5">
                    {source.registryDef?.description || `Source identifier: ${sourceName}`}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Diagnostic Strip */}
            <div className="grid grid-cols-3 gap-2 mt-5">
              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-2.5 text-center">
                <div className="text-[10px] text-white/40 uppercase font-semibold">Health Status</div>
                <div className="flex items-center justify-center gap-1 text-xs font-bold mt-0.5">
                  {source.healthy ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Healthy
                    </span>
                  ) : source.consecutiveFailures > 0 ? (
                    <span className="text-red-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Failing ({source.consecutiveFailures})
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Standby
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-2.5 text-center">
                <div className="text-[10px] text-white/40 uppercase font-semibold">Avg Yield</div>
                <div className="text-xs font-bold text-white mt-0.5 flex items-center justify-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" /> {source.avgYield} jobs
                </div>
              </div>

              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-2.5 text-center">
                <div className="text-[10px] text-white/40 uppercase font-semibold">Last Success</div>
                <div className="text-xs font-bold text-white mt-0.5">
                  {timeAgo(source.lastSuccessAt)}
                </div>
              </div>
            </div>

            {/* Sub-tab Navigation */}
            <div className="flex items-center gap-1 mt-5 p-1 rounded-xl bg-white/[0.03] border border-white/5">
              {[
                { id: 'general', label: 'General', icon: Sliders },
                { id: 'schedule', label: 'Schedule', icon: Clock },
                { id: 'limits', label: 'Limits & Rate', icon: Cpu },
                { id: 'auth', label: 'Auth & Keys', icon: Key },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all ${
                      active
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Error Message */}
            {errorMessage && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-4">
                {/* Enabled Toggle Card */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                  <div>
                    <div className="font-bold text-sm text-white">Enable Portal Ingestion</div>
                    <div className="text-xs text-white/40 mt-0.5">
                      Include in scheduled scans, demand refreshes, and continuous job fetching.
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* Ingestion Priority */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-white/70">
                        Ingestion Priority (1 - 100)
                      </label>
                      <p className="text-[11px] text-white/40 mt-0.5">
                        Higher priority sources are processed first in demand scheduling.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-mono font-bold text-xs border border-emerald-500/20">
                      {priority}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-white/30 font-mono">
                    <span>1 (Low)</span>
                    <span>50 (Normal)</span>
                    <span>100 (Urgent)</span>
                  </div>
                </div>

                {/* Source Metadata & Config status */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-white/70">
                    Source Engine Metadata
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="text-[10px] text-white/40">Source ID</div>
                      <div className="font-mono text-white mt-0.5">{sourceName}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="text-[10px] text-white/40">Connector Type</div>
                      <div className="font-mono text-white mt-0.5 uppercase">{sourceType}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="text-[10px] text-white/40">Config Status</div>
                      <div className="mt-0.5">
                        {source.configStatus.ready ? (
                          <span className="text-emerald-400 font-bold">Ready</span>
                        ) : (
                          <span className="text-amber-400 font-bold">{source.configStatus.reason || 'Missing Keys'}</span>
                        )}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="text-[10px] text-white/40">Avg Duration</div>
                      <div className="font-mono text-white mt-0.5">{formatDuration(source.avgDuration)}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Schedule Tab */}
            {activeTab === 'schedule' && (
              <div className="space-y-4">
                {/* Refresh Frequency */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/70">
                    Scraping Frequency / Cadence
                  </label>
                  <p className="text-[11px] text-white/40">
                    How frequently this portal should be queried for fresh jobs.
                  </p>
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    {[
                      { label: '1 hour', mins: 60 },
                      { label: '3 hours', mins: 180 },
                      { label: '6 hours', mins: 360 },
                      { label: '8 hours', mins: 480 },
                      { label: '12 hours', mins: 720 },
                      { label: '24 hours', mins: 1440 },
                    ].map((preset) => (
                      <button
                        key={preset.mins}
                        type="button"
                        onClick={() => setFrequencyMinutes(preset.mins)}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                          frequencyMinutes === preset.mins
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-white/5 border-white/5 text-white/60 hover:text-white'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative pt-2">
                    <Clock className="absolute left-3.5 top-5 w-4 h-4 text-white/30" />
                    <input
                      type="number"
                      min="5"
                      max="10080"
                      value={frequencyMinutes}
                      onChange={(e) => setFrequencyMinutes(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-16 text-white focus:outline-none focus:border-emerald-500 font-mono text-xs"
                      placeholder="Minutes"
                    />
                    <span className="absolute right-3.5 top-4 text-xs text-white/40">mins</span>
                  </div>
                </div>

                {/* Cooldown Period */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/70">
                    Run Cooldown Period (Minutes)
                  </label>
                  <p className="text-[11px] text-white/40">
                    Minimum safety delay before another run can be executed for this portal.
                  </p>
                  <div className="relative pt-1">
                    <Timer className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      value={cooldownMinutes}
                      onChange={(e) => setCooldownMinutes(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-16 text-white focus:outline-none focus:border-emerald-500 font-mono text-xs"
                      placeholder="Cooldown in minutes"
                    />
                    <span className="absolute right-3.5 top-3 text-xs text-white/40">mins</span>
                  </div>
                </div>

                {/* Next Eligible Run Display */}
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="text-xs font-bold text-white">Next Eligible Run</div>
                      <div className="text-[11px] text-white/40">
                        {source.nextEligibleRun ? new Date(source.nextEligibleRun).toLocaleString() : 'Ready now'}
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {source.isDue ? 'Due Now' : 'Scheduled'}
                  </span>
                </div>
              </div>
            )}

            {/* Limits & Rate Tab */}
            {activeTab === 'limits' && (
              <div className="space-y-4">
                {/* Max Jobs per Run */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/70">
                    Max Jobs Per Ingestion Batch
                  </label>
                  <p className="text-[11px] text-white/40">
                    Upper bound of job postings collected in a single crawl/fetch cycle.
                  </p>
                  <div className="relative pt-1">
                    <Zap className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
                    <input
                      type="number"
                      min="10"
                      max="10000"
                      value={maxJobs}
                      onChange={(e) => setMaxJobs(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-16 text-white focus:outline-none focus:border-emerald-500 font-mono text-xs"
                      placeholder="e.g. 500"
                    />
                    <span className="absolute right-3.5 top-3 text-xs text-white/40">jobs/run</span>
                  </div>
                </div>

                {/* Concurrency & Timeout */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/70">
                      Concurrency Limit
                    </label>
                    <p className="text-[10px] text-white/40">Parallel workers</p>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={concurrency}
                      onChange={(e) => setConcurrency(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-emerald-500 font-mono text-xs"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/70">
                      Timeout (Seconds)
                    </label>
                    <p className="text-[10px] text-white/40">Max request time</p>
                    <input
                      type="number"
                      min="5"
                      max="300"
                      value={timeoutSeconds}
                      onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-emerald-500 font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Retry Count */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/70">
                    Max Retry Attempts on Failure
                  </label>
                  <p className="text-[11px] text-white/40">
                    Number of exponential backoff retry cycles before marking run failed.
                  </p>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={retryCount}
                    onChange={(e) => setRetryCount(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-emerald-500 font-mono text-xs"
                  />
                </div>
              </div>
            )}

            {/* Auth & Keys Tab */}
            {activeTab === 'auth' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/70">
                      Portal API Key / Secret
                    </label>
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <Shield className="w-3 h-3" /> Encrypted at rest
                    </span>
                  </div>
                  <p className="text-[11px] text-white/40">
                    {isApiKeySource
                      ? 'Required for authenticating and querying this portal provider.'
                      : 'Optional API credentials or token if using authenticated tier.'}
                  </p>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={isApiKeySource ? 'Enter API Key' : 'Not required for public API'}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-3 pr-10 text-white focus:outline-none focus:border-emerald-500 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-2.5 text-white/40 hover:text-white transition-colors"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Application ID (for services like Adzuna) */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/70">
                    App ID / Client Identifier (Optional)
                  </label>
                  <p className="text-[11px] text-white/40">
                    Required for dual-key portals (e.g. Adzuna App ID, Workday tenant ID).
                  </p>
                  <input
                    type="text"
                    value={appId}
                    onChange={(e) => setAppId(e.target.value)}
                    placeholder="e.g. app_id_12345"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-emerald-500 font-mono text-xs"
                  />
                </div>
              </div>
            )}
          </form>

          {/* Footer Action Controls */}
          <div className="p-6 border-t border-white/10 bg-[#12190e]/90 backdrop-blur-md shrink-0 flex items-center justify-between gap-3">
            {/* Quick Trigger Button */}
            <button
              type="button"
              onClick={handleTriggerRun}
              disabled={isTriggering || isSaving || !enabled}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="Trigger an immediate manual ingestion run"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTriggering ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{isTriggering ? 'Running...' : triggerSuccess ? 'Triggered!' : 'Run Now'}</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-bold transition-all"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isTriggering}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Settings'}
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
