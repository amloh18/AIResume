# CV Rendering Issues — Step 3 Editor (Review)

**Date:** 2026-07-07  
**Scope:** CV building, rendering, and download pipeline during Step 3 (`ResumeEnhancer` → `Step3CV`)  
**Severity scale:** Critical | High | Medium | Low  

---

## 1. Scope & Architecture Summary

Step 3 of the CV editor renders a live, editable document. The pipeline is:

```
ResumeEnhancerContainer
  → Step3CV
    → CVBuilderProAdapter
      → normalizeCvDataForCanvas(cvData)
        → CVCanvasEngine
          → EditableField / ListEntry / CanvasZone (DOM editing)
          → onDataChange(updatedCanvasData)
            → CVBuilderProAdapter.handleDataChange
              → reverse-map to UnifiedCVDataStructure
              → ResumeEnhancerContext SET_CV_DATA
```

**PDF / Download paths:**
- Client-side: `downloadCanvasAsPDF` (`src/lib/utils/downloadCanvas.ts`) → `html2canvas` → `jsPDF` addImage
- Server-side: `/api/cvs/[id]/download` → `PDFService.generatePDFFromHTML` → Puppeteer → `page.pdf()` (text-based)
- Fallback: `PDFService.generatePDFFallback` → `jsPDF`

---

## 2. Identified Issues

### 2.1 CRITICAL — Client-Side PDF Is Rasterized, Not Text-Selectable

**File:** `src/lib/utils/downloadCanvas.ts`  
**Lines:** 56–62 (comment), 166–196 (implementation)

**Finding:**  
The file header claims the utility produces **pixel-perfect, text-selectable PDFs** using `jsPDF html method` (lines 56–62). However, lines 166–196 actually capture each `.cv-page` with `html2canvas`, convert to JPEG data URLs, and stamp them as images using `doc.addImage(..., 'JPEG', ...)`. The resulting PDF is **image-based** with no selectable text.

**Impact:**  
- ATS parsers cannot read text.  
- File sizes are large.  
- Users cannot copy/paste content.  
- Scaling/zooming produces blurry text.

**Code:**
```ts
// downloadCanvas.ts:180-184
const imgData = canvas.toDataURL('image/jpeg', 0.95);
if (i > 0) {
  doc.addPage([dims.widthPx, dims.heightPx], 'portrait');
}
doc.addImage(imgData, 'JPEG', 0, 0, dims.widthPx, dims.heightPx);
```

**Recommended Fix:**
1. Replace `html2canvas` with a proper HTML→PDF renderer that preserves text (e.g., Puppeteer `page.pdf()` or `pdf-lib` with embedded fonts).
2. If `html2canvas` must be kept for preview accuracy, route downloads to the **server-side** `/api/cvs/[id]/download` which already uses text-based Puppeteer rendering (`src/lib/services/pdfService.ts:177-247`).
3. Update comment to match reality if image-based export is intentionally a “quick print” fallback.

---

### 2.2 CRITICAL — Location Object Loss During Normalization Round-Trip

**Files:**
- `src/lib/utils/cv-canvas-normalizer.ts:49-53`
- `src/components/cv-builder-pro/CVBuilderProAdapter.tsx:40-49`

**Finding:**  
`normalizeCvDataForCanvas` converts the structured `location` object into a comma-separated string (line 52). When changes come back from the canvas, `CVBuilderProAdapter` splits the string back, but only restores `city`, `countryCode`, and `region`. The `address` and `postalCode` fields are **permanently dropped**.

**Code:**
```ts
// cv-canvas-normalizer.ts:49-53
if (typeof translated.basics.location === 'object' && translated.basics.location !== null) {
  const loc = translated.basics.location;
  translated.basics.location = [loc.city, loc.region, loc.countryCode].filter(Boolean).join(', ');
}

// CVBuilderProAdapter.tsx:40-49
if (typeof updatedBasics.location === 'string') {
  newCvData.basics.location = {
    city: updatedBasics.location,
    countryCode: '',
    region: ''
  };
}
```

**Impact:**  
- Postal codes and street addresses are silently lost when a user edits anything in Step 3.
- Datastore drift across successive save cycles.

**Recommended Fix:**
- Store location as a structured object in the canvas state, or preserve the full original object in metadata and merge it back in `handleDataChange`.
- If flattening is required, encode the full struct in JSON and parse it back, or add `address`/`postalCode` to the split/merge logic.

---

