# Performance Review: Data Loading Blocking UI Rendering

## Executive Summary

The application exhibits significant "blank screen" or "loading spinner" delays because **data fetching is tightly coupled to initial render**, not just on specific routes but across the entire authenticated experience. The UI shell (layout, sidebar, header) does not paint until several round-trips to the server complete, and several components eagerly fan out large parallel request bursts on authentication.

The fixes below are written to **preserve correctness and UX safety** while improving perceived and actual load time. Where an optimization introduces risk (FOUC, cache staleness, CLS, notification desync, race conditions), the fix explicitly includes a mitigation.

---

## Identified Problems

### 1. Dashboard: 12-Way Parallel Request Burst on Auth
**File:** `src/contexts/DashboardDataContext.tsx`  
**Impact:** HIGH

`DashboardDataProvider` fires **12 simultaneous API requests** the moment a user authenticates. Even in parallel via `Promise.all`, this saturates browser connection limits, competes for CPU to parse large JSON payloads, and means any slow backend query delays widget hydration.

### 2. NotificationContext: Aggressive Mount Behavior
**File:** `src/contexts/NotificationContext.tsx`  
**Impact:** HIGH

On mount the provider immediately fetches `/api/notifications`, opens SSE (after 500 ms), starts polling fallback every 5 s (after 2 s), fires `/api/notifications/check-triggers`, and renders toasts for every unread notification in `requestAnimationFrame`.

### 3. Duplicate User Profile Requests
**Files:**
- `src/lib/hooks/useUserData.ts` fetches `/api/user`
- `src/lib/hooks/useMembership.ts` fetches `/api/user/usage-limits`

These run independently from `DashboardDataContext`, adding multiple requests before the dashboard is ready.

### 4. Root + Dashboard Layout: Sequential Server-Side Awaits
**Files:**
- `src/app/layout.tsx`
- `src/app/dashboard/layout.tsx`

Both call `await getServerSession(...)`, and dashboard also calls `userRepository.findById(...)`. Together they add two sequential server round-trips before the browser receives any HTML.

### 5. Editor Page: Hard Loading Gate
**File:** `src/app/editor/page.tsx`  
**Impact:** MEDIUM-HIGH

The editor returns a full-screen `LoadingOverlay` while auth/guest/redirect state resolves. The master-CV redirect adds another fetch before UI renders.

### 6. No Streaming or Progressive Hydration
**Impact:** HIGH

`RootLayout` wraps `ClientProviders` in one `<Suspense>` boundary. The user sees **nothing** until all client providers mount, rather than seeing the shell first and widgets later.

### 7. Over-Nesting and Heavy Components
**Files:**
- `src/components/providers/ClientProviders.tsx`
- `src/components/cv-builder-pro/CVCanvasEngine.tsx`
- `src/components/dashboard/redesigned/RedesignedDashboardView.tsx`

Deep provider trees and large immediate-bundle components increase time-to-interactive and make incremental rendering harder.

---

## Safe, Risk-Mitigated Fixes

### Fix 1: Staged Critical-Then-Background Data Loading
**File:** `src/contexts/DashboardDataContext.tsx`  
**Goal:** Render widgets fast, fill details later — without changing backend architecture.

**Do not** collapse 12 endpoints into one aggregate endpoint. That converts a client-side parallelism problem into a server-side tail-latency bottleneck: the response is only as fast as the slowest child query, and backend domains become tightly coupled.

Instead, define two fetch tiers:

- **Critical tier (synchronously after auth resolves):**
  - `/api/cvs?projection=summary`
  - `/api/jobs?limit=all`
  - `/api/dashboard/profile-strength`

- **Deferred tier (after mount, via framework-managed priority):**
  - `/api/cover-letters`
  - `/api/analytics/progress`
  - `/api/dashboard/streak`
  - `/api/dashboard/goals`
  - `/api/dashboard/activities`
  - `/api/dashboard/ai-insights`
  - `/api/dashboard/skills-market`
  - `/api/dashboard/salary-insights`
  - `/api/dashboard/job-recommendations`

