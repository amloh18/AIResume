# Security and Performance Optimization Plan

## Summary
This plan outlines the steps to remediate critical security vulnerabilities and performance bottlenecks discovered throughout the Next.js application. The primary focus is on securing expensive AI/OCR endpoints against Denial of Wallet (DoW) attacks, strictly validating arbitrary file uploads, and optimizing heavy Mongoose database queries to significantly reduce memory and CPU overhead.

## Current State Analysis

### 🚨 Security Flaws
1. **Unprotected Expensive Endpoints (DoS/DoW)**: 
   - `src/app/api/cv/parse/route.ts` and `src/app/api/ai/career-analysis/route.ts` are explicitly whitelisted as public routes in `src/middleware.ts`. They perform heavy OCR (Tesseract/mammoth) and AI operations but lack mandatory authentication and rate-limiting. This leaves the app vulnerable to API quota exhaustion and CPU spikes.
2. **Arbitrary File Upload Vulnerability**:
   - `src/app/api/upload/route.ts` generates S3 presigned URLs using `PutObjectCommand` without enforcing file size limits or strictly validating the `contentType`. Malicious actors could upload massive files or executable malware (e.g., `.exe`, `.sh`), exhausting storage or hosting malicious content.
3. **Hardcoded Fallback Secrets**:
   - `next.config.ts` falls back to `'fallback-secret-key-for-development'` for `NEXTAUTH_SECRET`, which is risky if accidentally deployed to production without the environment variable set.

### 🐌 Performance Flaws
1. **Missing `.lean()` in Mongoose Queries**:
   - Across the `src/app/api/` directory (especially in `/admin/` routes), there are over 60 `find()` and `findOne()` read-only operations that do not utilize `.lean()`. Returning heavy Mongoose document instances instead of plain JavaScript objects consumes significantly more memory and processing time.
2. **Unbounded Queries**:
   - Routes like `src/app/api/admin/notifications/create-offer/route.ts` execute unbounded queries (`User.find(userQuery).select('_id')`), loading potentially thousands of user records into memory at once, risking out-of-memory (OOM) crashes on the server.

---

## Proposed Changes

### Step 1: Secure Public AI & Parsing Routes
* **File:** `src/middleware.ts`
  * Remove `/api/cv/parse` and `/api/ai/career-analysis` from the `publicApiRoutes` array to enforce the default authentication check at the edge.
* **File:** `src/app/api/cv/parse/route.ts` & `src/app/api/ai/career-analysis/route.ts`
  * Add strict rate-limiting using the existing `rateLimiter` utility (`src/lib/rate-limiter.ts`) to prevent abuse by authenticated users.

### Step 2: Secure S3 File Uploads
* **File:** `src/app/api/upload/route.ts`
  * Validate `contentType` against a strict whitelist (e.g., `application/pdf`, `image/jpeg`, `image/png`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`).
  * Replace `PutObjectCommand` with `createPresignedPost` from `@aws-sdk/s3-presigned-post` to enforce strict server-side limits on file size (`content-length-range`: 10MB max) and exact content types directly at the S3 level.

### Step 3: Optimize Database Queries (Mongoose `.lean()`)
* **Files:** Multiple files in `src/app/api/admin/**/*.ts` and `src/app/api/user/**/*.ts` (e.g., `admin/metrics/route.ts`, `calendar/sync/route.ts`, `admin/manage-users/route.ts`).
  * Append `.lean()` to all `find()` and `findOne()` queries where the returned documents are only read and serialized to JSON (i.e., where `.save()` is not subsequently called).

### Step 4: Mitigate Unbounded Queries (Pagination/Limits)
* **File:** `src/app/api/admin/notifications/create-offer/route.ts` (and similar admin notification routes).
  * Refactor heavy `User.find()` queries to use pagination, limits, or Mongoose cursors/aggregation pipelines when fetching large datasets for batch processing.

---

## Assumptions & Decisions
* **Decision:** Securing `/api/cv/parse` behind authentication assumes that guest users are not meant to parse 10MB documents for free without logging in. If guest parsing is a strict business requirement, we will implement aggressive IP-based rate limiting instead of requiring auth.
* **Decision:** Switching to `createPresignedPost` is the AWS-recommended approach for enforcing upload constraints securely from the browser.
* **Assumption:** The application relies on `next-auth` for session management, and `getServerSession` is the standard way to verify identity in API routes.

---

## Verification Steps
1. **Security:** Attempt to hit `/api/cv/parse` without a valid session token; verify it returns a `401 Unauthorized`.
2. **Security:** Attempt to generate an upload URL for a `.exe` file or a file larger than 10MB via `/api/upload`; verify the request is rejected by the server or S3.
3. **Performance:** Verify the application builds successfully (`npm run build`) and no Mongoose hydration errors occur on the admin dashboards due to the `.lean()` additions.
4. **Performance:** Monitor memory usage during local testing of the admin user list/notification routes to ensure unbounded queries are resolved.