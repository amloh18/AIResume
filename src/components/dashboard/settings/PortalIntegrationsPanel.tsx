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
  ExternalLink,
  Settings,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import PortalConnectModal, { PortalType } from './PortalConnectModal';

interface PortalStats {
  totalFetched: number;
  totalApplied: number;
  lastAppliedAt?: string;
}

interface PortalState {
  connected: boolean;
  sessionStatus: 'active' | 'expired' | 'disconnected';
  connectedAt?: string;
  lastSyncedAt?: string;
  userEmail?: string;
  stats: PortalStats;
}

interface PortalIntegrationsPanelProps {
  onConnectionChange?: (connected: boolean) => void;
}

interface PortalCardConfig {
  id: PortalType;
  name: string;
  category: string;
  icon: any;
  color: string;
  borderHover: string;
  gradient: string;
  desc: string;
  authType: string;
  isPublicApi?: boolean;
}

const PORTALS: PortalCardConfig[] = [
  {
    id: 'naukri',
    name: 'Naukri.com',
    category: 'India & Middle East Leader',
    icon: Globe,
    color: 'bg-blue-600',
    borderHover: 'hover:border-blue-500/50',
    gradient: 'from-blue-50/70 via-white to-lime-50/30 dark:from-blue-950/20 dark:via-[#141810] dark:to-lime-950/10',
    desc: 'Automatically stream fresh tech roles from Naukri matching your profile and submit 1-click applications.',
    authType: 'Session Key / Token',
  },
  {
    id: 'indeed',
    name: 'Indeed Global',
    category: 'Worldwide #1 Job Board',
    icon: Briefcase,
    color: 'bg-indigo-600',
    borderHover: 'hover:border-indigo-500/50',
    gradient: 'from-indigo-50/70 via-white to-lime-50/30 dark:from-indigo-950/20 dark:via-[#141810] dark:to-lime-950/10',
    desc: 'Access millions of tech jobs across the US, UK, India, and global remote tech employers.',
    authType: 'Session Key / Token',
  },
  {
    id: 'greenhouse',
    name: 'Greenhouse ATS',
    category: 'Direct Unicorn & Enterprise Boards',
    icon: Building2,
    color: 'bg-emerald-600',
    borderHover: 'hover:border-emerald-500/50',
    gradient: 'from-emerald-50/70 via-white to-lime-50/30 dark:from-emerald-950/20 dark:via-[#141810] dark:to-lime-950/10',
    desc: 'Direct integration with Greenhouse ATS boards (Stripe, Airbnb, Monzo, Figma, Deliveroo, Gitlab).',
    authType: 'Direct ATS Board Stream',
    isPublicApi: true,
  },
  {
    id: 'adzuna',
    name: 'Adzuna Free Index',
    category: 'Global Search Aggregator',
    icon: Search,
    color: 'bg-amber-600',
    borderHover: 'hover:border-amber-500/50',
    gradient: 'from-amber-50/70 via-white to-lime-50/30 dark:from-amber-950/20 dark:via-[#141810] dark:to-lime-950/10',
    desc: 'Free public global job index aggregating millions of vacancies with real-time salary insights.',
    authType: 'Free Public Index / API',
    isPublicApi: true,
  },
  {
    id: 'lever',
    name: 'Lever Job Postings',
    category: 'Startup & Tech Boards',
    icon: Briefcase,
    color: 'bg-violet-600',
    borderHover: 'hover:border-violet-500/50',
    gradient: 'from-violet-50/70 via-white to-lime-50/30 dark:from-violet-950/20 dark:via-[#141810] dark:to-lime-950/10',
    desc: 'Direct postings from Lever-powered career pages (Netflix, Notion, Figma, Spotify, OpenAI).',
    authType: 'Direct Public API',
    isPublicApi: true,
  },
  {
    id: 'ashby',
    name: 'Ashby Job Boards',
    category: 'Compensation-Enriched Boards',
    icon: Building2,
    color: 'bg-rose-600',
    borderHover: 'hover:border-rose-500/50',
    gradient: 'from-rose-50/70 via-white to-lime-50/30 dark:from-rose-950/20 dark:via-[#141810] dark:to-lime-950/10',
    desc: 'Public Ashby boards with salary/compensation data included (Notion, Figma, Ramp, Vercel).',
    authType: 'Direct Public API',
    isPublicApi: true,
  },
  {
    id: 'workable',
    name: 'Workable Job Boards',
    category: 'SMB & Agency Boards',
    icon: Search,
    color: 'bg-cyan-600',
    borderHover: 'hover:border-cyan-500/50',
    gradient: 'from-cyan-50/70 via-white to-lime-50/30 dark:from-cyan-950/20 dark:via-[#141810] dark:to-lime-950/10',
    desc: 'Public Workable job boards for SMBs and agencies (Zapier, Sentry, Automattic, GitBook).',
    authType: 'Direct Public API',
    isPublicApi: true,
  },
];

