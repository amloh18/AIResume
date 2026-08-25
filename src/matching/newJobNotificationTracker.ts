import { Db, ObjectId } from 'mongodb';
import { extractCandidateProfile } from './candidateProfileExtractor';
import { buildHardFilterQuery } from './hardFilterStage';

export interface NewJobsNotificationStatus {
  hasNewJobs: boolean;
  newJobsCount: number;
  bannerMessage?: string;
}

export async function checkNewMatchingJobsForUser(db: Db, userId: string): Promise<NewJobsNotificationStatus> {
  const usersColl = db.collection('users');
  const jobsColl = db.collection('jobs');

  let userObjId: ObjectId | null = null;
  try {
    userObjId = new ObjectId(userId);
  } catch {
    // string id
  }

  const queryFilters: any[] = [{ email: userId }, { id: userId }];
  if (userObjId) {
    queryFilters.push({ _id: userObjId });
  }

  const user = await usersColl.findOne({
    $or: queryFilters,
  });

  const lastSeenAt = user?.lastSeenJobMatchesAt || new Date(Date.now() - 24 * 60 * 60 * 1000);

  const profile = await extractCandidateProfile(db, userId);
  const filter = buildHardFilterQuery(profile);
  filter.createdAt = { $gt: lastSeenAt };

  const newJobsCount = await jobsColl.countDocuments(filter);

  return {
    hasNewJobs: newJobsCount > 0,
    newJobsCount,
    bannerMessage:
      newJobsCount > 0
        ? `🔥 ${newJobsCount} new roles matching your Profile discovered today`
        : undefined,
  };
}
