# Improve Template Rendering and Editing Spec

## Why
Current templates have inconsistent gaps, no way to change sidebar colors, excessive padding in 2-column templates, clipped section controls in narrow columns, location field duplication bugs, and inline editing is not sufficiently distinct/form-like. Addressing these issues will make CV building much more polished and customizable.

## What Changes
- Add `sidebarBgColor` setting to the design menu for 2-column/sidebar templates.
- Add `sectionGap` setting to the design menu to control vertical spacing between sections (default: 1.5rem).
- Reduce excessive vertical space (`pt-[23px]`) in 2-column template layouts.
- Scale down and adapt the floating `CanvasSnippet` section control buttons (`group-hover/inner:opacity-100`) so they don't clip in narrow sidebar columns.
- Upgrade `EditableField` focus state to look like a minimal form input (padding, background, ring, and rounded corners) to clearly indicate edit mode.
- Fix `location` field duplication logic in `CVBuilderProAdapter.tsx` so strings aren't repeatedly appended.
- Standardize all section gaps (`mb-4`, `mb-5`, `mb-6`) to use `--cv-section-gap`.

## Impact
- Affected specs: CV Design Settings, Template Rendering, Inline Editing, CV Data mapping.
- Affected code:
  - `src/components/cv-builder-pro/CVCanvasEngine.tsx`
  - `src/components/cv-builder-pro/CVBuilderProAdapter.tsx`
  - `src/components/cv-builder-pro/components/CoreUI.tsx`
  - `src/components/cv-builder-pro/registry.tsx`

## ADDED Requirements
### Requirement: Sidebar Color Customization
The system SHALL allow users to change the sidebar background color via the Design menu, ensuring text contrast remains legible.

### Requirement: Section Gap Customization
The system SHALL allow users to control the vertical gap between CV sections globally from the Design menu.

## MODIFIED Requirements
### Requirement: Inline Text Editing
The inline editor SHALL visually transform into a minimal form field (e.g., distinct background, padding, subtle ring) when clicked, to improve editability.

### Requirement: Template Layouts
2-column templates SHALL NOT have excessive hardcoded top padding below the header. Section controls SHALL scale down gracefully in narrow columns.

## REMOVED Requirements
N/A