# API Route-Contract Audit — 2026-09-16

## 1. Why this audit exists

A client `fetch()` can send an HTTP method the target route file does not export.
TypeScript cannot catch this (the method is just a string in an options object),
ESLint cannot catch it, and `next build` cannot catch it — the mismatch only
surfaces at **runtime as a 405**.

It is worse than a normal 404 because it hides. Two real cases shipped this way:

| Caller | Bug | Visible symptom |
| --- | --- | --- |
| `JobsDashboard.tsx` (tailoring toggle) | `PATCH /api/user/settings`; the route exports `GET` + `PUT` only | Toggle silently reverted; only a console error |
| `JourneyTimelineCard.tsx` (cover-letter link) | `PATCH /api/application-journey/[id]`; route exports `GET` + `PUT` only | Cover letter was created but never linked, **while the success toast still fired** |

Both are fixed. This audit exists to find any siblings.

## 2. Method

Script: [`scripts/audit-api-routes.py`](../scripts/audit-api-routes.py)

1. Index every `src/app/api/**/route.ts` and extract its exported HTTP methods —
   covering both `export async function GET` and the re-export form
   `export { handler as GET, handler as POST }` (used by NextAuth).
2. Scan every `fetch()` / `authenticatedFetch()` call site in `src/`.
3. Match the call path to a route segment-wise, treating `[param]` segments and
   un-substituted `${...}` template holes as wildcards.
4. Flag any call whose method the matched route does not export.

Two false positives were found and eliminated while building it:

- NextAuth's `export { handler as GET, handler as POST }` re-export form was
  initially missed — fixed by adding an export-list/alias regex.
- A `fetch('/api/user/usage/check')` inside a JSDoc comment — fixed with a
  `strip_comments()` that respects string literals (so `https://` inside a
  string is not truncated).

## 3. Result

```
Indexed 350 route files under src/app/api
Checked 500 /api call sites

METHOD / ROUTE MISMATCHES — none found
```

**Zero method mismatches remain.** The bug class is clean.

Unresolved call sites came down in two passes as the findings were worked:
**15 → 13 → 10**, and every one of the remaining 10 is now confirmed to be either
unreachable dead code or a deliberate, handled fallback (see §5).

### Verification

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | exit 0 |
| ESLint on every changed/added line | 0 problems (all reported problems are pre-existing, outside the edited ranges) |
| `npm run build` | `✓ Compiled successfully in 14.9s`, 326/326 pages; both new routes compiled (`/api/admin/users/[id]/notes`, `/api/admin/pricing-regions`) |
| `npx vitest run` | 289 passed, 4 failed — see below |
| Audit re-run | 350 routes / 500 call sites, **0 mismatches**, unresolved 15 → 10 |

The 4 test failures are **pre-existing and environmental**, not caused by this
work. `tests/e2e/job-pipeline.e2e.test.ts` is an integration test that connects
to a live MongoDB Atlas cluster and asserts indexes exist;
`docxService` / `pdfService` "should be importable" time out at 5s on heavy module
load. None of those test files imports anything changed here — and route/page
files are entry points, so nothing imports *them*, which means they cannot affect
a unit test at all.

## 4. Fixes applied

### 4.1 Change password was completely broken — `settings/page.tsx`

`handlePasswordSubmit` POSTed to `/api/user/change-password`, **which does not
exist on disk**. The 404 returned Next's HTML error page, so `response.json()`
threw, the catch reported *"Network error. Please try again."*, and the password
was never changed. Every user-facing attempt failed with a misleading message.

The complete implementation already existed and was **unused**:
`PUT /api/user/settings/security` with `action: 'changePassword'` verifies the
current password, saves the new one, resets lockout counters and writes an audit
log entry. The page already called that same route for 2FA, so the fix was to
call it with the documented action shape rather than add a second copy of the
logic:

```ts
fetch('/api/user/settings/security', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'changePassword',
    data: { currentPassword, newPassword },
  }),
});
```

Also fixed: the page read `data.error`, but that route's error envelope uses
`data.message`.

### 4.2 Wrong password reported "Internal server error"

`handlePasswordChange` threw plain `Error`s. `createErrorResponse()` only maps
`DatabaseError` / `ValidationError` to a real status code; a plain `Error` falls
through to the generic branch:

```ts
return { success: false, message: 'Internal server error', statusCode: 500 };
```

So a mistyped current password produced a **500 "Internal server error"** and the
specific reason was lost. The three business-rule throws now use the existing
`ValidationError` from `@/lib/db-utils`, which maps to `400` + the real message.
No new error taxonomy was introduced.

### 4.3 Admin "Add Note" button was dead — new route

`POST /api/admin/users/${userId}/notes` did not exist, so the button silently did
nothing. Both halves of the feature already existed around the gap:

- `GET /api/admin/users/[id]/activity` already reads `SupportNote` and returns
  `data.supportNotes`, so the notes **list** rendered fine.
- The `SupportNote` model already existed (`userId`, `adminId`, `adminEmail`,
  `content`, `timestamp`).
- The caller only checked `if (res.ok)` with **no else-branch**, so the failure
  was invisible.

Added `src/app/api/admin/users/[id]/notes/route.ts`, mirroring the existing
admin-write pattern (`withAdminAuth` + `requireAdmin` + `User.findById` guard +
`ActivityLogService.logAdminAction` audit entry). The caller now surfaces
failures via a destructive toast instead of closing as if it had worked.

