# Tasks
- [x] Task 1: Add “Suggest Skills” entry point in Skills UI
  - Update the active Skills editor component (likely [SkillsSection.tsx](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/components/forms/SkillsSection.tsx)) to add a “Suggest Skills” button.
  - Open a suggestions card/modal anchored to the Skills section.
  - Validation: UI renders in both light/dark themes and does not break existing add/edit/delete flows.

- [x] Task 2: Add/extend API to generate role-aware, CV-aware categorized skills
  - Prefer extending an existing route (e.g. `/api/ai/skills-map`) to accept `cvId` + `role` (string) when `jobId` is not present, OR add a new route `/api/ai/skills-suggestions`.
  - Response shape should include categories and skills, e.g.:
    - `{ categories: Array<{ category: string; skills: string[] }>, meta?: { role: string } }`
  - Validation: returns non-empty suggestions for a CV with content; returns safe empty state for missing role/CV.

- [x] Task 3: Implement selection + apply-to-Skills behavior
  - Add per-skill checkboxes and “Select all” controls (global + per category).
  - Add “Add Selected” and “Cancel/Close” actions.
  - Merge behavior:
    - Avoid duplicates (case-insensitive compare).
    - Prefer inserting into matching category name when present; otherwise add into “Suggested Skills” category.
  - Validation: selecting single skill adds exactly once; select-all adds all non-duplicates.

- [x] Task 4: Add “Perfect Score” improvement summary section
  - Add a secondary view/tab/accordion within the suggestions card that shows:
    - Experience improvements
    - Gaps (skills/experience/education)
    - Grammar/clarity suggestions
    - Other ATS/formatting factors (if available from existing analysis)
  - Prefer using an existing comprehensive analysis endpoint if present; otherwise extend AI service.
  - Validation: renders with loading/error states and does not block skills insertion when analysis fails.

- [x] Task 5: Wire role context into the request
  - Determine target role source precedence:
    1) Selected job context (if available)
    2) Existing “role” field in editor/resume-enhancer state
    3) Fallback “General”
  - Validation: role shown in the suggestions UI; requests include role.

- [x] Task 6: Add minimal tests / verification steps
  - Add a small unit test for the “merge skills without duplicates” helper (if extracted).
  - Manual verification checklist run:
    - Open Skills → Suggest Skills → Select/Add → Skills updated
    - Switch role context (if applicable) → suggestions change

# Task Dependencies
- Task 3 depends on Task 1 and Task 2.
- Task 4 can be developed in parallel with Task 3 once the card/modal exists.
