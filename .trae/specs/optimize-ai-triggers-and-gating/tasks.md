# Tasks

- [x] Task 1: Implement Unified Intelligence Service & Cost Strategy
  - [x] SubTask 1.1: Create/Refactor `ai_service` to include a contextual caching mechanism for AI responses based on CV section state.
  - [x] SubTask 1.2: Implement unified model logic ensuring `gemini flash lite` is used exclusively for all AI requests (suggestions, ATS calculation, and full analysis) to maximize cost-efficiency.
  - [x] SubTask 1.3: Update AI prompts to be state-driven, using actual user CV context rather than hardcoded mock data.
- [x] Task 2: Implement User Quota & Pro Gating System
  - [x] SubTask 2.1: Update user schema to track AI feature quotas based on join date (e.g., 3 free analysis credits per month).
  - [x] SubTask 2.2: Add logic to decrement quotas and gate the ATS Calculator (Free limited), AI Suggestions (Pro/Trial), and Full Analysis (Pro limited).
  - [x] SubTask 2.3: Design and render a locked UI state directly within the existing components (with a high-converting message) when a user's quota reaches zero, replacing the previous modal approach.
- [x] Task 3: Refactor UI Triggers and Toolbar Fixes
  - [x] SubTask 3.1: Remove any background or persistent AI triggers (Minimum Trigger Principle). AI must only run on explicit user action.
  - [x] SubTask 3.2: Move AI Contextual Suggestion UI to render on the right of the triggered section.
  - [x] SubTask 3.3: Fix the WYSIWYG toolbar visibility bug when clicking a record so it reliably appears on focus/click.

- [x] Task 4: Fix Gemini Model Usage
  - [x] SubTask 4.1: Update all AI services and API routes to use the Gemini Flash Lite model exclusively instead of `gemini-1.5-flash-latest` to meet cost-efficiency requirements.

# Task Dependencies
- [Task 1] should be completed before [Task 2] to ensure the API responses are accurate before charging quotas.
- [Task 3] can be completed in parallel with [Task 1] and [Task 2].