**Prefer framework-managed deferral over raw browser APIs.** In Next.js, use `next/dynamic` with `loading` skeletons for the non-critical widgets. That lets the framework schedule chunk hydration after critical paint, instead of manually tying network requests to `requestIdleCallback`. If you do need a browser-level fallback, guard it:

```ts
const safeIdleCallback = (cb: () => void, delay = 0) => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => cb(), { timeout: delay });
  } else {
    setTimeout(cb, Math.max(delay, 50));
  }
};
```

Trigger deferred tier only after critical tier resolves. Widgets show skeleton states until their specific data arrives, rather than the whole dashboard waiting on one aggregate response.

**Risk mitigation:**
- No aggregate endpoint => no single backend slow-query blocker.
- Deferral happens at the widget/mount level, so it does not interfere with React 18’s hydration queue.
- If a widget never becomes visible, its data can stay unrequested.

---

### Fix 2: Decouple Shell from Data with Responsive Skeleton Widgets
**Files:**
- `src/app/dashboard/page.tsx`
- `src/components/dashboard/OptimizedDashboardLayout.tsx`

Keep the shell rendering unconditionally. Do **not** wrap `RouteGuard` in a full-page `Suspense` fallback that covers the shell.

Instead:
- Render layout shell immediately.
- Each widget renders its own lightweight skeleton until data is present.
- Use **responsive skeleton dimensions** that match the final rendered component at every breakpoint:

```tsx
const WidgetShell = ({ loading, children, className }: { loading: boolean; children: React.ReactNode; className?: string }) => (
  <div className={cn('min-h-[140px] md:min-h-[180px]', className)}>
    {loading ? <Skeleton className="h-full w-full" /> : children}
  </div>
);
```

Measure the real rendered height at `sm`, `md`, `lg`, and mirror those values in the skeleton. If the final widget can expand to `180px` on mobile because text wraps, the mobile skeleton must also be `180px`.

**Risk mitigation:**
- Widgets resolve independently => no “all empty → all loaded” flash.
- Responsive-aware skeletons prevent mobile CLS while preserving desktop CLS protection.

---

### Fix 3: Notifications: Lazy Fetch + Safe SSE Catch-Up
**File:** `src/contexts/NotificationContext.tsx`  
**Goal:** Reduce mount traffic without missing events.

1. **Remove the eager `/api/notifications` fetch on auth.**
2. **Connect SSE as soon as auth is confirmed**, but with a catch-up mechanism:
   - Store `lastKnownNotificationId` in a ref when SSE delivers events.
   - If SSE reconnects after a gap, send `/api/notifications?since=<lastKnownNotificationId>` to backfill missed notifications.
3. **Lazy-load initial notifications only when the drawer opens** (`setIsOpen` transition inside `NotificationCenter`).
4. **Batch toasts:** if `unreadCount > 3`, show a single toast: "You have N unread notifications." Show individual toasts only for live events arriving via SSE after mount.
5. **Polling backoff:** when SSE is `OPEN`, poll every 30–60 s. When SSE is `CLOSED`, poll every 5 s.

**Risk mitigation:**
- Lazy drawer fetch + SSE catch-up ensures no missed events.
- Batching toasts prevents layout thrashing from 10+ simultaneous popups.
- Backoff reduces bandwidth contention with dashboard data.

---

### Fix 4: Session Handling Without FOUC
**Files:**
- `src/app/layout.tsx`
- `src/app/dashboard/layout.tsx`

**Do not** move `getServerSession` entirely to client-side. That risks Flash of Unauthenticated Content when the session is missing or expired.

Instead:
1. Keep `getServerSession(authConfig)` in `layout.tsx` to stream the shell safely.
2. In `DashboardLayout`, replace `userRepository.findById(...)` with a **client-side fetch wrapped in Suspense at the widget level**, not the page level. Example:
   - Layout renders shell immediately.
   - Dashboard header/greeting queries profile data independently and shows a small skeleton for the user name while loading.
