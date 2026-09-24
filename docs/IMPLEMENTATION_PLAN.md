# BuildAIResume — Implementation Plan

**Date:** 2026-08-25
**Status:** APPROVED WITH MODIFICATIONS — Ready for Review
**Scope:** Phases 1-8 only (JobSearchProfile unification)
**Strategy:** Parallel-run with validation

---

## Executive Summary

This plan implements the approved architectural modifications to unify job-search preferences into a new canonical `JobSearchProfile` domain model. The implementation follows a parallel-run strategy where:
- New canonical model is created alongside legacy stores
- Data is backfilled and validated
- Readers/writers are gradually switched
- Legacy stores are maintained for backward compatibility
- Production data is NEVER deleted during this phase

**CRITICAL:** This plan stops after Phase 8 validation. Application model unification and Settings consolidation are deferred.

---

## 1. TARGET DOMAIN MODEL

### 1.1 JobSearchProfile (NEW Canonical)

**Collection:** `jobsearchprofiles`

```typescript
interface IJobSearchProfile {
  _id: ObjectId;
  userId: ObjectId;
  
  // Target roles and titles
  targetRoles: string[];                    // ['Full Stack Developer', 'Software Engineer']
  
  // Location preferences
  locations: string[];                      // ['London', 'Remote', 'Bangalore']
  workplaceTypes: ('remote' | 'hybrid' | 'onsite')[];
  remoteOnly: boolean;
  
  // Salary preferences
  minSalary: number;
  salaryCurrency: string;                   // 'GBP', 'USD', 'INR_LPA'
  
  // Experience and availability
  experienceYears: number;
  maxNoticePeriodDays: number;
  
  // Search behavior
  searchIntensity: 'browsing' | 'exploring' | 'active' | 'aggressive';
  expectedApplicationsPerMonth: number;
  applicationMode: 'find_only' | 'manual_review' | 'automatic';
  
  // Auto-apply specific (consumed BY auto-apply, not owned)
  autoApply: {
    enabled: boolean;
    maxPerDay: number;
    useTailoredCV: boolean;
    useCoverLetter: boolean;
    autoAnswerQuestions: boolean;
    enabledPortals: ('naukri' | 'indeed' | 'greenhouse' | 'adzuna' | 'lever' | 'ashby' | 'workable')[];
  };
  
  // Versioning for cache invalidation
  profileVersion: number;                   // Incremented on meaningful changes
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
```

### 1.2 Auto-Apply Configuration (Separate Concept)

**Collection:** `autoapplyconfigurations`

```typescript
interface IAutoApplyConfiguration {
  _id: ObjectId;
  userId: ObjectId;
  
  // Reference to canonical profile (read-only)
  jobSearchProfileId: ObjectId;
  
  // Auto-apply specific settings
  enabled: boolean;
  maxPerDay: number;
  useTailoredCV: boolean;
  useCoverLetter: boolean;
  autoAnswerQuestions: boolean;
  enabledPortals: string[];
  
  // Portal-specific overrides (NOT general preferences)
  portalOverrides: {
    naukri?: { enabled: boolean; dailyLimit: number };
    indeed?: { enabled: boolean; dailyLimit: number };
  };
  
  // Version tracking
  profileVersion: number;                   // Must match JobSearchProfile
  lastSyncedAt: Date;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### 1.3 Portal Connection Preferences (Portal-Specific Only)

**NOT a separate collection** — remains in `PortalConnection` schema but reclassified:

```typescript
// In PortalConnection schema
interface PortalConnection {
  // ... existing fields ...
  
  // Portal-specific technical metadata (NOT general preferences)
  portalSpecificConfig: {
    // Naukri-specific: CTC in lakhs, experience format
    // Indeed-specific: salary currency format
    // Portal-specific display preferences
  };
  
  // Reference to canonical profile (for validation)
  canonicalProfileId: ObjectId;
  lastProfileSyncAt: Date;
}
```

### 1.4 Application (Unified Model — Phase 1-8 Scope)

**Collection:** `applications` (merged from `applications` + `jobapplications`)

```typescript
interface IApplication {
  _id: ObjectId;
  userId: ObjectId;
  jobId: ObjectId;
  
  // Current state
  currentStage: 'saved' | 'staging' | 'applied' | 'interview' | 'offer' | 'rejected';
  internalStatus: string;
  applicationMethod: 'manual' | 'auto';
  
