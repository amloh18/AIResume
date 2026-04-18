# Tasks
- [x] Task 1: Clean up phantom and redundant services
  - [x] SubTask 1.1: Remove `getRealTimeATSScore` from `cvAnalyticsService.ts` and phantom endpoint references.
  - [x] SubTask 1.2: Remove stubbed `calculateATSScore` from `AIService.ts`.
- [x] Task 2: Unify ATS calculation logic
  - [x] SubTask 2.1: Ensure `CentralScoreManager.ts` (or primary backend service) is the sole calculator.
  - [x] SubTask 2.2: Remove conflicting calculation logic from `AIAssistantService.ts`, `ATSCompatibilityMeter.tsx`, `ats-keyword-service.ts`, and `resumeEnhancerFactors.ts`.
- [x] Task 3: Refactor frontend components to use global state
  - [x] SubTask 3.1: Update `JourneyTimelineCard.tsx` to remove inline `fetchATSScore` and use global state/context.
  - [x] SubTask 3.2: Update `JourneyStatusBanner.tsx` to remove inline `fetchATSScore` and use global state/context.
  - [x] SubTask 3.3: Update `ATSDeepDiveModal.tsx` to use the global ATS service instead of manual API calls.
- [x] Task 4: Clean up backend race condition workarounds
  - [x] SubTask 4.1: Remove `calculationLocks` and idempotency key workarounds in `/api/ats/calculate-score/route.ts` if frontend race conditions are resolved.

# Task Dependencies
- Task 3 depends on Task 2.
- Task 4 depends on Task 3.