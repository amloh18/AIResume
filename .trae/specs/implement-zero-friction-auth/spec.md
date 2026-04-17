# Zero-Friction Re-entry & Auth Security Spec

## Why
Currently, unauthenticated users accessing protected routes (like `/dashboard` or `/editor?cvId=...`) are subjected to a hard redirect to a generic `/sign-in` page, losing their context and URL intent. Additionally, there is a reported security issue where entering a correct `cvid` in the address bar might bypass authentication or inadvertently create a session. To achieve production-grade UX (like Pinterest or Facebook) and ensure airtight security, we need to implement an "Intercept and Redirect" pattern using an overlay Auth Modal, and strictly protect all routes.

## What Changes
- **BREAKING**: Remove hard 302 redirects to `/sign-in` for protected page routes in `src/middleware.ts`.
- **BREAKING**: Replace the current `RouteGuard` redirect logic with a global Auth Modal trigger.
- Implement a global state manager (Zustand or Context) for the Auth Modal.
- Wrap the application layout in an Auth Guard that renders the protected route underneath a "locked" modal overlay if the user is unauthenticated.
- Create a global Fetch/Axios interceptor to catch `401 Unauthorized` API responses and trigger the Auth Modal.
- Audit and patch any CV-related API or page routes to ensure `cvId` parameters cannot bypass authentication or initialize guest sessions improperly.
- Ensure OAuth (Google/Apple) hand-off works seamlessly with the modal (using popup or redirect with callback URL preservation).

## Impact
- Affected specs: Authentication, Routing, Guest Mode.
- Affected code: `src/middleware.ts`, `src/components/auth/RouteGuard.tsx`, `src/components/auth/RegistrationModal.tsx`, `src/lib/fetch-interceptor.ts` (new).

## ADDED Requirements
### Requirement: Zero-Friction Auth Modal
The system SHALL display an authentication modal over the requested protected route instead of redirecting the user.
#### Scenario: Success case
- **WHEN** an unauthenticated user navigates to `/dashboard`
- **THEN** the dashboard layout renders in the background (locked/blurred), and the Auth Modal appears.
- **WHEN** the user logs in successfully via the modal
- **THEN** the modal closes, and the dashboard fetches private data dynamically without a page reload.

### Requirement: Global 401 Interceptor
The system SHALL catch any 401 responses from API calls and trigger the Auth Modal to prevent data loss.

## MODIFIED Requirements
### Requirement: Route Protection & CV ID Security
**Reason**: To prevent unauthorized access or accidental session creation via `cvId` deep links.
**Migration**: All API routes accessing CVs must strictly verify the NextAuth session. The `RouteGuard` will no longer redirect but will enforce the modal overlay.