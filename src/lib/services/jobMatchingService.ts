import { ObjectId } from 'mongodb';
import type {
  Job,
  JobMatch,
  JobPreferences,
  MatchBreakdown,
  User,
} from '@/types/automation-schema';
import { MATCH_SCORE_WEIGHTS, MATCH_SCORE_THRESHOLDS } from '@/types/automation-schema';
import { calculateLevenshteinDistance } from '@/lib/services/semantic-matcher-service';

export class JobMatchingService {
  static async computeScore(userId: string, jobId: string): Promise<JobMatch> {
    try {
      const { getDb } = await import('@/lib/db');
      const db = await getDb();

      const [user, job, preferences] = await Promise.all([
        db.collection<User>('users').findOne({ _id: new ObjectId(userId) }),
        db.collection<Job>('jobs').findOne({ _id: new ObjectId(jobId) }),
        db.collection<JobPreferences>('job_preferences').findOne({
          userId: new ObjectId(userId),
        }),
      ]);

      if (!user || !job || !preferences) {
        throw new Error('User, job, or preferences not found');
      }

      const breakdown = await this.calculateBreakdown(user, job, preferences);
      const score =
        breakdown.skills * MATCH_SCORE_WEIGHTS.SKILLS +
        breakdown.title * MATCH_SCORE_WEIGHTS.TITLE +
        breakdown.location * MATCH_SCORE_WEIGHTS.LOCATION +
        breakdown.recency * MATCH_SCORE_WEIGHTS.RECENCY;

      const eligibleForAutoApply =
        score >= MATCH_SCORE_THRESHOLDS.AUTO_APPLY_MIN &&
        job.atsType !== 'unknown';

      const match: JobMatch = {
        _id: new ObjectId(),
        userId: new ObjectId(userId),
        jobId: new ObjectId(jobId),
        score: Math.round(score),
        breakdown,
        eligibleForAutoApply,
        createdAt: new Date(),
      };

      await db.collection<JobMatch>('job_matches').updateOne(
        {
          userId: new ObjectId(userId),
          jobId: new ObjectId(jobId),
        },
        { $set: match },
        { upsert: true }
      );

      return match;
    } catch (error) {
      console.error('[JobMatchingService] computeScore error:', error);
      throw error;
    }
  }

  private static async calculateBreakdown(
    user: User,
    job: Job,
    preferences: JobPreferences
  ): Promise<MatchBreakdown> {
    const skillsScore = await this.calculateSkillsScore(job);
    const titleScore = this.calculateTitleScore(preferences.titles, job.title);
    const locationScore = this.calculateLocationScore(
      preferences.locations,
      job.location,
      preferences.remoteOnly,
      job.remote
    );
    const recencyScore = this.calculateRecencyScore(
      job.postedDate || job.createdAt
    );

    return {
      skills: skillsScore,
      title: titleScore,
      location: locationScore,
      recency: recencyScore,
    };
  }

  private static async calculateSkillsScore(job: Job): Promise<number> {
    if (!job.keywords || job.keywords.length === 0) {
      return 50;
    }
    // Score based on how many job keywords exist (more keywords = higher baseline)
    const keywordCount = job.keywords.length;
    if (keywordCount >= 10) return 85;
    if (keywordCount >= 5) return 75;
    return 60;
  }

  private static calculateTitleScore(
    userTitles: string[],
    jobTitle: string
  ): number {
    const normalizedJobTitle = jobTitle.toLowerCase();
    const normalizedUserTitles = userTitles.map((t) => t.toLowerCase());

    for (const userTitle of normalizedUserTitles) {
      if (normalizedJobTitle.includes(userTitle)) {
        return 100;
      }

      if (userTitle.includes(normalizedJobTitle)) {
        return 90;
      }

      const similarity = this.calculateStringSimilarity(
        userTitle,
        normalizedJobTitle
      );
      if (similarity > 0.7) {
        return 80;
      }
    }

    return 30;
  }

  private static calculateLocationScore(
    userLocations: string[],
    jobLocation: string,
    userRemoteOnly: boolean,
    jobRemote: boolean
  ): number {
    if (userRemoteOnly && !jobRemote) {
      return 0;
    }

    if (jobRemote) {
      return 100;
    }

    const normalizedJobLocation = jobLocation.toLowerCase();
    const normalizedUserLocations = userLocations.map((l) => l.toLowerCase());

    for (const userLocation of normalizedUserLocations) {
      if (normalizedJobLocation.includes(userLocation)) {
        return 100;
      }

      if (userLocation === 'remote' && jobRemote) {
        return 100;
      }
    }

    return 50;
  }

  private static calculateRecencyScore(postedDate: Date): number {
    const now = new Date();
    const daysSincePosted = Math.floor(
      (now.getTime() - postedDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSincePosted <= 1) return 100;
    if (daysSincePosted <= 3) return 90;
    if (daysSincePosted <= 7) return 80;
    if (daysSincePosted <= 14) return 70;
    if (daysSincePosted <= 30) return 50;
    return 30;
  }

  private static calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    const editDistance = calculateLevenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  static async rematchAllJobsForUser(userId: string): Promise<void> {
    try {
      const { getDb } = await import('@/lib/db');
      const db = await getDb();

      const jobs = await db.collection<Job>('jobs').find({}).toArray();

      const matchPromises = jobs.map((job) =>
        this.computeScore(userId, job._id.toString())
      );

      await Promise.all(matchPromises);

      console.log(
        `[JobMatchingService] Rematched ${jobs.length} jobs for user ${userId}`
      );
    } catch (error) {
      console.error('[JobMatchingService] rematchAllJobsForUser error:', error);
      throw error;
    }
  }

  static async getEligibleJobs(
    userId: string,
    minScore: number = MATCH_SCORE_THRESHOLDS.DISPLAY_MIN
  ): Promise<JobMatch[]> {
    try {
      const { getDb } = await import('@/lib/db');
      const db = await getDb();

      const matches = await db
        .collection<JobMatch>('job_matches')
        .find({
          userId: new ObjectId(userId),
          score: { $gte: minScore },
        })
        .sort({ score: -1 })
        .toArray();

      return matches;
    } catch (error) {
      console.error('[JobMatchingService] getEligibleJobs error:', error);
      throw error;
    }
  }
}
