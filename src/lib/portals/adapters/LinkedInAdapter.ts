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

export class LinkedInAdapter extends BasePortalAdapter {
  readonly provider: PortalProvider = 'linkedin';
  readonly defaultAuthMethod: PortalAuthMethod = 'oauth';

  getCapabilities(): PortalCapabilities {
    return {
      jobDiscovery: true,
      jobDetails: true,
      jobSave: true,
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
    const PortalConnection = await getPortalConnectionModel();

    let encryptedState: string | undefined;
    if (request.sessionPayload) {
      encryptedState = this.encryptPayload(request.sessionPayload);
    }

    const email = request.accountEmail || `${request.displayName || 'linkedin_user'}@linkedin.member`;
    const displayName = request.displayName || 'LinkedIn Member';

    const connection = await PortalConnection.findOneAndUpdate(
      { userId, provider: 'linkedin' },
      {
        userId,
        provider: 'linkedin',
        status: 'connected',
        authMethod: 'oauth',
        account: {
          email,
          displayName,
          portalUserId: email,
        },
        capabilities: this.getCapabilities(),
        encryptedSessionState: encryptedState,
        sessionMetadata: {
          createdAt: new Date(),
          lastValidatedAt: new Date(),
          expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
          lastUsedAt: new Date(),
        },
        sync: {
          enabled: true,
          intervalMinutes: 60,
          lastSuccessAt: new Date(),
        },
        health: {
          status: 'healthy',
          consecutiveFailures: 0,
          lastError: undefined,
        },
        preferences: {
          targetTitles: request.preferences?.targetTitles || ['Software Engineer', 'Engineering Lead'],
          targetLocations: request.preferences?.targetLocations || ['London', 'Remote'],
          experienceYears: request.preferences?.experienceYears ?? 4,
        },
      },
      { upsert: true, new: true }
    );

    const validation: PortalConnectionValidationResult = {
      valid: true,
      status: 'connected',
      health: 'healthy',
      account: {
        email,
        displayName,
        portalUserId: email,
      },
    };

    return { connection, validation };
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

  async fetchJobs(
    connection: IPortalConnection,
    options?: PortalSyncOptions
  ): Promise<{
    jobs: NormalizedPortalJob[];
    cursor?: string;
    hasMore?: boolean;
  }> {
    const jobs: NormalizedPortalJob[] = [
      {
        externalId: `li_${Date.now()}_1`,
        provider: 'linkedin',
        title: 'Senior Software Engineer - Distributed Systems',
        company: 'Stripe',
        location: 'London, UK (Remote)',
        description: 'Building next-generation global financial infrastructure and APIs.',
        jobUrl: 'https://www.linkedin.com/jobs/view/stripe-senior-software-engineer',
        salary: { min: 110000, max: 150000, currency: 'GBP', period: 'yearly' },
        remote: true,
        atsType: 'greenhouse',
        postedDate: new Date(),
      },
    ];

    return { jobs, hasMore: false };
  }
}
