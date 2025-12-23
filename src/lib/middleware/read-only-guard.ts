/**
 * Read-Only Guard
 * Prevents editing of frozen CVs or expired Day Pass CVs
 */
import { isCVFrozen } from '@/lib/services/deep-freeze-service';
import { checkDayPassAccess } from '@/lib/services/day-pass-service';
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
  
  // Check Day Pass expiry for Journey CVs
  const user = await User.findById(userId).select('currentPlanKey subscription');
  const cv = await CV.findOne({ _id: cvId, userId }).select('cvType');
  
  if (cv?.cvType === 'journey' && user?.currentPlanKey === 'day_pass') {
    const dayPassAccess = await checkDayPassAccess(userId);
    
    if (dayPassAccess.isExpired) {
      // EDGE CASE 14: Day Pass expired - read-only mode
      if (action === 'download') {
        return {
          isReadOnly: true,
          reason: 'Your pass expired. Resume is locked. Renew pass or Upgrade to download.',
          canUpgrade: true
        };
      }
      if (action === 'edit') {
        return {
          isReadOnly: true,
          reason: 'Your pass expired. Resume is locked. Renew pass or Upgrade to edit.',
          canUpgrade: true
        };
      }
    }
  }
  
  // EDGE CASE 15: Master CV is never locked
  if (cv?.cvType === 'master') {
    return { isReadOnly: false };
  }
  
  return { isReadOnly: false };
}