3. Where possible, pass minimal session claims through the existing session cookie and rely on client `useSession()` for user-specific UI state.

Once membership or user data changes in a way that affects Server Component output (e.g., an upgraded plan badge in the layout), invalidate both caches explicitly:

```ts
// After upgrade mutation:
queryClient.invalidateQueries({ queryKey: ['user', 'usage-limits'] });
queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
router.refresh(); // Purge Next.js Router Cache for RSC
```

**Risk mitigation:** Server-side session gate remains for the actual redirect decision; only non-critical profile display data shifts to background hydration, so no unauthorized shell is shown. Dual invalidation keeps React Query and RSC output in sync.

---

### Fix 5: Editor: Shell-First, Hydrate-Later with Visible Input Guard
**File:** `src/app/editor/page.tsx`  
**Goal:** Show editor instantly without race-condition data overwrites or silent locks.

1. Render the editor shell and canvas immediately in a **read-only / placeholder** state.
2. Show a subtle, localized `isHydrated` indicator — a small spinner in the canvas corner or a non-blocking toast ("Syncing workspace…") — **not** a full-screen `LoadingOverlay`.
3. **Disable canvas input until hydration completes.** Use an `isHydrated` flag, not a full-screen overlay.
4. For `doc=master-cv`, resolve the redirect inline by rendering the editor at `/editor?mode=create` and swapping params when the master-CV ID arrives.

Example:

```tsx
const [hydrated, setHydrated] = useState(false);
const [isHydrating, setIsHydrating] = useState(true);

useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      const data = await loadCVOrJourney(...);
      if (!cancelled) {
        setCvData(data);
        setHydrated(true);
      }
    } finally {
      if (!cancelled) setIsHydrating(false);
    }
  })();
  return () => { cancelled = true; };
}, [...]);

return (
  <>
    <CanvasEditor data={cvData} readOnly={!hydrated} />
    {isHydrating && (
      <div className="absolute bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-white text-xs">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Syncing workspace…
      </div>
    )}
  </>
);
```

**Risk mitigation:**
- `readOnly` prevents user input from being overwritten by late-arriving data.
- The localized indicator explains the temporary unclickability, avoiding the “frozen app” perception on slow networks.
- The UI is visible instantly, and data flows in asynchronously without race conditions.

---

### Fix 6: Deduplicate User Requests Without Over-Fetching
**Files:**
- `src/lib/hooks/useUserData.ts`
- `src/lib/hooks/useMembership.ts`

**Do not** merge `/api/user` and `/api/user/usage-limits` into one query. Membership checks only need a small subset of the user profile; combining them wastes bandwidth and couples unrelated concerns.

Instead:
1. Keep `/api/user` and `/api/user/usage-limits` as separate endpoints.
2. In React Query, use **query deduplication** by sharing the same underlying request for the overlapping portion if needed.
3. More importantly: ensure `useUserData` and `useMembership` are **not called on the same render path** unless both are needed. On the dashboard, `DashboardDataProvider` can own the user fetch; `useUserData` can consume from context or be skipped.

```tsx
// In DashboardDataProvider:
const { data: user } = useQuery({ queryKey: ['user', 'me'], queryFn: fetchUser });
const { data: limits } = useQuery({
  queryKey: ['user', 'usage-limits', user?.id],
  queryFn: fetchLimits,
  enabled: !!user?.id,
});
```

