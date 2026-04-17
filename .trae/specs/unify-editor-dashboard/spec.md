# Unify Editor Dashboard Spec

## Why
The Resume Enhancer is evolving into a unified document editor. The initial step (Step 1 dashboard) needs to display both CVs and Cover Letters, allowing users to seamlessly edit or create either document type. Additionally, the application requires renaming "Resume Enhancer" to "Editor" in the UI to reflect this broader capability, and several existing UI bugs (like duplicate template modals and incorrect template selector display on edit) need fixing.

## What Changes
- Rename visible "Resume Enhancer" text to "Editor" across the application.
- Update `Step1Parser.tsx` to fetch and display both CVs and Cover Letters in the "Continue Editing" section.
- Fix the logic in `ResumeEnhancerContainer.tsx` so the Step 2 Template Selector is strictly skipped when editing an existing CV.
- Fix the duplicate Template Selector modal issue in `Step3BuilderSurgeon.tsx` by relying solely on the new `CVCanvasEngine` modal and removing the old local one.

## Impact
- Affected specs: `resume-enhancer`, `enhance-cover-letter-flow`
- Affected code: 
  - `src/components/resume-enhancer/steps/Step1Parser.tsx`
  - `src/components/resume-enhancer/ResumeEnhancerContainer.tsx`
  - `src/components/resume-enhancer/steps/Step3BuilderSurgeon.tsx`
  - Various layout and UI components mentioning "Resume Enhancer"

## ADDED Requirements
### Requirement: Unified Step 1 Dashboard
The system SHALL display both CVs and Cover Letters in the Step 1 dashboard.

#### Scenario: Success case
- **WHEN** user lands on the Editor dashboard (Step 1)
- **THEN** they see tabs or sections for "CVs" and "Cover Letters", and can click to edit existing documents or create new ones.

## MODIFIED Requirements
### Requirement: Template Selector Display Logic
The system SHALL NOT display the Step 2 Template Selector when editing an existing CV.

#### Scenario: Success case
- **WHEN** user chooses to edit an existing CV
- **THEN** they bypass the Template Selector and are routed directly to Step 3 (Builder).

### Requirement: Single Template Selector Modal
The system SHALL only display one Template Selector modal when requested in Step 3.

#### Scenario: Success case
- **WHEN** user clicks "Template" in the header of Step 3
- **THEN** exactly one Template Selector modal appears (the new one from `CVCanvasEngine`).