  // References
  cvId?: ObjectId;
  coverLetterId?: ObjectId;
  
  // Automation
  automationEnabled: boolean;
  automationRunId?: string;
  attempts: number;
  
  // Intelligence (from JobApplication)
  matchScore?: number;
  trustScore?: number;
  skillGapAnalysis?: any;
  
  // Tracker UI fields (from JobApplication)
  jobTitle: string;
  company: string;
  location?: string;
  salary?: { min?: number; max?: number; currency?: string; period?: string };
  status: string;                           // Unified status enum
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  tags: string[];
  
  // Stage history (replaces stageHistory array)
  // Events stored in ApplicationEvent collection
  
  createdAt: Date;
  updatedAt: Date;
}
```

### 1.5 ApplicationEvent (Immutable History)

**Collection:** `applicationevents`

```typescript
interface IApplicationEvent {
  _id: ObjectId;
  applicationId: ObjectId;
  userId: ObjectId;
  
  type: 'stage_change' | 'status_update' | 'note_added' | 'tag_updated';
  previousStage?: string;
  newStage?: string;
  source: 'user' | 'automation' | 'email_intelligence' | 'admin';
  
  metadata?: Record<string, any>;
  createdAt: Date;                          // No updatedAt — immutable
}
```

---

## 2. MIGRATION MAP

### 2.1 JobSearchProfile Field Mapping

| Source Location | Target Field | Transform | Notes |
|----------------|--------------|-----------|-------|
| `user.autoApplyPreferences.targetRoles` | `targetRoles` | Direct | Canonical source |
| `user.autoApplyPreferences.locations` | `locations` | Direct | Canonical source |
| `user.autoApplyPreferences.workplaceTypes` | `workplaceTypes` | Direct | Canonical source |
| `user.autoApplyPreferences.remoteOnly` | `remoteOnly` | Direct | Canonical source |
| `user.autoApplyPreferences.minSalary` | `minSalary` | Direct | Canonical source |
| `user.autoApplyPreferences.salaryCurrency` | `salaryCurrency` | Direct | Canonical source |
| `user.autoApplyPreferences.experienceYears` | `experienceYears` | Direct | Canonical source |
| `user.autoApplyPreferences.maxNoticePeriodDays` | `maxNoticePeriodDays` | Direct | Canonical source |
| `user.autoApplyPreferences.searchIntensity` | `searchIntensity` | Direct | Canonical source |
| `user.autoApplyPreferences.expectedApplicationsPerMonth` | `expectedApplicationsPerMonth` | Direct | Canonical source |
| `user.autoApplyPreferences.applicationMode` | `applicationMode` | Direct | Canonical source |
| `user.autoApplyPreferences.enabled` | `autoApply.enabled` | Move | Auto-apply config |
| `user.autoApplyPreferences.maxPerDay` | `autoApply.maxPerDay` | Move | Auto-apply config |
| `user.autoApplyPreferences.useTailoredCV` | `autoApply.useTailoredCV` | Move | Auto-apply config |
| `user.autoApplyPreferences.useCoverLetter` | `autoApply.useCoverLetter` | Move | Auto-apply config |
| `user.autoApplyPreferences.autoAnswerQuestions` | `autoApply.autoAnswerQuestions` | Move | Auto-apply config |
| `user.autoApplyPreferences.enabledPortals` | `autoApply.enabledPortals` | Move | Auto-apply config |
| `job_preferences.titles` | `targetRoles` | Rename | Legacy collection |
| `job_preferences.locations` | `locations` | Direct | Legacy collection |
| `job_preferences.remoteOnly` | `remoteOnly` | Direct | Legacy collection |
| `job_preferences.salaryMin` | `minSalary` | Rename | Legacy collection |
| `user.naukriIntegration.preferences` | * | Extract portal-specific | See 2.2 |
| `user.indeedIntegration.preferences` | * | Extract portal-specific | See 2.2 |

### 2.2 Portal Preferences Classification

**Naukri Preferences:**
| Source Field | Classification | Action |
|--------------|----------------|--------|
| `targetTitles` | General preference | Migrate to JobSearchProfile |
| `targetLocations` | General preference | Migrate to JobSearchProfile |
| `minCtcLakhs` | General preference | Migrate to JobSearchProfile (convert format) |
| `experienceYears` | General preference | Migrate to JobSearchProfile |
| `maxNoticePeriodDays` | General preference | Migrate to JobSearchProfile |
| `dailyLimit` | Auto-apply config | Migrate to AutoApplyConfiguration |
| `autoApplyEnabled` | Auto-apply config | Migrate to AutoApplyConfiguration |

**Indeed Preferences:**
| Source Field | Classification | Action |
|--------------|----------------|--------|
| `targetTitles` | General preference | Migrate to JobSearchProfile |
| `targetLocations` | General preference | Migrate to JobSearchProfile |
| `minSalary` | General preference | Migrate to JobSearchProfile |
| `salaryCurrency` | General preference | Migrate to JobSearchProfile |
| `remoteOnly` | General preference | Migrate to JobSearchProfile |
| `dailyLimit` | Auto-apply config | Migrate to AutoApplyConfiguration |
| `autoApplyEnabled` | Auto-apply config | Migrate to AutoApplyConfiguration |

### 2.3 AutoApplyConfiguration Field Mapping

| Source Location | Target Field | Transform | Notes |
|----------------|--------------|-----------|-------|
| `user.autoApplyPreferences.enabled` | `enabled` | Direct | Auto-apply specific |
| `user.autoApplyPreferences.maxPerDay` | `maxPerDay` | Direct | Auto-apply specific |
| `user.autoApplyPreferences.useTailoredCV` | `useTailoredCV` | Direct | Auto-apply specific |
| `user.autoApplyPreferences.useCoverLetter` | `useCoverLetter` | Direct | Auto-apply specific |
| `user.autoApplyPreferences.autoAnswerQuestions` | `autoAnswerQuestions` | Direct | Auto-apply specific |
| `user.autoApplyPreferences.enabledPortals` | `enabledPortals` | Direct | Auto-apply specific |
| `UserQuota.autoApplySettings` | * | Deprecated | Read from AutoApplyConfiguration |

---

## 3. READ/WRITE MATRIX

### 3.1 JobSearchProfile

| Operation | Canonical Writer | Legacy Writers (Maintain During Transition) | Canonical Readers | Legacy Readers (Switch in Phase 5-6) |
|-----------|------------------|---------------------------------------------|-------------------|--------------------------------------|
| Create/Update | `JobSearchProfileService.updateProfile()` | `UserJobPreferencesService.updatePreferences()` | `JobSearchProfileService.getProfile()` | `UserJobPreferencesService.getPreferences()` |
| Welcome Onboarding | `WelcomeService.saveStep()` → `JobSearchProfileService` | `UserJobPreferencesService.saveOnboardingStep()` | Welcome restore | — |
| Job Settings | `JobSettingsService.updatePreferences()` | `/api/jobs/preferences POST` | Job Settings UI | `/api/jobs/preferences GET` |
| Portal Login | `PortalService.syncPreferences()` | Direct portal preference writes | Portal service | — |

### 3.2 AutoApplyConfiguration

| Operation | Writer | Reader | Notes |
|-----------|--------|--------|-------|
| Create/Update | `AutoApplyConfigurationService.updateConfig()` | `AutoApplyProcessor` | Consumes JobSearchProfile |
| Portal Sync | `PortalService.syncAutoApplyConfig()` | Portal apply services | Portal-specific settings |

### 3.3 Application (Unified)

| Operation | Writer | Reader | Notes |
|-----------|--------|--------|-------|
| Create | `ApplicationService.create()` | Tracker UI | Both manual and auto |
| Update | `ApplicationService.updateStage()` | Tracker UI, Dashboard | Creates ApplicationEvent |
| Query | — | `ApplicationService.get Applications()` | View projection |

---

## 4. CACHE DESIGN

### 4.1 Discovery Cache (Phase 1 Fix)

**Current Problem:** Global cache key allows cross-user data leakage.

**New Design:**
```typescript
// Cache key format: `discover:${userId}:${profileVersion}:${queryHash}`
// Example: `discover:user123:5:a1b2c3d4`