### 2.3 HIGH — Education Degree Parsing Breaks Without `" in "` Separator

**File:** `src/components/cv-builder-pro/CVBuilderProAdapter.tsx`  
**Lines:** 189–218

**Finding:**  
`handleDataChange` splits `education[].degree` on `" in "` to derive `studyType` and `area`. If the degree does not contain that separator (e.g., `"BS"`, `"MBA"`, `"High School Diploma"`), the fallback produces `studyType` = full string and `area` = empty string, which is an incorrect shape.

**Code:**
```ts
// CVBuilderProAdapter.tsx:193-195
if (edu.degree && edu.degree.includes(' in ')) {
  [studyType, area] = edu.degree.split(' in ');
}
// studyType becomes full degree, area becomes ""
```

**Impact:**  
- Education section formatting breaks for common degree formats.  
- `studyType` and `area` are swapped/lost, leading to lumps of text in the wrong field.

**Recommended Fix:**
- Introduce a more robust parser (regex or configurable separator list) or store `studyType` and `area` as separate fields in canvas state.
- Fallback: if no separator found, set `studyType = edu.degree` and `area = ''` explicitly, but surface a warning or keep both values.

---

### 2.4 HIGH — Skills Data Shape Is Dual and Fragile

**Files:**
- `src/lib/utils/cv-canvas-normalizer.ts:107-124`
- `src/components/cv-builder-pro/CVBuilderProAdapter.tsx:220-253`

**Finding:**  
Skills mutate between two incompatible shapes:
1. **Array of groups:** `[{ category, skillsText }]` (canvas) ↔ `[{ category, skills[] }]` (unified).
2. **Object shorthand:** `{ languages, frameworks, tools }` (legacy strings) ↔ `[{ category, skills[] }]` (unified).

The adapter contains branching logic to handle both, but this dual-shape contract is undocumented and brittle. Any template or migration that emits a slightly different shape (e.g., `keywords` instead of `skills`) drops data.

**Code:**
```ts
// CVBuilderProAdapter.tsx:220-252
if (Array.isArray(updatedCanvasData.skills)) {
  // object→array split
} else if (typeof updatedCanvasData.skills === 'object') {
  // legacy string fields
}
```

**Impact:**  
- Skills categories merge, duplicate, or vanish depending on source.  
- Rating metadata is lost if present.

**Recommended Fix:**
- Adopt a single canonical shape across all templates and the canvas engine.
- If backward compatibility is required, centralize the normalization in one helper (`normalizeSkillsText` already exists) and add TypeScript types for both shapes.

---

### 2.5 HIGH — Languages / Interests Comma Splitting Breaks Multi-Word Values

**File:** `src/lib/utils/cv-canvas-normalizer.ts:126-132`  
**File:** `src/components/cv-builder-pro/CVBuilderProAdapter.tsx:255-269`

**Finding:**  
The normalizer flattens `languages` and `interests` arrays into comma-joined strings. The adapter splits them back with `.split(',')`. Values containing commas (e.g., `"Mandarin Chinese, Cantonese"`, `"Open Source, Community"`) are incorrectly tokenized.

**Code:**
```ts
// cv-canvas-normalizer.ts:126-132
if (Array.isArray(cvData.languages)) {
  translated.languages = cvData.languages.map((l: any) => l.language || l).join(', ');
}
if (Array.isArray(cvData.interests)) {
  translated.interests = cvData.interests.map((i: any) => i.name || i).join(', ');
}

// CVBuilderProAdapter.tsx:255-269
if (typeof updatedCanvasData.languages === 'string') {
  newCvData.languages = updatedCanvasData.languages.split(',').map(...);
}
```

**Impact:**  
- Single interests/languages with commas are split into multiple entries.  
- Users see phantom entries after editing.

**Recommended Fix:**
- Stop flattening arrays to strings. Pass structured arrays through the canvas layer.
- If strings are required, use a non-ambiguous delimiter (e.g., JSON-encoded array, pipe `|`) and decode deterministically.

---

### 2.6 HIGH — Pre-Save Hook Risks Metadata Wipe on `resumeData` Update

**File:** `src/models/CV.ts`  
**Lines:** 289–308 (per exploration findings)

**Finding:**  
When `resumeData` changes, a Mongoose pre-save hook calls `migrateToLegacyFormat` and manually preserves `metadata` and `sectionTitles`. Other nested fields such as `canvasTemplatesZones`, `canvasTemplatesDesign`, `analysisSnapshot`, and `surgeonAnalysis` are **not preserved**. Additionally, the hook uses a dynamic `require(...)` inside the hook body, which can fail silently on path changes.

