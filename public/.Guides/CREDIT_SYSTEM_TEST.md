# Credit System Testing Guide

## Test Endpoints Created

### 1. Get Credit Status
**Endpoint:** `GET /api/test/credits`

**Description:** Returns comprehensive credit system status including:
- Current credit status (CV, Export, ATS)
- Credit availability
- Usage limit checks
- Plan credit allocations
- Reset eligibility

**Usage:**
```bash
# While logged in, visit in browser:
http://localhost:3000/api/test/credits
```

### 2. Initialize Credits
**Endpoint:** `GET /api/test/credits/init`

**Description:** Initializes credits for the current user based on their plan.

**Usage:**
```bash
# While logged in, visit in browser:
http://localhost:3000/api/test/credits/init
```

### 3. Spend Credit (Test)
**Endpoint:** `POST /api/test/credits`

**Body:**
```json
{
  "action": "cv_create"
}
```

**Description:** Tests spending a credit. Shows before/after credit counts.

## Manual Testing Steps

### Step 1: Initialize Credits
1. Start your dev server: `npm run dev`
2. Log in to your application
3. Visit: `http://localhost:3000/api/test/credits/init`
4. Verify credits are initialized based on your plan

### Step 2: Check Credit Status
1. Visit: `http://localhost:3000/api/test/credits`
2. Verify:
   - Credit counts match your plan
   - Reset schedule is correct
   - Next reset date is calculated

### Step 3: Test Credit Spending
1. Try to create a CV via the UI or API
2. Before creation, credits should be checked
3. After successful creation, credit should be spent
4. Check credit status again to verify credit was decremented

### Step 4: Test Credit Limits
1. Spend all available credits
2. Try to create another CV
3. Should receive error: "Credit limit exceeded"
4. Should see `requiresUpgrade: true` in response

### Step 5: Test Plan Integration
1. Upgrade/downgrade your plan via admin panel
2. Credits should be re-initialized with new plan limits
3. Verify credits match new plan allocation

## Expected Behavior

### Free Plan
- CV Credits: 3
- Export Credits: 3
- ATS Check Credits: 3
- Reset Schedule: Monthly

### Day Pass
- CV Credits: 5 (from plan.maxCVs)
- Export Credits: 5
- ATS Check Credits: 5
- Reset Schedule: Never (expires with pass)

### Pro Plans
- CV Credits: -1 (unlimited) or plan limit
- Export Credits: -1 (unlimited) or plan limit
- ATS Check Credits: -1 (unlimited) or plan limit
- Reset Schedule: Monthly/Quarterly/Yearly based on plan

## Integration Points Tested

✅ **Subscription Activation**
- Credits initialized when plan is activated
- Tested in: `subscriptionService.activateDayPass()` and `activateProPlan()`

✅ **Payment Webhooks**
- Credits reset on subscription renewal
- Tested in: Stripe webhook `handleInvoicePaymentSucceeded()`

✅ **CV Creation**
- Credits checked before creation
- Credits spent after successful creation
- Tested in: `POST /api/cvs`

✅ **Admin Upgrades**
- Credits initialized when plan changes
- Tested in: Admin upgrade route

## Troubleshooting

### Credits Not Initialized
- Visit `/api/test/credits/init` to manually initialize
- Check user's `currentPlanKey` is set correctly
- Verify plan exists in PricingPlan collection

### Credits Not Decrementing
- Check credit service logs
- Verify `spendCredit()` is called after successful creation
- Check if plan has unlimited credits (-1)

### Reset Not Working
- Check `credits.resetSchedule` matches plan
- Verify `lastResetDate` is set
- Check cron job is running: `/api/cron/credits/reset`

## Next Steps

After verifying the credit system works:
1. ✅ Remove test endpoints (or keep for admin use)
2. ✅ Implement clone endpoints
3. ✅ Add deletion protection
4. ✅ Update frontend to show credits
5. ✅ Create migration script for existing users