**Cache invalidation strategy:**
- After mutations that affect membership (upgrade, downgrade), explicitly invalidate `['user', 'usage-limits']` **and** call `router.refresh()` if the layout or any Server Component renders membership-dependent UI.
- After profile updates, invalidate `['user', 'me']`.
- Use `staleTime: 60_000` for limits (they don't change intra-session), but **always refetch on window focus** for membership if the user just returned from a payment page.

**Risk mitigation:** Separate cache keys mean over-fetching is minimized, while shared invalidation keeps state consistent after mutations. `router.refresh()` bridges the App Router cache gap.

---

### Fix 7: Intelligent Caching of Static Dashboard Metrics
**Files:**
- `src/contexts/DashboardDataContext.tsx`
- Dashboard API routes

For data that changes infrequently (streak, goals, profile strength, skills market):
- Use React Query `staleTime: 5 * 60_000` (5 minutes).
- After mutations that affect these values, invalidate the specific query key only.

For API routes that back Server Components or layouts, add route-level revalidation so RSC output stays fresh:

```ts
export const revalidate = 300; // 5 minutes
```

**Risk mitigation:** Short `staleTime` prevents "my save didn't work" confusion. After user actions that change stats, invalidate only the affected key rather than flushing the whole cache. Route-level `revalidate` keeps server-rendered membership badges consistent without hardcoded `router.refresh()` everywhere.

---

### Fix 8: Lazy-Load Heavy Components Without Blocking Bundle
**Files:**
- `src/components/cv-builder-pro/CVCanvasEngine.tsx`
- `src/components/dashboard/redesigned/RedesignedDashboardView.tsx`

Use `next/dynamic` with `{ ssr: false, loading: () => <Skeleton /> }` for:
- `CVCanvasEngine`
- AI insights widgets
- Salary insights widgets
- Job recommendations widget

This keeps the initial JS bundle lean and lets the main thread render the shell first.

```tsx
const CVCanvasEngine = dynamic(
  () => import('@/components/cv-builder-pro/CVCanvasEngine'),
  { ssr: false, loading: () => <div className="h-[600px] animate-pulse bg-gray-100 rounded-2xl" /> }
);
```

**Risk mitigation:** Skeletons reserve exact space; the canvas loads only when the user navigates to the editor, not on initial page load.

---

### Fix 9: Flatten Provider Nesting Where It Reduces Re-Render Cost
**File:** `src/components/providers/ClientProviders.tsx`

The current nesting is functional but deep. Flatten where safe:

- Combine `PaymentModalProvider`, `CreditExhaustionProvider`, `ConsoleLoggerProvider`, and `FeaturePromotionProvider` into a single `AppProviders` if they are always rendered together.
- Keep `SessionProvider` and `ReactQueryProvider` as the two true roots.
- Move `NotificationProvider` inside `AuthProvider` (already done) and make it a leaf above `children`.

This reduces the number of context subscriptions React must track on every render.

---

### Fix 10: Landing Page Stagger Dynamic Imports
**File:** `src/components/landing/LandingPageContent.tsx`

Stagger below-the-fold section imports using a small delay so they do not all compete for network and CPU in the same frame:

```tsx
const stagger = (ms: number) => new Promise(r => setTimeout(r, ms));

// In component:
useEffect(() => {
  let cancelled = false;
  (async () => {
    if (cancelled) return;
    await stagger(200);
    preload(Features);
    await stagger(200);
    preload(Pricing);
    // ...
  })();
  return () => { cancelled = true; };
}, []);
```

Or use the native `import()` with a `priority` hint inside the browser network scheduler if supported.

**Risk mitigation:** Staggering keeps the main thread free for hero-section interactions and reduces simultaneous network contention.

---

### Fix 11: NotificationCenter Render-Time Cleanup
**File:** `src/components/notifications/NotificationCenter.tsx`

Move the activity merge/sort into a `useMemo` keyed on `[liveActivities, dbActivities]`, and only re-sort when lengths change. Do not merge on every render.

```tsx
const allActivities = useMemo(() => {
  const merged = [...liveActivities];
  dbActivities.forEach(dbA => {
    if (!merged.some(a => a.id === dbA.id)) merged.push(dbA);
  });
  return merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}, [liveActivities, dbActivities]);
```

---

## Advanced Edge Cases & "Gotchas"

### Skeleton-Content Breakpoint Mismatch (Fix 2)
If the final widget height changes at responsive breakpoints because text wraps or grids collapse, fixed skeleton heights will still cause mobile CLS.  
**Mitigation:** Mirror the exact responsive height classes in both skeleton and content containers (`min-h-[140px] md:min-h-[180px]`). Treat breakpoint parity as a testable requirement.

### Next.js Router Cache Stale After Membership Mutation (Fix 6 & 7)
React Query invalidation does not purge the Next.js Client-side Router Cache. If a layout or Server Component renders a premium badge based on membership, that UI can remain stale after upgrade until the user navigates away and back.  
**Mitigation:** After any membership or profile mutation, call `router.refresh()` alongside React Query invalidation. If using Server Actions, pair them with `revalidatePath('/dashboard')` for the affected routes.

### Read-Only Editor "Silent Lock" (Fix 5)
A silently disabled canvas on slow networks feels broken, not loading.  
**Mitigation:** Always show a localized sync indicator (corner spinner or toast) while `isHydrated` is false. Keep the canvas visible and non-blocking; only the input layer should be disabled.

### requestIdleCallback vs React 18 Hydration Timing (Fix 1)
Scheduling fetches in `requestIdleCallback` can overlap with React’s hydration/commit phase, especially on low-end devices.  
**Mitigation:** Prefer framework-managed deferral (`next/dynamic` low-priority widgets, staggered mount effects) over raw browser idle callbacks. Only use `requestIdleCallback` as a progressive enhancement wrapped in a Safari-safe `setTimeout` fallback.

---

## Priority & Expected Impact

| Priority | Fix | Safe because | Expected Impact |
|---|---|---|---|
| P0 | Fix 1: Staged dashboard loading | Keeps endpoints separate; widget-level deferral avoids tail-latency coupling | 30–50 % faster first paint |
| P0 | Fix 3: Notification lazy + SSE | SSE catch-up + drawer fetch preserves data | Removes 2–3 requests on mount |
| P0 | Fix 5: Editor shell-first | `readOnly` + visible sync indicator prevents race and confusion | Editor visible instantly |
| P1 | Fix 2: Responsive skeleton widgets | Exact breakpoint parity prevents mobile CLS | Perceived speed increase |
| P1 | Fix 4: Session without FOUC | Server gate stays; dual invalidation bridges RSC cache | Faster navigation, no auth flash |
| P1 | Fix 6: Dedupe without over-fetching | Separate endpoints + router.refresh() on mutation | Removes redundant requests |
| P1 | Fix 7: Cache with TTL + route revalidation | Per-key invalidation keeps data fresh | Reduces API load |
| P2 | Fix 8: Lazy heavy components | SSR disabled; skeleton reserves space | Smaller initial bundle |
| P2 | Fix 9: Flatten providers | No behavioral change; less re-render cost | Minor perf + clarity |
| P2 | Fix 10: Stagger landing imports | Sequential preload, not blocking | Smoother landing load |
| P2 | Fix 11: Memoize notification merge | Expensive work only on data change | Minor render savings |

---

## Quick Wins

1. **NotificationContext:** Remove the eager `fetch('/api/notifications')` on mount. Fetch lazily when the drawer opens and rely on SSE + catch-up for initial state.
2. **DashboardDataContext:** Move 8 of 12 fetches behind framework-managed widget deferral (`next/dynamic` or mount stubs) so critical widgets paint instantly.
3. **Editor:** Replace `LoadingOverlay` with a canvas shell + `readOnly` until data hydrates, plus a visible “Syncing workspace…” indicator.
4. **Session:** Keep server session in layout; move `userRepository.findById` into a client-side skeleton, not a server block. Call `router.refresh()` after membership mutations.

---

## Conclusion

The app feels slow because **data waits for UI** instead of **UI waiting for data**. The safe optimization path is:
1. Render shell and critical widgets immediately.
2. Hydrate secondary/tertiary data in the background via framework-managed deferral.
3. Guard edge cases explicitly: responsive CLS, Next.js Router Cache staleness, visible editor hydration indicators, avoiding `requestIdleCallback` conflicts with React 18, and notification catch-up.

This approach improves both real and perceived performance without introducing regressions in auth safety, data freshness, or user input reliability.
