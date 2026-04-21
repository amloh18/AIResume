# Plan: Section Hover Controls, Section Titles, Sidebar Color, Remove Marketing Template Previews

## Summary
- Remove the floating hover header bar that appears above each CV section and instead render the section controls inline on the same row as the section title.
- Ensure section titles are editable inline and:
  - Update the current CV’s `cvData.sectionTitles` immediately (so preview/export uses it).
  - Persist the user’s preferred defaults to the database (per-user setting) for future CVs.
- Fix the “Sidebar Background” color picker so it actually affects sidebar layouts in the snippet-based builder.
- Remove the snippet-driven template/snippet showcase from marketing pages so snippet-driven templates only exist inside the authenticated app/editor.

## Current State Analysis (Repo Grounding)
### Hover header bar / controls
- The section hover UI is currently implemented as an absolutely-positioned “header bar” above each snippet container in [CoreUI.tsx](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/components/cv-builder-pro/components/CoreUI.tsx#L163-L196).
- This bar is positioned with `-top-[34px]`, which creates the unwanted “new header above the section title” effect the screenshot shows.

### Section titles already exist, but persistence is incomplete (per-user default requirement)
- Section titles are rendered using editable fields at `sectionTitles.<key>` in the builder:
  - [CoreUI.tsx](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/components/cv-builder-pro/components/CoreUI.tsx#L151-L159)
- The adapter already round-trips `sectionTitles` between the canvas format and unified CV schema:
  - Defaults are set in [CVBuilderProAdapter.tsx](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/components/cv-builder-pro/CVBuilderProAdapter.tsx#L99-L116)
  - The updated `sectionTitles` are copied back into unified CV data in [CVBuilderProAdapter.tsx](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/components/cv-builder-pro/CVBuilderProAdapter.tsx#L154-L158)
- However, there is currently no per-user storage for preferred section titles in settings. User chose “Per user default”.
- There is an existing user settings API and model:
  - API: [api/user/settings/route.ts](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/app/api/user/settings/route.ts)
  - Model: [UserSettings.ts](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/models/UserSettings.ts#L72-L106)

### Sidebar background color not applied in builder layouts
- The design panel updates `design.sidebarBgColor` in [CVCanvasEngine.tsx](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/components/cv-builder-pro/CVCanvasEngine.tsx#L295-L305).
- The CSS variable `--cv-sidebar-bg` is set on the wrapper, but in the interactive layout renderer, sidebar columns still use fixed Tailwind background classes (`bg-slate-50`, `bg-slate-800`) instead of the CSS variable:
  - [CVCanvasEngine.tsx](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/components/cv-builder-pro/CVCanvasEngine.tsx#L258-L266)

### Snippet-driven templates exposed on marketing pages
- The marketing/SEO pages currently import and render the snippet-driven builder showcase:
  - [app/page.tsx](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/app/page.tsx#L10-L16) and [app/page.tsx](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/app/page.tsx#L214-L216)
  - [app/templates/page.tsx](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/app/templates/page.tsx#L1-L3) and [app/templates/page.tsx](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/app/templates/page.tsx#L141-L143)
- The showcase implementation itself is in [PremiumTemplates.tsx](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/components/landing/PremiumTemplates.tsx).

## Proposed Changes (Decision-Complete)
### 1) Inline section controls on the section title row (remove floating header)
**Files**
- Update [CoreUI.tsx](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/components/cv-builder-pro/components/CoreUI.tsx)

**What**
- Remove the floating “header bar” container rendered on hover (the one positioned above the section with `-top-[34px]`).
- Move the controls into the section title renderer so they appear inline on the same row as the section title.

**How**
- In `CanvasSnippet`, compute the “primary title key” for the snippet (`SnippetComponent.category.toLowerCase()` with any necessary mapping).
- Update the local `Title` component to render:
  - Left: the editable title text (`EditableWrapper path="sectionTitles.<titleKey>"`)
  - Right: an inline controls cluster that is only visible on hover (`opacity-0 group-hover/inner:opacity-100`) and only for the primary title row.
- Ensure the control buttons continue to call existing handlers:
  - Replace: `onReplace(zoneId, index, instance.type)`
  - Move: `moveSnippet(zoneId, index, ±1)` (non-header snippets only)
  - Delete: `removeSnippet(zoneId, index)` (non-header snippets only)
  - Drag handle remains visual only (existing drag behavior stays attached to the snippet wrapper)
- Preserve current “Add list entry” logic (Experience/Education/Projects/etc) but move it to the inline title row (so it doesn’t render in a separate bar above the section).

**Success criteria**
- Hovering any section does not create an extra bar/header above the section title.
- Controls appear on the section title line, aligned to the right, and only on hover.

### 2) Fix Sidebar Background color in design tab (use CSS variable in interactive layouts)
**Files**
- Update [CVCanvasEngine.tsx](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/components/cv-builder-pro/CVCanvasEngine.tsx)

**What**
- Make all sidebar layout variants use `backgroundColor: 'var(--cv-sidebar-bg)'` for the sidebar column.

**How**
- In `renderCanvasLayout()` cases:
  - `sidebar-left`, `sidebar-right`, `sidebar-left-dark`, `top-sidebar-left`, `top-sidebar-right`:
    - Remove hard-coded Tailwind background color classes on the sidebar container.
    - Add inline style `backgroundColor: 'var(--cv-sidebar-bg)'`.
  - Keep `isDark` rendering for typography as-is (the `isDark` parameter passed into `renderZone` stays unchanged).

**Success criteria**
- Changing “Sidebar Background” in the Design panel visibly updates sidebar backgrounds for all sidebar layout templates.

### 3) Section title editing: persist as per-user defaults + apply to new CVs
User decision: save section title edits as **per-user defaults**.

**Files**
- Update [UserSettings.ts](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/models/UserSettings.ts)
- Update [api/user/settings/route.ts](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/app/api/user/settings/route.ts)
- Update [Step3BuilderSurgeon.tsx](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/components/resume-enhancer/steps/Step3BuilderSurgeon.tsx)
- (Optional small alignment) Update [canvas-initial-data.ts](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/lib/templates/canvas-initial-data.ts) to match the canonical default mapping provided.

**Data model**
- Store the defaults at:
  - `UserSettings.preferences.cv.sectionTitles: Record<string, string>`

**API behavior**
- Extend the PUT handler to support partial updates without overwriting the entire `preferences.cv` object.
  - Specifically: if request includes `settings.preferences.cv.sectionTitles`, merge it into existing `userSettings.preferences.cv` and preserve other existing CV prefs (`defaultTemplate`, `autoSave`, etc.).
- Ensure GET returns `preferences.cv.sectionTitles` so the builder can apply defaults.

**Frontend behavior**
- On Step 3 mount:
  - Fetch `/api/user/settings`.
  - If the response includes `preferences.cv.sectionTitles` and the current `state.cvData.sectionTitles` is missing/empty:
    - Initialize `state.cvData.sectionTitles` from the user defaults (dispatch `SET_CV_DATA` with merged `sectionTitles`).
- When section titles change in the builder:
  - Debounce (e.g., ~500–1000ms) and PUT to `/api/user/settings` with `{ settings: { preferences: { cv: { sectionTitles: <latest> }}}}`.
  - Keep updating the CV data immediately (already happens via `onDataChange` flow), so the current document reflects changes right away.

**Default mapping**
- Canonical default mapping (as provided in the request) used when neither CV nor user settings provide a value:
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

**Success criteria**
- User can click and edit a section title inline.
- The change persists across sessions as the user’s default titles (new CVs pick them up automatically).
- Existing CVs are not forcibly overwritten if they already have `cvData.sectionTitles`.

### 4) Remove snippet-driven template showcase from marketing pages
User decision: remove from marketing.

**Files**
- Update [app/page.tsx](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/app/page.tsx)
- Update [app/templates/page.tsx](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/app/templates/page.tsx)
- Delete [PremiumTemplates.tsx](file:///Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/components/landing/PremiumTemplates.tsx)

**What**
- Remove all imports/usages of `PremiumTemplates`.
- Remove the “Premium Templates” nav submenu entry that points to `#premium-templates` (since that section will be removed).
- Keep the rest of the landing and templates pages intact.

**Success criteria**
- Marketing pages no longer bundle or render the snippet-driven registry/templates/snippets.
- Snippet-driven templates remain available inside the authenticated builder/editor only.

## Assumptions & Decisions
- Controls placement: inline on the title row (chosen).
- Marketing: remove snippet-driven template previews from marketing pages (chosen).
- Section title persistence: saved as per-user defaults in `UserSettings.preferences.cv.sectionTitles` (chosen), while still updating the current CV’s `cvData.sectionTitles` live.
- DB: project uses MongoDB/Mongoose; per-user settings are stored in `UserSettings` (already in repo).

## Verification Steps
- Run typecheck and lint:
  - `npm run type-check`
  - `npm run lint`
- Manual UI checks:
  - In the builder, hover a section: verify no header bar appears above the title.
  - Verify controls appear inline on the title row and remain clickable.
  - Edit a section title, refresh page, create/open another CV: verify the edited titles are applied as defaults.
  - In Design tab, change Sidebar Background: verify sidebar color updates for `sidebar-left`, `sidebar-right`, `top-sidebar-*`, and `sidebar-left-dark`.
  - Visit `/` and `/templates`: verify no snippet/template showcase is rendered and pages load without console errors.

