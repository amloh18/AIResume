# Enhance Notifications Spec

## Why
The current notification system uses generic, system-centric language (e.g., "Application ready") that feels robotic and lacks deep engagement. To drive better engagement and guide users effectively through their job search journey, notifications must be rewritten to be user-oriented, encouraging, and actionable. Additionally, toast notifications and the Notification Center need to ensure that CTAs are deeply linked to the exact context rather than generic pages, making the system genuinely helpful.

## What Changes
- **Rewrite Copywriting**: Update all notification templates in `src/lib/notifications/templates.ts` to use a supportive, user-first tone with motivational and context-rich language.
- **Deep-Linked CTAs**: Ensure all `actionUrl` properties in notifications point to specific, actionable routes (e.g., `/dashboard/tracker/[id]` instead of `/applications`).
- **Toast Notification Refinement**: Fix the toast notification action buttons in `src/contexts/NotificationContext.tsx` to properly navigate users to the `actionUrl` upon clicking, ensuring the deep link works system-wide.

## Impact
- Affected specs: Notification delivery, User engagement, Routing.
- Affected code: 
  - `src/lib/notifications/templates.ts`
  - `src/contexts/NotificationContext.tsx`

## ADDED Requirements
### Requirement: Deep-Linked Toast Notifications
The system SHALL provide working deep links for all interactive toast notifications.
- **WHEN** a user clicks an action button in a toast notification
- **THEN** they are navigated directly to the specific resource defined in `actionUrl` (e.g., `/editor?mode=edit&cvId=...`) rather than just dismissing the toast.

## MODIFIED Requirements
### Requirement: Notification Copywriting
The system SHALL generate user-oriented notifications that motivate the user and clearly explain the value of the next step.
- **WHEN** an ATS score is generated
- **THEN** the notification should say "We've analyzed your CV for [Role]. See how you can boost your score!" instead of just "ATS score ready."
