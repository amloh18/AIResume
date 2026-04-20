# Tasks
- [x] Task 1: Fix location duplication bug in `CVBuilderProAdapter.tsx` (ensure string is assigned directly to city without appending existing data on re-save).
- [x] Task 2: Add `sidebarBgColor` and `sectionGap` to `design` state in `CVCanvasEngine.tsx` and design panel UI.
- [x] Task 3: Update `StaticLayoutRenderer` in `CoreUI.tsx` to apply `sidebarBgColor` and remove excessive `pt-[23px]` top padding in 2-column layouts.
- [x] Task 4: Standardize section gaps in `registry.tsx` by replacing hardcoded `mb-6`, `mb-5`, `mb-4` on section wrappers with a dynamic CSS variable (e.g., `mb-[var(--cv-section-gap)]`).
- [x] Task 5: Fix section control buttons clipping in narrow columns by adding responsive classes/scaling or flex-wrap in `CoreUI.tsx` (`CanvasSnippet` toolbar).
- [x] Task 6: Enhance inline editing UX in `EditableField` (`CoreUI.tsx`) by adding distinct focus styles (padding, background, border/ring) to act as a minimal form field.

# Task Dependencies
- Task 4 depends on Task 2.
- Task 3 depends on Task 2.