# Unified Editor Cover Letter Spec

## Why
The legacy standalone cover letter editor still exists and handles cover letters when clicking from Step 1 or tracking dashboards. Since Cover Letter editing is now unified as Step 4 of the "Editor", we must completely remove the legacy editor and route all cover letter edits to the unified Editor flow. Furthermore, the Cover Letter step (Step 4) needs to match the rich visual design and functional structure of Step 3 (Builder), and Step 5 (Review) needs to show previews for both the CV and Cover Letter. Finally, UI transitions between the 5 steps should be enhanced with animations.

## What Changes
- **BREAKING**: Delete the entire `src/components/cover-letter-editor` directory and the `src/app/cover-letter-editor` page.
- Reroute all Cover Letter "Edit" links to `/resume-enhancer` (now named Editor) configured to start at Step 4, loading the specific Cover Letter.
- Redesign `Step4CoverLetter.tsx` to resemble the dual-panel `Step3BuilderSurgeon.tsx`, featuring a Canvas (CoverLetterLayoutEngine) on the left and an editing/AI panel on the right.
- Update `Step4Review.tsx` (Step 5) to display a split or toggle view containing both the CV preview and Cover Letter preview.
- Wrap the main step components in `ResumeEnhancerContainer.tsx` with `framer-motion` `<AnimatePresence>` to create smooth slide/fade transitions between Steps 1-5.

## Impact
- Affected specs: `unify-editor-dashboard`, `enhance-cover-letter-flow`
- Affected code:
  - `src/app/cover-letter-editor/*` (Delete)
  - `src/components/cover-letter-editor/*` (Delete)
  - `src/components/resume-enhancer/ResumeEnhancerContainer.tsx` (Add animations, handle Cover Letter initial load)
  - `src/components/resume-enhancer/steps/Step4CoverLetter.tsx` (Redesign)
  - `src/components/resume-enhancer/steps/Step4Review.tsx` (Add CL preview)
  - `src/components/resume-enhancer/steps/Step1Parser.tsx` (Update CL routing)

## ADDED Requirements
### Requirement: Unified Routing for Cover Letters
The system SHALL route all cover letter editing to the unified Editor flow at Step 4.

#### Scenario: Success case
- **WHEN** user clicks to edit a Cover Letter from the Dashboard
- **THEN** they are navigated to the Editor (Resume Enhancer) loaded directly into Step 4 with the cover letter data populated.

### Requirement: Step 4 Advanced Layout
The system SHALL present Step 4 using a split-panel layout identical to Step 3.

#### Scenario: Success case
- **WHEN** user reaches Step 4
- **THEN** they see the Cover Letter preview/canvas on the left and an editing/options panel on the right.

### Requirement: Dual Preview in Review Step
The system SHALL show previews for both the CV and the Cover Letter in Step 5.

#### Scenario: Success case
- **WHEN** user reaches Step 5
- **THEN** they can view both their CV and their generated Cover Letter before downloading.

### Requirement: Smooth Step Transitions
The system SHALL animate transitions between the Editor's 5 steps.

#### Scenario: Success case
- **WHEN** user navigates from Step 3 to Step 4
- **THEN** the UI transitions smoothly using a slide or fade animation rather than an instant snap.

## REMOVED Requirements
### Requirement: Legacy Cover Letter Editor Page
**Reason**: Replaced by unified Editor Step 4.
**Migration**: Delete legacy page and components. Update routing.
