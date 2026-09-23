'use client';

import React, { useState } from 'react';
import {
  Globe,
  Briefcase,
  Linkedin,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Settings2,
} from 'lucide-react';
import toast from '@/lib/hot-toast';
import {
  JOB_SOURCE_PROVIDERS,
  JOB_SOURCE_DESCRIPTORS,
  JobSourceConnectionView,
  JobSourceProvider,
  formatConnectedDate,
} from '@/lib/portals/connection-state';
import {
  useJobSourceConnections,
  useSyncJobSource,
} from '@/hooks/useJobSourceConnections';
import PortalConnectModal from './PortalConnectModal';
import PortalManageDialog from './PortalManageDialog';

const SOURCE_ICONS: Record<JobSourceProvider, React.ComponentType<{ className?: string }>> = {
  naukri: Globe,
  indeed: Briefcase,
  linkedin: Linkedin,
};

/** 1234567 → "1.2M+" */
function formatCount(value?: number): string | undefined {
  if (value == null) return undefined;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M+`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K+`;
  return String(value);
}

interface ConnectedJobAccountsProps {
  /**
   * `settings` renders the standalone card used in the Settings tab;
   * `onboarding` renders the same content without the outer card, for the wizard.
   *
   * ⚠️ Only presentation differs. Both variants read and mutate the *same*
   * react-query cache, which is what guarantees the two screens can never
   * disagree about whether an account is connected.
   */
  variant?: 'settings' | 'onboarding';
}

