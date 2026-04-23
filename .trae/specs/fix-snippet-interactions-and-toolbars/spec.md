# Fix Snippet Interactions and Toolbars Spec

## Why
Users are having trouble interacting with snippets and sections. The "Skills" section doesn't provide an AI suggestion option within the format toolbar. Additionally, the empty state of sections (especially Skills) makes it hard to add content. The clickable input areas are too thin and hard to trigger. Finally, toolbars overlap with section text, and the blue borders indicating edit boundaries should be replaced with cleaner green dotted lines.

## What Changes
- Add a "✨ Suggest Skills" button to the format toolbar (`FloatingToolbar`) when the active node is within a skills section.
- Add an "Add Skill" action button to the empty state of the Skills section (or an "Add" button within the section toolbar).
- Widen the clickable trigger area for empty `EditableField` components (e.g., adding a thin bottom border line or minimum width/height) to make them easier to click.
- Adjust the position of the section toolbar (e.g., `FloatingToolbar` and section controls) so they do not overlap the text.
- Replace the blue section border styles (`border-blue-200`, `border-blue-400`, `bg-blue-50/10`) with a green dotted/dashed style (e.g., `border-emerald-400 border-dashed`).
- Remove individual record blue lines inside a section.

## Impact
- Affected specs: Editor UX, CV Builder Canvas.
- Affected code:
  - `src/components/cv-builder-pro/components/CoreUI.tsx`
  - `src/components/cv-builder-pro/components/ListEntry.tsx`
  - `src/components/cv-builder-pro/CVCanvasEngine.tsx`

## ADDED Requirements
### Requirement: Skill AI Suggestion in Toolbar
The system SHALL display an AI suggestion button in the formatting toolbar when the user focuses on a skills-related field.

#### Scenario: Success case
- **WHEN** user clicks inside a skills field
- **THEN** the floating toolbar appears and includes a "Suggest Skills" button.

### Requirement: Easy Interaction for Empty Sections
The system SHALL provide an obvious visual affordance (e.g., a plus icon or wider clickable area) to add content when a section like Skills is empty.

## MODIFIED Requirements
### Requirement: Section Borders
The section edit boundaries SHALL use a green dashed/dotted line instead of the current blue line, and individual records inside a section SHALL NOT have a blue hover border.

### Requirement: Toolbar Positioning
Toolbars (both section and format) SHALL be positioned so they do not obscure the text being edited.
