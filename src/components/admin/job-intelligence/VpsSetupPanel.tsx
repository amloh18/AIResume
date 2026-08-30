'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Server, CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  Terminal, Play, Square, RotateCcw, Download, Settings,
  ChevronDown, ChevronUp, Loader2,
} from 'lucide-react';

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
  _diagnostics?: { projectRoot: string; markerFound: boolean; markerPath: string };
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
                <div>Project root: <span className="text-white/50">{status._diagnostics.projectRoot}</span></div>
                <div>Marker file: <span className={status._diagnostics.markerFound ? 'text-emerald-400/70' : 'text-red-400/70'}>
                  {status._diagnostics.markerFound ? 'Found' : 'Not found'} — {status._diagnostics.markerPath}
                </span></div>
                {!status._diagnostics.markerFound && (
                  <div className="text-yellow-400/60 mt-2">
                    Installations not detected. Run on VPS: <code className="text-emerald-400/70">sudo bash scripts/vps-setup.sh</code>
                  </div>
                )}
              </div>
            </div>
          )}
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
