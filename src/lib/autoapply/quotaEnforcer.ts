import { Db } from 'mongodb';

export interface QuotaCheckResult {
  allowed: boolean;
  appliedTodayCount: number;
  dailyLimit: number;
  remainingQuota: number;
}

export async function checkUserDailyApplicationQuota(
  db: Db,
  userId: string,
  dailyLimit = 20
): Promise<QuotaCheckResult> {
  const appsColl = db.collection('applications');

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const appliedTodayCount = await appsColl.countDocuments({
    userId: userId,
    applicationMethod: 'auto',
    createdAt: { $gte: startOfToday },
  });

  const remaining = Math.max(0, dailyLimit - appliedTodayCount);

  return {
    allowed: appliedTodayCount < dailyLimit,
    appliedTodayCount,
    dailyLimit,
    remainingQuota: remaining,
  };
}