### 4.4 Paper size never auto-detected — `Step5Review.tsx`

The effect fetched `/api/region`, which does not exist, so `response.ok` was
always false and detection never ran. **Every user got A4** — including the
US/CA/MX/PH countries that print US Letter, which clips content when the PDF is
printed on the other stock.

Repointed to `GET /api/pricing/regional`, which is the canonical region endpoint:
it already auto-detects from the request IP via `detectUserRegion()` and returns
`{ countryCode }` — exactly what this caller destructures. No new route was
needed, and adding one would have duplicated region detection.

Verified safe by reading `detectUserRegion()`'s contract: it never throws, and its
final fallback is **`'GB'`, not `'US'`**. GB maps to A4, so a total detection
failure lands on A4 — the same outcome as the old always-A4 behaviour. (The
endpoint's own `|| 'US'` fallback only triggers if `detectUserRegion` throws,
which it is documented not to do.)

### 4.5 Avatar never loaded — `LinkedInEnhancementFlow.tsx`

Two bugs in four lines. It fetched `/api/user/profile` (no such route, so
`response.ok` was always false) **and** read `data.user?.image || data.user?.picture`
— neither field exists on any user payload; the field is `avatar`.

Repointed to `GET /api/user/current`, which returns `{ success, user: { …, avatar } }`
— matching the `data.user` access already in the code — and corrected the field
name to `avatar`.

### 4.6 Admin campaign region list was a hardcoded duplicate — new route

`CampaignFilters` fetched `/api/admin/pricing-regions`, which did not exist, and
so always fell back to a hardcoded `['US','GB','IN','CA','AU','EU','SG']` — a
stale duplicate of configuration that actually lives in the database, and one
containing `'EU'` (a bloc, not a country).

Added `GET /api/admin/pricing-regions`, reading through the existing
`getAllCountryPricing()` service so there is a single source of truth. When no
regional pricing is configured it returns `success: false` rather than
`success: true` with an empty array — the caller treats a *present* `regions`
array as authoritative (an empty array is truthy) and would otherwise render a
region filter with no options.

## 5. Remaining unresolved call sites (10)

These are a **separate, pre-existing** condition — calls to paths that do not
exist on disk. None is a method mismatch. None was introduced by this work.
After the fixes in §4, **every remaining entry is unreachable or deliberate** —
there are no live user-facing failures left in this list.

| Call site | Method + path | Reachability | Verdict |
| --- | --- | --- | --- |
| `lib/services/aiAssistantService.ts` | `POST /api/ai/comprehensive-ats-analysis` | reachable | **By design.** Two-tier call that falls through to `/api/ai/comprehensive-analysis`, which exists. The 404 is absorbed; only cost is one wasted request per analysis. Not a bug. |
| `lib/services/jobService.ts` (5 calls) | `jobs/[id]/status`, `interviews`, `interviews/[id]` (PUT + DELETE), `link-cv` | **unreachable** | **Dead code.** `JobService` has 15 statics; only `getJob` is called anywhere in `src/`. |
| `app/shared/candidate/[token]/page.tsx` (GET + POST) | `POST /api/public/shared-candidate/[token]` | **unreachable** | **Orphaned.** No `public/` routes exist at all, and nothing in the codebase generates a share token or links to this page — so the page cannot be reached to render its blank state. |
| `lib/sync-engine/SyncEngine.ts` | `POST /api/sync-history` | **unreachable** | **Dead code.** No `syncHistory` model or reader exists. `saveToSyncHistory` is called from `PersistenceLayer`, which is not exported and is used only by `SyncEngine`, which no production file imports (its only reference is its own test). The real save is the preceding `PUT /api/cvs/[id]`. |
| `lib/error-tracking.ts` | `POST /api/error-tracking` | rare fallback only | **Observability, left alone deliberately.** `captureException` is called by `ui/ErrorBoundary.tsx` in production, but `logrocket` *is* a dependency, so the custom endpoint is only reached when LogRocket fails to initialise. A 404 does not reject the promise, so even the `.catch()` never fires. Wiring this up means choosing a store, retention and PII policy — a product decision, not a bug fix. |

### Optional cleanup (dead code, no user impact)

Both of the following are unreferenced and can be deleted rather than
implemented. They were **not** removed here, because deleting code is an owner
decision:

- The 14 unused `JobService` statics in `lib/services/jobService.ts`, including
  `moveJobToStatus`, which delegates to the already-dead `updateJobStatus`.
- `saveToSyncHistory` in `lib/sync-engine/SyncEngine.ts` and its call site in
  `PersistenceLayer.persistState()` — it fires a wasted 404 on every autosave.

## 6. What this audit cannot see

- **Dynamic paths built from variables** (`fetch(base + path)`) are invisible to
  the regex. All 500 call sites found use inline literals.
- **Server-side calls** (`fetch` from inside a route handler to another route)
  are covered, but calls made through a client SDK or a wrapper that is not
  named `fetch` / `authenticatedFetch` are not.
- **Correct method, wrong payload shape.** The audit proves the verb is
  supported, not that the body matches what the handler expects. That remains a
  runtime concern.
- **Middleware rewrites.** If `next.config.ts` or middleware rewrites a path, the
  audit sees the pre-rewrite URL.

## 7. Re-running

```bash
python3 scripts/audit-api-routes.py .
```

Exits `1` if any method mismatch is found, `0` otherwise, so it can gate CI.