export function ConnectedJobAccounts({ variant = 'settings' }: ConnectedJobAccountsProps) {
  const { network, sources, isLoading, isError, refetch, getSource } =
    useJobSourceConnections();
  const sync = useSyncJobSource();

  const [connectProvider, setConnectProvider] = useState<JobSourceProvider | null>(null);
  const [manageProvider, setManageProvider] = useState<JobSourceProvider | null>(null);
  const [syncingProvider, setSyncingProvider] = useState<JobSourceProvider | null>(null);

  const isOnboarding = variant === 'onboarding';

  const handleSync = async (provider: JobSourceProvider) => {
    setSyncingProvider(provider);
    try {
      const result = await sync.mutateAsync(provider);
      const name = JOB_SOURCE_DESCRIPTORS[provider].name;

      if (result.sourceUnavailable) {
        // ⚠️ Deliberately not a success toast. The account is connected, but there
        // is no job source behind it yet, and reporting "Found N new jobs" here is
        // exactly the fabricated status this screen used to show.
        //
        // `react-hot-toast` takes a single message plus options — there is no
        // separate description field, so the two facts go in one sentence.
        toast(`${name} is connected. Job discovery from this account isn’t available yet.`, {
          icon: 'ℹ️',
        });
      } else if (result.jobsCreated > 0) {
        toast.success(`Found ${result.jobsCreated} new jobs from ${name}`);
      } else {
        toast(`No new jobs from ${name}`, { icon: 'ℹ️' });
      }
    } catch (error: any) {
      toast.error(error?.message || `Could not sync ${JOB_SOURCE_DESCRIPTORS[provider].name}`);
    } finally {
      setSyncingProvider(null);
    }
  };

  const body = (
    <>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      {isOnboarding ? (
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Connect your job accounts
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            AIResume already searches across its job network. You can also connect the
            job sites you personally use to keep your job workflow in one place.
          </p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-lime-600 dark:text-lime-400" />
              <span>Connected Job Accounts</span>
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Connect your job-search accounts to personalize discovery and prepare
              supported application workflows.
            </p>
          </div>
        </div>
      )}

      {/* ── AIResume Job Network ───────────────────────────────────────── */}
      {/* Shown as an always-connected indicator rather than a fourth card: it is
          not an external account the user connects, and giving it a card would
          imply it can be disconnected. */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-lime-500/25 bg-lime-50/40 dark:bg-lime-900/10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-lime-100 dark:bg-lime-900/30 text-emerald-700 dark:text-lime-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-gray-900 dark:text-white text-sm">
              AIResume Job Network
            </h4>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              {network?.statsUnavailable || (!network?.sourceCount && !network?.jobCount)
                ? 'Job network active'
                : [
                    network?.sourceCount != null ? `${network.sourceCount} sources` : null,
                    network?.jobCount != null ? `${formatCount(network.jobCount)} jobs` : null,
                  ]
                    .filter(Boolean)
                    .join(' • ')}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border border-lime-500/30 bg-lime-500/10 text-lime-700 dark:text-lime-400 shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Always connected
        </span>
      </div>

      {/* ── Your accounts ──────────────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Your accounts
        </p>

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {JOB_SOURCE_PROVIDERS.map((provider) => (
              <div
                key={provider}
                className="h-44 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] animate-pulse"
              />
            ))}
          </div>
        )}

        {!isLoading && isError && (
          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/30 bg-amber-50/60 dark:bg-amber-950/20">
            <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>We couldn&apos;t load your connected accounts.</span>
            </div>
            <button
              type="button"
              onClick={refetch}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/40 transition-colors shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !isError && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {JOB_SOURCE_PROVIDERS.map((provider) => (
              <SourceCard
                key={provider}
                provider={provider}
                connection={getSource(provider)}
                isSyncing={syncingProvider === provider}
                onConnect={() => setConnectProvider(provider)}
                onManage={() => setManageProvider(provider)}
                onSync={() => handleSync(provider)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {isOnboarding ? (
        <div className="space-y-5">{body}</div>
      ) : (
        <div className="bg-white dark:bg-[#141810] border border-gray-200/90 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
          {body}
        </div>
      )}

      {connectProvider && (
        <PortalConnectModal
          portal={connectProvider}
          isOpen
          onClose={() => setConnectProvider(null)}
          onSuccess={refetch}
        />
      )}

      {manageProvider && (
        <PortalManageDialog
          provider={manageProvider}
          connection={getSource(manageProvider)}
          isOpen
          onClose={() => setManageProvider(null)}
          onReconnect={() => setConnectProvider(manageProvider)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

interface SourceCardProps {
  provider: JobSourceProvider;
  connection: JobSourceConnectionView | undefined;
  isSyncing: boolean;
  onConnect: () => void;
  onManage: () => void;
  onSync: () => void;
}

const SourceCard: React.FC<SourceCardProps> = ({
  provider,
  connection,
  isSyncing,
  onConnect,
  onManage,
  onSync,
}) => {
  const descriptor = JOB_SOURCE_DESCRIPTORS[provider];
  const Icon = SOURCE_ICONS[provider];

  const isConnected = connection?.state === 'connected';
  const needsAttention = connection?.state === 'attention_required';
  const connectedOn = formatConnectedDate(connection?.connectedAt);

  // Needs-attention cards use the connected layout — the account *is* linked, it
  // just isn't healthy, and showing a Connect button would be wrong.
  const showConnectedLayout = isConnected || needsAttention;

  if (!showConnectedLayout) {
    return (
      <div className="p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${descriptor.iconClass} shrink-0`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate">
                {descriptor.name}
              </h4>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 shrink-0" />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Not connected
                </span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
            {descriptor.description}
          </p>
        </div>

        <button
          type="button"
          onClick={onConnect}
          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-lime-500 dark:hover:border-lime-400 hover:text-lime-700 dark:hover:text-lime-300 transition-colors text-center"
        >
          Connect {descriptor.name}
        </button>
      </div>
    );
  }

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl border flex flex-col justify-between space-y-4 ${
        needsAttention
          ? 'border-amber-500/30 bg-amber-50/30 dark:bg-amber-900/10'
          : 'border-lime-500/25 bg-lime-50/30 dark:bg-lime-900/10'
      }`}
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${descriptor.iconClass} shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate">
              {descriptor.name}
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  needsAttention ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              />
              <span
                className={`text-xs font-semibold ${
                  needsAttention
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-emerald-700 dark:text-emerald-400'
                }`}
              >
                {needsAttention ? 'Needs attention' : 'Connected'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-1 text-[11px] text-gray-600 dark:text-gray-400">
          <div className="font-medium text-gray-800 dark:text-gray-200 truncate">
            {connection?.accountIdentifier || descriptor.connectedSubtitle}
          </div>
          {connectedOn && (
            <div className="text-[10px] text-gray-400 dark:text-gray-500">
              Connected {connectedOn}
            </div>
          )}
          {needsAttention && connection?.lastError && (
            <p className="text-[10px] text-amber-700 dark:text-amber-400 pt-0.5 leading-relaxed">
              {connection.lastError}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onManage}
          className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-800 dark:text-gray-200 transition-colors flex items-center justify-center gap-1.5"
        >
          <Settings2 className="w-3.5 h-3.5 text-lime-600 dark:text-lime-400" />
          Manage
        </button>
        <button
          type="button"
          onClick={onSync}
          disabled={isSyncing}
          title="Sync this account"
          aria-label={`Sync ${descriptor.name}`}
          className="p-2 rounded-xl text-gray-400 hover:text-lime-700 dark:hover:text-lime-400 hover:bg-lime-50 dark:hover:bg-lime-950/30 transition-colors shrink-0 disabled:opacity-60"
        >
          {isSyncing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};

export default ConnectedJobAccounts;