export const PortalIntegrationsPanel: React.FC<PortalIntegrationsPanelProps> = ({
  onConnectionChange,
}) => {
  const [loading, setLoading] = useState(true);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [selectedPortal, setSelectedPortal] = useState<PortalType | null>(null);

  const [naukriData, setNaukriData] = useState<PortalState | null>(null);
  const [indeedData, setIndeedData] = useState<PortalState | null>(null);
  const [portalStats, setPortalStats] = useState<Map<string, PortalStats>>(new Map());

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const [naukriRes, indeedRes, statsRes] = await Promise.all([
        fetch('/api/integrations/naukri/session'),
        fetch('/api/integrations/indeed/session'),
        fetch('/api/jobs/portal-stats'),
      ]);

      if (naukriRes.ok) {
        const nJson = await naukriRes.json();
        setNaukriData(nJson);
      }

      if (indeedRes.ok) {
        const iJson = await indeedRes.json();
        setIndeedData(iJson);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        const map = new Map<string, PortalStats>();
        for (const s of statsData.stats || []) {
          map.set(s.portal, { totalFetched: s.jobsDiscovered, totalApplied: s.applications });
        }
        setPortalStats(map);
      }

      if (onConnectionChange) {
        const anyConnected =
          naukriData?.sessionStatus === 'active' || indeedData?.sessionStatus === 'active';
        onConnectionChange(anyConnected);
      }
    } catch (error) {
      console.error('Failed to fetch portal statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const getPortalStatus = (portalId: PortalType): { connected: boolean; statusLabel: string; stats: PortalStats } => {
    // Merge real per-portal stats from the database
    const realStats = portalStats.get(portalId) || { totalFetched: 0, totalApplied: 0 };

    if (portalId === 'naukri') {
      const active = naukriData?.sessionStatus === 'active';
      return {
        connected: active,
        statusLabel: active ? 'Connected & Active' : 'Not Linked',
        stats: {
          totalFetched: realStats.totalFetched || naukriData?.stats?.totalFetched || 0,
          totalApplied: realStats.totalApplied || naukriData?.stats?.totalApplied || 0,
        },
      };
    }
    if (portalId === 'indeed') {
      const active = indeedData?.sessionStatus === 'active';
      return {
        connected: active,
        statusLabel: active ? 'Connected & Active' : 'Not Linked',
        stats: {
          totalFetched: realStats.totalFetched || indeedData?.stats?.totalFetched || 0,
          totalApplied: realStats.totalApplied || indeedData?.stats?.totalApplied || 0,
        },
      };
    }
    // Greenhouse, Adzuna, Lever, Ashby, Workable are public APIs — no user login required
    return {
      connected: false,
      statusLabel: 'Available (No login required)',
      stats: realStats,
    };
  };

  const handleDisconnect = async (portalId: PortalType, portalName: string) => {
    if (!confirm(`Are you sure you want to disconnect your ${portalName} account?`)) return;

    try {
      setDisconnectingId(portalId);
      const endpoint =
        portalId === 'naukri'
          ? '/api/integrations/naukri/session'
          : '/api/integrations/indeed/session';

      const res = await fetch(endpoint, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Disconnect failed');
      toast.success(`${portalName} account disconnected`);
      await fetchStatus();
    } catch (error: any) {
      toast.error(error.message || 'Failed to disconnect');
    } finally {
      setDisconnectingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 sm:p-8 space-y-4 animate-pulse">
        <div className="h-6 w-48 bg-gray-200 dark:bg-white/10 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-44 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl" />
          <div className="h-44 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl" />
          <div className="h-44 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl" />
          <div className="h-44 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 space-y-6 min-w-0 max-w-full">
      {/* Header */}
      <div>
        <h3 className="text-h3 font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Globe className="w-5 h-5 text-lime-600" />
          Connected Job Portals & Platforms
        </h3>
        <p className="mt-1 text-small text-gray-500 dark:text-gray-400">
          Manage your credentials, direct ATS feeds, and background synchronization streams.
        </p>
      </div>

      {/* Portals Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PORTALS.map((portal) => {
          const { connected, statusLabel, stats } = getPortalStatus(portal.id);
          const IconComp = portal.icon;
          const isDisconnecting = disconnectingId === portal.id;

          return (
            <div
              key={portal.id}
              className={`rounded-2xl border border-gray-200 dark:border-white/10 bg-gradient-to-br ${portal.gradient} p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group ${portal.borderHover}`}
            >
              <div>
                {/* Top Info Bar */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl ${portal.color} flex items-center justify-center text-white shadow-md shrink-0`}
                    >
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 dark:text-white text-base">
                          {portal.name}
                        </span>
                        {portal.isPublicApi && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 uppercase">
                            Free Stream
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 block">
                        {portal.category}
                      </span>
                    </div>
                  </div>

                  <div>
                    {connected ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-lime-500/15 text-lime-700 dark:text-lime-400 border border-lime-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        {statusLabel}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                        <AlertCircle className="w-3 h-3" />
                        {statusLabel}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  {portal.desc}
                </p>

                {/* Mini Stats Grid */}
                <div className="grid grid-cols-2 gap-2 mb-4 p-2.5 rounded-xl bg-white/70 dark:bg-black/20 border border-gray-100 dark:border-white/5 text-xs">
                  <div>
                    <span className="text-gray-400 text-[11px] block">Jobs Discovered</span>
                    <span className="font-bold text-gray-900 dark:text-white text-small">
                      {stats.totalFetched || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[11px] block">Applications</span>
                    <span className="font-bold text-lime-600 dark:text-lime-400 text-small">
                      {stats.totalApplied || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="pt-3 border-t border-gray-200/70 dark:border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                  <Shield className="w-3.5 h-3.5 text-lime-600" />
                  <span>{portal.authType}</span>
                </div>

                <div className="flex items-center gap-2">
                  {connected && !portal.isPublicApi ? (
                    <button
                      type="button"
                      onClick={() => handleDisconnect(portal.id, portal.name)}
                      disabled={isDisconnecting}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl transition-colors flex items-center gap-1"
                    >
                      {isDisconnecting ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                      Disconnect
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedPortal(portal.id)}
                      className={`px-4 py-1.5 text-xs font-semibold text-white ${portal.color} hover:opacity-90 rounded-xl transition-all shadow-sm flex items-center gap-1.5`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      {connected ? 'Configure' : 'Link Account'}
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
