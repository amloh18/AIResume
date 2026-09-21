'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Server, CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  Terminal, Play, Square, RotateCcw, Download, Settings,
  ChevronDown, ChevronUp, Loader2, Wifi, WifiOff, Globe, Cpu, Inbox,
} from 'lucide-react';

interface IngestionServiceSource {
  name: string;
  displayName: string;
  health: string;
  lastSuccessAt: string | null;
}

interface IngestionServiceStatus {
  configured: boolean;
  url: string | null;
  reachable: boolean;
  schedulerRunning: boolean | null;
  status: string | null;
  sources: IngestionServiceSource[];
  error?: string;
}

interface VpsStatus {
  setupScript: { exists: boolean; path: string };
  mainVenv: { exists: boolean; python: boolean; path: string };
  linkedinVenv: { exists: boolean; python: boolean; path: string };
  workers: { jobspy: boolean; linkedin: boolean; linkedinLogin: boolean };
  browserProfile: { exists: boolean; path: string };
  environment: {
    linkedinEnabled: boolean;
    linkedinDebug: boolean;
    linkedinDryRun: boolean;
  };
  docker?: { installed: boolean; version?: string; running?: boolean };
  stalwart?: { running: boolean; status?: string; containerName?: string };
  workerGateway?: {
    configured: boolean;
    online: boolean;
    url: string | null;
    mode: 'remote-gateway' | 'local-spawn' | 'disabled';
    version?: string | null;
    workers?: Record<string, unknown> | null;
    error?: string;
  };
  ingestionService?: IngestionServiceStatus;
  workerLoop?: {
    configured: boolean;
    role: string | null;
    uptimeSeconds: number | null;
    memoryRssMb: number | null;
    loops: Record<string, unknown> | null;
  };
  _diagnostics?: {
    projectRoot: string;
    markerFound: boolean;
    markerPath: string;
    architecture?: string;
    checksProbedRemotely?: boolean;
  };
}

interface DeployAction {
  id: string;
  label: string;
  description: string;
  icon: any;
  action: string;
  options?: Record<string, any>;
  variant?: 'primary' | 'secondary' | 'danger';
}

