# Revamp LinkedIn Enhancer Design Spec

## Why
The current LinkedIn Enhancer design lacks a cohesive dashboard for tracking overall profile health and a streamlined, side-by-side comparison interface for applying AI enhancements. We need to revamp the UI to provide a comprehensive Dashboard (showing profile strength, AI summary, and recommendations) and an Enhancement Flow (featuring a 3-column layout with before/after comparisons, AI insights, and clear CTAs for the browser extension).

## What Changes
- **BREAKING**: Replace the current linear flow in `LinkedInEnhancerContainer` with a dual-view system:
  1. **Dashboard View**: A high-level overview showing Profile Strength, Profile Checklist, AI Summary, and actionable "Next Best Action" recommendations.
  2. **Enhancement Flow View**: A detailed workspace for reviewing and applying AI changes using progressive disclosure (Default: Original | Enhanced; Toggle: Show Insights).
- **Split Contexts**: Refactor `LinkedInEnhancerContext` into three distinct contexts to prevent bloat: `EnhancerContext` (generation & section states), `DashboardContext` (metrics & insights), and `ExtensionContext` (connection & injection status).
- **Explicit State Machine**: Define section states strictly as `ORIGINAL` -> `GENERATED` -> `ACCEPTED` -> `APPLIED`. Editing overrides `GENERATED` and becomes `ACCEPTED`.
- **User Control Layer**: Add granular control checkboxes (e.g., `[✓ Headline] [✗ Experience]`) so users can selectively apply injected sections.
- **Safe Mode Preview & Undo**: Add a "Preview on LinkedIn" feature before applying, and a post-apply success state featuring an "Undo Changes" rollback option.
- **Quick Mode**: Introduce a "⚡ One-click optimize" option to auto-accept high-confidence changes and skip manual review for faster Time to Value.
- Add confidence scores (e.g., "92% confidence") and inline explanations ("Why this change?") to each section's AI suggestion.
- Add robust **Null States** for the Dashboard and Enhancement Flow when the user has not yet imported data or connected the extension.

## Edge Cases & Null States
- **Extension Not Installed/Connected**: Show a prominent empty state/banner prompting the user to install the Chrome Extension to fetch their profile data. The "Import from LinkedIn" step should trigger the installation modal if not detected.
- **No Profile Data Imported**: The Dashboard should display a skeleton/null state for Profile Strength, AI Summary, and Recommendations until the first successful sync.
- **Empty Sections**: If a user's LinkedIn profile lacks a specific section (e.g., no "Featured" section), the Enhancement Flow should gracefully display an "Add Section" null state for that card, suggesting AI-generated content to fill the gap.
- **API/Generation Failure**: If the AI fails to generate enhancements, show a clear error boundary with a "Retry Generation" CTA inside the specific section card rather than failing the entire page.
- **State Conflicts**: If a user clicks "Regenerate" on an `ACCEPTED` section, it should reset to `GENERATED` without breaking the history tree.

## Impact
- Affected specs: UI/UX, AI Content Generation, Browser Extension Integration, State Management.
- Affected code:
  - `src/components/linkedin-enhancer/*` (All existing cards and containers will be heavily modified or replaced).
  - `src/contexts/*` (Splitting existing context into `EnhancerContext`, `DashboardContext`, and `ExtensionContext`).

## ADDED Requirements
### Requirement: Next Best Action Dashboard
The system SHALL provide a dashboard view that drives action rather than just displaying metrics.
#### Scenario: Viewing Dashboard
- **WHEN** the user navigates to the LinkedIn Enhancer.
- **THEN** they see "Next Best Actions" (e.g., "🚀 Improve your headline [Fix Now ->]") that directly route them into the Enhancement flow for that specific section.

### Requirement: Granular Control & State Machine
The system SHALL enforce a strict state machine (`ORIGINAL` -> `GENERATED` -> `ACCEPTED` -> `APPLIED`) and allow users to select exactly which `ACCEPTED` sections get injected.
#### Scenario: Reviewing AI Changes
- **WHEN** the user enters the Enhancement Flow.
- **THEN** they see their original text on the left and the AI-suggested text on the right. They can check/uncheck sections, see a Confidence Score, and read inline "Why this change?" reasoning.

### Requirement: Safe Mode Preview & Rollback
The system SHALL provide a secure preview before DOM injection and an undo option after injection.
#### Scenario: Applying Changes via Extension
- **WHEN** the user is ready to apply changes.
- **THEN** they can click "Preview on LinkedIn" to see an overlay on their actual profile. After applying, they receive a success confirmation with an option to "Undo Changes" (Version History rollback).

## MODIFIED Requirements
### Requirement: Split Context Architecture
Update the existing monolithic context to manage the complex state of the new layout by splitting it into `EnhancerContext`, `DashboardContext`, and `ExtensionContext` to ensure fast updates and clean state sync.