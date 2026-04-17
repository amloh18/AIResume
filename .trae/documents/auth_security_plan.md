# Authentication Consolidation & Security Fixes Plan

## Summary
The goal of this plan is to consolidate the authentication system so that admins and users log in through the same unified flow. The separate admin login will be removed, and an Apple login option will be added using NextAuth. Crucially, a massive security vulnerability regarding unprotected `/api/admin/*` routes and bypassed Next.js middleware will be patched.

## Current State Analysis & Security Flaws
1. **Broken Middleware Execution**: Currently, `src/middleware.ts` uses a custom `parseJWT` function (`src/lib/edge-auth.ts`) that uses `atob()`. This fails to decrypt NextAuth's default JWE (JSON Web Encryption) tokens. To prevent the app from breaking, the `matcher` array in `middleware.ts` was configured to only match non-existent paths (like `/api/dashboard/(.*)`), meaning the middleware **never executes** for real routes.
2. **Unprotected Admin API Routes**: Because the middleware is bypassed, dozens of routes in `src/app/api/admin/*` (e.g., `/api/admin/users/route.ts`) have absolutely no authentication checks. They rely solely on the broken middleware. This allows anyone to access sensitive admin data.
3. **Parallel Authentication**: The app maintains two completely separate login systems (`credentials` for users, `admin-credentials` for admins) and schemas (`User` vs `AdminAuth`).
4. **Apple Login**: Apple login is stubbed out in the frontend (`hasApple = false`) but not implemented in the NextAuth provider list.

## Proposed Changes

### 1. Fix Global Authentication Security (The Fixes)
* **File**: `src/middleware.ts`
* **What**: Completely refactor the middleware to use NextAuth's official `getToken` utility and correctly match routes.
* **How**:
  * Import `getToken` from `next-auth/jwt`.
  * Update the `matcher` array to apply globally (e.g., `['/((?!_next/static|_next/image|favicon.ico|images|public).*)']`).
  * Implement strict route protection:
    * If `pathname.startsWith('/admin')` or `pathname.startsWith('/api/admin')`, verify the token exists and `token.role === 'admin' || token.role === 'superadmin' || token.type === 'admin'`.
    * If unauthorized, redirect page requests to `/sign-in` and return `401/403` JSON responses for API requests.

### 2. Consolidate Authentication Flows (Remove Admin Login)
* **Files**: `src/app/admin/signin/page.tsx`, `src/lib/auth/unified-auth-service.ts`, `src/models/AdminAuth.ts` (if exists).
* **What**: Remove all parallel admin authentication logic.
* **How**:
  * Delete the `/admin/signin` route entirely.
  * In `unified-auth-service.ts`, remove the `admin-credentials` provider.
  * Ensure the `jwt` and `session` callbacks in `unified-auth-service.ts` correctly map a regular `User`'s role (if it is `admin`) to the session token so they can access the admin dashboard.
  * Remove `AdminAuth` references from `src/lib/auth/user-service.ts`.

### 3. Add Apple Login (NextAuth)
* **Files**: `src/lib/auth/unified-auth-service.ts`, `src/components/auth/RegistrationModal.tsx`, `src/components/auth/SocialAuthButtons.tsx` (if applicable).
* **What**: Implement NextAuth Apple Provider.
* **How**:
  * Import and add `AppleProvider` to the `providers` array in `unified-auth-service.ts` using `process.env.APPLE_ID` and `process.env.APPLE_SECRET`.
  * In `RegistrationModal.tsx`, change `hasApple = false` to `true` and render the "Continue with Apple" button alongside Google.
  * Ensure the button calls `handleOAuthSignIn('apple')` which maps to `signIn('apple')`.

## Assumptions & Decisions
* The user confirmed they want to use NextAuth for Apple Login rather than re-introducing the Firebase SDK, maintaining a clean single source of truth for auth.
* Regular users with `role: 'admin'` in the `User` collection will now be the only authorized administrators. Any existing `AdminAuth` accounts must be recreated in the `User` collection if they don't already exist.
* Fixing the `middleware.ts` matcher will now actively enforce authentication on all protected routes. We assume that NextAuth tokens are correctly passed in cookies and that standard `getToken` works seamlessly.

## Verification Steps
1. Verify that navigating to `/admin/dashboard` while logged out correctly redirects to `/sign-in`.
2. Verify that logging in as a regular user (without the admin role) and navigating to `/admin/dashboard` redirects away or denies access.
3. Verify that querying an admin API route like `/api/admin/users` without an admin token returns a `403 Forbidden` or `401 Unauthorized` response.
4. Verify that the Apple Login button appears on the sign-in modal and initiates the OAuth flow.