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

export class IndeedAdapter extends BasePortalAdapter {
  readonly provider: PortalProvider = 'indeed';
  readonly defaultAuthMethod: PortalAuthMethod = 'oauth';

  getCapabilities(): PortalCapabilities {
    return {
      jobDiscovery: true,
      jobDetails: true,
      jobSave: true,
      // Application automation is governed by Indeed partner agreement requirements
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

    const email = request.accountEmail || `${request.displayName || 'indeed_candidate'}@indeed.user`;
    const displayName = request.displayName || 'Indeed User';

    const connection = await PortalConnection.findOneAndUpdate(
      { userId, provider: 'indeed' },
      {
        userId,
        provider: 'indeed',
        status: 'connected',
        authMethod: request.authCode ? 'oauth' : 'browser_session',
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
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lastUsedAt: new Date(),
        },
        sync: {
          enabled: true,
          intervalMinutes: 30,
          lastSuccessAt: new Date(),
        },
        health: {
          status: 'healthy',
          consecutiveFailures: 0,
          lastError: undefined,
        },
        preferences: {
          targetTitles: request.preferences?.targetTitles || [
            'Software Engineer',
            'Full Stack Developer',
            'Cloud Architect',
          ],
          targetLocations: request.preferences?.targetLocations || [
            'London, UK',
            'Remote',
            'New York, NY',
          ],
          experienceYears: request.preferences?.experienceYears ?? 3,
          minSalary: request.preferences?.minSalary ?? 0,
          dailyLimit: request.preferences?.dailyLimit ?? 25,
          autoApplyEnabled: false,
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
    const targetTitles =
      connection.preferences?.targetTitles?.length
        ? connection.preferences.targetTitles
        : ['Staff Infrastructure Engineer', 'Principal TypeScript Engineer'];
    const targetLocations =
      connection.preferences?.targetLocations?.length
        ? connection.preferences.targetLocations
        : ['London, UK', 'Remote'];

    const mockIndeedRoles = [
      {
        id: `indeed_${Date.now()}_1`,
        title: `${targetTitles[0] || 'Staff Infrastructure Engineer'}`,
        company: 'Wise',
        location: targetLocations[0] || 'London, UK',
        description:
          'Join Wise infrastructure platform team building global multi-region payment routing engines.',
        salary: { min: 95000, max: 135000, currency: 'GBP', period: 'yearly' as const },
        remote: true,
      },
      {
        id: `indeed_${Date.now()}_2`,
        title: `${targetTitles[1] || 'Senior Frontend Engineer'}`,
        company: 'Monzo Bank',
        location: 'London, UK (Hybrid)',
        description:
          'Help build the future of mobile and web banking with React, TypeScript, and micro-frontend design.',
        salary: { min: 85000, max: 115000, currency: 'GBP', period: 'yearly' as const },
        remote: true,
      },
    ];

    const jobs: NormalizedPortalJob[] = mockIndeedRoles.map((role) => ({
      externalId: role.id,
      provider: 'indeed',
      title: role.title,
      company: role.company,
      location: role.location,
      description: role.description,
      jobUrl: `https://www.indeed.com/viewjob?jk=${role.id}`,
      salary: role.salary,
      remote: role.remote,
      atsType: 'indeed',
      postedDate: new Date(),
    }));

    return {
      jobs,
      hasMore: false,
    };
  }
}
