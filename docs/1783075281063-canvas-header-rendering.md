# Implementation Plan: Canvas Header Rendering Fixes

This plan outlines the changes required to align the live CV canvas header rendering with the layout thumbnails and snippet previews perfectly, incorporating dynamic font size adjustment, avatar layout readjustment, vertical sidebar corrections, character line-breaking bug fixes, and heading-to-subheading spacing optimization.

---

## 1. Dynamic Font Sizing & Formatting Rules

### A. Dynamic Font Scaling Equations
To guarantee that names, job titles, and horizontal contact fields fit on a single line and stay proportional to the global font size setting, we calculate responsive scales inside the React render function based on text length:

```typescript
// For Wide/Full-Width Headers (where isNarrow is false)
const nameLength = (data?.basics?.name || '').length;
const titleLength = (data?.basics?.title || '').length;

let nameScale = 2.5; // default wide
if (nameLength > 18) {
  nameScale = Math.max(1.4, 2.5 - (nameLength - 18) * 0.05);
}

let titleScale = 1.15; // default wide
if (titleLength > 24) {
  titleScale = Math.max(0.8, 1.15 - (titleLength - 24) * 0.015);
}

// For Narrow Sidebar Headers (where isNarrow is true)
let nameNarrowScale = 2.0; // default narrow
if (nameLength > 15) {
  nameNarrowScale = Math.max(1.1, 2.0 - (nameLength - 15) * 0.05);
}

let titleNarrowScale = 1.15; // default narrow
if (titleLength > 20) {
  titleNarrowScale = Math.max(0.75, 1.15 - (titleLength - 20) * 0.02);
}
```

### B. Single-Line Enforcements & Contact Lists
* Enforce `white-space: nowrap !important` (via standard classes/inline styles) on `cv-header-name` and `cv-header-role`.
* For inline contact lists, add the `cv-contact-horizontal` class to their container divs across all full-width headers. This applies `flex-wrap: nowrap !important; overflow: hidden;` and the responsive container query `font-size: min(calc(var(--cv-base-size) * 0.85), 2cqw) !important` to stay inline and never wrap.

### C. Vertical Contact Formatting Sidebars
* Keep vertical contact formatting (like `sidebar-contact`) as-is.
* When a profile photo is enabled (`showAvatar` is true) in a narrow sidebar header, dynamically reduce:
  1. Root container padding/gap (e.g. from `gap-6 pb-6` to `gap-3.5 pb-3.5`).
  2. Avatar `sizeClass` from `w-32 h-32` or `w-28 h-28` to `w-20 h-20` or `w-22 h-22`.
* Apply the length-based narrow scales (`nameNarrowScale` and `titleNarrowScale`) to keep text compact.

---

## 2. File-by-File Changes

### File: `src/components/cv-builder-pro/registry.tsx`

#### 1. Fix the Split Modern character line splitting
* **Issue**: The text wrapper `div` in `'header-split'` (line 343) lacks `w-full` or `flex-1`, causing it to collapse under flexbox layouts on the canvas and squeeze text characters onto separate lines.
* **Fix**: Change:
  ```tsx
  <div className={`min-w-0 flex flex-col ${alignClass}`}>
  ```
  to:
  ```tsx
  <div className={`min-w-0 w-full flex flex-col ${alignClass}`}>
  ```

#### 2. Enforce dynamic font scaling and inline single-line contacts
For all full-width renders in headers:
* Apply `{ fontSize: calc(var(--cv-base-size) * ${nameScale}) }` inline style to the `h1` or `<Editable path="basics.name" />` container.
* Apply `{ fontSize: calc(var(--cv-base-size) * ${titleScale}) }` inline style to the `h2` or `<Editable path="basics.title" />` container.
* Add `cv-contact-horizontal` to the wrapping contact `div` in:
  * `header-split` (line 349)
  * `header-avatar` (line 394)
  * `header-boxed` (line 444)
  * `header-executive` (line 490)
  * `header-creative` (line 587)
  * `header-typographic` (line 929)
  * `header-banner` (line 1010)

For all narrow `isNarrow` renders in headers (`header-minimal`, `header-split`, `header-avatar`, `header-boxed`, `header-executive`, `header-accent`, `header-creative`):
* Apply dynamic scales `{ fontSize: calc(var(--cv-base-size) * ${nameNarrowScale}) }` and `{ fontSize: calc(var(--cv-base-size) * ${titleNarrowScale}) }`.
* If `showAvatar` is true, reduce container padding/gap (e.g. from `gap-6` to `gap-4`, `pb-6` to `pb-4`) and adjust avatar dimensions (e.g. `sizeClass` of `AvatarEditable` to `w-20 h-20` or `w-22 h-22` depending on snippet).

#### 3. Remove excess extra space between headings and subheadings
* **Issue**: Standard layout lists separate heading and subheading into individual block flex items inside a `gap-x-1.5` container, which creates an artificial gap and looks like `"Role,    Company"`.
* **Fix**: Apply this adjustment across all 18 occurrences of standard layout entries in `registry.tsx`:
  1. Remove `gap-x-1.5` from the parent flexbox container `flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 mb-1.5 w-full` (change to `flex flex-wrap items-baseline gap-y-0.5 mb-1.5 w-full`).
  2. Change `max-w-full shrink-0` to `inline` for both the `h4` (heading) and `span` (subheading) tags.
  3. Change `,</h4>` to `, </h4>` (including a single trailing space) to render exactly `, ` between them.

---

## 3. Risks & Edge Cases
1. **Pasted markup or contenteditable tags**: `EditableField` handles input styling sanitization. Ensure text is parsed correctly when inline font size scale changes.
2. **Global Font Size settings**: Ensure CSS custom property `--cv-base-size` is correctly retrieved as a fallback if `design.fontSize` is not passed or undefined.

---

## 4. Verification & Validation Steps
1. **Visual Comparison**: Open the CV Builder, choose different templates (such as *Split Professional*, *Executive Sidebar Right*, or *Minimalist Single*), and compare live rendering with their modal templates/thumbnails in the template selector modal.
2. **Long Input Scaling Test**: Input a very long name (e.g., `"Alexander August von Bismarck-Schönhausen"`) and verify that it scales down smoothly on a single line instead of splitting or wrapping to a new line.
3. **Photo Toggle Test**: Toggle the avatar on and off on a narrow vertical layout template (e.g. *Creative Sidebar Left*) and verify that the layout spacing readjusts nicely without pushing content off-page.
