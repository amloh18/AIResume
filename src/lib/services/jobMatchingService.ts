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
import {
  extractUserSkills,
  extractJobSkills,
  computeSmartMatch,
} from '@/lib/services/smartSkillMatcher';

export class JobMatchingService {
  /**
   * Compute match score for a user and job.
   * 
   * IMPORTANT: Now reads from canonical JobSearchProfile instead of legacy job_preferences.
   * Falls back to legacy job_preferences if profile doesn't exist.
   */
  static async computeScore(userId: string, jobId: string): Promise<JobMatch> {
    try {
      const { getDb } = await import('@/lib/db');
      const db = await getDb();

      const [user, job] = await Promise.all([
        db.collection<User>('users').findOne({ _id: new ObjectId(userId) }),
        db.collection<Job>('jobs').findOne({ _id: new ObjectId(jobId) }),
      ]);

      if (!user || !job) {
        throw new Error('User or job not found');
      }

      // Read from JobSearchProfile or legacy job_preferences based on feature flag
      let preferences: JobPreferences | null = null;
      
      const { isFeatureFlagEnabledForUser, FEATURE_FLAGS } = await import('@/lib/feature-flags');
      const useNewStore = isFeatureFlagEnabledForUser(FEATURE_FLAGS.USE_JOB_SEARCH_PROFILE, userId);
      
      if (useNewStore) {
        try {
          const { JobSearchProfileService } = await import('./jobSearchProfileService');
          const { trackNewStoreRead, trackLegacyFallbackRead } = await import('@/lib/migration/migrationTelemetry');
          const profile = await JobSearchProfileService.getProfile(userId);
          
          if (profile) {
            preferences = {
              titles: profile.targetRoles,
              locations: profile.locations,
              country: 'UK',
              remoteOnly: profile.remoteOnly,
              salaryMin: profile.minSalary,
            } as JobPreferences;
            trackNewStoreRead('JobMatchingService', userId);
          } else {
            preferences = await db.collection<JobPreferences>('job_preferences').findOne({
              userId: new ObjectId(userId),
            });
            trackLegacyFallbackRead({
              service: 'JobMatchingService',
              userId,
              legacySource: 'job_preferences',
              reason: 'profile_not_found',
            });
          }
        } catch (error) {
          console.warn('[JobMatchingService] Could not load JobSearchProfile, falling back to legacy:', error);
          const { trackLegacyFallbackRead } = await import('@/lib/migration/migrationTelemetry');
          preferences = await db.collection<JobPreferences>('job_preferences').findOne({
            userId: new ObjectId(userId),
          });
          trackLegacyFallbackRead({
            service: 'JobMatchingService',
            userId,
            legacySource: 'job_preferences',
            reason: 'profile_error',
            error: error instanceof Error ? error.message : String(error),
          });
        }
      } else {
        // Feature flag disabled — read directly from legacy
        preferences = await db.collection<JobPreferences>('job_preferences').findOne({
          userId: new ObjectId(userId),
        });
      }

      if (!preferences) {
        throw new Error('Preferences not found');
      }

      // Load user's master CV for skill extraction
      const primaryCvId = (user as any).primary_cv_id || (user as any).settings?.primaryCvId;
      let userSkills: string[] = [];

      if (primaryCvId) {
        try {
          const CV = (await import('@/models/CV')).default;
          const cv = await CV.findById(primaryCvId).lean() as any;
          if (cv?.cvData) {
            userSkills = extractUserSkills(cv.cvData);
          }
        } catch {}
      }

      // Fallback: extract skills from user preferences titles as keywords
      if (userSkills.length === 0 && preferences.titles?.length) {
        userSkills = preferences.titles.map((t) => t.toLowerCase());
      }

      const breakdown = await this.calculateBreakdown(user, job, preferences, userSkills);
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
    preferences: JobPreferences,
    userSkills: string[] = []
  ): Promise<MatchBreakdown> {
    const jobSkills = extractJobSkills({
      description: (job as any).description || (job as any).jobDescription || '',
      keywords: job.keywords || [],
      title: job.title,
    });

    const userTitles = preferences.titles || [];

    const smartResult = computeSmartMatch(
      userSkills,
      jobSkills,
      userTitles,
      job.title,
      job.location || '',
      preferences.locations || [],
      job.remote || false,
      preferences.remoteOnly || false,
      job.postedDate || job.createdAt
    );

    return smartResult.breakdown;
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
