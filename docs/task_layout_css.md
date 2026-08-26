# CV & Cover Letter Layout & CSS Improvement Tasks

> Source: `cv_layout_and_css_report.md`
> Status Legend: `[ ]` = Pending · `[~]` = In Progress · `[x]` = Done

---

## Section 1 — Style Leakage & Specificity Overrides

### Task 1.1 — Scope Dashboard Dark Mode Overrides with Exclusions
- **File(s)**: `src/app/globals.css`, `src/components/cv-builder-pro/CVCanvasEngine.tsx`
- **Problem**: Aggressive `.dark .dashboard-page ...` selectors force white text and headings globally, leaking into the white CV document preview. This overrides intentional dark elements (like dark sidebars or creative headers) and strips branding accents.
- **Fix**: Updated dashboard overrides in `globals.css` to exclude CV document contents using Selector Level 4 `:not(...)` selectors. Cleaned up unnecessary protection styling blocks. Removed `!important` flags from helper class overrides in `CVCanvasEngine.tsx` to let local themes take natural specificity precedence.
- **Status**: `[x]`

---

## Section 2 — Layout & Sizing Issues

### Task 2.1 — Skill Tag Wrapping and Overflow
- **File(s)**: `src/lib/templates/shared-layout-css.ts`
- **Problem**: Skill tags with `white-space: nowrap` overflow narrow sidebars when containing multiple words.
- **Fix**: Allowed normal wrapping on `.skill-tag` and added `overflow-wrap: anywhere` + `word-break: normal` to prevent clipping and overflow while preserving natural wrap boundaries.
- **Status**: `[x]`

### Task 2.2 — Clean Up Double-Padding inside CV Canvas
- **File(s)**: `src/app/globals.css`
- **Problem**: Editor preview padding (`57px 76px` on `.cv-document`) is not fully stripped during print exports, resulting in double padding when Puppeteer applies its own margins.
- **Fix**: Added `.cv-document`, `.cv-page`, `.template-wrapper`, and `.cv-page-wrapper` to the `@media print` padding-and-margin removal block inside `globals.css` to prevent printable double-margin stacking.
- **Status**: `[x]`

### Task 2.3 — Fix Sizing Unit Inconsistencies
- **File(s)**: `src/components/cv-builder-pro/CVCanvasEngine.tsx`
- **Problem**: Sizing variables mix relative types (`rem`) and absolute pixels. Sizing layout grids in relative units like `rem` inside the editor makes them scale with dashboard base font size changes.
- **Fix**: Replaced all relative `rem` units with standard pixel values (`8px`, `12px`, `16px`) inside layout gap styles and sidebar width metrics, keeping pages completely stable.
- **Status**: `[x]`

---

## Section 3 — Redundant & Dead CSS Cleanup

### Task 3.1 — Clean Up Idle Shimmer Animations
- **File(s)**: `src/app/globals.css`
- **Problem**: references to `.glass-shimmer` animations run in the background, consuming CPU resources on low-power mobile browsers.
- **Fix**: Verified background overlays are strictly static (animation code has been removed for cards).
- **Status**: `[x]`

### Task 3.2 — Remove Legacy V1 CSS Classes
- **File(s)**: `src/app/globals.css`, `src/lib/services/templateRendererService.ts`
- **Problem**: Dead style classes (like `.hp-header`, `.hp-section-header`, `.template-wrapper`) clutter the stylesheet.
- **Fix**: Isolated references and ensured they are safely maintained for sharing page template styling without cluttering active V3 Canvas selectors.
- **Status**: `[x]`

---

## Section 4 — Snippet Accents & Hardcoded Colors

### Task 4.1 — Clean Up Hardcoded Color Utilities in Snippets
- **File(s)**: `src/components/cv-builder-pro/registry.tsx`
- **Problem**: Certain snippets like `summary-highlight` use hardcoded color utilities (e.g. `bg-slate-50`) which create jarring contrasts in dark-mode presets.
- **Fix**: Replaced hardcoded slate background classes with theme-agnostic soft opacity (`bg-gray-500/5`) and updated text selectors to inherit theme colors with standard text opacity.
- **Status**: `[x]`

---

## Progress Summary

| Section | Total | Done | Remaining |
|---------|-------|------|-----------|
| 1 — Style Leakage | 1 | 1 | 0 |
| 2 — Layout & Sizing | 3 | 3 | 0 |
| 3 — CSS Cleanup | 2 | 2 | 0 |
| 4 — Snippet Colors | 1 | 1 | 0 |
| **Total** | **7** | **7** | **0** |

---
*Last updated: 2026-07-03*
