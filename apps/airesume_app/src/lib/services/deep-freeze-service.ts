/**
 * Deep Freeze Protocol
 * When user downgrades from Pro to Free, freeze all Journey CVs except the most recently edited one
 *
 * NOTE ON FIELD LOCATION
 * ----------------------
 * The freeze state lives on the ROOT of the CV document:
 *   - `documentState: 'editable' | 'frozen' | 'read-only'`
 *   - `frozenAt: Date | null`
 *   - `frozenReason: 'plan_downgrade' | 'limit_exceeded' | 'pass_expired' | 'premium_template_restriction'`
 *
 * These are the fields declared in `src/models/CV.ts`, the fields
 * `unifiedLimitService` writes, and the fields every read path
 * (`unifiedLimitService.checkEditPermission`, Vault View, limit counting)
 * inspects. Writing to `metadata.isFrozen` instead — as this service used to —
 * is silently dropped by Mongoose strict mode and makes freezing a no-op.
 */
import { getConnection } from '@/lib/database';
import CV from '@/models/CV';
import mongoose from 'mongoose';

export type FrozenReason =
  | 'plan_downgrade'
  | 'limit_exceeded'
  | 'pass_expired'
  | 'premium_template_restriction';

export interface DeepFreezeResult {
  frozenCount: number;
  activeCount: number;
  mostRecentCVId: string | null;
}

function normalizeId(value: string) {
  return mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : value;
}

export async function applyDeepFreeze(
  userId: string,
  reason: FrozenReason = 'plan_downgrade'
): Promise<DeepFreezeResult> {
  await getConnection();

  const normalizedUserId = normalizeId(userId);

  // Find most recently edited Journey CV. Prefer `updatedAt` (always present
  // via timestamps) and fall back to metadata.lastModified only as a tie-break.
  const mostRecent = await CV.findOne({
    userId: normalizedUserId,
    cvType: 'journey',
    documentState: { $ne: 'frozen' },
  })
    .sort({ updatedAt: -1 })
    .select('_id');

  const mostRecentId = mostRecent?._id?.toString() || null;

  // Freeze all other Journey CVs
  const freezeResult = await CV.updateMany(
    {
      userId: normalizedUserId,
      cvType: 'journey',
      ...(mostRecentId ? { _id: { $ne: normalizeId(mostRecentId) } } : {}),
      documentState: { $ne: 'frozen' },
    },
    {
      $set: {
        documentState: 'frozen',
        frozenAt: new Date(),
        frozenReason: reason,
      },
    }
  );

  // Count remaining active
  const activeCount = await CV.countDocuments({
    userId: normalizedUserId,
    cvType: 'journey',
    documentState: { $ne: 'frozen' },
  });

  return {
    frozenCount: freezeResult.modifiedCount,
    activeCount,
    mostRecentCVId: mostRecentId,
  };
}

/**
 * Check if a CV is frozen and should be read-only
 */
export async function isCVFrozen(cvId: string, userId: string): Promise<boolean> {
  await getConnection();

  const cv = await CV.findOne({
    _id: normalizeId(cvId),
    userId: normalizeId(userId),
  }).select('documentState');

  return cv?.documentState === 'frozen';
}

/**
 * Thaw a frozen CV (when user resubscribes)
 */
export async function thawCV(cvId: string, userId: string): Promise<boolean> {
  await getConnection();

  const result = await CV.updateOne(
    {
      _id: normalizeId(cvId),
      userId: normalizeId(userId),
      documentState: 'frozen',
    },
    {
      $set: {
        documentState: 'editable',
        frozenAt: null,
        frozenReason: null,
      },
    }
  );

  return result.modifiedCount > 0;
}

/**
 * Thaw every frozen CV for a user. Used when a subscription is reactivated.
 */
export async function thawAllFrozenCVs(userId: string): Promise<number> {
  await getConnection();

  const result = await CV.updateMany(
    {
      userId: normalizeId(userId),
      documentState: 'frozen',
    },
    {
      $set: {
        documentState: 'editable',
        frozenAt: null,
        frozenReason: null,
      },
    }
  );

  return result.modifiedCount;
}
