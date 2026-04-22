# Optimize AI Triggers and Gating Spec

## Why
Currently, the AI features (Analysis, ATS Calculator, Suggestions) run inefficiently, sometimes in the background, and provide hardcoded results instead of dynamic, contextual ones based on the user's CV. Additionally, there is no cost control strategy, meaning high AI usage can lead to unpredictable costs. By implementing a "Minimum Trigger Principle," a unified, cost-efficient model, contextual caching, and a Pro-gated quota system that refreshes monthly, we transform the intelligence layer into a predictable, monetizable, and user-friendly feature.

## What Changes
- **Minimum Trigger Principle**: AI activates *only* when explicitly requested by the user. Background processing is disabled.
- **Dynamic Contextual Results**: Remove hardcoded AI responses. Pass actual user CV state into smaller, context-aware prompts.
- **Cost-Efficiency Strategy (Caching & Unified Model)**:
  - **Gemini Flash Lite**: Used exclusively for *all* AI requests (single-bullet rewrites, "✨ Suggest", and "Perform Full Analysis") to ensure maximum cost-efficiency and high speed.
  - **Contextual Caching**: Re-analyze only sections that have changed since the last request.
- **Pro Gating & Quotas**:
  - Implement a monthly quota system that refreshes on the user's join date (e.g., 3 Free Analysis credits).
  - Render a clear, locked UI within the existing components (with a high-converting message) when the quota is exhausted, instead of a disruptive modal.
  - **ATS Calculator**: Free (Limited quota).
  - **AI Suggestions**: Pro (Free trial).
  - **CV Analysis**: Pro (Limited quota).
- **UI Improvements**:
  - AI Contextual Suggestions must appear on the *right* of the triggered section.
  - Fix the bug where the WYSIWYG toolbar sometimes doesn't show when a record is clicked.

## Impact
- Affected specs: AI Suggestions, ATS Score Calculation, Billing/Quotas, CV Form Editor.
- Affected code: `src/lib/services/aiAssistantService.ts`, `src/components/ui/WYSIWYGToolbar.tsx`, `src/components/forms/*`, `src/app/api/ai/*`.

## ADDED Requirements
### Requirement: Unified Intelligence Service
The system SHALL use a single, state-aware AI service that manages user context, exclusively utilizes Gemini Flash Lite for all requests to maximize cost-efficiency and speed, and caches responses based on the CV section's state.

#### Scenario: Success case
- **WHEN** user clicks "✨ Suggest" on an empty paragraph
- **THEN** the system generates a single-bullet suggestion using Gemini Flash Lite and deducts from the user's AI Suggestions quota (or trial).

### Requirement: Join-Date Monthly Quotas
The system SHALL grant users a specific quota of free AI operations that resets monthly on the calendar day they registered.

#### Scenario: Success case
- **WHEN** user exhausts their 3 Free Analysis credits and attempts to use an AI feature
- **THEN** the system prevents the calculation and displays a clear, locked UI directly within the component (e.g., instead of the suggestions box or ATS result) with a high-converting message.

## MODIFIED Requirements
### Requirement: AI Contextual Suggestions UI
**Previous**: Suggestions appeared as a generic modal or inline popover.
**New**: Suggestions SHALL appear exclusively on the right side of the section that triggered them.

## REMOVED Requirements
### Requirement: Background AI Analysis
**Reason**: High, unpredictable API costs and low perceived user value.
**Migration**: Replace with explicit user-triggered buttons (e.g., "Calculate ATS Score", "Perform Full Analysis").
