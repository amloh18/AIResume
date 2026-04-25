# Implementation Plan

## Summary
Enhance the CV Builder by improving drag-and-drop visual feedback for hybrid layouts, introducing a centralized date formatting system controlled via the Design panel, and adding a live, offline syntax and grammar checker to the AI ATS panel.

## Current State Analysis
1. **Layout Drop Zones**: The `hybrid-split` layout uses standard `CanvasZone` components, but during a drag operation, empty or partially filled zones (especially the top full-width vs. bottom columns) may not be visually distinct enough to guide the user.
2. **Date Formatting**: Dates are currently treated as raw text strings edited via the generic `EditableWrapper`. This leads to inconsistent formats (e.g., "Jan 2024" vs "01/2024") across different sections like Experience and Education.
3. **Live Feedback**: The `ATSMeterPanel` displays AI-generated ATS scores and keyword gaps but lacks instant, offline feedback for basic syntax, grammar, and formatting errors (like double spaces or missing capitalization).

## Proposed Changes

### 1. Hybrid Layout Drop Zones Visibility
- **File**: `src/components/cv-builder-pro/components/CoreUI.tsx`
- **What/How**: 
  - Modify the `CanvasZone` component to react to the `dragState.isDragging` prop.
  - When dragging is active, apply a minimum height (e.g., `min-h-[120px]`) and a subtle dashed border background to all drop zones.
  - This ensures that in the `hybrid-split` layout, the top single-column zone (`main`) and the bottom two-column zones (`left`, `right`) are clearly demarcated as distinct drop targets based on the mouse position.

### 2. Centralized Date Control & Settings
- **File**: `src/components/cv-builder-pro/CVCanvasEngine.tsx`
- **What/How**: 
  - Extend the `design` state to include a `dateFormat` property (default: `'MMM YYYY'`).
  - Add a new "Date Format" dropdown in the Design sidebar with options: "MM/YYYY", "MMM YYYY" (e.g., Jan 2024), "DD/MM/YYYY", and "YYYY".
- **File**: `src/components/cv-builder-pro/components/CoreUI.tsx`
- **What/How**: 
  - Create a new `<DateEditable />` component that wraps the existing editable logic but intercepts the display value.
  - It will parse the raw underlying date string and format it according to `design.dateFormat`.
  - It will gracefully handle empty dates (showing standard placeholders) and the "PRESENT" keyword (case-insensitive), rendering it correctly as "Present".
- **File**: `src/components/cv-builder-pro/registry.tsx`
- **What/How**: 
  - Update all snippets that render dates (Experience, Education, Projects, Awards, etc.) to use `<DateEditable />` instead of the standard `<EditableWrapper />` for date fields. Ensure start and end dates are formatted identically.

### 3. Live Offline Syntax & Grammar Checks
- **File**: `src/lib/utils/offline-grammar-check.ts` (New File)
- **What/How**: 
  - Implement a lightweight utility function `checkSyntaxAndGrammar(cvData)` that runs regex-based rules over the CV's text fields (summaries, descriptions, highlights).
  - Rules will include: repeated words (e.g., "the the"), double/multiple spaces, missing capitalization at the start of sentences/bullets, and basic passive voice flags (e.g., "was responsible for").
- **File**: `src/components/resume-enhancer/panels/ATSMeterPanel.tsx`
- **What/How**: 
  - Import and run the offline checker utility using `useMemo` on `state.cvData`.
  - Add a new "Live Formatting Checks (Offline)" section below the ATS score to display these warnings in real-time without hitting an external API.

## Assumptions & Decisions
- **Date Parsing**: Standard JavaScript date parsing and regex fallbacks will be used to interpret user input (like "01-2024" or "Jan 2024") and reformat it to the selected global format. If a date is completely unparseable, it will fall back to the raw string to prevent data loss.
- **Grammar Checker**: Kept strictly offline using regex to ensure zero latency and no API costs. It acts as a helpful linter rather than a full NLP engine like Grammarly.
- **Drag-and-Drop**: We will use CSS classes and conditional rendering based on the existing `dragState` to enhance visual feedback, avoiding a rewrite of the core drag logic.

## Verification Steps
1. Open the builder with a `hybrid-split` layout. Drag a section and verify that the top main zone and bottom columns visually highlight with distinct boundaries.
2. Go to the Design panel, change the Date Format. Verify that all dates in Experience and Education update immediately to the new format. Type "present" in an end date and verify it renders as "Present".
3. Intentionally type a repeated word (e.g., "managed the the team") and use a double space in a work description. Open the AI Analysis panel and verify the offline syntax error appears instantly.