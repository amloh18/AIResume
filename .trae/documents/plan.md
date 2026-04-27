# Plan: Enhance ATS Score, Auto-Save, and CV Sidebar Tools

## Summary
The goal is to make the AI analysis sidebar robust, real-time, and free for basic checks, while providing a clear conversion path for ATS scoring by asking for a Job Description (JD). The CV should auto-save seamlessly. The Raw JSON tool needs to be editable and reflect live changes. Finally, the download button in the sidebar must open the download modal.

## Current State Analysis
- **ATS Score**: `ATSMeterPanel` relies on the `ATSContext` which calls an API for scoring. If no JD is linked, it still labels the score "ATS Score" and doesn't dynamically calculate it offline.
- **Grammar & Format**: Currently uses a basic `checkSyntaxAndGrammar` utility. Needs to be more robust but remain offline and free.
- **Auto-Save**: The CV editor (`CVCanvasEngine`) updates the local React state (`cvData`) instantly, but there is no consistent debounced auto-save to the database for authenticated users during the editing flow.
- **Raw JSON Tool**: `JSONSidebarViewer` is completely read-only, rendering a custom JSON tree.
- **Download Button**: Dispatches a `open-download-modal` CustomEvent from `CVCanvasEngine`, but no component listens for this event to actually show the modal.

## Proposed Changes

### 1. Robust & Dynamic Score System (`src/components/resume-enhancer/panels/ATSMeterPanel.tsx`)
- Use the offline `CentralScoreManager.getInstance().getScoreSync(state.cvData, state.jobData)` to compute scores instantly.
- If a Job Description is linked, display the `atsScore.total` and label it **"ATS Match Score"**.
- If no Job Description is linked, display the `cvScore.total` and label it **"CV Score"**. Keep the existing "Paste Job Description" prompt to encourage conversion.

### 2. Enhanced Offline Grammar & Format Checks (`src/lib/utils/offline-grammar-check.ts`)
- Add more robust checks to `checkSyntaxAndGrammar` (e.g., capitalization at the start of sentences, consistent bullet point punctuation, checking for "weasel words").
- Keep this running completely offline so it's always free and requires no AI credits.

### 3. Real-time Auto-Save (`src/components/resume-enhancer/steps/Step3BuilderSurgeon.tsx`)
- Implement a `useEffect` that listens to `state.cvData`.
- Use a 2-second debounce interval. When the user stops typing, automatically trigger a `fetch('/api/cvs/[id]', { method: 'PUT', body: JSON.stringify({ cvData }) })` to save the CV to the database.
- This ensures the CV is saved locally on every stroke (via context) and to the database without disrupting the user.

### 4. Editable Raw JSON Tool (`src/components/cv-builder-pro/components/JSONSidebarViewer.tsx`)
- Replace the read-only JSON tree with a controlled `<textarea>`.
- Parse the input on change; if valid, call `onDataChange` to update the live CV immediately.
- Add error state handling so invalid JSON doesn't crash the app or overwrite data incorrectly.

### 5. Fix Download Modal (`src/components/resume-enhancer/steps/Step3BuilderSurgeon.tsx`)
- Add a `useEffect` event listener for `open-download-modal`.
- When triggered, toggle the state to show the `DownloadModal` component (which may need to be imported or handled similarly to how it is in `Step4Review.tsx`).

## Assumptions & Decisions
- **Auto-Save**: A 2-second debounce is optimal for balancing database load and saving user progress.
- **JSON Editor**: A simple textarea is sufficient for raw JSON editing. Syntax highlighting can be skipped to keep it lightweight and robust.
- **Scoring**: Bypassing the API for basic CV scoring saves AI credits and provides instant feedback, fulfilling the requirement for a robust, real-time, free tier.

## Verification Steps
1. Open the CV builder and type in any field. Wait 2 seconds and verify a network request is made to save the CV.
2. Open the Raw JSON sidebar, edit a value, and verify the visual CV updates immediately.
3. Click the "Download PDF" button in the sidebar and verify the download modal appears.
4. Check the AI Analysis sidebar. Verify it shows "CV Score" when no JD is linked, and "ATS Match Score" when a JD is linked.
