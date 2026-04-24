# Plan: Fix Floating UI Positioning & Enhance Smart Job Tracker Modal

## 1. Summary
This plan addresses two main areas of the application:
1. **Floating UI Positioning**: Fix the `FloatingToolbar` and AI Contextual Suggestion card in the CV Editor so they scroll naturally with the document and don't stay fixed to the viewport. Position the AI card to the right of the CV document.
2. **Smart Job Tracker Enhancements**: Upgrade the `JobParserDialog` by adding `Target Job Title` (with autocomplete from the `COMMON_JOB_TITLES` database) and `Experience Level` inputs. Improve the null state of the AI Insights panel with blurred placeholders (score, skills, perks) and a Sponsorship indicator for UK/US jobs. Ensure clicking the Target Role context in the editor opens this redesigned modal.

## 2. Proposed Changes

### A. Fix `FloatingToolbar` & AI Suggestion Card Positioning
**Files**: `src/components/cv-builder-pro/components/CoreUI.tsx`, `src/components/cv-builder-pro/CVCanvasEngine.tsx`
- **`FloatingToolbar`**: Extract the position calculation logic into an `updatePos` function. Attach an event listener for `scroll` on the `.overflow-auto` container and `resize` on the window to dynamically update `pos.top` and `pos.left`.
- **`CVCanvasEngine`**: 
  - Change `pointSuggestion` to store the actual HTML `node` instead of a static `rect`.
  - Extract the inline AI Contextual Suggestion Card JSX into a new `<FloatingAICard>` component.
  - Inside `<FloatingAICard>`, use a `useEffect` with the same scroll/resize listeners to update its position dynamically.
  - **Position Logic**: Align `top` with the `nodeRect.top`. Align `left` to `wrapperRect.right + 20` (placing it outside the CV preview on the right). Constrain `left` and `top` to `window.innerWidth/Height` to prevent it from going off-screen.

### B. Enhance `JobParserDialog` (Smart Job Tracker Modal)
**File**: `src/components/dashboard/jobs/JobParserDialog.tsx`
- **New Inputs**: Below the "Paste JD" textarea, add two new fields:
  - **Target Job Title**: An autocomplete/dropdown input that filters against `COMMON_JOB_TITLES` (imported from `src/lib/data/role-profiler-data.ts`).
  - **Experience Level**: A dropdown or text input for the user's experience level.
- **Null State (Insights Panel)**: 
  - When `!parsedData`, render a visually appealing blurred mockup of the insights.
  - Include a blurred Match Score ring (e.g., 0%), blurred Key Skills pills, blurred Requirements list, and a blurred Job Details card.
  - Add a visible "Sponsorship: Yes/No" indicator (logic: if country/location implies UK or USA, show it clearly so users know this feature is available).
- **Data Flow**: Ensure the selected Job Title and Experience Level are included in the `onParseComplete` callback payload.

### C. Link Modal in `ATSMeterPanel`
**File**: `src/components/resume-enhancer/panels/ATSMeterPanel.tsx`
- **Click Handler**: Update the `onClick` handler of the "Target Role context" container. Instead of dispatching the custom `open-job-sidebar` event, change it to call the `onOpenJobParser()` prop. This ensures clicking the context block opens the redesigned Smart Job Tracker modal.

## 3. Verification Steps
- **Floating UI**: Open the editor, highlight text. Verify the toolbar scrolls with the text. Click "Suggest" and verify the AI card appears to the right of the CV and scrolls with the text.
- **JobParserDialog**: Open the Smart Job Tracker. Verify the new inputs exist and autocomplete works. Verify the null state shows blurred insights and the sponsorship indicator.
- **Linking**: In Step 3 (Editor), click the Target Role context box in the left sidebar and verify it opens the Smart Job Tracker modal.