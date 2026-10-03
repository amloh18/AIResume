import { ObjectId } from 'mongodb';
import type { AuditLog } from '@/types/automation-schema';

export class AuditService {
  static async logAction(
    actor: string,
    action: string,
    target?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      const { getDb } = await import('@/lib/db');
      const db = await getDb();

      const log: AuditLog = {
        _id: new ObjectId(),
        actor: new ObjectId(actor),
        action,
        target: target ? new ObjectId(target) : undefined,
        metadata,
        createdAt: new Date(),
      };

      await db.collection<AuditLog>('audit_logs').insertOne(log);
    } catch (error) {
      console.error('[AuditService] logAction error:', error);
    }
  }

  static async queryAuditLog(filters: {
    actor?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditLog[]> {
    try {
      const { getDb } = await import('@/lib/db');
      const db = await getDb();

      const query: any = {};

      if (filters.actor) {
        query.actor = new ObjectId(filters.actor);
      }

      if (filters.action) {
        query.action = filters.action;
      }

      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) {
          query.createdAt.$gte = filters.startDate;
        }
        if (filters.endDate) {
          query.createdAt.$lte = filters.endDate;
        }
      }

      const logs = await db
        .collection<AuditLog>('audit_logs')
        .find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit || 100)
        .toArray();

      return logs;
    } catch (error) {
      console.error('[AuditService] queryAuditLog error:', error);
      throw error;
    }
  }

  static async getRecentActions(
    userId: string,
    limit: number = 20
  ): Promise<AuditLog[]> {
    return this.queryAuditLog({
      actor: userId,
      limit,
    });
  }
}
