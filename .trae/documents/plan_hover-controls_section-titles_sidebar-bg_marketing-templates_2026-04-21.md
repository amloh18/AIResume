# Plan: Hover Controls, Editable Section Titles, Sidebar BG Color, Remove Marketing Snippet Templates

## Summary
- Remove the “floating hover header” that appears above a section title on hover, and instead show section controls inline on the existing section title row.
- Allow editing section titles directly in the CV (inline), and persist the user’s preferred defaults to the database under `preferences.cv.sectionTitles`.
- Fix the Design tab “Sidebar Background” color so it applies to sidebar layouts in the snippet-based builder.
- Ensure snippet-driven template previews are not present on marketing pages and only exist inside the authenticated builder/editor experience.

## Current State Analysis (Repo Grounding)
- Hover controls + section titles for snippet sections are handled in [CoreUI.tsx](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/components/cv-builder-pro/components/CoreUI.tsx).
- Design tab sets `--cv-sidebar-bg` but interactive sidebar layouts were using hard-coded Tailwind background classes in [CVCanvasEngine.tsx](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/components/cv-builder-pro/CVCanvasEngine.tsx).
- Section titles already exist on CV data as `cvData.sectionTitles` and are referenced by editable fields (`sectionTitles.<key>`). They already round-trip through the adapter: [CVBuilderProAdapter.tsx](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/components/cv-builder-pro/CVBuilderProAdapter.tsx).
- There is an existing per-user settings API and model suitable for storing defaults:
  - API: [api/user/settings/route.ts](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/app/api/user/settings/route.ts)
  - Model: [UserSettings.ts](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/models/UserSettings.ts)
- Marketing pages previously rendered snippet-template previews (via a landing component). We must ensure those previews are removed from public routes while keeping the in-app template library intact.

## Proposed Changes (Decision-Complete)

### 1) Inline section controls on the section title row (remove floating hover header)
**Files**
- Update [CoreUI.tsx](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/components/cv-builder-pro/components/CoreUI.tsx)

**What**
- Remove any hover UI that renders a separate “header bar” above the section title.
- Render Replace/Move/Delete/Drag (and other relevant controls like Add List Entry) inline on the existing section title row.

**How**
- Identify the snippet’s “primary title key” from snippet metadata (usually `SnippetComponent.category.toLowerCase()`).
- Inside the local `Title` renderer:
  - Render the title text using `EditableWrapper` at `sectionTitles.<titleKey>`.
  - Conditionally render an inline control cluster aligned to the right, only when:
    - `!readOnly`, and
    - `titleKey === primaryTitleKey` (avoid duplicate controls for nested titles).
- Ensure controls keep using existing handlers (replace/move/delete/add-list-entry) and remain hover-only.

**Success criteria**
- Hovering a section does not create any extra bar above the title.
- Controls appear on the title row and do not shift layout; they only fade in on hover.

### 2) Editable section titles with per-user persistence (`preferences.cv.sectionTitles`)
**Files**
- Update [UserSettings.ts](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/models/UserSettings.ts)
- Update [api/user/settings/route.ts](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/app/api/user/settings/route.ts)
- Update [Step3BuilderSurgeon.tsx](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/components/resume-enhancer/steps/Step3BuilderSurgeon.tsx)

**Data model**
- Store per-user defaults at: `UserSettings.preferences.cv.sectionTitles` (record of `sectionKey -> label`).
- Default mapping (canonical, as provided):
  - summary → Professional Summary
  - experience → Professional Experience
  - education → Education
  - projects → Projects
  - certifications → Certifications
  - awards → Awards
  - publications → Publications
  - volunteer → Volunteer Experience
  - references → References
  - skills → Skills
  - languages → Languages
  - interests → Interests
  - contact → Contact

**API behavior**
- Ensure `GET /api/user/settings` returns `preferences.cv.sectionTitles`.
- Ensure `PUT /api/user/settings` supports partial updates without overwriting the full `preferences.cv` object:
  - When request includes `settings.preferences.cv`, merge into existing `userSettings.preferences.cv`.

**Frontend behavior (Resume Enhancer builder step)**
- On builder mount (Step 3):
  - Fetch `/api/user/settings`.
  - If the current CV is missing/empty `cvData.sectionTitles`, initialize it from the user defaults merged with canonical defaults.
- On subsequent edits to `cvData.sectionTitles`:
  - Debounce a `PUT /api/user/settings` that persists the merged titles as user defaults.

**Success criteria**
- Clicking a section title allows inline editing.
- Title edits update the current CV immediately (preview/export reflects changes).
- Title edits persist across sessions as defaults (new CVs pick them up), but existing CVs are not overwritten if they already have titles.

### 3) Fix Design tab “Sidebar Background” color (interactive layouts)
**Files**
- Update [CVCanvasEngine.tsx](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/components/cv-builder-pro/CVCanvasEngine.tsx)

**What**
- Sidebar layouts must use `--cv-sidebar-bg` for the sidebar column background.

**How**
- In `renderCanvasLayout()` for sidebar-like layouts (`sidebar-left`, `sidebar-right`, `sidebar-left-dark`, `top-sidebar-left`, `top-sidebar-right`):
  - Remove any hard-coded sidebar background classes.
  - Apply `style={{ backgroundColor: 'var(--cv-sidebar-bg)' }}` to the sidebar column container.

**Success criteria**
- Changing “Sidebar Background” in the Design panel updates the sidebar column background in all sidebar layout variants.

### 4) Remove snippet-driven template previews from marketing pages
**Files**
- Update [app/page.tsx](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/app/page.tsx)
- Update [app/templates/page.tsx](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/app/templates/page.tsx)
- Delete the marketing snippet-template showcase component (if present under `src/components/landing/`).

**What**
- Marketing pages should not render the snippet-based template showcase/registry UI.
- The in-app builder template library remains available (e.g., inside [CVCanvasEngine.tsx](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/components/cv-builder-pro/CVCanvasEngine.tsx)).

**Success criteria**
- `/` and `/templates` do not import or render snippet template previews.
- Marketing routes continue to load without runtime errors.

## Assumptions & Decisions
- Controls should be inline on the existing section title row (not in a separate overlay above the section).
- Section title persistence is per-user defaults stored in user settings.
- “Snippet-driven templates only exist in the app” means: remove snippet-template previews from public marketing pages, not remove in-app template functionality.

## Verification Steps
- Static checks:
  - `npm run type-check`
  - `npm run lint`
- Manual UI checks (authenticated flow):
  - Open the builder/editor (e.g., [app/editor/page.tsx](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/app/editor/page.tsx)).
  - Hover sections: confirm no extra header bar above the title, and controls appear inline on the title row.
  - Edit a section title: refresh and create/open another CV: confirm defaults persist.
  - Design tab: change Sidebar Background: confirm sidebar column color updates across sidebar templates.
- Manual UI checks (public marketing routes):
  - Visit `/` and `/templates`: confirm no snippet-template showcase is displayed and no console/runtime errors.

## Troubleshooting Note (Verification Blocker)
- If `/editor` fails to load due to a bundler/HMR error (e.g., “module factory is not available”), treat it as a separate runtime issue:
  - Rebuild/restart dev server and clear Next build artifacts.
  - If still reproducible, isolate the exact import chain and fix the underlying module resolution/circular dependency.
