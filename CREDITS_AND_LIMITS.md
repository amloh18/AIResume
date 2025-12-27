# Credits & Usage Limits System Documentation

This document outlines how `CVCircle` handles user permissions, subscription limits, and credit consumption. The system uses a hybrid approach combining **Active Resource Limits** (e.g., max 3 active jobs) and **Consumption Credits** (e.g., unlimited runs for Pro).

## 1. Core Concepts

The system is built on three main pillars:
1. **Plan Limits (`PLAN_LIMITS`)**: Static definitions of what each plan allows (e.g., "Free users get 3 active jobs").
2. **Credit Service (`CreditService`)**: Manages the "spending" of credits and checks if an action is allowed based on subscription status.
3. **Time-Based Access (`UsageLimitsService`)**: Determines if a subscription matches the current date (handling expiry, grace periods).

---

## 2. Plan Limits (`subscription-helpers.ts`)

The `PLAN_LIMITS` constant in `src/lib/utils/subscription-helpers.ts` is the **single source of truth** for feature capabilities.

### Current Limits Configuration:

| Feature | Free | Day Pass | Pro (Monthly/Quarterly) | Pro (Yearly/Lifetime) |
| :--- | :--- | :--- | :--- | :--- |
| **Max Active Jobs** | 3 | 100 | Unlimited (-1) | Unlimited (-1) |
| **Active Journey CVs** | 1 | Unlimited (-1) | 50 / Unlimited | Unlimited (-1) |
| **AI Surgeon Runs** | 10 | Unlimited (-1) | Unlimited (-1) | Unlimited (-1) |
| **Downloads** | 5 | Unlimited (-1) | Unlimited (-1) | Unlimited (-1) |
| **Premium Templates** | ❌ | ✅ | ✅ | ✅ |
| **AI Modes** | Spelling Only | Full | Full | Full |
| **Career Vault** | ❌ | ❌ | ❌ | ✅ |

> **Note:** A limit of `-1` signifies **Unlimited**.

### Key Function: `checkJobLimit`
This function specifically regulates the Job Tracker.
- **Logic**: It counts the user's *non-archived* jobs.
- **Rule**: `Active Jobs < Max Jobs Limit`
- **Day Pass Special Case**: Even though Day Pass allows 100 jobs, if the pass expires, the limit reverts to Free (3).

---

## 3. Credit Service (`creditService.ts`)

Located in `src/lib/services/creditService.ts`. This service answers the question: *"Can the user perform this action right now?"*

### Responsibilities:
1. **Subscription Status Check**:
   - Verifies if the user's `subscription.status` is `active`.
   - Checks `currentPeriodEnd` (for subscriptions) or `accessExpiresAt` (for Day Pass) against the current time.
   - **Pro Lifetime**: specific bypass to always grant access.

2. **Credit Allocation**:
   - **Free**: Defaults to 1 credit/month (fallback logic).
   - **Paid/Day Pass**: Returns `-1` (Unlimited).

3. **Spending Credits**:
   - For non-unlimited plans, it decrements `credits.jobCredits` in the database.
   - For unlimited plans, it skips decrementing but tracks usage validation.

---

## 4. Time-Based Access (`usageLimitsService.ts`)

Located in `src/lib/services/usageLimitsService.ts`. This service strictly manages **Feature Access based on Time**.

### Logic Flow:
1. **Day Pass**: Checks `accessExpiresAt`.
   - **Grace Period**: 3 days (allows access but warns).
2. **Recurring Subscriptions (Monthly)**: Checks `currentPeriodEnd`.
   - Handles auto-renewal logic and grace periods for failed payments.
3. **Fixed Duration (Quarterly/Yearly)**: Checks `accessExpiresAt`.
4. **Lifetime**: Always returns `hasAccess: true`.

### Interaction with Limits:
When `checkUsageLimit` is called:
1. It **first** calls `checkTimeBasedAccess` to ensure the subscription is valid.
2. If valid, it **then** checks `CreditService` for available credits.

---

## 5. Summary of Validation Flow

When a user attempts to **Create a Job**:

1. **Frontend**: Checks `checkJobLimit` (Active Jobs count).
   - If User has 3 active jobs and is Free -> **BLOCKED** (Prompt Upgrade).
2. **Backend API** (`/api/jobs/[id]`):
   - **Step 1: Time Check**: Is the subscription active? (via `usageLimitsService`)
   - **Step 2: Credit Check**: Does the user have credits? (via `creditService`)
   - **Step 3: Active Limit Check**: `checkJobLimit` (via `subscription-helpers`)
     - Queries DB for `countDocuments({ isArchived: false })`.
     - Compares against `PLAN_LIMITS[planKey].maxJobs`.
   - **Result**: Operation allowed or 403 Forbidden.

## 6. Recent Fixes (Pro Unlimited)
- **Problem**: Pro users were hitting a limit because strict credit checking logic wasn't fully synced with the `PLAN_LIMITS` configuration.
- **Fix**:
  - `pro_monthly`, `pro_quarterly`, `pro_yearly`, and `pro_lifetime` are now explicitly set to `-1` (Unlimited) in **all** limit configurations (`PLAN_LIMITS`) and credit allocations (`getPlanCredits`).
  - `pro_lifetime` was added as a distinct plan key to ensure it isn't treated as a default/free plan.
