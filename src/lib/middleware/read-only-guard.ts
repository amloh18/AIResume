/**
 * Read-Only Guard
 * Prevents editing of frozen CVs or expired Day Pass CVs
 */
import { isCVFrozen } from '@/lib/services/deep-freeze-service';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import CV from '@/models/CV';

export interface ReadOnlyCheck {
  isReadOnly: boolean;
  reason?: string;
  canUpgrade?: boolean;
}

export async function checkReadOnlyAccess(
  cvId: string,
  userId: string,
  action: 'edit' | 'download' | 'delete'
): Promise<ReadOnlyCheck> {
  await getConnection();
  
  // Check if CV is frozen
  const frozen = await isCVFrozen(cvId, userId);
  if (frozen) {
    return {
      isReadOnly: true,
      reason: 'This resume is in the archive. Resubscribe to thaw it.',
      canUpgrade: true
    };
  }
  
  const cv = await CV.findOne({ _id: cvId, userId }).select('cvType');
  
  // EDGE CASE 15: Master CV is never locked
  if (cv?.cvType === 'master') {
    return { isReadOnly: false };
  }
  
  return { isReadOnly: false };
}

