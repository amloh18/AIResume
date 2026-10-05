import { getConnection } from '@/lib/database';
import { ObjectId } from 'mongodb';
import {
  PortalProvider,
  IPortalConnection,
  getPortalConnectionModel,
} from '@/models/PortalConnection';
import {
  SyncTaskTrigger,
  getPortalJobSyncTaskModel,
} from '@/models/PortalJobSyncTask';
import { portalAdapterRegistry } from '@/lib/portals/PortalAdapterRegistry';
import { PortalConnectionCompleteRequest, PortalSyncResult } from '@/lib/portals/types';
import {
  JOB_SOURCE_PROVIDERS,
  JobNetworkView,
  JobSourceConnectionView,
  JobSourceConnectionsResponse,
  deriveJobSourceState,
} from '@/lib/portals/connection-state';

/**
 * Strict ObjectId test.
 *
 * ⚠️ `ObjectId.isValid()` is **not** a safe guard here. It returns `true` for any
 * 12-character string, and one of our provider ids — `ziprecruiter` — is exactly
 * twelve characters. So `ObjectId.isValid('ziprecruiter') === true`, and the
 * previous `findById(connectionIdOrProvider)` threw a BSONError cast failure and
 * 500'd the sync and disconnect endpoints for that provider. Match the hex shape
 * instead of asking the driver.
 */
const OBJECT_ID_HEX = /^[0-9a-f]{24}$/i;

function toObjectId(value: string): ObjectId | null {
  return OBJECT_ID_HEX.test(value) ? new ObjectId(value) : null;
}

/**
 * Match a user's rows whether `userId` was written as a string or an ObjectId.
 *
 * `PortalConnection.userId` is `Schema.Types.Mixed`, so legacy rows may hold
 * either. The dedupe migration normalises them, but the read path must be
 * correct *before* that runs — otherwise the settings page shows nothing
 * connected and looks like the migration broke it.
 */
function userIdMatch(userId: string) {
  const oid = toObjectId(userId);
  const candidates: unknown[] = [userId, userId.toLowerCase()];
  if (oid) candidates.push(oid);
  return { $in: candidates };
}

/** Safe, user-presentable failure text. Never a stack trace or internal code. */
function safeErrorMessage(provider: string): string {
  return `We couldn't reach ${provider} with this connection. Reconnect the account to continue.`;
}

export class PortalConnectionService {
  /**
   * All job-source connections for a user, plus the state of AIResume's own
   * network.
   *
   * ⚠️ The returned state is derived from the record via `deriveJobSourceState`,
   * not from a boolean. The previous implementation computed
   * `status === 'connected' && Boolean(account.email)`, which meant a connection
   * with no stored email — every one created without one — rendered as "Not
   * connected" while the database said otherwise. Worse, every status that was
   * not literally `connected` collapsed to `disconnected`, so an expired or
   * broken connection was indistinguishable from one the user never made and no
   * surface could ever ask them to fix it.
   */
  static async getUserPortalConnections(userId: string): Promise<JobSourceConnectionsResponse> {
    await getConnection();
    const PortalConnection = await getPortalConnectionModel();

    const records = await PortalConnection.find({ userId: userIdMatch(userId) }).lean();

    // One record per source is guaranteed by the unique index, but a pre-migration
    // database can still hold duplicates. Prefer the healthiest rather than
    // letting iteration order decide.
    const byProvider = new Map<string, any>();
    for (const record of records) {
      const incumbent = byProvider.get(record.provider);
      if (!incumbent || recordRank(record) < recordRank(incumbent)) {
        byProvider.set(record.provider, record);
      }
    }

    const sources: JobSourceConnectionView[] = JOB_SOURCE_PROVIDERS.map((provider) => {
      const record = byProvider.get(provider);
      const state = deriveJobSourceState({
        status: record?.status,
        healthStatus: record?.health?.status,
        // A row that has ever been connected can honestly say "previously
        // connected"; one that never existed must not imply a history.
        hasPriorConnection: Boolean(record?.connectedAt || record?.sessionMetadata?.createdAt),
      });

      const identifier = record?.account?.email;
      const connectedAt = record?.connectedAt || record?.sessionMetadata?.createdAt;

      return {
        source: provider,
        name: providerDisplayName(provider),
        state,
        connectedAt: connectedAt ? new Date(connectedAt).toISOString() : undefined,
        // Only surface an identifier the user actually supplied. Synthetic
        // addresses written by the old adapters are filtered out rather than
        // shown back as the user's account.
        accountIdentifier: identifier && !isSyntheticIdentifier(identifier) ? identifier : undefined,
        lastError:
          state === 'attention_required'
            ? record?.health?.lastErrorMessage || safeErrorMessage(provider)
            : undefined,
        hasRecord: Boolean(record),
      };
    });

    return {
      success: true,
      network: await this.getNetworkStats(),
      sources,
    };
  }

