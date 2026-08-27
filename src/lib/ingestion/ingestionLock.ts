/**
 * Ingestion Lock
 *
 * MongoDB-based distributed locking for ingestion segments.
 * Prevents duplicate ingestion runs when multiple users search
 * for the same role family / location / remote combination.
 *
 * Uses a dedicated `ingestionLocks` collection with TTL-based expiry
 * for automatic lock cleanup.
 */

import mongoose from 'mongoose';

// ── Lock Schema ─────────────────────────────────────────────────────────────

const IngestionLockSchema = new mongoose.Schema(
  {
    segmentKey: { type: String, required: true, unique: true },
    runId: { type: String, required: true },
    acquiredAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: false }
);

// TTL index: MongoDB automatically deletes documents when expiresAt passes
IngestionLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
IngestionLockSchema.index({ segmentKey: 1 });

let _LockModel: mongoose.Model<any> | null = null;

function getLockModel(): mongoose.Model<any> {
  if (_LockModel) return _LockModel;
  const conn = mongoose.connection;
  _LockModel = conn.models['IngestionLock'] || conn.model('IngestionLock', IngestionLockSchema, 'ingestionLocks');
  return _LockModel;
}

// ── Lock Operations ─────────────────────────────────────────────────────────

export interface LockAcquisitionParams {
  segmentKey: string;
  runId: string;
  ttlSeconds?: number;
  metadata?: Record<string, any>;
}

export interface LockStatus {
  locked: boolean;
  runId?: string;
  acquiredAt?: Date;
  expiresAt?: Date;
}

export class IngestionLock {
  /**
   * Try to acquire a lock for a demand segment.
   * Returns true if lock was acquired, false if another worker holds it.
   *
   * Uses MongoDB's unique index constraint: if the insert fails with
   * duplicate key error, the lock is already held.
   */
  static async acquire(params: LockAcquisitionParams): Promise<boolean> {
    const { segmentKey, runId, ttlSeconds = 600, metadata } = params;
    const LockModel = getLockModel();

    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    try {
      await LockModel.create({
        segmentKey,
        runId,
        acquiredAt: now,
        expiresAt,
        metadata,
      });
      return true;
    } catch (err: any) {
      // Duplicate key error means lock is already held
      if (err.code === 11000) {
        // Check if the existing lock is stale (shouldn't happen with TTL, but safety check)
        const existing = await LockModel.findOne({ segmentKey });
        if (existing && existing.expiresAt < now) {
          // Stale lock - force delete and retry
          await LockModel.deleteOne({ segmentKey });
          try {
            await LockModel.create({
              segmentKey,
              runId,
              acquiredAt: now,
              expiresAt,
              metadata,
            });
            return true;
          } catch {
            return false;
          }
        }
        return false;
      }
      throw err;
    }
  }

  /**
   * Release a lock. Only the holder can release it.
   */
  static async release(segmentKey: string, runId: string): Promise<void> {
    const LockModel = getLockModel();
    await LockModel.deleteOne({ segmentKey, runId });
  }

  /**
   * Force-release a lock regardless of holder (admin action).
   */
  static async forceRelease(segmentKey: string): Promise<boolean> {
    const LockModel = getLockModel();
    const result = await LockModel.deleteOne({ segmentKey });
    return result.deletedCount > 0;
  }

  /**
   * Check if a segment is currently locked.
   */
  static async isLocked(segmentKey: string): Promise<LockStatus> {
    const LockModel = getLockModel();
    const lock = await LockModel.findOne({ segmentKey });

    if (!lock) return { locked: false };

    // Check if lock is expired (safety check)
    if (lock.expiresAt < new Date()) {
      await LockModel.deleteOne({ segmentKey });
      return { locked: false };
    }

    return {
      locked: true,
      runId: lock.runId,
      acquiredAt: lock.acquiredAt,
      expiresAt: lock.expiresAt,
    };
  }

  /**
   * Get all currently held locks.
   */
  static async getAllLocks(): Promise<Array<{
    segmentKey: string;
    runId: string;
    acquiredAt: Date;
    expiresAt: Date;
    metadata?: Record<string, any>;
  }>> {
    const LockModel = getLockModel();
    const locks = await LockModel.find({ expiresAt: { $gt: new Date() } })
      .sort({ acquiredAt: -1 })
      .lean();
    return locks as any[];
  }

  /**
   * Cleanup stale locks (those past their TTL but not yet garbage-collected).
   * Useful as a safety net; MongoDB TTL index handles most cleanup.
   */
  static async cleanupStale(maxAgeMs = 30 * 60 * 1000): Promise<number> {
    const LockModel = getLockModel();
    const cutoff = new Date(Date.now() - maxAgeMs);
    const result = await LockModel.deleteMany({
      expiresAt: { $lt: cutoff },
    });
    return result.deletedCount || 0;
  }

  /**
   * Get the number of currently active locks.
   */
  static async getActiveCount(): Promise<number> {
    const LockModel = getLockModel();
    return LockModel.countDocuments({ expiresAt: { $gt: new Date() } });
  }
}

/**
 * Build a segment key from demand parameters.
 * Keys are deterministic so the same demand segment always maps to the same lock.
 */
export function buildSegmentKey(params: {
  roleFamily: string;
  country?: string;
  remote?: boolean;
  source?: string;
}): string {
  const parts = [params.source, params.roleFamily, params.country || 'GLOBAL'];
  if (params.remote) parts.push('REMOTE');
  return parts.filter(Boolean).join(':');
}
