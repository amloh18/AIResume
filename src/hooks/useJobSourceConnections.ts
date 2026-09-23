'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  JOB_SOURCES_QUERY_KEY,
  JobNetworkView,
  JobSourceConnectionView,
  JobSourceConnectionsResponse,
  JobSourceProvider,
} from '@/lib/portals/connection-state';
import type { PortalSyncResult } from '@/lib/portals/types';

/**
 * The one place job-source connection state is fetched, mutated and cached.
 *
 * ⚠️ Why a hook rather than local state in each screen: Settings and onboarding
 * both need this data, and both previously kept their **own** `portalConnections`
 * array fetched independently. That is two sources of truth for one fact, and it
 * is exactly how "connect in onboarding, still shows Not connected in Settings"
 * happens. Sharing a react-query cache makes the two surfaces agree by
 * construction — a mutation invalidates the key and every mounted consumer
 * re-renders, with no page refresh and no cross-screen plumbing.
 */

async function readJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchJobSourceConnections(): Promise<JobSourceConnectionsResponse> {
  const response = await fetch('/api/portal-connections', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(data?.error || 'Failed to load job source connections');
  }

  return data as JobSourceConnectionsResponse;
}

export interface JobSourceConnectionsResult {
  /** AIResume's own network. Always connected; never a user-connected account. */
  network: JobNetworkView | undefined;
  /** The three external account sources, always all three, in a stable order. */
  sources: JobSourceConnectionView[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  /** Convenience accessor so callers never have to scan the array themselves. */
  getSource: (provider: JobSourceProvider) => JobSourceConnectionView | undefined;
}

export function useJobSourceConnections(): JobSourceConnectionsResult {
  const query = useQuery({
    queryKey: JOB_SOURCES_QUERY_KEY,
    queryFn: fetchJobSourceConnections,
    // Connection state changes when the user acts, not on a timer. The mutations
    // below invalidate this key, so a stale window here would only cost an extra
    // round trip on mount.
    staleTime: 30 * 1000,
  });

  const sources = query.data?.sources ?? [];

  return {
    network: query.data?.network,
    sources,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error) ?? null,
    refetch: () => {
      void query.refetch();
    },
    getSource: (provider: JobSourceProvider) => sources.find((s) => s.source === provider),
  };
}

// ---------------------------------------------------------------------------
// Connect
// ---------------------------------------------------------------------------

export interface ConnectJobSourceInput {
  provider: JobSourceProvider;
  /**
   * The account the user identifies as theirs on that site. Optional: we store
   * nothing rather than inventing a placeholder.
   *
   * ⚠️ This is an **identifier only**. No password is ever collected, sent, or
   * stored — the API rejects a request containing one.
   */
  accountIdentifier?: string;
  displayName?: string;
  preferences?: {
    targetTitles?: string[];
    targetLocations?: string[];
  };
}

export function useConnectJobSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ConnectJobSourceInput) => {
      const startResponse = await fetch('/api/portal-connections/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: input.provider }),
      });
      const startData = await readJson(startResponse);
      if (!startResponse.ok) {
        throw new Error(startData?.error || 'Could not start the connection');
      }

      const completeResponse = await fetch('/api/portal-connections/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionAttemptId: startData?.connectionAttemptId,
          provider: input.provider,
          // Only ever an identifier and a display name. See ConnectJobSourceInput.
          accountEmail: input.accountIdentifier?.trim() || undefined,
          displayName: input.displayName?.trim() || undefined,
          preferences: input.preferences,
        }),
      });
      const completeData = await readJson(completeResponse);
      if (!completeResponse.ok) {
        throw new Error(completeData?.error || 'Could not complete the connection');
      }

      return completeData;
    },
    onSuccess: () => {
      // Both Settings and onboarding read this key, so both update.
      void queryClient.invalidateQueries({ queryKey: JOB_SOURCES_QUERY_KEY });
    },
  });
}

// ---------------------------------------------------------------------------
// Disconnect
// ---------------------------------------------------------------------------

export function useDisconnectJobSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (provider: JobSourceProvider) => {
      const response = await fetch(
        `/api/portal-connections?provider=${encodeURIComponent(provider)}`,
        { method: 'DELETE' }
      );
      const data = await readJson(response);
      if (!response.ok) {
        throw new Error(data?.error || 'Could not disconnect this account');
      }
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: JOB_SOURCES_QUERY_KEY });
    },
  });
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

export function useSyncJobSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (provider: JobSourceProvider): Promise<PortalSyncResult> => {
      const response = await fetch(
        `/api/portal-connections/${encodeURIComponent(provider)}/sync`,
        { method: 'POST' }
      );
      const data = await readJson(response);
      if (!response.ok) {
        throw new Error(data?.error || 'Could not sync this account');
      }
      return data as PortalSyncResult;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: JOB_SOURCES_QUERY_KEY });
    },
  });
}
