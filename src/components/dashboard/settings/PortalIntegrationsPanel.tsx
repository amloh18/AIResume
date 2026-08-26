'use client';

import React, { useState, useEffect } from 'react';
import {
  Globe,
  Briefcase,
  Building2,
  Search,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Shield,
  Zap,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
  Plus,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PortalConnectModal, { PortalType } from './PortalConnectModal';

interface PortalCapabilities {
  jobDiscovery: boolean;
  jobDetails: boolean;
  jobSave: boolean;
  application: boolean;
  applicationStatus: boolean;
}

interface PortalItem {
  id: PortalType;
  provider: PortalType;
  name: string;
  category: string;
  authMethod: string;
  isPublicFeed: boolean;
  status: 'connected' | 'disconnected' | 'expired' | 'reauth_required';
  health: 'healthy' | 'degraded' | 'expired' | 'disconnected' | 'reauth_required';
  account?: {
    displayName?: string;
    email?: string;
  };
  capabilities: PortalCapabilities;
  lastSyncedAt?: string;
  stats: {
    jobsDiscovered: number;
    applications: number;
  };
  connectionId?: string;
}

interface PortalIntegrationsPanelProps {
  onConnectionChange?: (connected: boolean) => void;
}

const PORTAL_METADATA: Record<
  string,
  {
    icon: any;
    color: string;
    borderHover: string;
    gradient: string;
    desc: string;
  }
> = {
  naukri: {
    icon: Globe,
    color: 'bg-blue-600',
    borderHover: 'hover:border-blue-500/50',
    gradient:
      'from-blue-50/70 via-white to-lime-50/30 dark:from-blue-950/20 dark:via-[#141810] dark:to-lime-950/10',
    desc: 'Connect your Naukri account to discover tech jobs and use supported application features.',
  },
  indeed: {
    icon: Briefcase,
    color: 'bg-indigo-600',
    borderHover: 'hover:border-indigo-500/50',
    gradient:
      'from-indigo-50/70 via-white to-lime-50/30 dark:from-indigo-950/20 dark:via-[#141810] dark:to-lime-950/10',
    desc: 'Connect your Indeed account to personalize job discovery and supported application features.',
  },
  linkedin: {
    icon: Globe,
    color: 'bg-sky-600',
    borderHover: 'hover:border-sky-500/50',
    gradient:
      'from-sky-50/70 via-white to-lime-50/30 dark:from-sky-950/20 dark:via-[#141810] dark:to-lime-950/10',
    desc: 'Connect LinkedIn to personalize role recommendations and network insights.',
  },
  greenhouse: {
    icon: Building2,
    color: 'bg-emerald-600',
    borderHover: 'hover:border-emerald-500/50',
    gradient:
      'from-emerald-50/70 via-white to-lime-50/30 dark:from-emerald-950/20 dark:via-[#141810] dark:to-lime-950/10',
    desc: 'Direct integration with Greenhouse ATS boards (Stripe, Airbnb, Figma, GitLab, Monzo).',
  },
  adzuna: {
    icon: Search,
    color: 'bg-amber-600',
    borderHover: 'hover:border-amber-500/50',
    gradient:
      'from-amber-50/70 via-white to-lime-50/30 dark:from-amber-950/20 dark:via-[#141810] dark:to-lime-950/10',
    desc: 'Free public global job index aggregating millions of vacancies with salary data.',
  },
  lever: {
    icon: Briefcase,
    color: 'bg-violet-600',
    borderHover: 'hover:border-violet-500/50',
    gradient:
      'from-violet-50/70 via-white to-lime-50/30 dark:from-violet-950/20 dark:via-[#141810] dark:to-lime-950/10',
    desc: 'Direct postings from Lever-powered career pages (Netflix, Notion, Figma, Spotify, OpenAI).',
  },
  ashby: {
    icon: Layers,
    color: 'bg-rose-600',
    borderHover: 'hover:border-rose-500/50',
    gradient:
      'from-rose-50/70 via-white to-lime-50/30 dark:from-rose-950/20 dark:via-[#141810] dark:to-lime-950/10',
    desc: 'Compensation-enriched Ashby career boards (Notion, Figma, Ramp, Vercel).',
  },
  workable: {
    icon: Search,
    color: 'bg-cyan-600',
    borderHover: 'hover:border-cyan-500/50',
    gradient:
      'from-cyan-50/70 via-white to-lime-50/30 dark:from-cyan-950/20 dark:via-[#141810] dark:to-lime-950/10',
    desc: 'Public Workable job boards for fast-growth startups and tech agencies.',
  },
};

export const PortalIntegrationsPanel: React.FC<PortalIntegrationsPanelProps> = ({
  onConnectionChange,
}) => {
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [selectedPortal, setSelectedPortal] = useState<PortalType | null>(null);
  const [portals, setPortals] = useState<PortalItem[]>([]);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/portal-connections');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.connections)) {
          setPortals(data.connections);
          if (onConnectionChange) {
            const hasActiveUserConnection = data.connections.some(
              (c: PortalItem) => !c.isPublicFeed && c.status === 'connected'
            );
            onConnectionChange(hasActiveUserConnection);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch portal connections:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSyncNow = async (portal: PortalItem) => {
    const targetId = portal.connectionId || portal.id;
    try {
      setSyncingId(portal.id);
      const res = await fetch(`/api/portal-connections/${targetId}/sync`, {
        method: 'POST',
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(
          `Synced ${data.jobsCreated || 0} new jobs from ${portal.name}!`
        );
        await fetchStatus();
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error: any) {
      toast.error(error.message || `Failed to sync ${portal.name}.`);
    } finally {
      setSyncingId(null);
    }
  };

  const handleDisconnect = async (portal: PortalItem) => {
    if (!confirm(`Are you sure you want to disconnect your ${portal.name} account?`)) return;

    const targetId = portal.connectionId || portal.id;
    try {
      setDisconnectingId(portal.id);
      const res = await fetch(`/api/portal-connections?id=${targetId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Disconnect failed');
      toast.success(`${portal.name} account disconnected`);
      await fetchStatus();
    } catch (error: any) {
      toast.error(error.message || 'Failed to disconnect');
    } finally {
      setDisconnectingId(null);
    }
  };

  const formatLastSync = (dateStr?: string) => {
    if (!dateStr) return 'Not yet synced';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffMin < 2) return 'Just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="p-6 sm:p-8 space-y-4 animate-pulse">
        <div className="h-6 w-56 bg-gray-200 dark:bg-white/10 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-48 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl" />
          <div className="h-48 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl" />
          <div className="h-48 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl" />
          <div className="h-48 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 space-y-6 min-w-0 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-h3 font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-lime-600 dark:text-[#013f2e]" />
            Connected Job Portals
          </h3>
          <p className="mt-1 text-small text-gray-500 dark:text-gray-400">
            Connect your career accounts to discover tailored jobs and synchronize application pipelines across portals.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSelectedPortal('naukri')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#013f2e] hover:brightness-95 text-black shadow-sm shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Connect Portal
        </button>
      </div>

      {/* Portals Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {portals.map((portal) => {
          const meta = PORTAL_METADATA[portal.id] || {
            icon: Globe,
            color: 'bg-emerald-600',
            borderHover: 'hover:border-emerald-500/50',
            gradient: 'from-emerald-50/70 via-white to-lime-50/30',
            desc: 'Job portal stream',
          };

          const IconComp = meta.icon;
          const isConnected = portal.status === 'connected';
          const isSyncing = syncingId === portal.id;
          const isDisconnecting = disconnectingId === portal.id;

          return (
            <div
              key={portal.id}
              className={`rounded-2xl border border-gray-200 dark:border-white/10 bg-gradient-to-br ${meta.gradient} p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group ${meta.borderHover}`}
            >
              <div>
                {/* Top Info Bar */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl ${meta.color} flex items-center justify-center text-white shadow-md shrink-0`}
                    >
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 dark:text-white text-base">
                          {portal.name}
                        </span>
                        {portal.isPublicFeed && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 uppercase">
                            Direct ATS
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 block">
                        {portal.category}
                      </span>
                    </div>
                  </div>

                  <div>
                    {isConnected ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-lime-500/15 text-lime-700 dark:text-lime-400 border border-lime-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-lime-500 animate-pulse" />
                        Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400 border border-gray-200 dark:border-white/10">
                        Not Connected
                      </span>
                    )}
                  </div>
                </div>

                {/* Account Details if connected */}
                {isConnected && portal.account?.email && (
                  <div className="mb-3 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-white/[0.04] border border-gray-100 dark:border-white/5 text-xs text-gray-700 dark:text-gray-300 flex items-center justify-between">
                    <span className="font-medium truncate">{portal.account.email}</span>
                    <span className="text-[11px] text-gray-400 shrink-0 ml-2">
                      Synced {formatLastSync(portal.lastSyncedAt)}
                    </span>
                  </div>
                )}

                {/* Description */}
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                  {meta.desc}
                </p>

                {/* Capabilities checklist */}
                <div className="mb-3 space-y-1 text-[11px]">
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Job discovery & profile matching</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Job details & salary insight extraction</span>
                  </div>
                  {portal.capabilities.application ? (
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Supported 1-click application automation</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium">
                      <Info className="w-3.5 h-3.5" />
                      <span>Application automation subject to integration availability</span>
                    </div>
                  )}
                </div>

                {/* Mini Stats Grid */}
                <div className="grid grid-cols-2 gap-2 mb-4 p-2.5 rounded-xl bg-white/70 dark:bg-black/20 border border-gray-100 dark:border-white/5 text-xs">
                  <div>
                    <span className="text-gray-400 text-[11px] block">Jobs Discovered</span>
                    <span className="font-bold text-gray-900 dark:text-white text-small">
                      {portal.stats.jobsDiscovered || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[11px] block">Applications</span>
                    <span className="font-bold text-lime-600 dark:text-lime-400 text-small">
                      {portal.stats.applications || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="pt-3 border-t border-gray-200/70 dark:border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                  <Shield className="w-3.5 h-3.5 text-lime-600 dark:text-[#013f2e]" />
                  <span>
                    {portal.isPublicFeed
                      ? 'Direct ATS Feed'
                      : isConnected
                      ? 'Secure Encrypted Connection'
                      : 'Not Connected'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isConnected && !portal.isPublicFeed ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSyncNow(portal)}
                        disabled={isSyncing}
                        className="px-3 py-1.5 text-xs font-semibold text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        {isSyncing ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        Sync Now
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPortal(portal.id)}
                        className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors"
                        title="Manage Connection Preferences"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDisconnect(portal)}
                        disabled={isDisconnecting}
                        className="px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl transition-colors flex items-center gap-1"
                      >
                        {isDisconnecting ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedPortal(portal.id)}
                      className={`px-4 py-1.5 text-xs font-semibold text-white ${meta.color} hover:opacity-90 rounded-xl transition-all shadow-sm flex items-center gap-1.5`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      {portal.isPublicFeed ? 'Configure Feed' : `Connect ${portal.name.split(' ')[0]}`}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Connect Modal */}
      {selectedPortal && (
        <PortalConnectModal
          portal={selectedPortal}
          isOpen={Boolean(selectedPortal)}
          onClose={() => setSelectedPortal(null)}
          onSuccess={fetchStatus}
        />
      )}
    </div>
  );
};

export default PortalIntegrationsPanel;