**Impact:**  
- Canvas design state, template zones, and AI analysis disappear on autosave.  
- Silent data loss across save cycles.

**Recommended Fix:**
- Deep-merge the entire existing `metadata` object with the migrated version instead of manual field-by-field preservation.
- Move the dynamic import to the top of the file or use a static import with explicit error handling.

---

### 2.7 HIGH — Optional Chaining Silently Erases User Canvas Customizations

**File:** `src/components/cv-builder-pro/CVCanvasEngine.tsx`  
**Lines:** 509, 531 (per exploration findings)

**Finding:**  
The engine reads customization data with optional chaining:
```ts
const rawZones = cvData.metadata?.canvasTemplatesZones?.[activeId] || cvData.metadata?.canvasZones;
```
If both lookups are missing, the engine falls back to template defaults **without warning**, erasing any manual zone reordering or design changes.

**Impact:**  
- User customizations are silently lost after theme switches or template changes.  
- Difficult to debug because no error is thrown.

**Recommended Fix:**
- Log a warning when falling back to defaults so that data-loss paths are visible in devtools.
- Guard defaults behind an explicit “hasCustomizations” check and render a placeholder block indicating customization is missing.

---

### 2.8 MEDIUM — Page Break and A4 Dimension Drift Between Preview and PDF

**Files:**
- `src/components/cv-builder-pro/layout-utils.ts:20-33`
- `src/lib/utils/downloadCanvas.ts:14-18`
- `src/lib/utils/pageBreakHelper.ts:6-7`

**Finding:**  
Multiple files define A4 dimensions with slightly different values:
- `layout-utils.ts`: `widthPx: 793.7008`, `heightPx: 1122.5197` (derived from mm/in → px)
- `downloadCanvas.ts`: `widthPx: 794`, `heightPx: 1123`
- `pageBreakHelper.ts`: `A4_WIDTH_PX = 794`, `A4_HEIGHT_PX = 1122`
- `pdfService.ts` (server): `viewportWidth = 794` for A4, `816` for Letter

These minor mismatches accumulate into **1–2 px per page** of layout drift, causing visible content shifts between the canvas preview and the exported PDF.

**Impact:**  
- Page breaks appear at different positions in preview vs download.  
- Text reflows differently, causing section orphans or clipped content.  
- User complaints of “the PDF looks different from what I edited.”

**Recommended Fix:**
- Centralize page dimensions in a single constants module (e.g., `src/lib/constants/pageMetrics.ts`).
- Export `A4_WIDTH_PX`, `A4_HEIGHT_PX`, `LETTER_WIDTH_PX`, `LETTER_HEIGHT_PX` and import everywhere.
- Align `pdfService.ts` viewport with the same constants.

---

### 2.9 MEDIUM — Direct State Mutation Before Dispatch in Step3CV

**File:** `src/components/resume-enhancer/steps/Step3CV.tsx`  
**Lines:** 1089–1126, 1284–1290 (per exploration findings)

**Finding:**  
`addNewSection` and `handleSectionReorder` mutate `state.cvData.structure.sections` (a nested array/object) before dispatching the reducer action. While the top-level `cvData` reference is replaced via spread, nested objects may still share references with previous state.

**Impact:**  
- React may miss nested updates if reference equality is checked shallowly.  
- Undo/redo history may capture mutated state rather than the pre-mutation snapshot.  
- Race conditions with concurrent edits.

**Code pattern:**
```ts
// Step3CV.tsx (illustrative)
const updatedSections = [...state.cvData.structure.sections];
updatedSections.splice(targetIndex, 0, newSection);
dispatch({ type: 'SET_CV_DATA', payload: { ...state.cvData, structure: { sections: updatedSections } } });
```

**Recommended Fix:**
- Use immutable helpers (e.g., `immer`, or deep clone before mutation).
- Ensure the reducer never mutates its input state.

---

### 2.10 MEDIUM — PDF Viewport and CSS `@page` Margin Double-Padding Risk

**File:** `src/lib/services/pdfService.ts`  
**Lines:** 177–247

**Finding:**  
`generatePDFFromHTML` hardcodes viewport dimensions and sets Puppeteer `page.pdf()` margins to `0mm` on the assumption that the HTML already contains `@page { margin: 12mm 15mm }`. If the rendered HTML omits `@page` margins or uses different values, the resulting PDF has either no margins or double margins (if both HTML and Puppeteer margins are set).

