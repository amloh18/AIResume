# Implementation Plan: B2B Admin Controls & HR Features

## Summary
This plan outlines the steps to implement full administrative control over B2B businesses (Tenants) within the main CVCircle Admin Dashboard, and to expand the Business (B2B) Dashboard with essential HR/Agency owner features (Team Management and Jobs/Requisitions).

## Current State Analysis
- The main Admin Dashboard (`/admin/dashboard`) currently manages regular B2C users via `UserManagement.tsx`. It lacks a dedicated interface for managing B2B Tenants.
- The `Tenant` model exists (`src/models/b2b/Tenant.ts`) and a basic creation endpoint exists (`/api/admin/b2b/tenants/route.ts`), but it does not link the `Tenant` to a `User` document as the B2B admin.
- The B2B Dashboard (`/b2b/dashboard`) has settings but explicitly stubs out "Team Management". It also lacks a "Jobs / Requisitions" section which is critical for an HR/Agency owner to score candidates against.

## Proposed Changes

### Phase 1: CVCircle Owner Controls (Admin Dashboard)
1. **Update Admin Navigation**
   - **File**: `src/components/admin/AdminNavigation.tsx`
   - **Change**: Add a new `Businesses (B2B)` link under the `Management` section.

2. **Create Business Management Component**
   - **File**: `src/components/admin/BusinessManagement.tsx` (New)
   - **Change**: Build a data table component to list all B2B Tenants. Include features to:
     - View Tenant Details (Name, Contact Email, Subscription Tier, Usage vs. Limit, Status).
     - Suspend/Activate Tenants.
     - Edit API Quotas (Rate Limit, Tier).
     - Create a New Tenant (Modal).

3. **Enhance Tenant API Endpoints**
   - **File**: `src/app/api/admin/b2b/tenants/route.ts`
   - **Change**: When a new Tenant is created, automatically find the user by `contactEmail` (or create a placeholder user) and set their `b2b.tenantId` and `b2b.role = 'admin'` so they have owner access.
   - **File**: `src/app/api/admin/b2b/tenants/[tenantId]/route.ts` (New)
   - **Change**: Add a `PATCH` endpoint to allow the Super Admin to update tenant status (`isActive`), `rateLimit`, and `subscriptionTier`.

4. **Register Component in Admin Dashboard**
   - **File**: `src/app/admin/dashboard/page.tsx`
   - **Change**: Render `<BusinessManagement />` when the `businesses` sub-tab is active.

### Phase 2: HR / Agency Owner Features (B2B Dashboard)
1. **Update B2B Navigation**
   - **File**: `src/components/b2b/B2BSidebar.tsx`
   - **Change**: Add `Jobs / Requisitions` to the navigation links.

2. **Implement Team Management (B2B Settings)**
   - **File**: `src/components/b2b/TeamManagement.tsx` (New)
   - **Change**: Replace the stubbed Team Management section in `src/app/b2b/dashboard/settings/page.tsx`. Allow the B2B Admin to view current members, invite new members by email, and assign roles (`recruiter`, `member`).
   - **API Files**: `src/app/api/b2b/team/route.ts` & `src/app/api/b2b/team/[id]/route.ts` (New). These will securely manage `User` documents scoped to the current `tenantId`.

3. **Implement Jobs / Requisitions (B2B Dashboard)**
   - **File**: `src/app/b2b/dashboard/jobs/page.tsx` (New)
   - **Change**: Create a UI for the HR Owner to define open job roles (Job Title, Description, Status). This will leverage the existing `Job.ts` model using the `tenantId` field.
   - **API Files**: `src/app/api/b2b/jobs/route.ts` & `src/app/api/b2b/jobs/[id]/route.ts` (New).

## Assumptions & Decisions
- A B2B Team Member is represented by the existing `User` model where `b2b.tenantId` is set to the business's Tenant ID.
- Jobs created in the B2B dashboard will utilize the existing `Job.ts` schema by storing the `tenantId` to isolate B2B jobs from B2C jobs.
- The `BusinessManagement` UI will match the visual style of the existing `UserManagement.tsx` component in the Admin Dashboard.

## Verification Steps
1. Navigate to `/admin/dashboard` as a Super Admin and verify the "Businesses (B2B)" tab appears.
2. Create a new B2B Tenant from the Admin Dashboard and verify the target email address gets the `b2b.role = 'admin'` privileges.
3. Suspend a Tenant and verify their API keys / Dashboard access are restricted.
4. Navigate to `/b2b/dashboard/settings` as a B2B Admin and invite a new team member via the new Team Management UI.
5. Navigate to `/b2b/dashboard/jobs` and create a new Job Requisition.