export default function VpsSetupPanel() {
  const [status, setStatus] = useState<VpsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionResult, setActionResult] = useState<{
    action: string;
    success: boolean;
    output: string;
    errors?: string;
  } | null>(null);
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [expandedOutput, setExpandedOutput] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/vps-setup?action=status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
      }
    } catch (err) {
      console.error('VPS status fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const runAction = async (action: string, options?: Record<string, any>) => {
    setRunningAction(action);
    setActionResult(null);

    try {
      const res = await fetch('/api/admin/vps-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, options }),
      });

      const data = await res.json();
      setActionResult({
        action,
        success: data.success,
        output: data.output || data.message || '',
        errors: data.errors,
      });
    } catch (err: any) {
      setActionResult({
        action,
        success: false,
        output: '',
        errors: err.message,
      });
    } finally {
      setRunningAction(null);
    }
  };

  const deployActions: DeployAction[] = [
    {
      id: 'install-all',
      label: 'Install Everything',
      description: 'Python, Playwright, JobSpy, LinkedIn, Docker, Stalwart',
      icon: Download,
      action: 'install',
      options: { type: 'all' },
      variant: 'primary',
    },
    {
      id: 'deploy-stalwart',
      label: 'Deploy Stalwart Mail Server',
      description: 'Docker + Stalwart for application email delivery',
      icon: Download,
      action: 'install',
      options: { type: 'stalwart' },
    },
    {
      id: 'install-linkedin',
      label: 'Install LinkedIn Worker',
      description: 'Playwright + Chromium for LinkedIn',
      icon: Download,
      action: 'install',
      options: { type: 'linkedin' },
    },
    {
      id: 'install-jobspy',
      label: 'Install JobSpy Worker',
      description: 'JobSpy + Playwright for Indeed/LinkedIn/ZR',
      icon: Download,
      action: 'install',
      options: { type: 'jobspy' },
    },
    {
      id: 'verify',
      label: 'Verify Installation',
      description: 'Check all dependencies are installed',
      icon: CheckCircle2,
      action: 'verify',
    },
  ];

  const serviceActions = [
    { command: 'status', label: 'Check Status', icon: Server },
    { command: 'start', label: 'Start', icon: Play },
    { command: 'stop', label: 'Stop', icon: Square },
    { command: 'restart', label: 'Restart', icon: RotateCcw },
  ];

  const StatusItem = ({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) => (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.03]">
      <div className="flex items-center gap-2">
        {ok ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        ) : (
          <XCircle className="w-4 h-4 text-red-400" />
        )}
        <span className="text-sm text-white/80">{label}</span>
      </div>
      {detail && <span className="text-xs text-white/40 font-mono">{detail}</span>}
    </div>
  );

  const uptimeLabel = (seconds: number | null | undefined) => {
    if (seconds == null) return '—';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
  };

  if (loading && !status) {
    return (
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
          <span className="text-sm text-white/60">Loading VPS status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-emerald-400" />
            VPS Deployment & Dependencies
          </h2>
          <p className="text-sm text-white/50 mt-1">
            Manage Python workers, Playwright browsers, and systemd services on your VPS.
          </p>
        </div>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all flex items-center gap-2 text-xs font-bold disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Status Grid */}
      {status && (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-4">Installation Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <StatusItem
              label="VPS Setup Script"
              ok={status.setupScript.exists}
              detail={status.setupScript.exists ? 'Found' : 'Missing'}
            />
            <StatusItem
              label="Main Python venv"
              ok={status.mainVenv.exists && status.mainVenv.python}
              detail={status.mainVenv.exists ? 'Created' : 'Not found'}
            />
            <StatusItem
              label="LinkedIn Python venv"
              ok={status.linkedinVenv.exists && status.linkedinVenv.python}
              detail={status.linkedinVenv.exists ? 'Created' : 'Not found'}
            />
            <StatusItem
              label="JobSpy Worker"
              ok={status.workers.jobspy}
              detail={status.workers.jobspy ? 'Found' : 'Missing'}
            />
            <StatusItem
              label="LinkedIn Worker"
              ok={status.workers.linkedin}
              detail={status.workers.linkedin ? 'Found' : 'Missing'}
            />
            <StatusItem
              label="LinkedIn Login Script"
              ok={status.workers.linkedinLogin}
              detail={status.workers.linkedinLogin ? 'Found' : 'Missing'}
            />
            <StatusItem
              label="Browser Profile Dir"
              ok={status.browserProfile.exists}
              detail={status.browserProfile.exists ? 'Created' : 'Not found'}
            />
            <StatusItem
              label="LinkedIn Enabled"
              ok={status.environment.linkedinEnabled}
              detail={status.environment.linkedinEnabled ? 'Yes' : 'No'}
            />
            <StatusItem
              label="Docker"
              ok={status.docker?.installed ?? false}
              detail={status.docker?.installed ? status.docker?.version || 'Installed' : 'Not installed'}
            />
            <StatusItem
              label="Stalwart Mail Server"
              ok={status.stalwart?.running ?? false}
              detail={status.stalwart?.running ? status.stalwart?.status || 'Running' : 'Not running'}
            />
          </div>

          {/* Diagnostics */}
          {status._diagnostics && (
            <div className="mt-4 pt-3 border-t border-white/5">
              <div className="text-[10px] text-white/30 font-mono space-y-1">
                {status._diagnostics.architecture && (
                  <div className="text-emerald-400/60">Architecture: <span className="text-white/50">{status._diagnostics.architecture}</span></div>
                )}
                <div>Project root: <span className="text-white/50">{status._diagnostics.projectRoot}</span></div>
                <div>Marker file: <span className={status._diagnostics.markerFound ? 'text-emerald-400/70' : 'text-red-400/70'}>
                  {status._diagnostics.markerFound ? 'Found' : 'Not found'} — {status._diagnostics.markerPath}
                </span></div>
                {!status._diagnostics.markerFound && !status._diagnostics.checksProbedRemotely && (
                  <div className="text-yellow-400/60 mt-2">
                    Installations not detected. Run on VPS: <code className="text-emerald-400/70">sudo bash scripts/vps-setup.sh</code>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Decoupled VPS services — the web container ships none of this by design */}
      {status && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Worker gateway (JobSpy + LinkedIn) */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Wifi className="w-4 h-4 text-emerald-400" />
                Worker Gateway
              </h3>
              {status.workerGateway?.configured ? (
                <span className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono ${
                  status.workerGateway.online
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border border-red-500/20 text-red-400'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${status.workerGateway.online ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                  {status.workerGateway.online ? 'Online' : 'Offline'}
                </span>
              ) : (
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/40">
                  Not configured
                </span>
              )}
            </div>
            <div className="text-xs text-white/50 font-mono space-y-1">
              <div>URL: <span className="text-white/70">{status.workerGateway?.url || 'INGESTION_WORKER_URL not set'}</span></div>
              <div>Runs: <span className="text-white/70">JobSpy · LinkedIn browser worker</span></div>
              {status.workerGateway?.error && (
                <div className="text-red-400/70">{status.workerGateway.error}</div>
              )}
            </div>
          </div>

          {/* Ingestion microservice (public ATS sources) */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                Ingestion Microservice
              </h3>
              {status.ingestionService?.configured ? (
                <span className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono ${
                  status.ingestionService.reachable
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border border-red-500/20 text-red-400'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${status.ingestionService.reachable ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                  {status.ingestionService.reachable ? 'Online' : 'Offline'}
                </span>
              ) : (
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/40">
                  Not configured
                </span>
              )}
            </div>
            <div className="text-xs text-white/50 font-mono space-y-1">
              <div>URL: <span className="text-white/70">{status.ingestionService?.url || 'INGESTION_SERVICE_URL not set'}</span></div>
              <div>
                Scheduler: <span className={status.ingestionService?.schedulerRunning ? 'text-emerald-400/80' : 'text-white/40'}>
                  {status.ingestionService?.schedulerRunning == null ? 'unknown' : status.ingestionService.schedulerRunning ? 'running' : 'stopped'}
                </span>
                {status.ingestionService?.status && (
                  <> · Overall: <span className="text-white/70">{status.ingestionService.status}</span></>
                )}
              </div>
              {status.ingestionService?.error && (
                <div className="text-red-400/70">{status.ingestionService.error}</div>
              )}
            </div>
            {status.ingestionService?.reachable && status.ingestionService.sources.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/5">
                <div className="text-[10px] uppercase tracking-wider text-white/30 mb-2">Sources on this service</div>
                <div className="flex flex-wrap gap-1.5">
                  {status.ingestionService.sources.map((s) => (
                    <span
                      key={s.name}
                      title={`${s.displayName} — health: ${s.health}`}
                      className={`px-2 py-1 rounded-md text-[10px] font-mono border ${
                        s.health === 'healthy'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : s.health === 'degraded'
                            ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                      }`}
                    >
                      {s.displayName}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Background worker loop container */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                Background Worker
              </h3>
              {status.workerLoop?.configured ? (
                <span className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Running
                </span>
              ) : (
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/40">
                  Not configured
                </span>
              )}
            </div>
            {status.workerLoop?.configured ? (
              <div className="text-xs text-white/50 font-mono space-y-1">
                <div>Role: <span className="text-white/70">{status.workerLoop.role}</span></div>
                <div>Uptime: <span className="text-white/70">{uptimeLabel(status.workerLoop.uptimeSeconds)}</span></div>
                <div>Memory: <span className="text-white/70">{status.workerLoop.memoryRssMb ?? '—'} MB RSS</span></div>
                <div className="text-white/40 pt-1">Runs email delivery, inbox ingestion, the application queue and reconciliation — redeploys of the web tier do not interrupt them.</div>
              </div>
            ) : (
              <div className="text-xs text-white/40 font-mono">
                Set <code className="text-emerald-400/70">WORKER_HEALTH_URL</code> to surface the worker container here. Its loops run independently of web redeploys.
              </div>
            )}
          </div>

          {/* Mail server */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Inbox className="w-4 h-4 text-emerald-400" />
                Stalwart Mail Server
              </h3>
              <span className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono ${
                status.stalwart?.running
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}>
                <span className={`w-2 h-2 rounded-full ${status.stalwart?.running ? 'bg-emerald-400' : 'bg-red-400'}`} />
                {status.stalwart?.running ? 'Running' : 'Not running'}
              </span>
            </div>
            <div className="text-xs text-white/50 font-mono space-y-1">
              <div>Container: <span className="text-white/70">{status.stalwart?.containerName || 'stalwart-mail'}</span></div>
              {status.stalwart?.status && <div className="text-white/40">{status.stalwart.status}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Deploy Actions */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4">Install Dependencies</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {deployActions.map((action) => {
            const Icon = action.icon;
            const isRunning = runningAction === action.action;

            return (
              <button
                key={action.id}
                onClick={() => runAction(action.action, action.options)}
                disabled={!!runningAction}
                className={`flex items-start gap-3 p-4 rounded-xl border transition-all text-left ${
                  action.variant === 'primary'
                    ? 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20'
                    : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.05]'
                } disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${
                  action.variant === 'primary' ? 'text-emerald-400' : 'text-white/60'
                } ${isRunning ? 'animate-spin' : ''}`} />
                <div>
                  <div className="text-sm font-bold text-white">{action.label}</div>
                  <div className="text-xs text-white/40 mt-0.5">{action.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Service Management */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4">LinkedIn Worker Service</h3>
        <div className="flex items-center gap-3">
          {serviceActions.map((svc) => {
            const Icon = svc.icon;
            const isRunning = runningAction === `service-${svc.command}`;

            return (
              <button
                key={svc.command}
                onClick={() => runAction('service', {
                  service: 'buildairesume-linkedin-worker',
                  command: svc.command,
                })}
                disabled={!!runningAction}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 hover:text-white transition-all text-xs font-bold disabled:opacity-30"
              >
                <Icon className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                {svc.label}
              </button>
            );
          })}
        </div>

        <div className="mt-3">
          <button
            onClick={() => runAction('logs', {
              service: 'buildairesume-linkedin-worker',
              lines: 50,
            })}
            disabled={!!runningAction}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 hover:text-white transition-all text-xs font-bold disabled:opacity-30"
          >
            <Terminal className="w-3.5 h-3.5" />
            View Logs
          </button>
        </div>
      </div>

      {/* Action Result */}
      <AnimatePresence>
        {actionResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`rounded-2xl border p-5 ${
              actionResult.success
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-red-500/5 border-red-500/20'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {actionResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <span className="text-sm font-bold text-white">
                  {actionResult.action === 'install' ? 'Installation' :
                   actionResult.action === 'verify' ? 'Verification' :
                   actionResult.action === 'service' ? 'Service' :
                   actionResult.action === 'logs' ? 'Logs' :
                   'Action'} — {actionResult.success ? 'Success' : 'Failed'}
                </span>
              </div>
              <button
                onClick={() => setActionResult(null)}
                className="text-white/40 hover:text-white"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            {actionResult.output && (
              <div className="mt-3">
                <button
                  onClick={() => setExpandedOutput(!expandedOutput)}
                  className="flex items-center gap-1 text-xs text-white/50 hover:text-white/70 mb-1"
                >
                  {expandedOutput ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {expandedOutput ? 'Hide' : 'Show'} Output
                </button>
                {expandedOutput && (
                  <pre className="text-xs text-white/60 bg-black/30 rounded-xl p-4 overflow-x-auto max-h-80 overflow-y-auto font-mono whitespace-pre-wrap">
                    {actionResult.output}
                  </pre>
                )}
              </div>
            )}

            {actionResult.errors && (
              <pre className="text-xs text-red-400/80 bg-black/30 rounded-xl p-4 mt-2 overflow-x-auto max-h-40 overflow-y-auto font-mono whitespace-pre-wrap">
                {actionResult.errors}
              </pre>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Setup Guide */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-3">Quick Setup Guide</h3>
        <div className="space-y-2 text-xs text-white/50 font-mono">
          <div className="flex items-start gap-2">
            <span className="text-emerald-400 font-bold">1.</span>
            <span>Click &quot;Install All Dependencies&quot; above (or run on VPS: <code className="text-emerald-400">sudo bash scripts/vps-setup.sh</code>)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-400 font-bold">2.</span>
            <span>Run LinkedIn login: <code className="text-emerald-400">python3 scripts/linkedin-worker/login_linkedin.py</code></span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-400 font-bold">3.</span>
            <span>Set <code className="text-emerald-400">LINKEDIN_ENABLED=true</code> in your .env file</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-400 font-bold">4.</span>
            <span>Click &quot;Start&quot; to launch the LinkedIn worker service</span>
          </div>
        </div>
      </div>
    </div>
  );
}
