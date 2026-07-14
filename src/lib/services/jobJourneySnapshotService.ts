import { RelationshipRepository } from '../repositories/relationshipRepository';
import { RelationshipMapper } from '../mappers/relationshipMapper';
import { JobJourneySnapshot } from '@/types/job-relationship';
import { serializeId } from '../utils/idSerializer';

export class JobJourneySnapshotService {
  // Request-level cache
  private static cache = new Map<string, JobJourneySnapshot>();

  static clearCache() {
    this.cache.clear();
  }

  static async getSnapshotForJob(job: any, userId: string): Promise<JobJourneySnapshot> {
    const jobId = serializeId(job);
    if (!jobId) {
      return { journey: null, documents: {}, health: 'missing_journey' };
    }

    const cacheKey = `${userId}:${jobId}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const journey = await RelationshipRepository.findPrimaryJourney(jobId, userId);
    if (!journey) {
      const result: JobJourneySnapshot = { journey: null, documents: {}, health: 'missing_journey' };
      this.cache.set(cacheKey, result);
      return result;
    }

    const [cvDoc, clDoc] = await Promise.all([
      journey.cvId ? RelationshipRepository.findCV(journey.cvId) : null,
      journey.coverLetterId ? RelationshipRepository.findCoverLetter(journey.coverLetterId) : null
    ]);

    const snapshot = RelationshipMapper.mapToSnapshot(journey, cvDoc, clDoc);
    this.cache.set(cacheKey, snapshot);
    return snapshot;
  }

  static async getSnapshotsForJobs(jobs: any[], userId: string): Promise<Map<string, JobJourneySnapshot>> {
    const result = new Map<string, JobJourneySnapshot>();
    const jobIds = jobs.map(j => serializeId(j)).filter(Boolean) as string[];
    if (!jobIds.length) return result;

    // Load journeys
    const allJourneys = await RelationshipRepository.findJourneysForJobs(jobIds, userId);
    
    // Group journeys by jobId
    const journeysByJobId = new Map<string, any>();
    for (const journey of allJourneys) {
      if (!journeysByJobId.has(journey.jobId)) {
        journeysByJobId.set(journey.jobId, journey); // First one is primary due to sort
      }
    }

    // Gather doc IDs to batch query
    const cvIds: string[] = [];
    const clIds: string[] = [];
    for (const journey of allJourneys) {
      if (journey.cvId) cvIds.push(journey.cvId);
      if (journey.coverLetterId) clIds.push(journey.coverLetterId);
    }

    const [cvs, clLetters] = await Promise.all([
      cvIds.length ? RelationshipRepository.findCVs(cvIds) : [],
      clIds.length ? RelationshipRepository.findCoverLetters(clIds) : []
    ]);

    const cvMap = new Map(cvs.map(c => [serializeId(c._id)!, c]));
    const clMap = new Map(clLetters.map(c => [serializeId(c._id)!, c]));

    for (const job of jobs) {
      const jobId = serializeId(job)!;
      if (!jobId) continue;

      const journey = journeysByJobId.get(jobId);
      if (!journey) {
        result.set(jobId, { journey: null, documents: {}, health: 'missing_journey' });
        continue;
      }

      const cvDoc = journey.cvId ? cvMap.get(serializeId(journey.cvId)!) : null;
      const clDoc = journey.coverLetterId ? clMap.get(serializeId(journey.coverLetterId)!) : null;

      const snapshot = RelationshipMapper.mapToSnapshot(journey, cvDoc, clDoc);
      result.set(jobId, snapshot);
      
      // Seed request-level cache
      this.cache.set(`${userId}:${jobId}`, snapshot);
    }

    return result;
  }
}
