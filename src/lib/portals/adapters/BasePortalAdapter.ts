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
        health: {
          status: 'disconnected',
          lastError: 'User disconnected portal account',
          lastErrorAt: new Date(),
        },
        $unset: {
          credentialReference: 1,
          encryptedSessionState: 1,
        },
      });
      return true;
    } catch (error) {
      console.error(`[${this.provider} Adapter] Error disconnecting:`, error);
      return false;
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
