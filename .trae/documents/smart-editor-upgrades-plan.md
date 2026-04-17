# Plan: Smart Editor Upgrades

## Summary
The goal is to evolve the Editor into a "Smart Editor" by unifying and gamifying the Job Description (JD) input flow, adding a new ATS Unlock popup in the Builder, overhauling the URL routing to use standard parameters (`/editor?cvId=...`), and ensuring full Light Theme support across all Editor steps. Finally, we will refine the "Back/Close" navigation to ensure users traverse gracefully through the Editor's internal steps before returning to the main dashboard.

## Current State Analysis
1. **JD Input Modals**: Currently fragmented into `JobParserDialog.tsx` (Magic Paste), `JDInputPanel.tsx` (textarea), and `RoleSelectorModal.tsx` (Role/Experience selection). The JD text box is plain and lacks gamification.
2. **Missing JD State**: Users editing a standalone CV in Step 3 aren't aggressively prompted to add a JD to unlock ATS scoring.
3. **Routing & URLs**: The editor is still hosted at `/resume-enhancer`. URL parameters are somewhat inconsistent.
4. **Theme**: Hardcoded dark mode colors (`bg-[#0A0D08]`, `text-white`, `bg-[#141810]`) exist in `ResumeEnhancerContainer.tsx` and step components, breaking light mode.
5. **Navigation**: `handleExit` exists but browser "Back" button might abruptly drop users to the main dashboard from deep within the editor.

## Proposed Changes

### 1. Route Renaming & URL Structure
- **What**: Move `src/app/resume-enhancer` to `src/app/editor`.
- **How**:
  - Rename the folder.
  - Update all `router.push('/resume-enhancer...')` references across the app to `/editor...`.
  - The URL structure will use standard query parameters to match the user's intent cleanly:
    - `cvcircle.com/editor?type=cv&cvId=[id]`
    - `cvcircle.com/editor?type=cl&clId=[id]`
    - `cvcircle.com/editor?journeyId=[id]`
  - *Note: Using `editor=cv` as the path itself is invalid web architecture, so standard query params (`?type=cv`) are used to achieve the exact same routing logic seamlessly.*

### 2. Unified Smart JD Modal (`SmartJDModal.tsx`)
- **What**: Create a single, gamified modal to handle all Job/Role inputs.
- **How**:
  - Replace `JobParserDialog`, `JDInputPanel`, and `RoleSelectorModal` inside the Editor flow with a new `SmartJDModal.tsx`.
  - Include:
    - **Gamified Teaser**: An animated UI element showing "Expected ATS Match: [blurred 92%] - Add JD to Unlock".
    - **Chrome Extension CTA**: A banner/button saying "Download our Extension for seamless 1-click job adding" (links to Chrome Web Store or a placeholder).
    - **Input Fields**: Textarea to paste JD, and dropdowns for Job Role and Experience Level.

### 3. ATS Unlock Popup Card (`ATSUnlockCard.tsx`)
- **What**: A 3D animated popup in Step 3 (Builder) that detects if a JD is missing.
- **How**:
  - Rendered in `Step3BuilderSurgeon.tsx` when `!state.jobData`.
  - Uses `framer-motion` for a 3D tilt/hover effect.
  - Content: Explains what is missing for the ATS calculation and features a "Next Level" CTA button that triggers the new `SmartJDModal`.

### 4. Light Theme Support in Editor
- **What**: Ensure the Editor respects the user's system/app light/dark theme preference.
- **How**:
  - Audit `ResumeEnhancerContainer.tsx`, `Step1Parser.tsx`, `Step3BuilderSurgeon.tsx`, `Step4CoverLetter.tsx`, and `Step4Review.tsx`.
  - Replace hardcoded hex colors (e.g., `bg-[#0A0D08]`, `text-white`) with Tailwind semantic/dark classes:
    - `bg-white dark:bg-[#0A0D08]` or `bg-[var(--bg-primary)]`
    - `text-gray-900 dark:text-white`
    - `border-gray-200 dark:border-white/10`

### 5. Graceful Back/Forth Navigation
- **What**: Ensure closing/backing out traverses Editor steps gracefully before exiting to the main dashboard.
- **How**:
  - Update `ResumeEnhancerContainer.tsx`.
  - Intercept the browser's `popstate` event: If the user hits the browser "Back" button while in Step 3, 4, or 5, intercept it and call `goToStep(1)` instead of letting the browser navigate to `/dashboard`.
  - Ensure the top-bar "Close" (X) button relies on the same logic (if `step > 1`, go to `step 1`; if `step === 1`, go to `/dashboard`).

## Assumptions & Decisions
- We will replace `resume-enhancer` with `editor` entirely for the route.
- We assume standard query parameters (`?cvId=...`) are preferred over malformed paths like `/editor=cv?cvid=...` as they provide a robust foundation for Next.js routing.
- The "Download Extension" button will link to `#` until a real Chrome Web Store URL is provided.
- The unified `SmartJDModal` will be accessible from both Step 1 and Step 3.

## Verification Steps
1. Verify the route `/editor` loads correctly and parses `cvId` or `clId`.
2. Verify the new `SmartJDModal` appears when adding a job, displaying the blurred score, extension CTA, and role/experience inputs.
3. Verify the `ATSUnlockCard` pops up in Step 3 when editing a CV without a linked Job Description.
4. Toggle the system theme to Light Mode and verify the Editor background, text, and modals are fully readable.
5. Click the UI "Close" button in Step 3 and verify it goes to Step 1. Hit the browser "Back" button in Step 3 and verify it goes to Step 1 instead of `/dashboard`.