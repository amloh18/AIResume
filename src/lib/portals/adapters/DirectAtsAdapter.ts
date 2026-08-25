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

export class DirectAtsAdapter extends BasePortalAdapter {
  readonly provider: PortalProvider;
  readonly defaultAuthMethod: PortalAuthMethod = 'public_feed';

  constructor(provider: PortalProvider) {
    super();
    this.provider = provider;
  }

  getCapabilities(): PortalCapabilities {
    return {
      jobDiscovery: true,
      jobDetails: true,
      jobSave: true,
      application: this.provider === 'greenhouse' || this.provider === 'lever',
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
        sync: {
          enabled: true,
          intervalMinutes: 60,
          lastSuccessAt: new Date(),
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
    return {
      valid: true,
      status: 'connected',
      health: 'healthy',
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
    return {
      jobs: [],
      hasMore: false,
    };
  }
}
