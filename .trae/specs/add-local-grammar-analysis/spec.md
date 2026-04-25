# Local Grammar Analysis & Feature Gating Spec

## Why
We need to provide immediate, free, offline value to users by pointing out grammatical and contextual issues in their CV text (bullet points, summaries, etc.) without incurring AI API costs. Additionally, we need to enforce stricter feature gating for Free tier users on premium AI capabilities to encourage upgrades.

## What Changes
- Implement a local, regex/dictionary-based text analysis engine that runs in the browser.
- Add visual text highlighting (yellow, red, purple, blue, green) for different types of writing issues directly in the editor components.
- Add a Grammar Correction Card that opens when clicking highlighted text, offering explanations and suggestions.
- **BREAKING**: Modify the inline AI suggestion tool in the formatting toolbar to block Free users, displaying blurred text and an upgrade prompt instead of calling the AI endpoint.
- **BREAKING**: Restrict the AI Analysis Sidebar for Free users to 1 use only, and limit its output to only grammar and context suggestions (derived locally or via a simplified prompt).

## Impact
- Affected specs: Editor Step 3 (Resume Enhancer/Builder), AI Analysis Sidebar, Formatting Toolbar.
- Affected code:
  - `src/components/resume-enhancer/AIAnalysisSidebar.tsx` (or similar)
  - `src/components/editor/RichTextEditor.tsx` (or wherever bullet points and summaries are rendered)
  - `src/components/editor/FormatToolbar.tsx` (Inline AI suggest feature)
  - New directory/files for local grammar rules (`src/lib/grammar/*`).

## ADDED Requirements
### Requirement: Local Grammar Engine
The system SHALL scan text blocks (profile summary, education, work, projects) locally for specific patterns and highlight them:
- **Yellow**: Lengthy, complex sentences.
- **Red**: Extremely dense, meandering sentences.
- **Purple**: Complex words that have simpler alternatives (e.g., "utilize" -> "use").
- **Blue**: Adverbs and weakening phrases (e.g., "perhaps", "really").
- **Green**: Passive voice constructions.

#### Scenario: User clicks on a highlight
- **WHEN** user clicks on a purple highlighted word ("utilize")
- **THEN** a Grammar Correction Card appears near the text, explaining the issue ("Use a shorter word") and suggesting alternatives ("use").

### Requirement: AI Feature Gating
The system SHALL lock premium AI features based on the user's active subscription plan.

#### Scenario: Free user clicks inline AI suggest
- **WHEN** a Free user selects text and clicks the "AI Suggest" button in the formatting toolbar
- **THEN** the system does not invoke the AI API. Instead, it shows a popover with blurred dummy text and an "Upgrade to Pro" button.

#### Scenario: Free user uses AI Analysis Sidebar
- **WHEN** a Free user opens the AI Analysis Sidebar
- **THEN** they can use it exactly 1 time.
- **AND** the analysis results are limited to grammar and context issues only (no deep AI restructuring or ATS premium insights).

## MODIFIED Requirements
### Requirement: Editor Text Rendering
The editor MUST support rendering inline highlights (spans with specific background colors) based on the local grammar engine's output without breaking the underlying HTML structure or user's ability to edit the text.