  /**
   * AIResume's own network — always connected, never a user-connected account.
   *
   * ⚠️ Read from the ingestion system's own data. `SOURCE_REGISTRY` is
   * deliberately **not** imported: the connection subsystem and the ingestion
   * engine are meant to stay independent, and reaching into the engine to
   * decorate a settings card would couple them for a number. Counts come from
   * `jobSources` and `jobs` instead, which is what those collections are for.
   *
   * When neither can be read, `statsUnavailable` is set and the UI says so rather
   * than printing a hard-coded figure.
   */
  private static async getNetworkStats(): Promise<JobNetworkView> {
    const cached = readNetworkCache();
    if (cached) return cached;

    const view: JobNetworkView = { alwaysConnected: true };

    try {
      const { getDb } = await import('@/lib/db');
      const db = await getDb();

      // `estimatedDocumentCount` reads collection metadata — no scan, so this is
      // safe to call on a pool with millions of documents.
      const jobCount = await db.collection('jobs').estimatedDocumentCount();

      // `jobSources` holds one record per configured ingestion source.
      let sourceCount = await db.collection('jobSources').estimatedDocumentCount();

      if (sourceCount === 0) {
        // Nothing scheduled yet. Fall back to the sources that have actually
        // produced jobs, which is a truthful lower bound rather than a guess.
        const distinctSources = await db.collection('jobs').distinct('atsType');
        sourceCount = distinctSources.filter(Boolean).length;
      }

      if (jobCount === 0 && sourceCount === 0) {
        view.statsUnavailable = true;
      } else {
        view.jobCount = jobCount;
        view.sourceCount = sourceCount;
      }
    } catch (error) {
      console.warn('[PortalConnectionService] Network stats unavailable:', error);
      view.statsUnavailable = true;
    }

    writeNetworkCache(view);
    return view;
  }

  /**
   * Start a new connection attempt.
   *
   * `userId` is intentionally unused beyond the adapter contract — the attempt id
   * is stateless. It is kept in the signature so an attempt can be bound to a user
   * once real session capture lands.
   */
  static async startConnectionAttempt(
    userId: string,
    provider: PortalProvider,
    options?: { redirectUri?: string; state?: string }
  ) {
    const adapter = portalAdapterRegistry.getAdapter(provider);
    return adapter.startConnection(userId, options);
  }

  /**
   * Complete a connection.
   *
   * ⚠️ No longer triggers a background job sync. It used to, and because the
   * adapters returned hard-coded sample roles the sync wrote them straight into
   * the shared `jobs` pool — so simply connecting an account injected fabricated
   * postings (Razorpay, Wise, Monzo…) into the pool every user matches against.
   * Connecting an account and discovering jobs are separate concerns; see
   * `syncPortalJobs`.
   */
  static async completeConnection(
    userId: string,
    request: PortalConnectionCompleteRequest
  ): Promise<{
    connection: IPortalConnection;
    validation: import('@/lib/portals/types').PortalConnectionValidationResult;
  }> {
    const adapter = portalAdapterRegistry.getAdapter(request.provider);
    return adapter.completeConnection(userId, request);
  }

