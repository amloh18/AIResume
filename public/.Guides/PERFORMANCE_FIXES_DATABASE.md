# Performance Fixes - Database Indexes & API Optimization

## ✅ Completed Fixes

### 1. Database Indexes Added (P0 - Critical)

**Problem**: Queries taking 1400ms+ because `userId` field was not indexed, causing full table scans.

**Solution**: Added dedicated `userId` indexes to all collections:

- **CV Model** (`src/models/CV.ts`):
  - Added: `cvSchema.index({ userId: 1 })`
  - This will reduce query time from ~1400ms to <100ms

- **CoverLetter Model** (`src/models/CoverLetter.ts`):
  - Added: `coverLetterSchema.index({ userId: 1 })`
  - This will reduce query time from ~1400ms to <100ms

- **Job Model** (`src/models/Job.ts`):
  - Added: `jobSchema.index({ userId: 1 })`
  - This will reduce query time from ~1400ms to <100ms

**How It Works**: 
- Mongoose will automatically create these indexes when the models are first loaded
- For existing databases, indexes will be created on the next server restart
- You can verify indexes exist by running: `db.cvs.getIndexes()` in MongoDB shell

**Expected Impact**:
- `GET /api/cvs?userId=...` should drop from **1141ms → <100ms**
- `GET /api/cover-letters?userId=...` should drop from **~1400ms → <100ms**
- `GET /api/jobs?userId=...` should drop from **~1400ms → <100ms**

---

### 2. Analytics Endpoint Optimized (P0 - Critical)

**Problem**: `GET /api/analytics/progress` was fetching all documents and processing in JavaScript, taking 1352ms.

**Solution**: Rewrote to use MongoDB aggregation pipelines that do counting in the database.

**File**: `src/app/api/analytics/progress/route.ts`

**Changes**:
- Replaced 3 separate `.find()` queries with 3 parallel aggregation pipelines
- Database now does the counting and grouping, not JavaScript
- Uses `$facet` to count both created and updated documents in one query
- All 3 aggregations run in parallel with `Promise.all()`

**Expected Impact**:
- `GET /api/analytics/progress` should drop from **1352ms → <200ms**

---

## 🔄 Next Steps (P1 - Important)

### 3. Fix Duplicate API Calls (Shotgun Problem)

**Problem**: Multiple components independently calling `/api/cvs` and `/api/cover-letters`, causing 3+ duplicate requests.

**Solution Options**:

#### Option A: Request Deduplication (Quick Fix)
A utility has been created at `src/lib/utils/requestDeduplication.ts` that prevents duplicate simultaneous requests. To use it:

```typescript
import { requestDeduplication } from '@/lib/utils/requestDeduplication';

// Wrap your fetch calls
const result = await requestDeduplication.deduplicate(
  '/api/cvs?userId=123',
  () => authenticatedFetch('/api/cvs?userId=123')
);
```

#### Option B: Shared Data Context (Better Long-term)
A `DashboardDataContext` has been created at `src/contexts/DashboardDataContext.tsx` that:
- Fetches CVs, cover letters, and jobs once at the top level
- Provides data to all child components via context
- Prevents duplicate fetches

**To implement**:
1. Wrap dashboard pages with `<DashboardDataProvider>`
2. Replace individual `fetch('/api/cvs')` calls with `useDashboardData()` hook
3. Components will automatically get cached data

**Files that need updating**:
- `src/components/dashboard/Analytics.tsx` - Replace CV fetch with context
- `src/components/dashboard/Canvas.tsx` - Replace CV/cover letter fetches with context
- `src/components/dashboard/MasterCVCardOverlay.tsx` - Use context instead of fetching
- `src/components/dashboard/NewJourneyCard.tsx` - Use context instead of fetching

---

## 📊 Performance Monitoring

After deploying these changes, monitor:

1. **API Response Times**:
   - `/api/cvs?userId=...` should be <100ms (was 1141ms)
   - `/api/cover-letters?userId=...` should be <100ms (was ~1400ms)
   - `/api/analytics/progress` should be <200ms (was 1352ms)

2. **Network Tab**:
   - Should see only 1 call to `/api/cvs` per page load (not 3)
   - Should see only 1 call to `/api/cover-letters` per page load (not 3)

3. **Database**:
   - Verify indexes exist: `db.cvs.getIndexes()`
   - Check query execution time in MongoDB logs

---

## 🚀 Deployment Notes

1. **Indexes will be created automatically** when the server restarts (Mongoose auto-creates indexes)
2. **No database migration needed** - indexes are non-breaking
3. **Monitor server startup** - first startup after this change will create indexes (may take a few seconds)
4. **For production**, consider creating indexes manually during a maintenance window:
   ```javascript
   db.cvs.createIndex({ userId: 1 });
   db.coverletters.createIndex({ userId: 1 });
   db.jobs.createIndex({ userId: 1 });
   ```

---

## ✅ Verification Checklist

- [x] Database indexes added to CV model
- [x] Database indexes added to CoverLetter model  
- [x] Database indexes added to Job model
- [x] Analytics endpoint optimized with aggregation
- [ ] Request deduplication implemented (optional)
- [ ] Shared data context implemented (optional)
- [ ] Performance improvements verified in production

---

**Status**: Database optimizations complete. Client-side deduplication is optional but recommended.

