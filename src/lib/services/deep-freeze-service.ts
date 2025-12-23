/**
 * Deep Freeze Protocol
 * When user downgrades from Pro to Free, freeze all Journey CVs except the most recently edited one
 */
import { getConnection } from '@/lib/database';
import CV from '@/models/CV';
import User from '@/models/User';
import mongoose from 'mongoose';

export interface DeepFreezeResult {
  frozenCount: number;
  activeCount: number;
  mostRecentCVId: string | null;
}

export async function applyDeepFreeze(userId: string): Promise<DeepFreezeResult> {
  await getConnection();
  
  const normalizedUserId = mongoose.Types.ObjectId.isValid(userId) 
    ? new mongoose.Types.ObjectId(userId)
    : userId;
  
  // Find most recently edited Journey CV
  const mostRecent = await CV.findOne({
    userId: normalizedUserId,
    cvType: 'journey',
    'metadata.isFrozen': { $ne: true }
  })
  .sort({ 'metadata.lastModified': -1 })
  .select('_id');
  
  const mostRecentId = mostRecent?._id?.toString() || null;
  
  // Freeze all other Journey CVs
  const freezeResult = await CV.updateMany(
    {
      userId: normalizedUserId,
      cvType: 'journey',
      _id: mostRecentId ? { $ne: new mongoose.Types.ObjectId(mostRecentId) } : undefined,
      'metadata.isFrozen': { $ne: true }
    },
    {
      $set: {
        'metadata.isFrozen': true,
        'metadata.frozenAt': new Date(),
        'metadata.frozenReason': 'subscription_downgrade'
      }
    }
  );
  
  // Count remaining active
  const activeCount = await CV.countDocuments({
    userId: normalizedUserId,
    cvType: 'journey',
    'metadata.isFrozen': { $ne: true }
  });
  
  return {
    frozenCount: freezeResult.modifiedCount,
    activeCount,
    mostRecentCVId: mostRecentId
  };
}

/**
 * Check if a CV is frozen and should be read-only
 */
export async function isCVFrozen(cvId: string, userId: string): Promise<boolean> {
  await getConnection();
  
  const normalizedUserId = mongoose.Types.ObjectId.isValid(userId) 
    ? new mongoose.Types.ObjectId(userId)
    : userId;
  const normalizedCvId = mongoose.Types.ObjectId.isValid(cvId) 
    ? new mongoose.Types.ObjectId(cvId)
    : cvId;
  
  const cv = await CV.findOne({
    _id: normalizedCvId,
    userId: normalizedUserId
  }).select('metadata.isFrozen');
  
  return cv?.metadata?.isFrozen === true;
}

/**
 * Thaw a frozen CV (when user resubscribes)
 */
export async function thawCV(cvId: string, userId: string): Promise<boolean> {
  await getConnection();
  
  const normalizedUserId = mongoose.Types.ObjectId.isValid(userId) 
    ? new mongoose.Types.ObjectId(userId)
    : userId;
  const normalizedCvId = mongoose.Types.ObjectId.isValid(cvId) 
    ? new mongoose.Types.ObjectId(cvId)
    : cvId;
  
  const result = await CV.updateOne(
    {
      _id: normalizedCvId,
      userId: normalizedUserId,
      'metadata.isFrozen': true
    },
    {
      $unset: {
        'metadata.isFrozen': '',
        'metadata.frozenAt': '',
        'metadata.frozenReason': ''
      }
    }
  );
  
  return result.modifiedCount > 0;
}

