# Implementation Plan - JobJourneySnapshot Mapping Strategy (Refined)

This plan defines the architecture, serialization layer, and API integration for the refined `JobJourneySnapshot` mapping strategy. It addresses all feedback from the design review, ensuring a lightweight, high-performance, and future-proof implementation.

---

## Goal Description
We will implement a modular layer for mapping `JobApplication` ↔ `ApplicationJourney` ↔ `CV` ↔ `CoverLetter` relationships. Instead of loading raw queries inside component code, we will construct a lightweight relationship snapshot (`JobJourneySnapshot`) that tracks journey state, document existence, document status, and relationship health.

---

## Design Refinements
1. **Lightweight Snapshot (`JobJourneySnapshot`)**: Only stores references, statuses, and metadata. No duplication of Job model fields (e.g., no `jobTitle`, `company`).
2. **Modular Architecture**:
   - `RelationshipRepository`: Pure database query layer.
   - `RelationshipMapper`: Pure serialization and ObjectId-to-string transformation.
   - `RelationshipService`: Memoization, health classification, and business logic.
3. **Explicit Query Loading**:
   - Relationship retrieval is kept opt-in: `GET /api/jobs?expand=relationship` or `GET /api/jobs/[id]?expand=relationship`.
4. **Document Health and Status**:
   - Detects orphaned documents, missing journeys, and missing files.
   - Provides explicit statuses (`ready`, `generating`, `failed`, `deleted`).
5. **Future-Proofing**:
   - Documents are mapped inside a extensible `documents` record mapping to handle future document types (e.g., portfolios) easily.
6. **Request-Level Cache**:
   - Implements request-scoped memoization to eliminate duplicate queries within the same request lifecycle.

---

## Proposed Changes

### 1. Types, Repository, and Serialization

#### [NEW] `src/types/job-relationship.ts`
Defines the clean contracts:
```typescript
export type JourneyStatus = 'in-progress' | 'completed' | 'paused' | 'processing_documents' | 'creation_failed' | 'ready' | 'draft';
export type DocumentStatus = 'ready' | 'generating' | 'failed' | 'deleted' | 'outdated';
export type RelationshipHealth = 'healthy' | 'missing_journey' | 'missing_cv' | 'missing_cover_letter' | 'orphaned' | 'broken';

export interface DocumentSnapshot {
  id: string;
  status: DocumentStatus;
  atsScore?: number;
  updatedAt: string;
}

export interface JobJourneySnapshot {
  journey: {
    id: string;
    status: JourneyStatus;
    currentStep: number;
  } | null;
  documents: {
    cv?: DocumentSnapshot;
    coverLetter?: DocumentSnapshot;
    [key: string]: DocumentSnapshot | undefined; // Extensible for portfolios, assessments, etc.
  };
  health: RelationshipHealth;
}
```

#### [NEW] `src/lib/utils/idSerializer.ts`
Shared ID serialization helper to prevent ObjectId vs string issues:
```typescript
import mongoose from 'mongoose';

export function serializeId(value: any): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof mongoose.Types.ObjectId) return value.toHexString();
  if (value.toString && typeof value.toString === 'function') return value.toString();
  if (value._id) return serializeId(value._id);
  if (value.id) return serializeId(value.id);
  return undefined;
}
```

#### [NEW] `src/lib/repositories/relationshipRepository.ts`
Pure database query layer with batch-loading support:
```typescript
import { ApplicationJourney, CV, CoverLetter } from '@/models';

export class RelationshipRepository {
  static async findPrimaryJourney(jobId: string, userId: string) {
    const journeys = await ApplicationJourney.find({ jobId, userId })
      .sort({ 'metadata.updatedAt': -1 })
      .lean();
    return journeys[0] || null;
  }

  static async findJourneysForJobs(jobIds: string[], userId: string) {
    return await ApplicationJourney.find({
      jobId: { $in: jobIds },
      userId
    }).sort({ 'metadata.updatedAt': -1 }).lean();
  }

  static async findCV(cvId: string) {
    return await CV.findById(cvId).lean();
  }

  static async findCoverLetter(clId: string) {
    return await CoverLetter.findById(clId).lean();
  }

  static async findCVs(cvIds: string[]) {
    return await CV.find({ _id: { $in: cvIds } }).lean();
  }

  static async findCoverLetters(clIds: string[]) {
    return await CoverLetter.find({ _id: { $in: clIds } }).lean();
  }
}
```

