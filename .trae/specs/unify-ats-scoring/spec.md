# Unify ATS Scoring and Remove Redundant Services Spec

## Why
Currently, the application calculates and fetches ATS scores in at least five different places using conflicting formulas (e.g., `CentralScoreManager.ts`, `AIAssistantService.ts`, `ATSCompatibilityMeter.tsx`, `ats-keyword-service.ts`, `resumeEnhancerFactors.ts`). This causes massive data discrepancies where users see different scores depending on the component. Additionally, there are redundant API calls and state management scattered across components, leading to race conditions and phantom service calls.

## What Changes
- Consolidate all ATS scoring logic to a single source of truth (the backend `CentralScoreManager.ts` or main ATS API).
- **BREAKING**: Remove conflicting local ATS score calculation logic from `AIAssistantService.ts`, `ATSCompatibilityMeter.tsx`, `ats-keyword-service.ts`, and `resumeEnhancerFactors.ts`.
- Refactor components (`JourneyTimelineCard.tsx`, `JourneyStatusBanner.tsx`, `ATSDeepDiveModal.tsx`) to use the global ATS context/service instead of making independent API calls.
- Remove redundant/phantom services and stub methods (`cvAnalyticsService.ts` phantom endpoints, `AIService.ts` stubbed ATS methods).
- Clean up backend API workarounds (e.g., calculation locks/idempotency keys) that were added to handle frontend race conditions.

## Impact
- Affected specs: ATS Score Calculation, Resume Enhancer, Journey Timeline
- Affected code: `src/lib/services/CentralScoreManager.ts`, `src/components/resume-enhancer/ATSCompatibilityMeter.tsx`, `src/components/dashboard/JourneyTimelineCard.tsx`, `src/components/dashboard/JourneyStatusBanner.tsx`, `src/components/resume-enhancer/ATSDeepDiveModal.tsx`, `src/lib/services/cvAnalyticsService.ts`, `src/lib/services/AIService.ts`, `src/app/api/ats/calculate-score/route.ts`.

## ADDED Requirements
### Requirement: Single Source of Truth for ATS Score
The system SHALL use the global ATS service and backend API as the sole authority for calculating and retrieving ATS scores.

#### Scenario: Success case
- **WHEN** a user views their ATS score in the Journey Timeline, ATS Compatibility Meter, or Deep Dive Modal
- **THEN** the exact same score and breakdown is displayed, fetched via the global ATS service.

## REMOVED Requirements
### Requirement: Localized ATS Score Calculations
**Reason**: Caused data discrepancies and inconsistent user experience.
**Migration**: All localized scoring logic in frontend components and secondary services is removed and replaced with calls to the global ATS service.