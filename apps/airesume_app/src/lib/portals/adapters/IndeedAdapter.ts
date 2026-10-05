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

export class IndeedAdapter extends BasePortalAdapter {
  readonly provider: PortalProvider = 'indeed';

  /**
   * `browser_session`, not `oauth`.
   *
   * This was declared `oauth` while `PortalConnectModal` ran Indeed through the
   * browser-session branch — so the adapter advertised a flow it never
   * implemented. Indeed's partner API is not integrated here, and per the brief we
   * must not invent an OAuth flow for it. `browser_session` is what this
   * connection actually is: the user's account, linked, awaiting a real session
   * capture.
   */
  readonly defaultAuthMethod: PortalAuthMethod = 'browser_session';

  /** See `NaukriAdapter.getCapabilities` — nothing is wired up for a connected account yet. */
  getCapabilities(): PortalCapabilities {
    return {
      jobDiscovery: false,
      jobDetails: false,
      jobSave: false,
      // Indeed's partner agreement governs application automation independently of
      // whether we hold a session, so this stays false regardless.
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
      sessionTtlDays: 30,
      syncIntervalMinutes: 30,
      preferences: {
        targetTitles: request.preferences?.targetTitles?.length
          ? request.preferences.targetTitles
          : ['Software Engineer', 'Full Stack Developer', 'Cloud Architect'],
        targetLocations: request.preferences?.targetLocations?.length
          ? request.preferences.targetLocations
          : ['London, UK', 'Remote', 'New York, NY'],
        experienceYears: request.preferences?.experienceYears ?? 3,
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

  /** See `NaukriAdapter.fetchJobs` — no fabricated postings. */
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
