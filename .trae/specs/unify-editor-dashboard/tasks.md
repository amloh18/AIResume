# Tasks
- [x] Task 1: Rename "Resume Enhancer" to "Editor" in UI
  - [x] SubTask 1.1: Replace "Resume Enhancer" string occurrences in `ResumeEnhancerContainer.tsx` and `Step1Parser.tsx`.
  - [x] SubTask 1.2: Replace "Resume Enhancer" string occurrences in other navigation/layout components like `TopBar.tsx`, `OptimizedNavigation.tsx`, and dashboard elements.
  - [x] SubTask 1.3: Do NOT change file names, variable names, or component names to avoid breaking imports.

- [x] Task 2: Update Step 1 Dashboard to show Cover Letters
  - [x] SubTask 2.1: Add a new state in `Step1Parser.tsx` for `existingCoverLetters` and fetch from `/api/cover-letters`.
  - [x] SubTask 2.2: Create a toggle or tab UI in `Step1Parser.tsx`'s "Continue Editing" section to switch between "CVs" and "Cover Letters".
  - [x] SubTask 2.3: Render Cover Letter cards alongside CV cards and add click handlers to navigate to the Cover Letter editor/flow.

- [x] Task 3: Fix Template Selector Logic for Editing
  - [x] SubTask 3.1: In `ResumeEnhancerContainer.tsx`'s `handleRoleModalSubmit`, ensure `goToStep(3)` is called when `isEditingExistingCV` is true.
  - [x] SubTask 3.2: Verify that editing an existing CV completely bypasses the template overlay logic and avoids the role modal loop.

- [x] Task 4: Fix Duplicate Template Selector in Step 3
  - [x] SubTask 4.1: Remove `showTemplateModal`, `templateModalRef`, and related GSAP animation/markup from `Step3BuilderSurgeon.tsx`.
  - [x] SubTask 4.2: Update `openTemplateSelector` in `useImperativeHandle` to safely call `canvasBuilderRef.current?.openTemplateSelector()`.

# Task Dependencies
- Task 1 has no dependencies
- Task 2 has no dependencies
- Task 3 has no dependencies
- Task 4 has no dependencies
