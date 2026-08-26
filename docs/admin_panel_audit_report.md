# Admin Panel Audit & Code Integrity Report

This report outlines bugs, hardcoded configurations, broken endpoints, and architectural issues in the Admin Panel subsystem, alongside recommended fixes.

---

## 1. Major Discovered Issues & Broken Endpoints

### Bug A: Non-Existent Configuration Endpoints (API 404s)
In `UserManagement.tsx` (Line 96) and `CampaignFilters.tsx` (Line 200), client fetch calls invoke:
* `fetch('/api/admin/config/plans')`
* `fetch('/api/admin/config/plans?forCampaigns=true')`

**The Bug:** The entire `/api/admin/config/plans` directory and API route does not exist. This triggers silent console failures (`Error fetching plan config: TypeError`), preventing proper filtering of user categories, plans, and displayed targets in both the User Management and Email Campaign filters views.

---


### Bug B: Missing `/api/admin/config/statuses` endpoint data properties
In `DiscountCodeManager.tsx` (Line 94), the code fetches:
* `fetch('/api/admin/config/statuses')`

**The Bug:** While the route `/api/admin/config/statuses/route.ts` is physically defined, it does not reliably return dynamic currency configurations (`currencies`). The discount manager falls back to a hardcoded array of `['EUR', 'USD', 'INR']` on error, which could prevent the administrator from selecting local promotional regions.

---

## 2. Hardcoded Values & Mock Layouts
* **Search Shortcuts**: Static hotkey badges (`⌘K`) in the header (Line 208) are hardcoded text and do not bind to any global command search handlers.
* **Notification Dispatch Defaults**: In the newly added `ContentAnalytics` emergency alert block, the default form is pre-filled with `"System Maintenance Update"`. This should be replaced with reactive state hooks bound to live database status payloads when integrating real maintenance flags.

---

# Plans

* smart_quarterly
* smart_yearly
* starter_monthly (free plan)
* starter_yearly
* focused_monthly
* focused_yearly

## 3. Structural & Architectural Fixes

### Fix A: Implement the `/api/admin/config/plans/route.ts` Endpoint
Create a dynamic endpoint that lists available pricing configurations:
```typescript
import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth';

export const GET = withAdminAuth(async () => {
  return NextResponse.json({
    success: true,
    plans: ['free', 'starter_monthly', 'starter_yearly', 'pro_monthly', 'pro_yearly'],
    planDisplayNames: {
      free: 'Free Tier',
      starter_monthly: 'Starter Monthly',
      starter_yearly: 'Starter Yearly',
      pro_monthly: 'Professional Monthly',
      pro_yearly: 'Professional Yearly'
    }
  });
});
```

### Fix B: Enhance Error Fallbacks on Pricing & Campaigns Views
Wrap user metrics fetches and plan arrays in try/catch hooks that fallback gracefully to standard system roles (`['admin', 'user', 'business']`) to maintain full panel operations even during live DB seed upgrades.