  /**
   * Resolve a connection the given user owns.
   *
   * ⚠️ Ownership is part of the *lookup*, not a check performed afterwards. The
   * previous version called `findById(id)` with no `userId` filter and only
   * compared owners later — and `disconnectPortalConnection` never compared at
   * all, so any signed-in user could disconnect another user's account by passing
   * its id. Returns `null` for both "missing" and "not yours" so the two are not
   * distinguishable from outside.
   */
  private static async findOwnedConnection(
    userId: string,
    connectionIdOrProvider: string
  ): Promise<any | null> {
    const PortalConnection = await getPortalConnectionModel();
    const owner = userIdMatch(userId);
    const oid = toObjectId(connectionIdOrProvider);

    if (oid) {
      const byId = await PortalConnection.findOne({ _id: oid, userId: owner });
      if (byId) return byId;
    }

    return PortalConnection.findOne({
      userId: owner,
      provider: connectionIdOrProvider.toLowerCase(),
    });
  }

  /**
   * Sync a portal's jobs.
   *
   * Honest by construction: when an adapter has no real source, this records a
   * completed sync with zero results and reports `sourceUnavailable`, instead of
   * inventing jobs. The dedupe-and-insert path below is preserved unchanged for
   * the day an adapter actually returns postings.
   */
  static async syncPortalJobs(
    userId: string,
    portalConnectionId: string,
    trigger: SyncTaskTrigger = 'manual'
  ): Promise<PortalSyncResult> {
    await getConnection();
    const PortalConnection = await getPortalConnectionModel();
    const PortalJobSyncTaskModel = await getPortalJobSyncTaskModel();

    const connection = await this.findOwnedConnection(userId, portalConnectionId);
    if (!connection) {
      // Also covers another user's id: the caller learns nothing about it.
      throw new Error('Portal connection not found');
    }

    const provider = connection.provider as PortalProvider;
    const adapter = portalAdapterRegistry.getAdapter(provider);

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
      const fetchResult = await adapter.fetchJobs(connection, { trigger, limit: 25 });
      const rawJobs = fetchResult.jobs || [];

      // ── No source yet ────────────────────────────────────────────────────
      // Not a failure and not a success: there is simply nothing to read. Report
      // it plainly so the UI can say so rather than showing a discovery count.
      if (rawJobs.length === 0) {
        await PortalJobSyncTaskModel.findByIdAndUpdate(syncTask._id, {
          status: 'completed',
          completedAt: new Date(),
          durationMs: Date.now() - startTime,
          results: { jobsFetched: 0, jobsCreated: 0, jobsUpdated: 0, jobsDeduplicated: 0 },
        });

        await PortalConnection.findByIdAndUpdate(connection._id, {
          $set: {
            'sync.lastCompletedAt': new Date(),
            'health.status': 'healthy',
            'health.consecutiveFailures': 0,
          },
          // `sync.lastSuccessAt` is deliberately NOT set: no data was retrieved,
          // so claiming a successful sync would be false.
        });

        return {
          success: true,
          jobsFetched: 0,
          jobsCreated: 0,
          jobsUpdated: 0,
          jobsDeduplicated: 0,
          sourceUnavailable: true,
          note: `Your ${providerDisplayName(provider)} account is connected. Job discovery from this account isn't available yet.`,
        };
      }

      // ── Real postings ────────────────────────────────────────────────────
      let jobsCreated = 0;
      let jobsUpdated = 0;
      let jobsDeduplicated = 0;

      const { getDb } = await import('@/lib/db');
      const db = await getDb();
      const jobsCollection = db.collection('jobs');

      for (const rawJob of rawJobs) {
        const existingJob = await jobsCollection.findOne({
          $or: [
            { externalId: rawJob.externalId },
            {
              company: { $regex: new RegExp(`^${escapeRegex(rawJob.company)}$`, 'i') },
              title: { $regex: new RegExp(`^${escapeRegex(rawJob.title)}$`, 'i') },
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

      await PortalConnection.findByIdAndUpdate(connection._id, {
        $set: {
          'sync.lastCompletedAt': new Date(),
          'sync.lastSuccessAt': new Date(),
          'health.status': 'healthy',
          'health.consecutiveFailures': 0,
        },
        $inc: {
          'sync.jobsFetched': rawJobs.length,
          'sync.jobsCreated': jobsCreated,
          'sync.jobsUpdated': jobsUpdated,
          'stats.jobsDiscovered': jobsCreated,
        },
        $unset: {
          'health.lastErrorCode': 1,
          'health.lastErrorMessage': 1,
          'health.lastErrorAt': 1,
        },
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
          safeUserMessage: safeErrorMessage(providerDisplayName(provider)),
          retryable: true,
          requiresUserAction: false,
        },
      });

      await PortalConnection.findByIdAndUpdate(connection._id, {
        $set: {
          'sync.lastFailureAt': new Date(),
          'health.status': 'degraded',
          'health.lastErrorCode': 'SYNC_ERROR',
          'health.lastErrorAt': new Date(),
          'health.lastErrorMessage': safeErrorMessage(providerDisplayName(provider)),
        },
        $inc: { 'health.consecutiveFailures': 1 },
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
          safeUserMessage: safeErrorMessage(providerDisplayName(provider)),
          retryable: true,
          requiresUserAction: false,
        },
      };
    }
  }

  /**
   * Disconnect a portal connection.
   *
   * Only the connection is removed. Jobs, applications, CVs, matches and journey
   * history are untouched — they belong to the user, not to the connection.
   */
  static async disconnectPortalConnection(
    userId: string,
    connectionIdOrProvider: string
  ): Promise<boolean> {
    await getConnection();

    const connection = await this.findOwnedConnection(userId, connectionIdOrProvider);
    if (!connection) {
      // Already gone, or never theirs. Either way there is nothing to do and
      // nothing to disclose.
      return true;
    }

    const adapter = portalAdapterRegistry.getAdapter(connection.provider as PortalProvider);
    await adapter.disconnect(connection);

    return true;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Ordering used to pick between duplicate rows in a pre-migration database:
 * a live connection beats a dead one, then the most recently updated wins.
 */
function recordRank(record: any): number {
  const statusRank: Record<string, number> = {
    connected: 0,
    connecting: 1,
    pending: 2,
    reauth_required: 3,
    expired: 4,
    error: 5,
    blocked: 6,
    disconnected: 7,
  };
  const status = statusRank[record?.status] ?? 99;
  const updated = record?.updatedAt ? new Date(record.updatedAt).getTime() : 0;
  // Lower status rank wins; ties broken by the more recently touched record.
  return status * 1e15 - updated;
}

function providerDisplayName(provider: string): string {
  const names: Record<string, string> = {
    naukri: 'Naukri',
    indeed: 'Indeed',
    linkedin: 'LinkedIn',
    foundit: 'Foundit',
    dice: 'Dice',
    ziprecruiter: 'ZipRecruiter',
    greenhouse: 'Greenhouse',
    lever: 'Lever',
    ashby: 'Ashby',
    workable: 'Workable',
    adzuna: 'Adzuna',
    other: 'this portal',
  };
  return names[provider] || provider;
}

/** Addresses the old adapters invented when the user supplied none. */
function isSyntheticIdentifier(value: string): boolean {
  return /@(naukri|indeed|linkedin)\.(user|member)$/i.test(value.trim());
}

/** Escape a user-supplied string before it becomes a `$regex` pattern. */
function escapeRegex(value: string): string {
  return String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// Network stats cache
// ---------------------------------------------------------------------------

let _networkCache: { value: JobNetworkView; ts: number } | null = null;
const NETWORK_CACHE_TTL_MS = 5 * 60 * 1000;

function readNetworkCache(): JobNetworkView | null {
  if (_networkCache && Date.now() - _networkCache.ts < NETWORK_CACHE_TTL_MS) {
    return _networkCache.value;
  }
  return null;
}

function writeNetworkCache(value: JobNetworkView): void {
  _networkCache = { value, ts: Date.now() };
}