**Code:**
```ts
// pdfService.ts:177-194
await page.setViewport({
  width: viewportWidth,
  height: 10000,
  deviceScaleFactor: 1 // No scaling to match CSS exactly
});
// ...
margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
```

**Impact:**  
- Templates without explicit `@page` rules render edge-to-edge.  
- Custom CSS in user snippets may override `@page`, producing unpredictable margins.

**Recommended Fix:**
- Inject a canonical `@page` rule in the HTML head before rendering if not already present.
- Compute Puppeteer margins from the actual `@page` CSS values using `page.evaluate` and pass them to `page.pdf()`.

---

### 2.11 MEDIUM — `JSON.parse(JSON.stringify())` Strips Non-Serializable Runtime Metadata

**File:** `src/components/cv-builder-pro/CVBuilderProAdapter.tsx`  
**Line:** 31

**Finding:**  
`handleDataChange` deep-clones `cvData` via `JSON.parse(JSON.stringify(cvData))`. This strips `undefined`, functions, `Date` objects, `Map`, `Set`, and circular references. The `UnifiedCVDocument.metadata.lastModified` and `createdAt` are `Date` per the schema.

**Code:**
```ts
// CVBuilderProAdapter.tsx:31
const newCvData = JSON.parse(JSON.stringify(cvData));
```

**Impact:**  
- `Date` fields in `metadata` become ISO strings or are lost, breaking any downstream code expecting `Date` objects.  
- If `metadata` ever contains runtime-only fields (e.g., undo stacks), they are silently removed.

**Recommended Fix:**
- Use a proper deep-clone utility that preserves `Date` (e.g., `structuredClone` in modern environments, or a custom replacer/reviver).

---

### 2.12 MEDIUM — `downloadCanvasAsPDF` SVG Inlining Is Unreliable and May Break Icons

**File:** `src/lib/utils/downloadCanvas.ts`  
**Lines:** 127–161

**Finding:**  
The function replaces inline SVGs with `<img>` tags using `btoa(unescape(encodeURIComponent(svgString)))`. Issues:
- `svgString.replace(/currentColor/g, color)` replaces all occurrences, including `currentColor` inside attribute values or text nodes.
- Lucide icons may use `stroke="currentColor"` and `fill="none"`; after replacement, the base64 image loses crisp vector scaling and becomes raster-equivalent at high zoom.
- The matching logic `cvDoc.querySelector(svg[class*="${svg.classList[0]}"])` may clone the incorrect node if classes collide.

**Impact:**  
- Icons become blurry or disappear in PDFs.  
- Color tokens may be incorrectly replaced.

**Recommended Fix:**
- Use `XMLSerializer` + Blob URLs rather than base64, and verify `currentColor` replacement is scoped to presentation attributes only.
- Alternatively, inline SVG paths as text in jsPDF for true vector preservation.

---

### 2.13 MEDIUM — Template Fallback Ignores User-Selected Design Context

**Files:**
- `src/app/api/cv/export/route.ts` (per exploration)

**Finding:**  
When exporting and the active template is missing, the export route builds a hardcoded `{ id: 'default', name: 'Default Template', globalStyles: { ... } }`. This ignores any user-selected design, custom fonts, accent colors, or snippet overrides, producing a generic export that does not match the editor preview.

**Impact:**  
- Users see a different CV in the downloaded PDF than what they edited.  
- Custom branding (colors, fonts) is lost on export.

**Recommended Fix:**
- If the active template is missing, derive export template from `cvData.metadata.canvasTemplate` or `cvData.metadata.canvasTemplatesDesign` before falling back to defaults.

---

### 2.14 MEDIUM — `TemplateRenderer` Memo Uses `JSON.stringify` for Deep Equality

**File:** `src/lib/templates/template-renderer.tsx`  
**Lines:** 353–363

**Finding:**  
The `memo` comparator stringifies `sectionOrder`, `sectionVisibility`, `enabledSections`, and `customStyles` on every render. For large CVs this is O(n) on every prop change and blocks the main thread during edits.

