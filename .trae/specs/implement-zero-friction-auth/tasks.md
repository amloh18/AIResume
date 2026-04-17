# Tasks

- [x] Task 1: Setup Global Auth Modal State
  - [x] SubTask 1.1: Create a Zustand store (`src/lib/stores/authModalStore.ts`) to manage `isOpen`, `callbackUrl`, and `view` (signin/signup) state.
  - [x] SubTask 1.2: Refactor `RegistrationModal.tsx` (or a wrapper `AuthModalProvider.tsx`) to connect to this global state so it can be triggered from anywhere.

- [x] Task 2: Refactor RouteGuard for Zero-Friction Entry
  - [x] SubTask 2.1: Update `src/components/auth/RouteGuard.tsx`. Instead of `router.push('/sign-in')`, it should call `openAuthModal()` and render a blurred/locked overlay over the `children`.
  - [x] SubTask 2.2: Ensure that once `status === 'authenticated'`, the overlay is removed and data fetching is triggered without reloading.

- [x] Task 3: Update Middleware
  - [x] SubTask 3.1: Modify `src/middleware.ts`. Remove the 302 redirect for protected page routes (like `/dashboard`, `/studio`, etc.). Let the request pass through so `RouteGuard` can handle the UI interception.
  - [x] SubTask 3.2: Keep strict 401/403 JSON responses for `/api/*` routes in the middleware.

- [x] Task 4: Implement Global API Interceptor
  - [x] SubTask 4.1: Create a custom fetch wrapper (`src/lib/api-client.ts`) that catches `401 Unauthorized` responses.
  - [x] SubTask 4.2: On 401, automatically trigger the global Auth Modal.

- [x] Task 5: Fix CV ID Auth Bypass Issue
  - [x] SubTask 5.1: Audit `src/app/editor/page.tsx` and `src/app/api/cvs/[id]/route.ts`. Ensure that passing a `cvId` parameter never sets `isGuestMode` to true inappropriately or bypasses the `RouteGuard`.
  - [x] SubTask 5.2: Enforce strict session checks on all CV retrieval endpoints.

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 1
- Task 5 can be done in parallel