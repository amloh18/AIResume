# Plan for Fixing Editor Dashboard, Cover Letter Layout, and Step Navigation

## Summary
This plan addresses the issues with the Resume Enhancer workflow, including the Draft CV loading logic in the Step 1 dashboard, Cover Letter (Step 4) layout and sidebar parity with Step 3, and removing the intrusive save dialog during internal step navigation. 

## Current State Analysis
- **Step 1 Dashboard**: Clicking a draft CV sometimes reads `draftCV.currentStep === 1`, which causes `goToStep(1)` and keeps the user on the dashboard instead of taking them to the editor.
- **Cover Letter (Step 4)**: The layout lacks the `.cv-document` A4 white page styling. The right sidebar lacks `h-screen overflow-y-auto` and static job cards instead of functional cards. The "Target Role Context" card's button is not wired to dispatch the `open-job-sidebar` event.
- **Step Navigation**: `RibbonStepIndicator` triggers `showSaveWarningModal(true)` if there are unsaved changes, even for internal step switching, instead of seamlessly auto-saving.

## Proposed Changes

### 1. Fix Step 1 Dashboard & Draft Loading
- **File**: `src/components/resume-enhancer/steps/Step1Parser.tsx`
- **What/How**:
  - Update the `onClick` handler for the Draft CV card to dispatch `SET_CV_DATA`, `SET_TEMPLATE`, and other context.
  - Fix the routing logic: If the draft lacks a template, dispatch a `show-template-overlay` event to open Step 2. Otherwise, navigate to `Math.max(3, draftCV.currentStep || 3)` so the user always lands in the builder (Step 3) or higher, never getting stuck on Step 1.
  - Verify the existing "Delete Draft" button is visible and properly wired to `DELETE /api/cv-draft/delete`.

### 2. Fix Step Navigation & Auto-Save
- **File**: `src/components/resume-enhancer/ResumeEnhancerContainer.tsx`
- **What/How**:
  - Add an event listener for `show-template-overlay` to set `setShowTemplateOverlay(true)`.
  - Update `onStepClick` in `<RibbonStepIndicator>`: If there are unsaved changes, call `handleSmartSave()` and proceed immediately to `goToStep(step)` without showing `showSaveWarningModal`. The modal should only trigger on `handleExit`.

### 3. Enhance Cover Letter Layout & Sidebar (Step 4)
- **File**: `src/components/resume-enhancer/steps/Step4CoverLetter.tsx`
- **What/How**:
  - Update the right sidebar wrapper to `h-[calc(100vh-64px)] overflow-y-auto` to enable internal scrolling while remaining fixed to viewport height.
  - Replace the static "Target Role" and "Interview Prep" cards with the functional components used in `ATSMeterPanel.tsx`. 
  - Wire the "Paste Job Description" button to trigger `window.dispatchEvent(new CustomEvent('open-job-sidebar'))` so it properly opens the job details overlay.
- **File**: `src/components/cover-letter-engine/CoverLetterLayoutEngine.tsx`
- **What/How**:
  - Ensure the Cover Letter wrapper uses the `.cv-document` class, `bg-white`, and `shadow-2xl`, mirroring the A4 canvas scaling from the CV Builder.

## Assumptions & Decisions
- Auto-save (`handleSmartSave`) is reliable enough to run in the background during step transitions without blocking the user.
- The `open-job-sidebar` event is already handled correctly in `ResumeEnhancerContainer.tsx`.
- Drafts with `currentStep < 3` should resume at Step 3 (or Step 2 if no template) to guarantee the user enters the editing flow.

## Verification Steps
1. Navigate to `/editor` (Step 1). Click a Draft CV and ensure it loads into Step 3 (or the Template Overlay if no template is selected).
2. Delete a draft from the Step 1 dashboard and verify it disappears.
3. Edit the CV in Step 3, then click Step 4 in the top ribbon. Verify it transitions smoothly without a save dialog.
4. In Step 4, verify the Cover Letter renders as a white A4 page. Check that the right sidebar scrolls internally.
5. Click "Paste Job Description" in the Step 4 Target Role card and verify the job details overlay opens.