**Code:**
```ts
export const TemplateRenderer = memo(TemplateRendererComponent, (prevProps, nextProps) => {
  return (
    prevProps.cvData === nextProps.cvData &&
    prevProps.template === nextProps.template &&
    JSON.stringify(prevProps.sectionOrder) === JSON.stringify(nextProps.sectionOrder) &&
    JSON.stringify(prevProps.sectionVisibility) === JSON.stringify(nextProps.sectionVisibility) &&
    JSON.stringify(prevProps.enabledSections) === JSON.stringify(nextProps.enabledSections) &&
    JSON.stringify(prevProps.customStyles) === JSON.stringify(nextProps.customStyles)
  );
});
```

**Impact:**  
- Edit latency increases with CV complexity.  
- `JSON.stringify` reserializes objects on every keystroke in `contenteditable` fields.

**Recommended Fix:**
- Replace stringified comparisons with referential equality or a shallow `isEqual` from `lodash` / a custom comparator.
- Memoize `sectionOrder`, `sectionVisibility`, `enabledSections`, and `customStyles` upstream so referential checks are sufficient.

---

### 2.15 MEDIUM — Page Break CSS Is Always Injected in Preview

**File:** `src/lib/utils/pageBreakHelper.ts`  
**Lines:** 45–165

**Finding:**  
`generatePageBreakCSS()` emits `@media print` and broad `.cv-preview-page` rules. If this CSS is injected into the live editor iframe/document, it may alter on-screen layout (e.g., `page-break-after: always` on `.cv-preview-page`), causing visual glitches or extra blank pages during editing.

**Impact:**  
- Extra blank spaces between pages in the canvas.  
- Editing in preview mode behaves differently than in edit mode.

**Recommended Fix:**
- Scope page-break styles to a wrapper class (e.g., `.pdf-preview-mode`) and only inject when the user explicitly requests print preview or download.

---

## 3. Summary Table

| # | Issue | Severity | Files Affected |
|---|-------|----------|---------------|
| 2.1 | Client PDF is rasterized, not text-selectable | Critical | `downloadCanvas.ts` |
| 2.2 | Location `address` / `postalCode` lost in round-trip | Critical | `cv-canvas-normalizer.ts`, `CVBuilderProAdapter.tsx` |
| 2.3 | Education degree parsing breaks without `" in "` | High | `CVBuilderProAdapter.tsx` |
| 2.4 | Skills dual-shape (array vs object) contract is fragile | High | `cv-canvas-normalizer.ts`, `CVBuilderProAdapter.tsx` |
| 2.5 | Languages/interests comma-splitting corrupts multi-word values | High | `cv-canvas-normalizer.ts`, `CVBuilderProAdapter.tsx` |
| 2.6 | Pre-save hook wipes canvas metadata on `resumeData` update | High | `CV.ts` (model) |
| 2.7 | Optional chaining silently falls back to template defaults | High | `CVCanvasEngine.tsx` |
| 2.8 | A4 dimension drift across layout/utils/download files | Medium | `layout-utils.ts`, `downloadCanvas.ts`, `pageBreakHelper.ts`, `pdfService.ts` |
| 2.9 | Direct state mutation before dispatch in Step3CV | Medium | `Step3CV.tsx` |
| 2.10 | PDF viewport/`@page` margin double-padding risk | Medium | `pdfService.ts` |
| 2.11 | `JSON.parse(JSON.stringify())` strips Date/undefined | Medium | `CVBuilderProAdapter.tsx` |
| 2.12 | SVG inlining via `btoa` is unreliable and degrades icons | Medium | `downloadCanvas.ts` |
| 2.13 | Export route ignores user template design context | Medium | `api/cv/export/route.ts` |
| 2.14 | `TemplateRenderer` memo uses `JSON.stringify` for equality | Medium | `template-renderer.tsx` |
| 2.15 | Page break CSS always injected, cluttering preview | Medium | `pageBreakHelper.ts` |

---

## 4. Recommended Immediate Work (Prioritized)

1. **Stop claiming the client download is text-selectable** — either reimplement with a text-based engine or redirect downloads to the server-side Puppeteer path.
2. **Fix the location round-trip** — preserve `address` and `postalCode` through normalization.
3. **Normalize data shapes** — add a single source-of-truth normalizer for skills, languages, and interests so the canvas never emits ambiguous structures.
4. **Centralize page metrics** — one constants file for A4/Letter geometry, consumed by layout, preview, and PDF generation.
5. **Hardening the pre-save hook** — deep-merge metadata instead of manual field whitelisting.
6. **Replace `JSON.parse(JSON.stringify())`** with `structuredClone` or a typed deep-clone utility.

---

*Document generated from static review of the cvcircle_app codebase.*
