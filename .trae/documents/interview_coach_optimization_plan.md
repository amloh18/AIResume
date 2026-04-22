# Interview Coach Optimization & Polish Plan

## 1. Summary
This plan outlines the architecture and implementation steps to upgrade the Interview Coach into a production-ready, highly optimized feature. It introduces cost-efficient AI gating (Free vs. Pro), dynamically injects the user's Master CV into the Gemini 2.0 Flash Lite prompt for personalized feedback, polishes the UI/UX with "live" states and command-palette navigation (`Cmd+K`), and fixes known z-index issues in contextual toolbars.

## 2. Current State Analysis
- **Gating:** The Interview Coach currently blocks free users entirely at the dashboard level (`InterviewCoachContainer.tsx`).
- **AI Prompts:** The `analyzeAnswer` function in `interviewCoachService.ts` relies solely on the job description and question, lacking the user's personal CV context.
- **UI/UX:** We have already implemented the right-hand contextual sidebar and audio transcription via server-side APIs in the previous iteration. However, the global `Cmd+K` command bar is missing, and there are reported z-index/focus issues with the CV Editor's inline toolbars.

## 3. Proposed Changes

### Step 1: Implement the Quota Guard (Database & Middleware Layer)
- **File:** `src/lib/utils/subscription-helpers.ts`
  - *Action:* Change `PLAN_LIMITS.free.interviewCoach` from `false` to `true` to allow free users to access the dashboard.
- **File:** `src/components/interview-coach/InterviewCoachContainer.tsx`
  - *Action:* Remove the hard block that prevents free users from entering the practice dashboard.
- **File:** `src/app/api/interview/initiate/route.ts`
  - *Action:* Implement logic to ensure Free users can only generate a plan for **1 job**. If they attempt to generate a plan for a second job, block it and return a paywall error.
- **File:** `src/components/interview-coach/PracticeInterface.tsx`
  - *Action:* Add client-side gating. If the user is on the `free` tier and they attempt to navigate past the 1st question of the 1st module (`currentIndex > 0`), show a "Locked" overlay prompting them to upgrade to Pro.

### Step 2: Dynamic Prompt Injection (Intelligence Layer)
- **File:** `src/lib/services/interviewCoachService.ts`
  - *Action:* Update the `analyzeAnswer` method signature to accept `cvContext: string`.
  - *Action:* Replace the existing system prompt with the new structured JSON prompt provided in the spec (incorporating `score`, `feedback_summary`, `what_you_did_well`, `areas_to_improve`, `your_edge`, and `ai_enhanced_version`).
- **File:** `src/app/api/interview/analyze/route.ts`
  - *Action:* Before calling `analyzeAnswer`, fetch the user's Master CV (`CV.findOne({ userId, 'metadata.isMaster': true })`) and format it into a string payload.
  - *Action:* Update the response mapping to correctly store the new JSON structure into the `JobApplication` database document.

### Step 3: UI/UX & Interaction Polish
- **File:** `src/components/interview-coach/PracticeInterface.tsx`
  - *Action:* Rename the analysis button to **"Practice with AI"** (or keep as Analyze My Answer but make it the primary hub button).
  - *Action:* Update the Feedback panel to parse and display the new AI response format (incorporating the `feedback_summary` and `your_edge`).
- **File:** `src/components/ui/GlobalCommandBar.tsx` (New File)
  - *Action:* Create a global `Cmd + K` search/command palette component using Framer Motion or standard React state. It will allow quick navigation to "Tracker", "Analyze CV", "Interview Coach", etc.
- **File:** `src/app/dashboard/layout.tsx` (or main wrapper)
  - *Action:* Mount the `GlobalCommandBar` and attach the global keyboard event listeners (`Cmd+K` / `Ctrl+K`).

### Step 4: Disappearing Toolbar Fix (CV Editor)
- **File:** `src/components/preview/BuilderPreview.tsx` (or related CV Editor component)
  - *Action:* Address the z-index and focus-management issue for the "add, replace, suggest, ATS Analysis" inline toolbar. Ensure `activeRecordId` correctly keeps the toolbar visible and above the sidebar's glassmorphism blur (`z-[100]`).

## 4. Assumptions & Decisions
- **Audio Transcription:** The current implementation uses Gemini 2.0 Flash Lite for audio-to-text. The plan assumes this is acceptable as a "Whisper" alternative, but we can swap to OpenAI Whisper if explicitly required for cost. (Gemini 2.0 Flash Lite is currently very cost-effective).
- **Database Schema:** We assume the `feedback` subdocument in the `JobApplication` model (`interviewCoach.questions.feedback`) can safely accept the new keys (`feedback_summary`, `your_edge`, `ai_enhanced_version`) without strict Mongoose validation errors (or we will update the schema if it is strictly typed).

## 5. Verification Steps
1. Log in as a Free user. Generate an interview plan for Job A (should succeed). Attempt to generate for Job B (should fail/paywall).
2. As a Free user, practice Q1 (should succeed). Attempt to go to Q2 (should show Locked UI).
3. Log in as a Pro user. Ensure unlimited access.
4. Submit a spoken answer. Verify the backend fetches the Master CV and the AI response contains the hyper-specific `your_edge` context.
5. Press `Cmd + K` on any dashboard screen and verify the command palette opens and navigates correctly.
6. Check the CV Editor inline toolbar to ensure it no longer disappears behind sidebars.