# Plan: Remove Credit System - Replace with Tier-Based Feature Gating

## Overview
Replace the credit deduction system with subscription tier-based feature access. Features will be locked/unlocked based on user's plan (free/pro) instead of deducting credits.

## Current System Analysis

### Credit System Flow:
1. User attempts action (create job, CV, etc.)
2. System checks `creditService.checkCreditAvailability()`
3. If credits available → deduct credit → proceed
4. If credits exhausted → show CreditExhaustionModal

### Tier-Based System (Target):
1. User attempts action
2. System checks `user.currentPlanKey`
3. If tier allows feature → proceed
4. If tier doesn't allow → show Upgrade Paywall

## Files That Need Changes

### 1. Core Services to Modify:
- `src/lib/services/creditService.ts` - Keep credit LIMIT checking, remove deduction
- `src/lib/services/unifiedLimitService.ts` - Add tier-based feature checks
- `src/lib/services/usageLimitsService.ts` - Replace credit checks with tier checks

### 2. API Routes to Update:
- `src/app/api/jobs/route.ts` - Remove credit spending, use tier check
- `src/app/api/jobs/[id]/route.ts` - Remove credit spending
- `src/app/api/cvs/route.ts` - Remove credit spending
- `src/app/api/user/usage/check/route.ts` - Return tier-based limits

### 3. Frontend Components:
- `src/components/payment/CreditExhaustionModal.tsx` - Rename to FeatureGateModal
- `src/contexts/CreditExhaustionContext.tsx` - Rename to FeatureAccessContext
- `src/lib/hooks/useCredits.ts` - Replace with useTierAccess hook
- `src/lib/hooks/useMembership.ts` - Already exists, enhance it

### 4. UI Updates:
- Show "Upgrade to Pro" instead of "Out of credits"
- Display feature availability based on tier

## Implementation Steps

### Phase 1: Core Logic
1. Create `src/lib/services/tierService.ts` - Feature tier definitions
2. Update `usageLimitsService.ts` to check tier instead of credits
3. Remove credit deduction from `creditService.ts` (keep limit checking)

### Phase 2: API Updates  
4. Update job creation API to check tier
5. Update CV creation API to check tier
6. Update all other credit-spending endpoints

### Phase 3: Frontend Updates
7. Create FeatureGateModal component
8. Replace CreditExhaustionContext with FeatureAccessContext
9. Update all components showing credit exhaustion to show tier upgrade

### Phase 4: Cleanup
10. Remove credit deduction logic (keep credit display for backward compat)
11. Update pricing plan descriptions
12. Test all user flows

## Feature Tier Definitions

```typescript
const TIER_FEATURES = {
  free: {
    maxJobs: 1,
    maxMasterCVs: 1,
    maxStandaloneCVs: 1,
    atsChecks: 0,
    aiEnhancements: 0,
    autoApply: false,
    prioritySupport: false,
  },
  pro: {
    maxJobs: -1, // unlimited
    maxMasterCVs: -1,
    maxStandaloneCVs: -1,
    atsChecks: -1,
    aiEnhancements: -1,
    autoApply: true,
    prioritySupport: true,
  }
}
```

## Key Changes Required

### Before (Credit-Based):
```typescript
// Check and spend credit
const check = await creditService.checkCreditAvailability(userId, 'job_create');
if (!check.available) {
  return { error: 'Insufficient credits' };
}
await creditService.spendCredit(userId, 'job_create');
```

### After (Tier-Based):
```typescript
// Check tier-based feature access
const tierAccess = await tierService.checkFeatureAccess(userId, 'createJob');
if (!tierAccess.allowed) {
  return { error: 'Upgrade to Pro', requiresUpgrade: true };
}
```

## Migration Notes:
- Keep credit fields in User model for display purposes (show "used" not "remaining")
- Paid plans should show "Unlimited" 
- Free plans should show actual usage vs plan limit (not credits)
- Existing credit balance can be migrated to "used" count
