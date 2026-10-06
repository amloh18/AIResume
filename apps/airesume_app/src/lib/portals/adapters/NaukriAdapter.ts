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

export class NaukriAdapter extends BasePortalAdapter {
  readonly provider: PortalProvider = 'naukri';
  readonly defaultAuthMethod: PortalAuthMethod = 'browser_session';

  /**
   * ⚠️ These flags describe what the **connection** can currently do, and today
   * the honest answer is nothing: there is no Naukri job source wired to a user's
   * connected account. They previously claimed `jobDiscovery`, `jobDetails`,
   * `jobSave` and `application` support, none of which existed — and the Settings
   * card rendered those claims as "Personalized discovery feed" and "Automated
   * application support".
   *
   * They are all `false` rather than deleted so that the day a real source lands,
   * flipping a flag is the whole change. Nothing in the codebase gates on these
   * today, so this is a truthfulness fix, not a behaviour change.
   */
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
    // ⚠️ No `accountEmail` fallback. The previous version defaulted to
    // `${displayName || 'candidate'}@naukri.user`, which meant every connection
    // stored a fake address and the card displayed it as the user's account.
    // Absent input now stays absent, and the card says "Account connected".
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
          : ['Software Engineer', 'Full Stack Developer', 'Frontend Developer', 'Backend Developer'],
        targetLocations: request.preferences?.targetLocations?.length
          ? request.preferences.targetLocations
          : ['Bangalore', 'Remote', 'Hyderabad', 'Mumbai', 'Pune'],
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

  /**
   * ⚠️ Returns nothing, on purpose.
   *
   * This previously returned three hard-coded roles (Razorpay, Swiggy, PhonePe)
   * built from the user's preference strings. `syncPortalJobs` then wrote them
   * into the shared `jobs` collection tagged `atsType: 'naukri'` — so every
   * connect polluted the global job pool with fabricated postings, and the card
   * could report a discovery count that no source had produced.
   *
   * Naukri is a session-captured account connection with no implemented feed. The
   * adapter contract is unchanged; it simply has no jobs to offer yet, and the
   * service reports that as `sourceUnavailable` instead of a failure.
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