interface DiscoveryCacheEntry {
  data: DiscoveredJob[];
  expiresAt: number;
  profileVersion: number;
  queryHash: string;
}

// In-memory store (per server instance)
const discoveryCache = new Map<string, DiscoveryCacheEntry>();

// Cache TTL: 5 minutes
const DISCOVERY_CACHE_TTL_MS = 5 * 60 * 1000;

// Cache invalidation on profile change
function invalidateDiscoveryCache(userId: string): void {
  const keysToDelete = Array.from(discoveryCache.keys())
    .filter(key => key.startsWith(`discover:${userId}:`));
  keysToDelete.forEach(key => discoveryCache.delete(key));
}
```

### 4.2 Recommendation Cache

**Key Format:** `recommendations:${userId}:${profileVersion}`

**Invalidation Triggers:**
- JobSearchProfile update (profileVersion increment)
- MasterCV update
- Manual invalidation by user

### 4.3 Match Score Cache

**Key Format:** `match:${userId}:${jobId}:${profileVersion}:${cvVersion}`

**Invalidation Triggers:**
- JobSearchProfile update
- MasterCV update
- Job data update

### 4.4 Cache Invalidation Strategy

```typescript
// Centralized cache invalidation service
class CacheInvalidationService {
  static async onProfileChange(userId: string, newVersion: number): Promise<void> {
    // 1. Invalidate discovery cache
    invalidateDiscoveryCache(userId);
    
    // 2. Invalidate recommendation cache
    await cacheManager.delete(`recommendations:${userId}:*`);
    
    // 3. Invalidate match scores for user's jobs
    await cacheManager.delete(`match:${userId}:*`);
    
    // 4. Log invalidation for monitoring
    await auditService.logCacheInvalidation(userId, 'profile_change', newVersion);
  }
  
