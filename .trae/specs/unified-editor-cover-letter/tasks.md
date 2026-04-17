# Tasks
- [x] Task 1: Delete Legacy Cover Letter Editor
  - [x] SubTask 1.1: Remove `src/app/cover-letter-editor` and `src/components/cover-letter-editor` directories.
  - [x] SubTask 1.2: Remove `src/contexts/CoverLetterEditorContext.tsx` context provider.
  - [x] SubTask 1.3: Update routing in `Step1Parser.tsx` and `CoverLetterCardOverlay.tsx` (or `Canvas.tsx`) to route to `/resume-enhancer?mode=edit-cover-letter&coverLetterId=...`.

- [x] Task 2: Redesign Step 4 Cover Letter Layout
  - [x] SubTask 2.1: Update `Step4CoverLetter.tsx` to use a split-panel design (similar to Step 3's `CVCanvasEngine` on the left and ATS/options on the right).
  - [x] SubTask 2.2: Ensure the Cover Letter Layout Engine sits inside the main canvas view.
  - [x] SubTask 2.3: Move the AI Generator options and Manual Edit options into a floating panel or right-side sidebar.

- [x] Task 3: Dual Previews in Step 5 Review
  - [x] SubTask 3.1: Update `Step4Review.tsx` (Step 5) to conditionally render the Cover Letter Layout Engine next to or toggleable with the CV Preview.
  - [x] SubTask 3.2: Update the `handleEditCoverLetter` function in Step 5 to switch the view to Step 4 instead of navigating to the deleted legacy page.

- [x] Task 4: Add Step Transitions & Enhancer Container Setup
  - [x] SubTask 4.1: Wrap the 5 steps in `ResumeEnhancerContainer.tsx` using `framer-motion` `<AnimatePresence mode="wait">` and slide/fade animations.
  - [x] SubTask 4.2: Update the initializer in `ResumeEnhancerContainer.tsx` to handle `mode === 'edit-cover-letter'`, fetching the cover letter and jumping straight to `goToStep(4)`.

# Task Dependencies
- Task 1 has no dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 2
