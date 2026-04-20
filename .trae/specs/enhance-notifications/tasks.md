# Tasks
- [x] Task 1: Rewrite Application Tracker Notifications
  - Description: Update `STAGE_DRAFT_TO_CREATED`, `STAGE_CREATED_TO_APPLIED`, `STAGE_APPLIED_TO_INTERVIEW`, `STAGE_INTERVIEW_TO_OFFER`, `STAGE_ANY_TO_REJECTED` with user-centric copy in `src/lib/notifications/templates.ts`. Update `DEADLINE_REMINDER`, `NO_ACTIVITY_REMINDER`, `APPLICATION_LIMIT_REACHED` as well.
  - Prompt: Open `src/lib/notifications/templates.ts`. Make sure the title and message are encouraging, user-focused, and highlight the value of the next step. Ensure `actionUrl` points to `/dashboard/tracker` instead of `/applications`. Replace `/applications/[id]` with `/dashboard/tracker/[id]` if `vars.jobId` or `vars.company` is used, ideally passing `jobId` in vars.

- [x] Task 2: Rewrite ATS Score and CV Document Notifications
  - Description: Update ATS score templates (`SCORE_GENERATED`, `SCORE_IMPROVED`, `LOW_ATS_WARNING`). Update CV document templates (`CV_UPDATED`, `COVER_LETTER_GENERATED`, `INTERVIEW_PRACTICE_COMPLETED`).
  - Prompt: Make the ATS and CV notifications motivational. Replace "ATS score ready" with "Your ATS Score is ready! 🎯". Check the `actionUrl` to ensure they link to the right tools (e.g. `/editor` instead of `/cv-builder`). Make sure all links actually exist in the current app structure.

- [x] Task 3: Enhance Toast Deep Linking in NotificationContext
  - Description: Ensure `NotificationContext.tsx` passes the `actionUrl` to the toast action button correctly so clicking the toast CTA navigates to the deep link.
  - Prompt: Open `src/contexts/NotificationContext.tsx`. Find the `showToastForNotification` function. Modify the `onClick` handler of the toast's action button to check `notification.actionUrl`. If it exists, navigate the user to that URL using `window.location.href` or a Next.js router. Also, update the button label logic to display a better CTA text (or use a mapping based on `notification.actionType`).

# Task Dependencies
- Task 3 can be done in parallel with Task 1 and 2.
- Task 1 and 2 modify the same file (`src/lib/notifications/templates.ts`).