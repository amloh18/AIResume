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

export class NaukriAdapter extends BasePortalAdapter {
  readonly provider: PortalProvider = 'naukri';
  readonly defaultAuthMethod: PortalAuthMethod = 'browser_session';

  getCapabilities(): PortalCapabilities {
    return {
      jobDiscovery: true,
      jobDetails: true,
      jobSave: true,
      application: true,
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

    const email = request.accountEmail || `${request.displayName || 'candidate'}@naukri.user`;
    const displayName = request.displayName || email.split('@')[0];

    const connection = await PortalConnection.findOneAndUpdate(
      { userId, provider: 'naukri' },
      {
        userId,
        provider: 'naukri',
        status: 'connected',
        authMethod: request.sessionPayload?.method || 'browser_session',
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
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
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
            'Frontend Developer',
            'Backend Developer',
          ],
          targetLocations: request.preferences?.targetLocations || [
            'Bangalore',
            'Remote',
            'Hyderabad',
            'Mumbai',
            'Pune',
          ],
          experienceYears: request.preferences?.experienceYears ?? 3,
          minSalary: request.preferences?.minSalary ?? 0,
          dailyLimit: request.preferences?.dailyLimit ?? 25,
          autoApplyEnabled: true,
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
        : ['Senior Software Engineer', 'Full Stack Developer', 'React / Node.js Developer'];
    const targetLocations =
      connection.preferences?.targetLocations?.length
        ? connection.preferences.targetLocations
        : ['Bangalore', 'Remote', 'Hyderabad'];

    const mockNaukriRoles = [
      {
        id: `naukri_${Date.now()}_1`,
        title: `${targetTitles[0] || 'Senior Full Stack Engineer'}`,
        company: 'Razorpay',
        location: targetLocations[0] || 'Bangalore',
        description:
          'Building high-scale payments infrastructure and developer platforms. Require strong TypeScript, Node.js, and distributed system design.',
        salary: { min: 2500000, max: 4200000, currency: 'INR', period: 'yearly' as const },
        remote: true,
      },
      {
        id: `naukri_${Date.now()}_2`,
        title: `${targetTitles[1] || 'Lead Backend Engineer'}`,
        company: 'Swiggy',
        location: targetLocations[1] || 'Bangalore',
        description:
          'Design resilient order fulfillment engines handling millions of daily requests. Microservices in Go/Node.js.',
        salary: { min: 3000000, max: 5000000, currency: 'INR', period: 'yearly' as const },
        remote: false,
      },
      {
        id: `naukri_${Date.now()}_3`,
        title: `${targetTitles[2] || 'Frontend Architect - React'}`,
        company: 'PhonePe',
        location: 'Bangalore (Hybrid)',
        description:
          'Drive core web architecture, performance optimization, design systems, and responsive web frameworks.',
        salary: { min: 2800000, max: 4500000, currency: 'INR', period: 'yearly' as const },
        remote: true,
      },
    ];

    const jobs: NormalizedPortalJob[] = mockNaukriRoles.map((role) => ({
      externalId: role.id,
      provider: 'naukri',
      title: role.title,
      company: role.company,
      location: role.location,
      description: role.description,
      jobUrl: `https://www.naukri.com/job-listings-${role.id}`,
      salary: role.salary,
      remote: role.remote,
      atsType: 'naukri',
      postedDate: new Date(),
    }));

    return {
      jobs,
      hasMore: false,
    };
  }
}
