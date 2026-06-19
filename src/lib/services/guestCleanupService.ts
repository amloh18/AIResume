import { getConnection } from '@/lib/database';
import { User, CV, TemporaryCVDraft } from '@/models';

/**
 * Guest User Cleanup Service
 * 
 * Cleans up guest users who have abandoned onboarding.
 * A guest user is deleted if they:
 * 1. Are marked as isAnonymous: true
 * 2. Were created more than 24 hours ago
 * 3. Have no master CV linked in the CV collection
 * 4. Have no master CV draft in the TemporaryCVDraft collection
 */
export async function cleanupGuestUsers(): Promise<number> {
  try {
    await getConnection();
    
    // Find all anonymous users created more than 24 hours ago
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const guestUsers = await User.find({
      isAnonymous: true,
      createdAt: { $lt: cutoff }
    });
    
    console.log(`🔍 guestCleanupService - Found ${guestUsers.length} total anonymous users older than 24h.`);
    
    let deletedCount = 0;
    
    for (const user of guestUsers) {
      const userId = user._id;
      const anonymousToken = user.anonymousToken;
      
      // Check if user has a master CV in CV collection
      const hasMasterCV = await CV.findOne({
        userId,
        $or: [
          { cvType: 'master' },
          { 'metadata.isMaster': true },
          { 'metadata.isMaster': 'true' }
        ]
      });
      
      if (hasMasterCV) {
        console.log(`ℹ️ guestCleanupService - User ${user.email} (${userId}) has a master CV. Keeping.`);
        continue;
      }
      
      // Check if user has a master CV draft in TemporaryCVDraft collection
      const draftQuery: any = {
        isForMasterCV: true,
        $or: [
          { userId }
        ]
      };
      if (anonymousToken) {
        draftQuery.$or.push({ sessionId: anonymousToken });
      }
      
      const hasMasterCVDraft = await TemporaryCVDraft.findOne(draftQuery);
      
      if (hasMasterCVDraft) {
        console.log(`ℹ️ guestCleanupService - User ${user.email} (${userId}) has a master CV draft. Keeping.`);
        continue;
      }
      
      // If no master CV and no draft exists, delete this user
      console.log(`🧹 guestCleanupService - User ${user.email} (${userId}) has no master CV/draft. Deleting.`);
      await User.deleteOne({ _id: userId });
      deletedCount++;
    }
    
    return deletedCount;
  } catch (error) {
    console.error('❌ guestCleanupService - Error during guest user cleanup:', error);
    throw error;
  }
}
