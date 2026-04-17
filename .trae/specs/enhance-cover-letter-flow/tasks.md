# Tasks
- [x] Task 1: Update Resume Enhancer Flow
  - [x] SubTask 1.1: Update `ResumeEnhancerContext` to support a 5-step flow (1: Parse, 2: Template, 3: Builder, 4: Cover Letter, 5: Review).
  - [x] SubTask 1.2: Update `ResumeEnhancerContainer` to render the new `Step4CoverLetter` component and shift Review to Step 5.
  - [x] SubTask 1.3: Add a "Skip" button to the Cover Letter step to proceed directly to Review.

- [x] Task 2: Build Snippet-Based Cover Letter Engine
  - [x] SubTask 2.1: Create snippet components for cover letter headers.
  - [x] SubTask 2.2: Implement the single-column responsive body layout for cover letters.
  - [x] SubTask 2.3: Integrate the new layout engine into `Step4CoverLetter`.

- [x] Task 3: Implement Smart AI Generation & JD Logic
  - [x] SubTask 3.1: Check for linked Job Description in `Step4CoverLetter`.
  - [x] SubTask 3.2: Enable AI generation button (with credit warning) if JD exists.
  - [x] SubTask 3.3: Implement fallback manual editor if no JD exists or user opts out of AI.
  - [x] SubTask 3.4: Integrate AI endpoint to generate content using CV and JD data.

- [x] Task 4: Implement Resilient Saving & Guest Support
  - [x] SubTask 4.1: Update `guestCVService` to handle saving cover letter drafts.
  - [x] SubTask 4.2: Add network state detection to `Step4CoverLetter`.
  - [x] SubTask 4.3: Display "offline saved only" UI when offline.
  - [x] SubTask 4.4: Ensure graceful sync and data retention on reconnection or login.

- [x] Task 5: Cleanup Legacy Components
  - [x] SubTask 5.1: Identify and remove legacy cover letter editor components (`CoverLetterInitModal`, etc.) that conflict with the new flow.
  - [x] SubTask 5.2: Ensure all existing routes point to the new integrated flow or a standalone version of the new snippet engine.

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 2
- Task 5 depends on Task 1, 2, 3, 4
