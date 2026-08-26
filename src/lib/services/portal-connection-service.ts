import { getConnection } from '@/lib/database';
import { ObjectId } from 'mongodb';
import {
  PortalProvider,
  IPortalConnection,
  getPortalConnectionModel,
} from '@/models/PortalConnection';
import {
  IPortalJobSyncTask,
  SyncTaskTrigger,
  getPortalJobSyncTaskModel,
} from '@/models/PortalJobSyncTask';
import { portalAdapterRegistry } from '@/lib/portals/PortalAdapterRegistry';
import {
  PortalConnectionStartResult,
  PortalConnectionCompleteRequest,
  PortalConnectionValidationResult,
  PortalSyncResult,
} from '@/lib/portals/types';

export class PortalConnectionService {
  /**
   * Get all portal connections for a user, enriched with real database stats
   */
  static async getUserPortalConnections(userId: string): Promise<any[]> {
    await getConnection();
    const PortalConnection = await getPortalConnectionModel();
    const { getDb } = await import('@/lib/db');
    const db = await getDb();

    // Query all existing user connections (excluding sensitive encrypted data)
    const userConnections = await PortalConnection.find({
      userId: new RegExp(`^${userId}$`, 'i'),
    }).lean();

    const connectionMap = new Map<string, any>();
    for (const conn of userConnections) {
      connectionMap.set(conn.provider, conn);
    }

    // Get live database stats for jobs discovered per provider
    const jobsCollection = db.collection('jobs');
    const jobsByProvider = await jobsCollection
      .aggregate([
        {
          $group: {
            _id: { $toLower: '$atsType' },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const statsMap = new Map<string, number>();
    for (const row of jobsByProvider) {
      if (row._id) statsMap.set(row._id, row.count);
    }

    // Count user applications per provider
    const appsCollection = db.collection('job_applications');
    const appsMap = new Map<string, number>();
    try {
      const userObjectId = ObjectId.isValid(userId) ? new ObjectId(userId) : userId;
      const userApps = await appsCollection
        .find({
          $or: [{ userId: userObjectId }, { userId: userId.toString() }],
        })
        .toArray();

      for (const app of userApps) {
        const portal = (app.source || app.atsType || 'unknown').toLowerCase();
        appsMap.set(portal, (appsMap.get(portal) || 0) + 1);
      }
    } catch (e) {
      console.warn('[PortalConnectionService] Failed to count apps per portal:', e);
    }

    const allProviders: PortalProvider[] = [
      'naukri',
      'indeed',
      'linkedin',
      'greenhouse',
      'adzuna',
      'lever',
      'ashby',
      'workable',
    ];

    const results = allProviders.map((provider) => {
      const adapter = portalAdapterRegistry.getAdapter(provider);
      const capabilities = adapter.getCapabilities();
      const existing = connectionMap.get(provider);
      const discoveredCount = statsMap.get(provider) || existing?.stats?.jobsDiscovered || 0;
      const appliedCount = appsMap.get(provider) || existing?.stats?.applications || 0;

      const isPublicFeed = adapter.defaultAuthMethod === 'public_feed';
      const isConnected = isPublicFeed
        ? true
        : Boolean(existing && existing.status === 'connected' && existing.account?.email);

      return {
        id: provider,
        provider,
        name: this.getProviderDisplayName(provider),
        category: this.getProviderCategory(provider),
        authMethod: existing?.authMethod || adapter.defaultAuthMethod,
        isPublicFeed,
        status: isConnected ? 'connected' : 'disconnected',
        health: existing?.health?.status || (isConnected ? 'healthy' : 'disconnected'),
        account: existing?.account
          ? {
              displayName: existing.account.displayName,
              email: existing.account.email,
            }
          : undefined,
        capabilities,
        lastSyncedAt: existing?.sync?.lastSuccessAt || existing?.updatedAt,
        stats: {
          jobsDiscovered: discoveredCount,
          applications: appliedCount,
        },
        preferences: existing?.preferences || {},
        connectionId: existing?._id?.toString(),
      };
    });

    return results;
  }

  /**
   * Start a new connection attempt
   */
  static async startConnectionAttempt(
    userId: string,
    provider: PortalProvider,
    options?: { redirectUri?: string; state?: string }
  ): Promise<PortalConnectionStartResult> {
    const adapter = portalAdapterRegistry.getAdapter(provider);
    return adapter.startConnection(userId, options);
  }

  /**
   * Complete connection with credentials/session data
   */
  static async completeConnection(
    userId: string,
    request: PortalConnectionCompleteRequest
  ): Promise<{
    connection: IPortalConnection;
    validation: PortalConnectionValidationResult;
  }> {
    const adapter = portalAdapterRegistry.getAdapter(request.provider);
    const result = await adapter.completeConnection(userId, request);

    // Trigger initial job sync immediately in background
    if (result.validation.valid) {
      this.syncPortalJobs(userId, result.connection._id.toString(), 'onboarding').catch((err) => {
        console.error(`[PortalConnectionService] Background onboarding sync failed:`, err);
      });
    }

    return result;
  }

  /**
   * Sync portal jobs in background
   */
  static async syncPortalJobs(
    userId: string,
    portalConnectionId: string,
    trigger: SyncTaskTrigger = 'manual'
  ): Promise<PortalSyncResult> {
    await getConnection();
    const PortalConnection = await getPortalConnectionModel();
    const PortalJobSyncTaskModel = await getPortalJobSyncTaskModel();

    let connection: any = null;
    if (ObjectId.isValid(portalConnectionId)) {
      connection = await PortalConnection.findById(portalConnectionId);
    }
    if (!connection) {
      connection = await PortalConnection.findOne({
        _id: portalConnectionId,
      });
    }

    if (!connection) {
      // Find by provider if ID match fails
      connection = await PortalConnection.findOne({
        userId,
        provider: portalConnectionId,
      });
    }

    if (!connection) {
      throw new Error(`Portal connection not found: ${portalConnectionId}`);
    }

    // Verify ownership
    if (connection.userId && connection.userId.toString() !== userId.toString()) {
      throw new Error('Unauthorized to sync this portal connection');
    }

    const provider = connection.provider as PortalProvider;
    const adapter = portalAdapterRegistry.getAdapter(provider);

    // Create sync task record
    const syncTask = await PortalJobSyncTaskModel.create({
      userId,
      portalConnectionId: connection._id,
      provider,
      trigger,
      status: 'running',
      requestedAt: new Date(),
      startedAt: new Date(),
      heartbeatAt: new Date(),
    });

    const startTime = Date.now();

    try {
      // Fetch normalized jobs through adapter
      const fetchResult = await adapter.fetchJobs(connection, { trigger, limit: 25 });
      const rawJobs = fetchResult.jobs || [];

      let jobsCreated = 0;
      let jobsUpdated = 0;
      let jobsDeduplicated = 0;

      const { getDb } = await import('@/lib/db');
      const db = await getDb();
      const jobsCollection = db.collection('jobs');

      for (const rawJob of rawJobs) {
        // 3-tier Deduplication by externalId or company + title
        const existingJob = await jobsCollection.findOne({
          $or: [
            { externalId: rawJob.externalId },
            {
              company: { $regex: new RegExp(`^${rawJob.company}$`, 'i') },
              title: { $regex: new RegExp(`^${rawJob.title}$`, 'i') },
            },
          ],
        });

        if (existingJob) {
          jobsDeduplicated++;
          await jobsCollection.updateOne(
            { _id: existingJob._id },
            {
              $set: {
                lastSeenAt: new Date(),
                atsType: provider,
                portalConnectionId: connection._id.toString(),
                updatedAt: new Date(),
              },
            }
          );
          jobsUpdated++;
        } else {
          await jobsCollection.insertOne({
            externalId: rawJob.externalId,
            title: rawJob.title,
            company: rawJob.company,
            companyLogo: rawJob.companyLogo,
            location: rawJob.location,
            description: rawJob.description,
            jobUrl: rawJob.jobUrl,
            salary: rawJob.salary,
            remote: rawJob.remote ?? false,
            atsType: provider,
            source: {
              provider,
              sourceType: 'portal_connection',
              connectionId: connection._id.toString(),
            },
            status: 'active',
            postedDate: rawJob.postedDate || new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          jobsCreated++;
        }
      }

      const durationMs = Date.now() - startTime;

      // Update sync task
      await PortalJobSyncTaskModel.findByIdAndUpdate(syncTask._id, {
        status: 'completed',
        completedAt: new Date(),
        durationMs,
        results: {
          jobsFetched: rawJobs.length,
          jobsCreated,
          jobsUpdated,
          jobsDeduplicated,
        },
      });

      // Update connection sync metadata and live stats
      await PortalConnection.findByIdAndUpdate(connection._id, {
        'sync.lastCompletedAt': new Date(),
        'sync.lastSuccessAt': new Date(),
        $inc: {
          'sync.jobsFetched': rawJobs.length,
          'sync.jobsCreated': jobsCreated,
          'sync.jobsUpdated': jobsUpdated,
          'stats.jobsDiscovered': jobsCreated,
        },
        'health.status': 'healthy',
        'health.consecutiveFailures': 0,
        'health.lastError': undefined,
      });

      return {
        success: true,
        jobsFetched: rawJobs.length,
        jobsCreated,
        jobsUpdated,
        jobsDeduplicated,
      };
    } catch (error: any) {
      console.error(`[PortalConnectionService] Sync error for ${provider}:`, error);

      await PortalJobSyncTaskModel.findByIdAndUpdate(syncTask._id, {
        status: 'failed',
        completedAt: new Date(),
        error: {
          code: 'SYNC_ERROR',
          message: error.message || 'Unknown sync error',
          safeUserMessage: `Failed to synchronize jobs with ${provider}. Please verify your connection.`,
          retryable: true,
          requiresUserAction: false,
        },
      });

      await PortalConnection.findByIdAndUpdate(connection._id, {
        'sync.lastFailureAt': new Date(),
        'health.status': 'degraded',
        $inc: { 'health.consecutiveFailures': 1 },
        'health.lastErrorCode': 'SYNC_ERROR',
        'health.lastErrorAt': new Date(),
        'health.lastErrorMessage': error.message,
      });

      return {
        success: false,
        jobsFetched: 0,
        jobsCreated: 0,
        jobsUpdated: 0,
        jobsDeduplicated: 0,
        error: {
          code: 'SYNC_ERROR',
          message: error.message,
          safeUserMessage: `Failed to synchronize jobs with ${provider}.`,
          retryable: true,
          requiresUserAction: false,
        },
      };
    }
  }

  /**
   * Disconnect a portal connection safely
   */
  static async disconnectPortalConnection(
    userId: string,
    connectionIdOrProvider: string
  ): Promise<boolean> {
    await getConnection();
    const PortalConnection = await getPortalConnectionModel();

    let connection: any = null;
    if (ObjectId.isValid(connectionIdOrProvider)) {
      connection = await PortalConnection.findById(connectionIdOrProvider);
    }
    if (!connection) {
      connection = await PortalConnection.findOne({
        userId,
        provider: connectionIdOrProvider,
      });
    }

    if (!connection) {
      return true; // Already disconnected
    }

    const adapter = portalAdapterRegistry.getAdapter(connection.provider);
    await adapter.disconnect(connection);

    return true;
  }

  private static getProviderDisplayName(provider: PortalProvider): string {
    const names: Record<PortalProvider, string> = {
      naukri: 'Naukri.com',
      indeed: 'Indeed Global',
      linkedin: 'LinkedIn',
      greenhouse: 'Greenhouse ATS',
      adzuna: 'Adzuna Free Index',
      lever: 'Lever Job Postings',
      ashby: 'Ashby Job Boards',
      workable: 'Workable Job Boards',
      foundit: 'Foundit (Monster)',
      dice: 'Dice Tech',
      ziprecruiter: 'ZipRecruiter',
      other: 'Other Portal',
    };
    return names[provider] || provider;
  }

  private static getProviderCategory(provider: PortalProvider): string {
    const categories: Record<PortalProvider, string> = {
      naukri: 'India & Middle East Leader',
      indeed: 'Worldwide #1 Job Board',
      linkedin: 'Professional Network & In-Mail',
      greenhouse: 'Direct Unicorn & Enterprise Boards',
      adzuna: 'Global Search Aggregator',
      lever: 'Startup & Tech Boards',
      ashby: 'Compensation-Enriched Boards',
      workable: 'SMB & Agency Boards',
      foundit: 'Asia & Gulf Tech',
      dice: 'Tech & Security Roles',
      ziprecruiter: 'US & UK Fast Apply',
      other: 'Custom Career Feed',
    };
    return categories[provider] || 'Job Board';
  }
}