#### [NEW] `src/lib/mappers/relationshipMapper.ts`
Converts raw Mongoose model documents into the `JobJourneySnapshot` DTO:
```typescript
import { JobJourneySnapshot, DocumentSnapshot, DocumentStatus, RelationshipHealth } from '@/types/job-relationship';
import { serializeId } from '../utils/idSerializer';

export class RelationshipMapper {
  static mapToSnapshot(
    journey: any | null,
    cvDoc: any | null,
    clDoc: any | null
  ): JobJourneySnapshot {
    if (!journey) {
      return {
        journey: null,
        documents: {},
        health: 'missing_journey'
      };
    }

    const documents: JobJourneySnapshot['documents'] = {};
    let health: RelationshipHealth = 'healthy';

    // Map CV
    if (journey.cvId) {
      const cvIdStr = serializeId(journey.cvId)!;
      let status: DocumentStatus = 'ready';
      
      if (!cvDoc) {
        status = 'deleted';
        health = 'missing_cv';
      } else if (journey.status === 'processing_documents') {
        status = 'generating';
      } else if (journey.status === 'creation_failed') {
        status = 'failed';
      }

      documents.cv = {
        id: cvIdStr,
        status,
        atsScore: cvDoc?.atsScore,
        updatedAt: cvDoc?.updatedAt?.toISOString() || journey.metadata?.updatedAt?.toISOString() || new Date().toISOString()
      };
    }

    // Map Cover Letter
    if (journey.coverLetterId) {
      const clIdStr = serializeId(journey.coverLetterId)!;
      let status: DocumentStatus = 'ready';

      if (!clDoc) {
        status = 'deleted';
        health = health === 'healthy' ? 'missing_cover_letter' : 'broken';
      } else if (journey.status === 'processing_documents') {
        status = 'generating';
      } else if (journey.status === 'creation_failed') {
        status = 'failed';
      }

      documents.coverLetter = {
        id: clIdStr,
        status,
        updatedAt: clDoc?.updatedAt?.toISOString() || journey.metadata?.updatedAt?.toISOString() || new Date().toISOString()
      };
    }

    return {
      journey: {
        id: serializeId(journey._id)!,
        status: journey.status,
        currentStep: journey.currentStep || 1
      },
      documents,
      health
    };
  }
}
```

#### [NEW] `src/lib/services/jobJourneySnapshotService.ts`
Coordinates data retrieval, health checking, and memoization:
```typescript
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
      const result = { journey: null, documents: {}, health: 'missing_journey' };
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
```

---

### 2. Backend Routing and Indexing Plan

* **Indexes**: The indexes are already created in the mongoose schemas:
  - `ApplicationJourney`: `userId: 1, jobId: 1`
  - `CV`: `journeyId: 1, userId: 1`
  - `CoverLetter`: `journeyId: 1, userId: 1`
  No additional schema migrations are required.

#### [MODIFY] `src/app/api/jobs/route.ts`
Add the optional `expand=relationship` parameter handler.
- If requested, load relationships in batch using `JobJourneySnapshotService.getSnapshotsForJobs` and attach the `relationship` snapshot.
```typescript
    const expandParams = searchParams.getAll('expand');
    const shouldExpandRelationship = expandParams.includes('relationship');

    // ... after fetching jobs
    let jobsWithRelations = jobs;
    if (shouldExpandRelationship) {
      const relationships = await JobJourneySnapshotService.getSnapshotsForJobs(jobApplications, userId);
      jobsWithRelations = jobs.map(j => ({
        ...j,
        relationship: relationships.get(j.id) || null
      }));
    }
```

#### [MODIFY] `src/app/api/jobs/[id]/route.ts`
Always include the `relationship` snapshot in the single job fetch response to allow sidebar components immediate access without any REST calls.

---

### 3. Frontend Adaptations

#### [MODIFY] `src/components/dashboard/JobsTracker.tsx`
- Request relationships when fetching the job list: `/api/jobs?expand=relationship`.
- Remove redundant state/filtering of loaded journeys for cards: use `job.relationship` directly.

#### [MODIFY] `src/components/dashboard/jobs/JobSidebar.tsx`
- Adapt from `primaryJourney` to `job.relationship`.
- Trigger previews directly using `job.relationship.documents.cv.id` or `job.relationship.documents.coverLetter.id`.

#### [MODIFY] `src/components/dashboard/jobs/sidebar/JobFilesTab.tsx`
- Bind card list logic using `job.relationship.documents`.

---

## Verification Plan

### Automated Tests
- Type checking:
  ```bash
  npx tsc --noEmit
  ```

### Manual Verification
1. **Network inspector validation**: Verify that N+1 API calls to `/api/application-journey` are eliminated when loading the job board.
2. **Orphan handling**: Manually trigger a CV deletion and confirm the files list card immediately switches to `'deleted'` / `Regenerate` state.
3. **Index verification**: Confirm page rendering is fast (< 100ms) with multiple stages of jobs.
