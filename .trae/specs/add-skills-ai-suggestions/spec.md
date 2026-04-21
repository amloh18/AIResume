# Skills AI Suggestions Spec

## Why
Users currently need to manually guess which skills to add and how to optimize their CV for a specific role. Adding role-aware, CV-aware AI skill suggestions (plus a broader improvement summary) reduces friction and increases ATS readiness.

## What Changes
- Add a “Suggest Skills” entry point in the Skills editing UI that opens a suggestions card.
- Generate categorized skill suggestions using the current CV content plus the target role context.
- Allow users to select individual skills or “select all” (per category and globally) and apply them into the Skills section.
- Provide an additional “Perfect Score” improvement summary (experience improvements, gaps, grammar/clarity, other factors) using CV-aware context.

## Impact
- Affected specs: Editor UX, AI assistance, CV data mutation, Job/role context.
- Affected code:
  - UI: `src/components/forms/SkillsSection.tsx` (or the active editor Skills form used in the editor flow)
  - AI: `src/lib/services/aiAssistantService.ts`, `src/lib/hooks/useAIAssistant.ts`
  - API: `src/app/api/ai/*` (extend or add route for skills suggestions)

## ADDED Requirements
### Requirement: Skills Suggestions Card
The system SHALL provide a Skills Suggestions Card in the editor Skills section.

#### Scenario: Open suggestions
- **WHEN** the user clicks “Suggest Skills” in the Skills section
- **THEN** a card/modal opens showing categorized skill suggestions (category + skills list)
- **AND** the card shows loading state and error state gracefully

### Requirement: Categorized Skill Suggestions
The system SHALL generate skill suggestions derived from the user’s CV and a target role.

#### Scenario: Role-aware suggestions
- **GIVEN** a CV is loaded in the editor
- **AND** a target role is known (from selected job context or a role string)
- **WHEN** the user requests skill suggestions
- **THEN** the system returns categories (e.g., “Core”, “Tools”, “Soft Skills”) each containing a list of skills
- **AND** each suggested skill is relevant to the target role and not a duplicate of existing CV skills

### Requirement: Select One or All
The system SHALL allow selecting one or multiple skills from suggestions.

#### Scenario: Apply selected skills
- **WHEN** the user selects one or more skills and clicks “Add Selected”
- **THEN** selected skills are appended to the appropriate skill category (or a default category if none matches)
- **AND** duplicates are not added
- **AND** the Skills section updates immediately

#### Scenario: Select all
- **WHEN** the user clicks “Select all” (global or per-category)
- **THEN** all skills in scope become selected and can be added in one click

### Requirement: “Perfect Score” Improvement Summary
The system SHALL provide a CV-aware improvement summary that helps the user move toward a “perfect score”.

#### Scenario: Show holistic improvements
- **WHEN** the user opens the suggestions card
- **THEN** the UI includes an additional view/section that shows:
  - Experience improvements (impact/metrics/action verbs)
  - Gaps (skills/experience/education, aligned to role)
  - Grammar/clarity suggestions (concise, professional wording)
  - Other high-impact factors (ATS keywords, formatting/compliance hints if available)
- **AND** the content is generated using CV-aware context and grammar-based guidance

## MODIFIED Requirements
### Requirement: Skills Editing
The existing Skills editing experience SHALL support inserting AI-provided skills while preserving user-entered content and avoiding duplicates.

## REMOVED Requirements
None

