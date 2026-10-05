import {
  PortalAdapter,
  PortalCapabilities,
  PortalConnectionStartResult,
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
import { encryptToken, decryptToken } from '@/lib/auth/token-encryption';
import crypto from 'crypto';

/** MongoDB duplicate-key error, raised by the unique `{userId, provider}` index. */
const DUPLICATE_KEY_CODE = 11000;

/** Parameters for {@link BasePortalAdapter.markConnected}. */
interface MarkConnectedParams {
  authMethod: PortalAuthMethod;
  /**
   * Identifying account data. Every field is optional **on purpose** — when the
   * user did not supply an identifier we store nothing rather than inventing a
   * placeholder. The previous adapters filled in `${name}@indeed.user`, and the
   * UI printed that back to the user as their account.
   */
  account: {
    email?: string;
    displayName?: string;
    portalUserId?: string;
    profileUrl?: string;
  };
  /**
   * Opaque session material supplied by a session-capture client (the future
   * browser extension). Absent for a declared connection, in which case any
   * previously stored session is cleared rather than left to rot.
   */
  sessionPayload?: unknown;
  sessionTtlDays: number;
  syncIntervalMinutes: number;
  preferences?: IPortalConnection['preferences'];
}

export abstract class BasePortalAdapter implements PortalAdapter {
  abstract readonly provider: PortalProvider;
  abstract readonly defaultAuthMethod: PortalAuthMethod;

  abstract getCapabilities(): PortalCapabilities;

  async startConnection(
    userId: string,
    options?: { redirectUri?: string; state?: string }
  ): Promise<PortalConnectionStartResult> {
    const connectionAttemptId = `attempt_${this.provider}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes TTL

    return {
      connectionAttemptId,
      provider: this.provider,
      authMethod: this.defaultAuthMethod,
      expiresAt,
      state: options?.state || crypto.randomBytes(16).toString('hex'),
    };
  }

  abstract completeConnection(
    userId: string,
    request: PortalConnectionCompleteRequest
  ): Promise<{
    connection: IPortalConnection;
    validation: PortalConnectionValidationResult;
  }>;

  abstract validateConnection(
    connection: IPortalConnection
  ): Promise<PortalConnectionValidationResult>;

  abstract fetchJobs(
    connection: IPortalConnection,
    options?: PortalSyncOptions
  ): Promise<{
    jobs: NormalizedPortalJob[];
    cursor?: string;
    hasMore?: boolean;
  }>;

  async disconnect(connection: IPortalConnection): Promise<boolean> {
    try {
      const PortalConnection = await getPortalConnectionModel();
      await PortalConnection.findByIdAndUpdate(connection._id, {
        status: 'disconnected',
        // Field paths, not a whole-subdocument replacement. The previous version
        // set `health: { status, lastError, lastErrorAt }`, which silently dropped
        // `consecutiveFailures` (so a reconnect-and-fail loop never escalated),
        // and wrote `lastError`, which is not a schema path — the schema field is
        // `lastErrorMessage`, so the reason for the disconnect was discarded.
        $set: {
          'health.status': 'disconnected',
          'health.lastErrorMessage': 'User disconnected portal account',
          'health.lastErrorAt': new Date(),
        },
        // The stored session is the sensitive part. A disconnect must actually
        // remove it, not just relabel the record.
        $unset: {
          credentialReference: 1,
          encryptedSessionState: 1,
          'health.lastErrorCode': 1,
        },
      });
      return true;
    } catch (error) {
      console.error(`[${this.provider} Adapter] Error disconnecting:`, error);
      return false;
    }
  }

  /**
   * Write the connected state for this user+source.
   *
   * Centralised because all three consumer adapters had grown their own copy of
   * this update, and every copy carried the same three defects:
   *
   *   1. `sync: {...}` / `health: {...}` / `sessionMetadata: {...}` were written
   *      as **whole subdocuments**, so reconnecting wiped `sync.jobsFetched`,
   *      `jobsCreated` and `health.consecutiveFailures`. Field paths fix that.
   *   2. `sync.lastSuccessAt` was set to `new Date()` at connect time — claiming a
   *      successful sync that had not happened.
   *   3. `encryptedSessionState: undefined` does not clear a field in Mongoose; it
   *      is stripped from the update, so a stale session survived a reconnect that
   *      supplied no new one.
   *
   * ⚠️ The unique index can reject the upsert when two connects race. That is the
   * index doing its job — the record is then updated instead of duplicated.
   */
  protected async markConnected(
    userId: string,
    params: MarkConnectedParams
  ): Promise<IPortalConnection> {
    const PortalConnection = await getPortalConnectionModel();
    const now = new Date();

    const account: Record<string, string> = {};
    if (params.account.email) account.email = params.account.email;
    if (params.account.displayName) account.displayName = params.account.displayName;
    if (params.account.portalUserId) account.portalUserId = params.account.portalUserId;
    if (params.account.profileUrl) account.profileUrl = params.account.profileUrl;

    const update: Record<string, unknown> = {
      $set: {
        userId,
        provider: this.provider,
        status: 'connected',
        authMethod: params.authMethod,
        connectedAt: now,
        account,
        capabilities: this.getCapabilities(),
        'sessionMetadata.createdAt': now,
        'sessionMetadata.lastValidatedAt': now,
        'sessionMetadata.lastUsedAt': now,
        'sessionMetadata.expiresAt': new Date(
          now.getTime() + params.sessionTtlDays * 24 * 60 * 60 * 1000
        ),
        'sync.enabled': true,
        'sync.intervalMinutes': params.syncIntervalMinutes,
        'health.status': 'healthy',
        'health.consecutiveFailures': 0,
        ...(params.preferences ? { preferences: params.preferences } : {}),
      },
      $unset: {
        // A healthy connection carries no error. Leaving the old one in place made
        // a recovered connection still look broken in any UI that reads it.
        'health.lastErrorCode': 1,
        'health.lastErrorMessage': 1,
        'health.lastErrorAt': 1,
        ...(params.sessionPayload ? {} : { encryptedSessionState: 1, credentialReference: 1 }),
      },
    };

    if (params.sessionPayload) {
      (update.$set as Record<string, unknown>).encryptedSessionState = this.encryptPayload(
        params.sessionPayload
      );
    }

    const applyUpdate = async (upsert: boolean): Promise<IPortalConnection> => {
      const result = await PortalConnection.findOneAndUpdate(
        { userId, provider: this.provider },
        update,
        { upsert, new: true, runValidators: true }
      );
      if (!result) {
        // `new: true` with a matched filter always returns a document, so this is
        // a defensive guard rather than an expected path.
        throw new Error(`Failed to persist ${this.provider} connection for user ${userId}`);
      }
      return result;
    };

    try {
      return await applyUpdate(true);
    } catch (error: any) {
      if (error?.code === DUPLICATE_KEY_CODE) {
        // Lost the race against a concurrent connect. The row now exists, so a
        // plain update on the same key is correct and creates nothing.
        return await applyUpdate(false);
      }
      throw error;
    }
  }

  protected encryptPayload(payload: any): string {
    const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return encryptToken(raw);
  }

  protected decryptPayload<T = any>(encryptedData?: string): T | null {
    if (!encryptedData) return null;
    try {
      const decrypted = decryptToken(encryptedData);
      try {
        return JSON.parse(decrypted) as T;
      } catch {
        return decrypted as unknown as T;
      }
    } catch (error) {
      console.error(`[${this.provider} Adapter] Failed to decrypt payload:`, error);
      return null;
    }
  }
}
