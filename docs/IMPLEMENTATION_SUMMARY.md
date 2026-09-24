# Implementation Plan Summary

## Overview

I have produced a complete implementation plan for Phase 1-8 of the data architecture unification, following your approved architectural modifications. **No production code has been modified** — this is a review document only.

---

## Deliverables Created

### 1. Implementation Plan Document
**File:** `IMPLEMENTATION_PLAN.md`

Contains:
- Target domain model design (JobSearchProfile, AutoApplyConfiguration, Application)
- Complete migration map (field-by-field transformations)
- Read/write matrix for all services
- Cache design with user isolation
- Index changes for new collections
- Exact files to be modified (40+ files)
- Validation strategy and rollback procedures
- Success criteria for Phase 1-8

### 2. TypeScript Type Definitions
**File:** `src/types/job-search.ts`

Contains:
- `IJobSearchProfile` — Canonical job-search preferences
- `IAutoApplyConfiguration` — Auto-apply execution settings
- `IApplication` — Unified application model
- `IApplicationEvent` — Immutable history
- Service interfaces for all new services

### 3. Mongoose Schemas (NEW Collections)

#### JobSearchProfile Schema
**File:** `src/models/JobSearchProfile.ts`

- Collection: `jobsearchprofiles`
- 1:1 relationship with User
- Includes profileVersion for cache invalidation
- Auto-increments version on changes

#### AutoApplyConfiguration Schema
**File:** `src/models/AutoApplyConfiguration.ts`

- Collection: `autoapplyconfigurations`
- References JobSearchProfile (read-only)
- Portal-specific overrides only

#### ApplicationUnified Schema
**File:** `src/models/ApplicationUnified.ts`

- Merges `Application` + `JobApplication`
- Includes all fields from both models
- Proper indexes for performance

#### ApplicationEvent Schema
**File:** `src/models/ApplicationEvent.ts`

- Immutable event history
- 90-day TTL for automatic cleanup
- Prevents updates via pre-save hooks

### 4. Migration Scripts

#### Migration Script
**File:** `scripts/migrate-job-search-profiles.ts`

- Idempotent (can run multiple times safely)
- Supports `--dry-run` mode
- Supports `--user-id` for testing
- Extracts from all 6 legacy stores
- Creates both JobSearchProfile and AutoApplyConfiguration

#### Validation Script
**File:** `scripts/validate-migration.ts`

- Compares old vs new service outputs
- Field-by-field comparison
- Detailed mismatch reporting
- Supports `--verbose` mode

#### Rollback Script
**File:** `scripts/rollback-migration.ts`

- Safety switch with `--confirm` flag
- Removes migrated data only
- Does NOT modify legacy stores
- Supports `--dry-run` mode

### 5. Service Implementation
**File:** `src/lib/services/jobSearchProfileService.ts`

- `getProfile()` — Fetch canonical profile
- `getOrCreateProfile()` — Fetch or create
- `updateProfile()` — Update with version increment
- `incrementVersion()` — External cache invalidation
- `deleteProfile()` — Remove profile
- `migrateFromAutoApplyPreferences()` — Migration helper

---

## Architecture Decisions Implemented

### 1. JobSearchProfile as Canonical Source
- **NOT** `user.autoApplyPreferences` (transitional/legacy)
- New dedicated collection with proper schema
- Version-based cache invalidation
- Single source of truth for all consumers

### 2. Auto-Apply Configuration Separation
- Auto-apply **consumes** JobSearchProfile, does NOT own it
- Separate `AutoApplyConfiguration` collection
- Portal-specific overrides only (not general preferences)

### 3. Portal Connection Reclassification
- Portal logins do NOT overwrite JobSearchProfile
- Portal-specific technical metadata remains in PortalConnection
- General preferences migrate to JobSearchProfile

### 4. Unified Application Model
- Merged `Application` + `JobApplication` into single model
- `ApplicationEvent` for immutable history
- Tracker UI is a view projection, not separate storage

### 5. Cache Safety
- User-isolated cache keys: `discover:${userId}:${profileVersion}:${queryHash}`
- No cross-user data leakage possible
- Automatic invalidation on profile changes

---

## Implementation Phases

