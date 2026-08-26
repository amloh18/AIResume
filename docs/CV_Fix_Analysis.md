# Root Cause Analysis and Definitive Fixes for CV Builder Pro Issues

This document outlines the systematic investigation, root causes, and clear actionable fixes for the four core issues identified in the CV Canvas Engine and database persistence layer.

---

## 1. Issue: Spacing and Layout Lost on File Reopen
### **Context and Symptoms**
After editing a CV, choosing a layout, adjusting design values (font size, margin, line spacing), and saving, reopening the CV resets everything to defaults.

### **Root Cause**
* **Stale S3 Overwrites on Stale Reads:** 
  During a standard save operation (`PUT` in `/api/cvs/[id]`), the server correctly parses and sets the nested metadata/cvData (including `canvasDesign`, `canvasTemplate`, and `canvasZones`) on the document, then issues `await CV.updateOne(...)` using `$set`.
  Immediately after this update, the S3 backup process is triggered. Instead of utilizing the freshly-saved document, it retrieves the original `cv` document object via `cv.cvData` and `cv.metadata` which has stale/missing fields. It then does `await cv.save()` (a full Document write) to persist the S3 URL. This `cv.save()` triggers Mongoose setters on the *stale memory object*, overwriting the database update with the old, pre-save states.
* **Mongoose Legacy Format Hook Destroys `cvData` Metadata:**
  In `src/models/CV.ts`, the `pre('save')` hook automatically syncs `resumeData` back to `cvData` using `migrateToLegacyFormat(this.resumeData)`. However, `migrateToLegacyFormat` reconstructs a raw, clean `UnifiedCVDataStructure` which **does not map or preserve any metadata, custom zones, or layout spacing**. This completely wipes the `cvData.metadata` object upon saving.

### **Definitive Fixes**
1. **Fix the pre-save Hook in `src/models/CV.ts`:**
   Modify the pre-save middleware to merge/preserve `metadata` and custom layout/spacing configurations inside `cvData` when rebuilding it from `resumeData`:
   ```typescript
   if (this.isModified('resumeData') && this.resumeData) {
     const { migrateToLegacyFormat } = require('@/lib/migrations/enhanced-resume-migration');
     const incomingMetadata = this.cvData?.metadata || {};
     this.cvData = {
       ...migrateToLegacyFormat(this.resumeData),
       metadata: {
         ...this.cvData?.metadata,
         ...incomingMetadata
       }
     };
   }
   ```
2. **Resolve S3 Backup Race Condition in `/api/cvs/[id]/route.ts`:**
   Change the post-save/S3 update operation to write directly to the database via `updateOne` using the ID instead of calling `await cv.save()` on a stale document instance.

---

## 2. Issue: Layout Switching Erases Refined Layout Customizations
### **Context and Symptoms**
Switching from Layout A to Layout B and back to Layout A wipes out all customizations (custom zones, block orders, spacing, etc.) previously refined for Layout A.

### **Root Cause**
* **Single Active Zone/Design State:**
  The `cvData.metadata` object only stores a single instance of active `canvasZones` and `canvasDesign`.
* **Destructive loadTemplate Function:**
  In `CVCanvasEngine.tsx`, when `loadTemplate(template)` is called, it constructs clean, raw default zones from the template configuration and replaces the active `zones` state entirely, overwriting any refined states. No local or database history is kept for individual template customizations.

### **Definitive Fixes**
* **Introduce a Template-Specific Customizations Map (`canvasTemplatesZones` and `canvasTemplatesDesign`):**
  Update `CVCanvasEngine.tsx` to cache layout custom states keyed by template ID. When loading a template:
  1. Store the currently active `zones` and `design` in `canvasTemplatesZones[activeTemplate.id]` and `canvasTemplatesDesign[activeTemplate.id]`.
  2. Before loading defaults for the next template, check if B already has saved customizations in the cache. If yes, load them; if not, fall back to template defaults.
  3. Persist this customizations cache in `cvData.metadata`.

---

## 3. Issue: CV Fails to Retain Configured Sections Across Sessions
### **Context and Symptoms**
Configured sections (such as hiding specific sections or moving them between sidebar/main columns) are reset between sessions or layout changes.

### **Root Cause**
Same as Issues 1 and 2. Because section arrangements are modeled as blocks inside `canvasZones`, any loss of the `cvData.metadata` object (due to stale S3 saves or legacy schema sync overwrites) or template-switching instantly resets the sections to hardcoded default arrangements.

### **Definitive Fixes**
Applying the fixes for **Issue 1** (fixing the hook and S3 save pattern) and **Issue 2** (layout-specific caching) fully resolves this issue. It ensures layout-specific section arrangements are safely persisted to the database and reloaded properly across sessions.

---

## 4. Issue: Zooming Canvas Alters CV Layout and Spacing
### **Context and Symptoms**
Zooming in/out on the canvas via app controls alters paragraph wrapping, column sizes, page pagination, and gaps, distorting the intended visual document spacing.

### **Root Cause**
* **Viewport-Dependent Spacing Calculations:**
  `computeCanvasLayoutMetrics` computes spacing metrics like `pageMarginPx`, `pageGapPx`, and `sectionGapPx` using the browser's raw `viewportWidth`, `viewportHeight`, and `devicePixelRatio`. When the browser zooms or changes size, these spacing properties are re-computed and altered dynamically, causing layout shifts.
* **Subpixel Wrap Oscillation in `getBoundingClientRect`:**
  The pagination algorithm in `CVCanvasEngine.tsx` relies on `getBoundingClientRect().height / scale` to measure heights of snippets. When the canvas is scaled, browser rendering engines round font sizes to subpixel boundaries. This causes words to wrap differently inside text containers at non-100% zoom levels, leading to height fluctuations. Because `usableHeight` calculations are exact, a 1px fluctuation can push a section onto a new page, altering page assignments completely.

### **Definitive Fixes**
1. **Fix Spacing Calculations in `computeCanvasLayoutMetrics`:**
   Modify layout calculations to make document spacing absolute and independent of browser viewport resizing or zoom. Keep padding and margin values constant in CSS pixels regardless of viewport width/height.
2. **Enforce Scale-Independent Height Matching:**
   Adjust the measurement of heights in `CVCanvasEngine.tsx` to prevent rounding errors. Ensure the element measurements are snapped to integer line heights, or add a layout threshold tolerance (e.g., 3-5px padding tolerance) when deciding page breaks to absorb zoom-related subpixel rendering oscillations.
