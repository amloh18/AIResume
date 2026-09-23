import { BasePortalAdapter } from './BasePortalAdapter';
import {
  PortalCapabilities,
  PortalConnectionCompleteRequest,
  PortalConnectionValidationResult,
  PortalSyncOptions,
  NormalizedPortalJob,
} from '../types';
import {
  PortalProvider,
  PortalAuthMethod,
  IPortalConnection,
  getPortalConnectionModel,
} from '@/models/PortalConnection';

/**
 * Registration record for a direct ATS source (Greenhouse, Lever, Ashby, …).
 *
 * ## What this adapter does NOT do
 *
 * It does not fetch jobs. `fetchJobs` returns an empty page, and there is no HTTP client, no board-token
 * lookup and no pagination here — the real ATS fetching lives in the ingestion engine
 * (`src/lib/ingestion/engine.ts`), which owns the `greenhouse` / `lever` / `ashby` sources.
 *
 * It used to report the opposite. `getCapabilities()` returned `jobDiscovery: true`, `jobDetails: true`,
 * `jobSave: true` and `application: true` for greenhouse and lever, and `completeConnection()` stamped
 * `sync.lastSuccessAt: new Date()` on the record it wrote. Nothing had been fetched and nothing had
 * succeeded, so a "connected" direct-ATS account advertised discovery and application capabilities that
 * had no implementation behind them — and any UI that reads capability flags to decide what to offer was
 * being told a source was ready when it was not.
 *
 * The flags are now honest, and the connection no longer claims a successful sync. Restore them the day
 * `fetchJobs` actually fetches something.
 */

/** No capability here is implemented yet; keep them all false rather than aspirational. */
const IMPLEMENTED_CAPABILITIES: PortalCapabilities = {
  jobDiscovery: false,
  jobDetails: false,
  jobSave: false,
  application: false,
  applicationStatus: false,
  messaging: false,
};

export class DirectAtsAdapter extends BasePortalAdapter {
  readonly provider: PortalProvider;
  readonly defaultAuthMethod: PortalAuthMethod = 'public_feed';

  constructor(provider: PortalProvider) {
    super();
    this.provider = provider;
  }

  getCapabilities(): PortalCapabilities {
    return { ...IMPLEMENTED_CAPABILITIES };
  }

  async completeConnection(
    userId: string,
    request: PortalConnectionCompleteRequest
  ): Promise<{
    connection: IPortalConnection;
    validation: PortalConnectionValidationResult;
  }> {
    const PortalConnection = await getPortalConnectionModel();

    const connection = await PortalConnection.findOneAndUpdate(
      { userId, provider: this.provider },
      {
        userId,
        provider: this.provider,
        status: 'connected',
        authMethod: 'public_feed',
        account: {
          displayName: `Public ${this.provider.toUpperCase()} Feed`,
        },
        capabilities: this.getCapabilities(),
        sessionMetadata: {
          createdAt: new Date(),
          lastValidatedAt: new Date(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          lastUsedAt: new Date(),
        },
        /*
          `sync.enabled: false` and no `lastSuccessAt`.

          A public feed needs no credentials, so there is nothing to validate and nothing to expire — but
          there is also nothing being synced, and recording a success timestamp for a sync that never ran
          is what made the connection look healthy.
        */
        sync: {
          enabled: false,
          intervalMinutes: 60,
        },
        health: {
          status: 'healthy',
          consecutiveFailures: 0,
        },
      },
      { upsert: true, new: true }
    );

    const validation: PortalConnectionValidationResult = {
      valid: true,
      status: 'connected',
      health: 'healthy',
      account: connection.account,
    };

    return { connection, validation };
  }

  async validateConnection(
    connection: IPortalConnection
  ): Promise<PortalConnectionValidationResult> {
    /*
      A public feed has no credentials to check, so this reports on the record rather than pretending to
      have contacted the source. It previously returned `healthy` unconditionally, which meant a
      connection could never be reported as degraded.
    */
    return {
      valid: true,
      status: connection.status,
      health: connection.health?.status ?? 'unknown',
      account: connection.account,
    };
  }

  async fetchJobs(
    connection: IPortalConnection,
    options?: PortalSyncOptions
  ): Promise<{
    jobs: NormalizedPortalJob[];
    cursor?: string;
    hasMore?: boolean;
  }> {
    /*
      Not implemented. Returning an empty page is the honest answer — the previous version of this class
      advertised `jobDiscovery: true` alongside this same empty return, which is how a source with no
      fetcher came to look like a working one.

      The real fetch path is the ingestion engine's own greenhouse/lever/ashby sources.
    */
    return {
      jobs: [],
      hasMore: false,
    };
  }
}
