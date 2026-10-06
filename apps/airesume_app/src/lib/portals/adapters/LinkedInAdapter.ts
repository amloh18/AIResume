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
} from '@/models/PortalConnection';

export class LinkedInAdapter extends BasePortalAdapter {
  readonly provider: PortalProvider = 'linkedin';

  /**
   * `browser_session`, not `oauth`.
   *
   * LinkedIn does offer real OAuth, but this codebase has no LinkedIn OAuth
   * integration — no client id, no redirect handler, no token exchange. The
   * adapter declared `oauth` anyway and wrote `authMethod: 'oauth'` on every
   * connection, which recorded a flow that never ran.
   *
   * ⚠️ Connecting LinkedIn is **not** the same thing as LinkedIn ingestion or
   * automation. This records the account connection only.
   */
  readonly defaultAuthMethod: PortalAuthMethod = 'browser_session';

  /** See `NaukriAdapter.getCapabilities` — nothing is wired up for a connected account yet. */
  getCapabilities(): PortalCapabilities {
    return {
      jobDiscovery: false,
      jobDetails: false,
      jobSave: false,
      application: false,
      applicationStatus: false,
      messaging: false,
    };
  }

  async completeConnection(
    userId: string,
    request: PortalConnectionCompleteRequest
  ): Promise<{
    connection: IPortalConnection;
    validation: PortalConnectionValidationResult;
  }> {
    // No invented fallback address — see `NaukriAdapter.completeConnection`.
    const email = request.accountEmail?.trim() || undefined;
    const displayName = request.displayName?.trim() || undefined;

    const connection = await this.markConnected(userId, {
      authMethod: this.defaultAuthMethod,
      account: {
        email,
        displayName,
        portalUserId: email,
      },
      sessionPayload: request.sessionPayload,
      sessionTtlDays: 60,
      syncIntervalMinutes: 60,
      preferences: {
        targetTitles: request.preferences?.targetTitles?.length
          ? request.preferences.targetTitles
          : ['Software Engineer', 'Engineering Lead'],
        targetLocations: request.preferences?.targetLocations?.length
          ? request.preferences.targetLocations
          : ['London', 'Remote'],
        experienceYears: request.preferences?.experienceYears ?? 4,
        minSalary: request.preferences?.minSalary ?? 0,
        dailyLimit: request.preferences?.dailyLimit ?? 25,
        autoApplyEnabled: false,
      },
    });

    return {
      connection,
      validation: {
        valid: true,
        status: 'connected',
        health: 'healthy',
        account: {
          email,
          displayName,
          portalUserId: email,
        },
      },
    };
  }

  async validateConnection(
    connection: IPortalConnection
  ): Promise<PortalConnectionValidationResult> {
    const isConnected = connection.status === 'connected';
    return {
      valid: isConnected,
      status: isConnected ? 'connected' : 'disconnected',
      health: isConnected ? 'healthy' : 'disconnected',
      account: connection.account,
    };
  }

  /**
   * See `NaukriAdapter.fetchJobs` — no fabricated postings.
   *
   * The single hard-coded job that used to live here was tagged
   * `atsType: 'greenhouse'`, so it was also misfiled in the shared `jobs`
   * collection under the wrong source.
   */
  async fetchJobs(
    connection: IPortalConnection,
    options?: PortalSyncOptions
  ): Promise<{
    jobs: NormalizedPortalJob[];
    cursor?: string;
    hasMore?: boolean;
  }> {
    return { jobs: [], hasMore: false };
  }
}