  static async onCVChange(userId: string): Promise<void> {
    // Similar invalidation for CV changes
  }
}
```

---

## 5. INDEX CHANGES

### 5.1 New Indexes

```typescript
// JobSearchProfile collection
db.jobsearchprofiles.createIndex({ userId: 1 }, { unique: true });
db.jobsearchprofiles.createIndex({ profileVersion: 1 });
db.jobsearchprofiles.createIndex({ updatedAt: -1 });

// AutoApplyConfiguration collection
db.autoapplyconfigurations.createIndex({ userId: 1 }, { unique: true });
db.autoapplyconfigurations.createIndex({ jobSearchProfileId: 1 });
db.autoapplyconfigurations.createIndex({ profileVersion: 1 });

// Application collection (unified)
db.applications.createIndex({ userId: 1, jobId: 1 }, { unique: true });
db.applications.createIndex({ userId: 1, currentStage: 1 });
db.applications.createIndex({ userId: 1, applicationMethod: 1 });
db.applications.createIndex({ userId: 1, createdAt: -1 });

// ApplicationEvent collection
db.applicationevents.createIndex({ applicationId: 1, createdAt: -1 });
db.applicationevents.createIndex({ userId: 1, type: 1 });
db.applicationevents.createIndex({ createdAt: -1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL
```

### 5.2 Legacy Indexes (Maintain During Transition)

```typescript
// Keep existing indexes on legacy collections
// job_preferences: { userId: 1 }
// jobapplications: { userId: 1, status: 1 }
// applications: { userId: 1, jobId: 1 }

// Add new indexes to support dual-read
db.job_preferences.createIndex({ userId: 1, updatedAt: -1 });
db.jobapplications.createIndex({ userId: 1, currentStage: 1 });
```

---

## 6. FILES TO BE MODIFIED

### Phase 1: Discovery Cache Isolation (2 hours)

| File | Change | Priority |
|------|--------|----------|
| `src/lib/services/jobDiscoveryService.ts` | Fix cache key to include userId + profileVersion | CRITICAL |
| `src/lib/services/jobDiscoveryService.ts` | Add cache invalidation on profile change | CRITICAL |
| `src/lib/services/userJobPreferencesService.ts` | Add cache invalidation call in `updatePreferences()` | HIGH |
| `src/app/api/jobs/preferences/route.ts` | Add cache invalidation after preference save | HIGH |

### Phase 2: JobSearchProfile Schema (3-4 hours)

| File | Change | Priority |
|------|--------|----------|
| `src/models/JobSearchProfile.ts` | NEW — Mongoose schema for canonical profile | CRITICAL |
| `src/models/AutoApplyConfiguration.ts` | NEW — Mongoose schema for auto-apply config | HIGH |
| `src/types/job-search.ts` | NEW — TypeScript interfaces | CRITICAL |
| `src/lib/db/indexes.ts` | Add new index creation | HIGH |

### Phase 3: JobSearchProfile Service (4-6 hours)

| File | Change | Priority |
|------|--------|----------|
| `src/lib/services/jobSearchProfileService.ts` | NEW — CRUD operations for canonical profile | CRITICAL |
| `src/lib/services/autoApplyConfigurationService.ts` | NEW — CRUD for auto-apply config | HIGH |
| `src/lib/services/cacheInvalidationService.ts` | NEW — Centralized cache invalidation | HIGH |
| `src/lib/services/userJobPreferencesService.ts` | Deprecate methods, add redirect to new service | MEDIUM |

### Phase 4: Preference Migration/Backfill (4-6 hours)

| File | Change | Priority |
|------|--------|----------|
| `scripts/migrate-job-search-profiles.ts` | NEW — Idempotent migration script | CRITICAL |
| `scripts/validate-migration.ts` | NEW — Validation script | CRITICAL |
| `scripts/rollback-migration.ts` | NEW — Rollback script (safety) | HIGH |
| `src/lib/services/migrationService.ts` | NEW — Migration orchestration | HIGH |

### Phase 5: Switch Discover/Matching to JobSearchProfile (6-8 hours)

| File | Change | Priority |
|------|--------|----------|
| `src/lib/services/jobDiscoveryService.ts` | Read from JobSearchProfile via service | CRITICAL |
| `src/lib/services/jobMatchingService.ts` | Read from JobSearchProfile via service | CRITICAL |
| `src/app/api/jobs/discover/route.ts` | Update to use new service | HIGH |
| `src/app/api/jobs/recommendations/route.ts` | Update to use new service | HIGH |

### Phase 6: Switch Top Matches/Recommendations (4-6 hours)

| File | Change | Priority |
|------|--------|----------|
| `src/lib/services/recommendationService.ts` | Update to use JobSearchProfile | HIGH |
| `src/app/api/jobs/top-matches/route.ts` | Update to use new service | HIGH |
| `src/components/dashboard/JobsDashboard/JobCard.tsx` | Update to use new match scores | MEDIUM |

### Phase 7: Switch Auto-Apply to JobSearchProfile (4-6 hours)

| File | Change | Priority |
|------|--------|----------|
| `src/lib/services/autoapply-processor.ts` | Read from AutoApplyConfiguration | CRITICAL |
| `src/lib/services/autoapply-processor.ts` | Consume JobSearchProfile for matching | HIGH |
| `src/app/api/jobs/auto-apply/route.ts` | Update to use new config | HIGH |
| `src/lib/services/unifiedApplyService.ts` | Update to use new config | MEDIUM |

### Phase 8: Parallel Validation (2-4 hours)

| File | Change | Priority |
|------|--------|----------|
| `src/lib/services/validationService.ts` | NEW — Compare old/new outputs | CRITICAL |
| `src/lib/services/auditService.ts` | Add validation logging | HIGH |
| `scripts/compare-outputs.ts` | NEW — Automated comparison script | HIGH |
| `src/app/api/admin/migration-status/route.ts` | NEW — Migration monitoring endpoint | MEDIUM |

---

## 7. VALIDATION STRATEGY

### 7.1 Data Consistency Checks

```typescript
// Validation script checks
1. All users with job_preferences have corresponding JobSearchProfile
2. All users with autoApplyPreferences have corresponding JobSearchProfile
3. Profile version matches across JobSearchProfile and AutoApplyConfiguration
4. No data loss: all fields from legacy stores present in new models
5. Field value equality: transformed fields match expected values
```

### 7.2 Output Comparison

```typescript
// Compare old vs new service outputs
1. GET /api/jobs/preferences returns same data as JobSearchProfileService.getProfile()
2. Discovery results identical with same inputs
3. Match scores within acceptable tolerance (±2 points)
4. Auto-apply eligibility decisions identical
5. Cache invalidation triggers correctly
```

### 7.3 Rollback Triggers

**Automatic rollback if:**
- Data validation fails for >1% of users
- Output comparison shows >5% divergence
- Performance degradation >20%
- Error rate increases >10%

**Manual rollback available via:**
- `scripts/rollback-migration.ts`
- Admin API endpoint
- Feature flag toggle

---

## 8. SUCCESS CRITERIA (Phase 1-8)

### 8.1 Functional Requirements

- [ ] Welcome onboarding writes to JobSearchProfile
- [ ] Job Settings reads/writes JobSearchProfile
- [ ] Discover reads from JobSearchProfile
- [ ] Top Matches reads from JobSearchProfile
- [ ] Matching engine reads from JobSearchProfile
- [ ] Auto-Apply consumes JobSearchProfile (not owns)
- [ ] Portal login does NOT overwrite JobSearchProfile
- [ ] Recommendations are user-isolated (no cross-user leakage)
- [ ] Preference changes invalidate old recommendations
- [ ] One canonical source for general job-search preferences

### 8.2 Data Integrity

- [ ] Existing users retain their current preferences
- [ ] No production data is deleted
- [ ] All legacy stores remain readable during transition
- [ ] Migration is idempotent (can run multiple times safely)
- [ ] Rollback is available and tested

### 8.3 Performance

- [ ] Discovery cache is user-isolated
- [ ] Cache invalidation completes within 100ms
- [ ] New service response times ≤ legacy service
- [ ] No increase in database query latency
- [ ] Memory usage stable (no cache leaks)

### 8.4 Monitoring

- [ ] Migration progress tracking available
- [ ] Validation results logged
- [ ] Discrepancies alert within 5 minutes
- [ ] Rollback can be triggered within 1 minute

---

## 9. RISK MITIGATION

### 9.1 High-Risk Areas

| Risk | Mitigation | Owner |
|------|------------|-------|
| Data loss during migration | Idempotent scripts + validation + rollback | Migration team |
| Cache inconsistency | Centralized invalidation + monitoring | Cache team |
| Portal preference overwrite | Portal service refactor + testing | Portal team |
| Performance degradation | Load testing + gradual rollout | Performance team |
| Cross-user data leakage | User-isolated cache keys + validation | Security team |

### 9.2 Feature Flags

```typescript
// Feature flags for gradual rollout
const FEATURE_FLAGS = {
  USE_JOB_SEARCH_PROFILE: 'use_job_search_profile',
  USE_NEW_DISCOVERY_CACHE: 'use_new_discovery_cache',
  USE_UNIFIED_APPLICATION: 'use_unified_application',
  ENABLE_MIGRATION_VALIDATION: 'enable_migration_validation'
};
```

### 9.3 Monitoring & Alerting

```typescript
// Key metrics to monitor
1. Migration progress: % users migrated
2. Validation success rate: % users passing consistency checks
3. Cache hit rates: old vs new cache
4. API response times: legacy vs new services
5. Error rates: legacy vs new services
6. Data divergence: field-by-field comparison
```

---

## 10. NEXT STEPS (After Plan Approval)

1. **Team Review:** Present this plan to engineering team
2. **Approval:** Get sign-off on schema designs and migration strategy
3. **Phase 1 Implementation:** Start with discovery cache isolation
4. **Iterative Development:** Complete phases 2-8 with validation
5. **Production Deployment:** Gradual rollout with feature flags
6. **Post-Phase 8 Review:** Assess results before Application unification

---

## APPENDIX A: SCHEMA COMPARISON

### Current vs Target

| Aspect | Current | Target |
|--------|---------|--------|
| Job Preferences | 6 independent stores | 1 canonical (JobSearchProfile) |
| Auto-Apply Config | Mixed in preferences | Separate (AutoApplyConfiguration) |
| Application Models | 2 separate collections | 1 unified collection |
| Settings | Split (User + UserSettings) | Deferred (Phase 9+) |
| Cache Safety | Global keys | User-isolated keys |
| Profile Versioning | None | Version-based invalidation |

### Migration Complexity

| Component | Complexity | Risk | Effort |
|-----------|------------|------|--------|
| Cache Isolation | Low | Low | 2 hours |
| Schema Creation | Medium | Low | 3-4 hours |
| Service Layer | High | Medium | 4-6 hours |
| Data Migration | High | High | 4-6 hours |
| Reader Switch | High | Medium | 6-8 hours |
| Writer Switch | Medium | Medium | 4-6 hours |
| Validation | Medium | Low | 2-4 hours |
| **Total** | **High** | **Medium** | **25-36 hours** |

---

**Document prepared for team review and approval.**
**No code changes have been made.**
**Implementation will begin upon approval of this plan.**
