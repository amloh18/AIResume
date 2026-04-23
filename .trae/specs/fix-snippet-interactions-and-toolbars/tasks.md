# Tasks
- [x] Task 1: Modify border styles in `CoreUI.tsx` and `ListEntry.tsx`.
  - [x] SubTask 1.1: In `CoreUI.tsx`, find all references to `border-blue-200` or `border-blue-400` representing section boundaries and replace them with `border-emerald-500 border-dashed` or similar green dotted lines.
  - [x] SubTask 1.2: In `ListEntry.tsx`, remove the `border-blue-200` hover and active borders from individual list items to prevent the blue lines from showing.
- [x] Task 2: Adjust toolbar positioning.
  - [x] SubTask 2.1: In `CoreUI.tsx`, update the `absolute right-0 top-0` section controls to be slightly offset (e.g., `-top-10` or `-right-4`) so they don't overlap the section title.
  - [x] SubTask 2.2: In `CoreUI.tsx`, update `FloatingToolbar` positioning to ensure it floats comfortably above or below the text without covering it.
- [x] Task 3: Improve `EditableField` click target.
  - [x] SubTask 3.1: In `CoreUI.tsx`, update `EditableField` to have a clear thin bottom border or minimum dimensions when empty, so it is easy to click.
- [x] Task 4: Add AI Skill Suggestion to format toolbar.
  - [x] SubTask 4.1: In `CoreUI.tsx`, update `FloatingToolbar` to detect if the `targetNode` is within a skills section (e.g., checking `data-path` for `skills`).
  - [x] SubTask 4.2: If in a skills context, render a "Suggest Skills" button in the toolbar.
- [x] Task 5: Enhance empty state for skills section.
  - [x] SubTask 5.1: In `CoreUI.tsx`, when rendering an empty section, add an explicit "Add [Category]" button if the category supports it, to make adding the first item intuitive.

# Task Dependencies
- [Task 1] can be done independently.
- [Task 2] can be done independently.
- [Task 3] can be done independently.
- [Task 4] depends on [Task 3].
- [Task 5] depends on [Task 3].
