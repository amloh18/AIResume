# Implementation Plan: Interview Coach Integration & Efficiency

## 1. Summary
This plan addresses the user's request to optimize the Interview Coach (preventing auto-generation on load), add a dynamic "Resume Prep" widget to the dashboard, integrate Interview Coach CTAs into the CV Builder (AI Analysis Sidebar and Review Screen), and ensure jobs in the "Created" stage are visible in the Interview Coach hub.

## 2. Current State Analysis
- **Interview Coach Generation**: `PracticeInterface.tsx` currently calls `POST /api/interview/initiate` on mount. The backend endpoint auto-generates the interview plan (calling OpenAI) if the cache is stale or missing, which consumes AI tokens unnecessarily and slows down the initial load.
- **Dashboard**: `page.tsx` displays Job Tracker and Doc Center, but lacks a dedicated widget for active Interview Prep sessions. The `useDashboardData` context fetches jobs from `/api/jobs`, but `interviewCoach` data is not currently serialized in the API response.
- **CV Builder (AI Sidebar & Review)**: `ATSMeterPanel.tsx` (the AI analysis sidebar) and `Step4Review.tsx` (the review screen) do not currently prompt the user to start interview prep for the linked job.
- **Interview Coach Hub**: `/api/interview/dashboard/route.ts` only fetches jobs in `applied`, `screening`, or `interview` statuses.

## 3. Proposed Changes

### Phase 1: Prevent Auto-Generation on Load (Efficiency)
**File**: `src/app/api/interview/initiate/route.ts`
- **Change**: Modify the POST endpoint to accept an `action` parameter (e.g., `action: 'fetch' | 'generate'`).
- **Logic**: If `action === 'fetch'`, simply return the existing `job.interviewCoach` data from the DB. If it's empty or `status === 'not_started'`, return that status without calling the AI service. Only call the AI service if `action === 'generate'` or `regenerate === true`.

**File**: `src/components/interview-coach/PracticeInterface.tsx`
- **Change**: Update the initial fetch to send `{ jobId, action: 'fetch' }`. 
- **Logic**: If the response indicates `status === 'not_started'` or questions are empty, display a "Generate Interview Plan" button. When clicked, call the endpoint again with `{ action: 'generate' }`.

### Phase 2: Expose `interviewCoach` Data to Dashboard
**File**: `src/app/api/jobs/route.ts` & `src/app/api/jobs/[id]/route.ts`
- **Change**: Update the `serializeJob` and `transformedJob` mapping functions to include `interviewCoach: job?.interviewCoach`.

### Phase 3: Dashboard Dynamic Widget
**File**: `src/app/dashboard/page.tsx` (or a new component imported here)
- **Change**: Extract jobs that have active interview prep (`jobs.filter(j => j.interviewCoach?.status === 'ready')`).
- **UI**: If `activePrepJobs.length > 0`, render a new "Interview Coach" widget (matching the style of the Job Tracker widget). Display the job title, company, a progress/readiness score, and a "Resume Prep" CTA linking to `/dashboard/interview/${job._id}`.

### Phase 4: CV Builder CTAs (AI Sidebar & Review Screen)
**File**: `src/components/resume-enhancer/panels/ATSMeterPanel.tsx`
- **Change**: Add a new card/banner at the bottom of the panel if a job is linked (`state.jobData` or `state.journeyId` exists).
- **UI**: "Prep for Interview? Practice answering questions tailored to this job." with a "Start Coaching" button.

**File**: `src/components/resume-enhancer/steps/Step4Review.tsx`
- **Change**: Add a similar "Start Interview Prep" banner/widget in the review screen layout (perhaps below the ATS Score or Actions section).

**File**: `src/components/resume-enhancer/ResumeEnhancerContainer.tsx` (or directly in the CTA handlers)
- **Logic**: When the "Start Coaching" CTA is clicked, if the linked job's status is `draft`, call the API to update its status to `created` (so it appears in the tracker/coach). Then navigate the user to `/dashboard/interview/${jobId}`.

### Phase 5: Show "Created" Jobs in Interview Coach
**File**: `src/app/api/interview/dashboard/route.ts`
- **Change**: Add `'created'` and `'Created'` to the `eligibleStatuses` array. This ensures that when a user generates a CV and the job moves to "Created", they can immediately select it in the Interview Coach hub.

## 4. Assumptions & Decisions
- **Assumption**: The user wants to manually trigger the *initial* generation of interview questions when they first open a new job in the coach, rather than having it happen automatically on page load.
- **Decision**: The CV Builder CTAs will update a `draft` job to `created` before redirecting. If the job is already `applied`, `screening`, or `interview`, it will leave the status as is, preserving the user's pipeline progress.

## 5. Verification Steps
1. Open the Practice Interface for a new job; verify it shows a "Generate" button instead of loading for 30 seconds.
2. Click "Generate" and verify questions are created and saved to the database.
3. Navigate to the Dashboard; verify the new Interview Prep widget appears for the job just generated, displaying the correct title and score.
4. Open the CV Builder with a linked job; verify the "Start Coaching" CTA appears in the ATS Meter Panel and Review screen.
5. Click the CTA for a draft job; verify the job status updates to `created` and redirects to the coach.
6. Verify the "Created" job appears in the `/dashboard/interview-coach` job selection list.