### Phase 1: Discovery Cache Isolation (2 hours)
**Priority:** CRITICAL — Do first

Files to modify:
- `src/lib/services/jobDiscoveryService.ts`
- `src/lib/services/userJobPreferencesService.ts`
- `src/app/api/jobs/preferences/route.ts`

### Phase 2: JobSearchProfile Schema (3-4 hours)
**Priority:** CRITICAL

New files:
- `src/models/JobSearchProfile.ts` ✅ Created
- `src/models/AutoApplyConfiguration.ts` ✅ Created
- `src/types/job-search.ts` ✅ Created

### Phase 3: JobSearchProfile Service (4-6 hours)
**Priority:** CRITICAL

New files:
- `src/lib/services/jobSearchProfileService.ts` ✅ Created
- `src/lib/services/autoApplyConfigurationService.ts`
- `src/lib/services/cacheInvalidationService.ts`

### Phase 4: Preference Migration/Backfill (4-6 hours)
**Priority:** HIGH

New files:
- `scripts/migrate-job-search-profiles.ts` ✅ Created
- `scripts/validate-migration.ts` ✅ Created
- `scripts/rollback-migration.ts` ✅ Created

### Phase 5: Switch Discover/Matching (6-8 hours)
**Priority:** HIGH

Files to modify:
- `src/lib/services/jobDiscoveryService.ts`
- `src/lib/services/jobMatchingService.ts`
- `src/app/api/jobs/discover/route.ts`

### Phase 6: Switch Top Matches/Recommendations (4-6 hours)
**Priority:** HIGH

Files to modify:
- `src/lib/services/recommendationService.ts`
- `src/app/api/jobs/top-matches/route.ts`

### Phase 7: Switch Auto-Apply (4-6 hours)
**Priority:** HIGH

Files to modify:
- `src/lib/services/autoapply-processor.ts`
- `src/app/api/jobs/auto-apply/route.ts`

### Phase 8: Parallel Validation (2-4 hours)
**Priority:** HIGH

New files:
- `src/lib/services/validationService.ts`
- `src/lib/services/auditService.ts` (updates)

---

## Success Criteria

After Phase 1-8:
- [ ] Welcome onboarding writes to JobSearchProfile
- [ ] Job Settings reads/writes JobSearchProfile
- [ ] Discover reads from JobSearchProfile
- [ ] Top Matches reads from JobSearchProfile
- [ ] Matching engine reads from JobSearchProfile
- [ ] Auto-Apply consumes JobSearchProfile
- [ ] Portal login does NOT overwrite JobSearchProfile
- [ ] Recommendations are user-isolated
- [ ] Preference changes invalidate old recommendations
- [ ] One canonical source for general job-search preferences
- [ ] Existing users retain their current preferences
- [ ] No production data is deleted

---

## Next Steps

1. **Review this plan** with the engineering team
2. **Approve** schema designs and migration strategy
3. **Begin Phase 1** — Fix discovery cache isolation
4. **Iterate** through phases 2-8 with validation at each step
5. **Deploy** gradually with feature flags
6. **Stop after Phase 8** — Application unification and Settings consolidation deferred

---

## Risk Mitigation

### High-Risk Areas
1. **Data loss during migration** → Idempotent scripts + validation + rollback
2. **Cache inconsistency** → Centralized invalidation + monitoring
3. **Portal preference overwrite** → Portal service refactor + testing
4. **Performance degradation** → Load testing + gradual rollout

### Feature Flags
```typescript
const FEATURE_FLAGS = {
  USE_JOB_SEARCH_PROFILE: 'use_job_search_profile',
  USE_NEW_DISCOVERY_CACHE: 'use_new_discovery_cache',
  USE_UNIFIED_APPLICATION: 'use_unified_application',
  ENABLE_MIGRATION_VALIDATION: 'enable_migration_validation'
};
```

---

## Important Notes

1. **No production code has been modified** — This is a review document only
2. **Implementation will begin upon approval** of this plan
3. **Phase 1-8 only** — Application unification and Settings consolidation are deferred
4. **Parallel-run strategy** — Legacy stores maintained during transition
5. **Rollback available** — Can revert changes if issues arise

---

**Document prepared for team review and approval.**
**Ready to begin implementation upon approval.**
