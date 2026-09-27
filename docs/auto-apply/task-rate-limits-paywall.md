# task.md — Rate limit enforcement & paywall one-view fix

Date: 2026-09-25 · Branch: `fix/fe-be-integration`

## Problem statement (user report)

1. **Apply was not blocked at the rate limit.** Settings showed "12 of 10 used · 0 remaining"
   while the Jobs Hub pill showed "13/10", yet nothing stopped the next apply.
2. **No remaining-time display** for when the rate limit refreshes.
3. **Paywall split into two views** (Monthly / Yearly toggle) instead of showing all plan
   cards at once.

## Root causes

| # | Cause | Effect |
|---|-------|--------|
| 1 | Three competing limit definitions: `lib/entitlements/limits.ts` (25/mo), `autoApplyQuotaService.PLAN_CONFIGS` (25/mo — the layer that actually enforces), legacy `entitlement-service` (10/mo — what Settings displayed) | UI said "12 of 10" while enforcement allowed up to 25 |
| 2 | Two usage counters: Settings counted `jobapplications` rows; `/api/jobs/auto-apply` counted `AutoApplyReservation` rows | 12 vs 13 on the same screen |
| 3 | Focused plan enforced a 50/**month** cap | Contradicted the marketed "50 automated applications / day" |
| 4 | `reserve()` did check-then-insert with no post-insert recheck | Concurrent requests could exceed the cap by one (the "12 of 10" class of bug) |
| 5 | `/api/me/entitlements` treated provider-less Starter ($0 promo) subscriptions as `free` | Free-plan limits shown to paying users |
| 6 | `JobSidebar.handleApplyNow` did not handle the 403 quota response | Generic "Auto-apply failed" toast instead of the real reason |
| 7 | No reset countdown anywhere | User couldn't see when the quota refreshes |
| 8 | `UniversalPaymentModal` filtered plan cards by `billingCycle` | Only 2 cards visible; other interval hidden behind the toggle |

## Canonical limits (single source of truth)

| Plan | Limit | Reset |
|------|-------|-------|
| Free | 10 lifetime auto-applies | never |
| Starter | 10 per billing month | billing period end |
| Focused | 50 per day (monthly uncapped) | midnight |

`limits.ts`, `PLAN_CONFIGS`, the paywall copy, and legal copy now all agree.

## Changes

- `src/lib/utils/reset-countdown.ts` (new) — shared formatter (`formatResetCountdown`,
  `formatResetLabel`, `describeReset`); 30s-ticking live countdowns on all surfaces.
- `src/lib/services/autoApplyQuotaService.ts` — canonical `PLAN_CONFIGS`; binding-cap helper
  (`resolveBindingCap`: free→lifetime, starter→monthly, focused→daily); post-insert recheck that
  releases the losing reservation on a race; accurate `used` (incl. reserved) and reset-time
  clauses in denial reasons; `getUsageSummary` reports the binding cap.
- `src/lib/entitlements/limits.ts` — Starter 10/mo, Focused daily 50 / monthly unlimited.
- `src/lib/services/entitlement-service.ts` — usage now reads the same reservation-based counts
  as enforcement (falls back to `jobapplications` counts if the quota service errors).
- `src/app/api/me/entitlements/route.ts` — provider-less paid plans resolve to their plan key,
  not `free`.
- `src/lib/hooks/useEntitlements.ts` — new `getAutoApplyUsage()` returning the binding cap +
  reset time for the current plan.
- `src/components/dashboard/JobsDashboard/FiltersBar.tsx` — pill uses the binding limit
  (no more `13/Infinity` on Focused), shows "· Resets in 5h 12m", turns red at zero remaining.
- `src/components/jobs/AutoApplyPanel.tsx` — Settings meter shows live countdown; amber
  "Limit reached — new applications unlock …" line at zero; percentage guard for limit 0.
- `src/components/dashboard/jobs/JobSidebar.tsx` — 403/429 quota blocks now surface the real
  reason + reset countdown instead of "Auto-apply failed".
- `src/components/jobs/EntitlementNotice.tsx` / `ContextualLimitModal.tsx` — real reset
  countdown instead of "next billing cycle".
- `src/components/payment/UniversalPaymentModal.tsx` — all four plan cards (Starter/Focused ×
  Monthly/Yearly) in one 2×2 grid; toggle removed; interval chip per card.

## Compatibility

- No schema changes. `AutoApplyReservation` queries unchanged.
- Tightening Starter 25→10 and Focused monthly→daily matches marketing/legal copy; users on the
  old de-facto 25/mo Starter allowance will hit the documented 10/mo cap. Product sign-off
  implied by the copy already shipping 10/mo.
- `/api/entitlements` and `/api/me/entitlements` response shapes unchanged (values corrected).

## Verification

- `npx tsc --noEmit` → clean.
- `npx vitest run src/lib/services/autoApplyQuotaService.test.ts src/lib/utils/reset-countdown.test.ts`
  → 18 passed (binding-cap precedence, race release, summary reporting, countdown formatting).
- `npx vitest run src/workers` → 24 passed (no worker regression).
- ESLint on changed files → no errors (pre-existing warnings untouched).

## Rollback

Single-commit revert of the changed files; no data migration to undo. Released (race-loser)
reservations are inert rows with `status: 'released'` and are excluded from counts.
