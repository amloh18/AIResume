# Enhance Cover Letter Flow Spec

## Why
The current cover letter process is disconnected from the main Resume Enhancer journey and uses an outdated layout system. To provide a seamless, unified experience, the cover letter needs to be integrated directly into the CV creation flow (between the Builder and Review steps) and utilize the modern, snippet-based responsive layout engine while strictly enforcing a single-column body.

## What Changes
- Insert a skippable Cover Letter creation step between Step 3 (Builder) and Step 4 (Review) in the Resume Enhancer.
- Overhaul the cover letter rendering to use snippet-based responsive layouts, ensuring the body remains single-column while headers are customizable via snippets.
- Add an AI generation toggle that uses CV data and the linked Job Description (JD) to tailor the content.
- Ensure AI credits are only consumed if the user explicitly opts into AI generation.
- Disable AI generation and ATS scoring if no JD is linked, falling back to a manual cover letter editor and basic resume score.
- Support robust saving for both guest and logged-in users, including handling offline states with clear "offline saved only" indicators and graceful data loss prevention.
- **BREAKING**: Remove the legacy standalone Cover Letter editor and preview components to consolidate around the new snippet system.

## Impact
- Affected specs: `resume-enhancer`, `guest-mode`, `ai-generation`
- Affected code: 
  - `src/contexts/ResumeEnhancerContext.tsx`
  - `src/components/resume-enhancer/ResumeEnhancerContainer.tsx`
  - `src/components/cover-letter-editor/*` (Legacy removal)
  - `src/services/guestCVService.ts`

## ADDED Requirements
### Requirement: Integrated Cover Letter Step
The system SHALL provide a skippable Cover Letter step between the Resume Builder and Review stages.

#### Scenario: Success case
- **WHEN** user completes Step 3 and clicks "Next"
- **THEN** they are presented with the Cover Letter step where they can generate, edit, or skip the cover letter before proceeding to the Review step.

### Requirement: Snippet-based Cover Letter Layout
The system SHALL render cover letters using the responsive snippet engine.

#### Scenario: Success case
- **WHEN** user views or edits a cover letter
- **THEN** the header is customizable through snippets, but the main body is strictly constrained to a single column.

### Requirement: Smart AI Generation
The system SHALL conditionally offer AI cover letter generation.

#### Scenario: Success case (JD Linked)
- **WHEN** user reaches the Cover Letter step with a linked Job Description
- **THEN** they can opt-in to AI generation (warning about credit usage) which auto-fills the letter using CV and JD data.

#### Scenario: Success case (No JD Linked)
- **WHEN** user reaches the Cover Letter step without a linked Job Description
- **THEN** AI generation is disabled, and they must write the cover letter manually.

### Requirement: Resilient Saving & Guest Support
The system SHALL securely save cover letters across network states and authentication statuses.

#### Scenario: Success case
- **WHEN** a user (guest or logged-in) edits a cover letter while offline
- **THEN** the system shows an "offline saved only" indicator and saves the data locally, syncing to the database once reconnected or when the guest logs in.

## REMOVED Requirements
### Requirement: Legacy Cover Letter Editor
**Reason**: Outdated layout system and disconnected UX.
**Migration**: Replace entirely with the integrated snippet-based Cover Letter step in the Resume Enhancer.
