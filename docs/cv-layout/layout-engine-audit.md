# CV Layout Engine — Deep Architecture Audit

> **Date**: 2026-08-31
> **Scope**: Full rendering pipeline, measurement, pagination, templates, PDF export
> **Goal**: Understand root causes of layout/pagination gaps. Design "upside-down Tetris" model.

---

## 1. TWO PARALLEL RENDERING PIPELINES

The system has two independent rendering paths that share snippet components but diverge everywhere else:

### Canvas Pipeline (Interactive Editor)
```
Props normalization (CVBuilderProAdapter.tsx)
  → CVCanvasEngine.tsx (2864 lines)
    → CSS columns via inline `columnCount`
    → Manual page breaks via `pageBreaksRef` array of {blockId, y}
    → DOM measurement via getBoundingClientRect() / getInlineStyles()
    → Scale compensation: height / scale
    → useEffect triggers recalc on data/metrics changes
    → DOM rendering: nested divs with transform: scale()
```

### PDF Pipeline (Export)
```
PDFService.generatePDF()
  → Puppeteer page.goto(htmlUrl)
  → templateRendererService.renderToHTML()
    → fetch('http://localhost:3000/api/renderer/preview') POST
      → Builds UnifiedCVDataStructure from DB record
      → Converts via normalizeForPDF()
      → Renders React to string (ReactDOMServer.renderToString)
      → Wraps in MUI ServerStyleSheets + emotion
    → @page CSS rules for page size
  → Puppeteer page.pdf() with computed width/height
```

**Critical difference**: Canvas is measured via DOM + JS. PDF is rendered to HTML + printed to PDF. They are fundamentally different approaches.

### PDF Download Also Has Client-Side Path
```
handleDownloadPDF() in CVBuilderProAdapter.tsx
  → html2canvas(containerRef) captures DOM as image
  → jsPDF builds PDF from canvas
  → "WYSIWYG" — captures exactly what user sees in editor
  → Used when htmlContent is available AND mobile
```

**Three PDF paths, not two.** The client-side WYSIWYG path is used by `ExportDialog.tsx` when on mobile or when `htmlContent` is provided.

---

## 2. THE CANVAS ENGINE (CVCanvasEngine.tsx) — DETAILED BREAKDOWN

**Location**: `src/components/cv-builder-pro/CVCanvasEngine.tsx`
**Size**: 2864 lines (Monolithic — the single largest component in the system)

### 2.1 Props
```typescript
interface CVCanvasEngineProps {
  layout: UnifiedLayoutData;
  data: UnifiedSectionData;
  metrics?: PageMetrics;
  onMetricsChange?: (metrics: PageMetrics) => void;
  pageStyle?: 'classic' | 'modern' | 'ats-optimized' | 'atsultra' | 'balanced';
 ATSStyle?: 'optimized' | 'ultra' | 'balanced';
  mode?: 'editor' | 'ats';
  splitLayout?: boolean;
  onTextFocus?: (focus: TextFocusEvent) => void;
  isTyping?: boolean;
}
```

### 2.2 Data Flow
```
CVBuilderProAdapter (normalizes UnifiedCV → flat sections)
  ↓
CVCanvasEngine receives UnifiedLayoutData + UnifiedSectionData
  ↓
normalizeMetrics(metrics, DEFAULT_METRICS) — merges with defaults
  ↓
Builds PDF-compatible data structure (mimics PDF render format)
  ↓
Creates orderedPageData from flat sections
  ↓
Passes to layout page renderer (with pagination if columns enabled)
```

### 2.3 Key Files
| File | Lines | Role |
|------|-------|------|
| `CVCanvasEngine.tsx` | 2864 | Core engine, DOM measurement, pagination, render |
| `layoutHelpers.ts` | 400 | extractSectionFromChildren, renderLayoutPage |
| `useLayoutPagination.ts` | 60 | Pagination hook |
| `usePDFExport.ts` | 135 | Client-side PDF via html2canvas + jsPDF |
| `utils/formatting.ts` | 190 | Block rendering, duplicate filtering |
| `utils/layout.ts` | 20 | isChunkEmpty, shouldRenderSection |
| `CVBuilderProAdapter.tsx` | 322 | Props normalization, data transformation |

### 2.4 Layout Data Model
```
UnifiedLayoutData {
  metadata: { pageWidth, pageHeight, margins, fonts, colors, spacing }
  sections: [SectionKey]  // ordering
  sectionWeights: Record<SectionKey, number>
  sectionSplitting: Record<SectionKey, 'split' | 'keep'>
  sectionColumns: Record<SectionKey, number>
  sectionLayout: Record<SectionKey, 'single' | 'two-column'>
  sectionPresets: Record<SectionKey, string>
  // + feature flags: sectionDesignOverrides, sectionMoved, sectionCustomOrder, sectionSnippets
}
```

### 2.5 Page Data Model
```typescript
type PageDataItem = {
  id: string;        // Section key or custom section ID
  weight: number;    // For ordering
  children: PageDataChild[];  // Rendered content
};
```

### 2.6 Measurement
DOM measurement via `getBoundingClientRect()`:
```typescript
const measure = () => {
  const pageContainer = pageRef.current;
  const els = pageContainer.querySelectorAll('[data-block-id]');
  els.forEach((el, index) => {
    const blockId = el.getAttribute('data-block-id');
    const blockBottom = el.getBoundingClientRect().bottom;
    const blockTop = el.getBoundingClientRect().top;
    const sectionTop = sectionTopPositions[sectionId] || blockTop;
    const paddingTop = getInlineStyles(el).paddingTop;
    const paddingBottom = getInlineStyles(el).paddingBottom;
    const height = (blockBottom - sectionTop) + parseFloat(paddingBottom);
    if (height < MIN_BLOCK_HEIGHT_THRESHOLD) return; // Skip tiny blocks
    pageHeights[index] = Math.max(pageHeights[index], height + BOTTOM_PADDING_ALLOWANCE);
  });
};
```

**Key constants**:
- `MIN_BLOCK_HEIGHT_THRESHOLD = 20` — Skip blocks shorter than 20px
- `BOTTOM_PADDING_ALLOWANCE = 8` — Add 8px buffer to all measurements

### 2.7 Pagination Algorithm
```typescript
const runPagination = useCallback(() => {
  const totalHeight = pageHeight - margins.top - margins.bottom;
  let currentPage = 0;
  let remaining = totalHeight;
  let startPageY = 0;

  // Phase 1: Find forced page breaks (page-break-before/after)
  // Phase 2: Calculate content heights and split across pages
  // Phase 3: Account for section keepTogether
  // Phase 4: Apply column spacing (columns * columnSpacing)
}, [orderedPageData, pageHeight, margins, pages, sectionSplitting, sections, columnGap, columnCount, columnSpacing]);
```

**Force breaks**: Runs first, forces page breaks on entire sections. This is expensive — `O(n²)` where `n` = number of blocks with `keepTogether=keep`.

**Column splitting**: When `columnCount > 1`:
```typescript
if (columnCount > 1) {
  const columnCount = pageColumns ?? columnCount;
  const totalHeight = pageHeight - margins.top - margins.bottom;
  const adjustedContentHeight = totalHeight - COLUMN_SPACING_ALLOWANCE;
  const columnHeight = adjustedContentHeight / columnCount;
  // ... splits content into columns
}
```

### 2.8 Page Break Injection
```typescript
pageBreaksRef.current = pageBreaks.map(pageBreak => ({
  blockId: pageBreak.blockId,
  y: pageBreak.y + (margins.top + BOTTOM_PADDING_ALLOWANCE)
}));
```

### 2.9 Section Height Registration
```typescript
const updateSectionHeight = useCallback((sectionKey: string, height: number) => {
  sectionHeightsRef.current[sectionKey] = height;
}, []);
```

Called by each section component's `onHeightChange` callback. Triggers `forceUpdate()`.

### 2.10 Rendering
Sections render as nested divs with `data-page-break` markers:
```jsx
<LayoutPage pageData={pageData} pageNumber={i} columnCount={columnCount}>
  <div ref={pageRef} data-page={pageNumber}>
    {/* Section heading */}
    <div className="cv-section-heading" ...>
      {renderSectionHeading(sectionKey, ...)}
    </div>
    {/* Section content */}
    {renderSectionContent(sectionKey, ...)}
    {/* Column dividers */}
    {isChunk && <ColumnDivider />}
  </div>
</LayoutPage>
```

---

## 3. THE MEASUREMENT SYSTEM

### 3.1 DOM Measurement
The engine measures heights using `getBoundingClientRect()` on blocks:
- `[data-block-id]` — Block-level elements
- `[data-block-first-line-metrics]` — First line height (used for column height calculation)

**Block height calculation**:
```
height = (blockBottom - sectionTop) + paddingBottom + BOTTOM_PADDING_ALLOWANCE
```

Where `sectionTop` is the top position of the section containing the block (stored in `sectionTopPositions`).

### 3.2 Section Top Positions
```typescript
const [sectionTopPositions, setSectionTopPositions] = useState({} as Record<string, number>);
```

Updated in `useEffect` via `getBlockPositions` (lines 1649-1694) which measures section header positions.

### 3.3 Timing Problem
Heights are measured AFTER render via `useEffect`. This creates a "flash" of unpaginated content before pagination is applied. The `rAF` trick helps but doesn't eliminate it.

### 3.4 Measurement is Bidirectional
Section components report their own heights via `onHeightChange`:
```typescript
// In CVSectionsFactory, each section:
onHeightChange={(height) => updateSectionHeight(sectionKey, height)}
```

But this only updates `sectionHeightsRef` — it doesn't directly participate in pagination.

---

## 4. THE PDF PIPELINE

### 4.1 Server-Side Rendering
`templateRendererService.renderToHTML()`:
1. Creates `UnifiedCVDataStructure` from DB record
2. Converts to PDF format via `normalizeForPDF()`
3. Renders React to string via `ReactDOMServer.renderToString()`
4. Wraps in MUI `ServerStyleSheets` + emotion cache
5. Injects `@page` CSS rules for page dimensions
6. Returns full HTML document string

### 4.2 Puppeteer PDF Generation
`pdfService.generatePDF()`:
1. Checks cache first (if `cacheKey` provided)
2. Spawns Puppeteer browser via `puppeteerPoolService`
3. Creates new page, sets viewport
4. Sets content via `page.setContent()`
5. Generates PDF with `page.pdf()`
6. Returns PDF buffer

### 4.3 Page Dimensions
From `page-dimensions.ts`:
```typescript
export const PAGE_DIMENSIONS = {
  letter: { width: 816, height: 1056 }, // 8.5" × 11" at 96 DPI
  a4: { width: 794, height: 1123 },     // 210mm × 297mm at 96 DPI
};
```

### 4.4 PDF Template Spacing Presets
From `template-definitions.ts`, V2 templates use presets:
```typescript
spacing: { 0.7: { sectionGap: 12, blockGap: 6, snippetGap: 3, blockPadding: 6, headingMarginBottom: 4 } }
         { 0.8: { sectionGap: 16, blockGap: 8, snippetGap: 4, blockPadding: 8, headingMarginBottom: 6 } }
         { 0.9: { sectionGap: 20, blockGap: 10, snippetGap: 5, blockPadding: 10, headingMarginBottom: 8 } }
         { 1.0: { sectionGap: 24, blockGap: 12, snippetGap: 6, blockPadding: 12, headingMarginBottom: 10 } }
         { 1.1: { sectionGap: 28, blockGap: 14, snippetGap: 7, blockPadding: 14, headingMarginBottom: 12 } }
         { 1.2: { sectionGap: 32, blockGap: 16, snippetGap: 8, blockPadding: 16, headingMarginBottom: 14 } }
         { 1.3: { sectionGap: 36, blockGap: 18, snippetGap: 9, blockPadding: 18, headingMarginBottom: 16 } }
         { 1.4: { sectionGap: 40, blockGap: 20, snippetGap: 10, blockPadding: 20, headingMarginBottom: 18 } }
```

### 4.5 Font Handling
- PDF paths: System fonts (`Inter`, `Georgia`) via CSS `@import` from Google Fonts CDN
- Canvas editor: Uses `@remixicon/react` icons, custom CSS classes
- No dynamic font measurement — fonts are static CSS imports

---

## 5. TEMPLATE SYSTEM

### 5.1 Canvas Templates (15 active)
From `src/components/cv-builder-pro/registry.tsx`:

| Template | Section Layout | Style |
|----------|---------------|-------|
| modern-classic | default | two-column, full |
| modern-executive | stacked | two-column, full |
| bold-impact | side-accent | two-column, full |
| green-accent | side-accent | two-column, full |
| premium-dark | default | two-column, dark |
| premium-bold | stacked | two-column, full |
| professional-minimal | stacked | two-column, full |
| two-column-clean | two-column | two-column, clean |
| modern-minimal-v2 | two-column | two-column, modern |
| creative-serif | two-column | two-column, serif |
| professional-executive | two-column | two-column, executive |
| executive-classic | two-column | two-column, classic |
| classic-reversed | two-column | two-column, reversed |
| athena | two-column | two-column, athena |
| contemporary | two-column | two-column, full |

Each template defines:
- `sectionLayout`: `'default' | 'stacked' | 'side-accent' | 'two-column'`
- `sectionColumns`: default column count
- `sectionSnippets`: which snippet components for each section
- `sectionFonts`: font overrides
- `sectionDesignOverrides`: template-specific style overrides

### 5.2 Template Layout Taxonomy
Templates fall into 4 layout patterns:

**Pattern 1: Default (single column, full width)**
- `modern-classic`, `modern-executive`, `premium-dark`
- Full-width sections, no columns by default

**Pattern 2: Side Accent**
- `bold-impact`, `green-accent`
- Left sidebar accent (colored background), right content area

**Pattern 3: Stacked**
- `premium-bold`, `professional-minimal`
- Header + sections stacked vertically

**Pattern 4: Two-Column**
- `two-column-clean`, `modern-minimal-v2`, `creative-serif`, `professional-executive`, `executive-classic`, `classic-reversed`, `athena`, `contemporary`
- Left/right column split across sections

### 5.3 V2 Template System
5 templates in `src/lib/templates/v2/template-definitions.ts`:
- `contemporary`, `executive-classic`, `modern`, `professional`, `executive`
- All use spacing presets
- Have `schemaVersion: '2'`
- Support page size (letter/A4)

### 5.4 Section Splitting Rules
From `sectionWeights.ts`:
```typescript
export const sectionWeights: Record<string, number> = {
  contact: 1,       // TOP (always first)
  summary: 2,
  experience: 3,
  projects: 4,
  skills: 5,
  // Lower = bottom
};

export const sectionSplitting: Record<string, 'split' | 'keep'> = {
  summary: 'keep',      // Never split
  skills: 'keep',       // Never split
  education: 'keep',    // Never split
  // experience: 'split' (default)
  // projects: 'split' (default)
};
```

### 5.5 Column Counts
Default column counts from template registry:
```typescript
column: {
  count: 1,  // default
  // can be overridden via sectionColumns
}
```

Templates can override per-section:
```typescript
sectionColumns: { skills: 2, experience: 1 }
```

---

## 6. THE SNIPPET SYSTEM

### 6.1 Snippet Registry
```typescript
// snippetRegistry.ts
export type SnippetComponent = React.FC<SnippetRenderProps>;
type SnippetRegistry = Record<string, SnippetComponent>;
```

All snippet components receive:
```typescript
interface SnippetRenderProps {
  id: string;
  type: string;
  data: Record<string, any>;
  style?: Record<string, string>;
  metrics?: Record<string, number>;
  textMetrics?: TextMetrics;
  onStyleChange?: (style: Record<string, string>) => void;
  onTextMetricsChange?: (metrics: TextMetrics) => void;
  onTextFocus?: (focus: TextFocusEvent) => void;
  onHeightChange?: (height: number) => void;
  isTyping?: boolean;
  disabled?: boolean;
}
```

### 6.2 Snippet Styling
Snippets use inline styles from `snippetStyle` + template `sectionDesignOverrides`:
```typescript
const getSnippetStyle = (sectionKey, snippetType, sectionStyle, templateOverrides) => {
  // Merges: default → section → template overrides → per-snippet styles
  // All inline styles, no CSS modules
}
```

### 6.3 Snippet Measurement
Snippets measure themselves via `onHeightChange`:
```typescript
useEffect(() => {
  if (containerRef.current) {
    const height = containerRef.current.getBoundingClientRect().height;
    if (prevHeight !== height) {
      onHeightChange(height);
      prevHeight = height;
    }
  }
}, [data, onHeightChange]);
```

### 6.4 Snippet Types (13 total)
- `experience` — Work experience entries
- `education` — Education entries
- `skills` — Skills/tags
- `projects` — Project entries
- `certifications` — Certifications
- `awards` — Awards
- `languages` — Languages
- `publications` — Publications
- `volunteer` — Volunteer experience
- `references` — References
- `interests` — Interests
- `custom` — Custom sections
- `achievements` — Achievements

### 6.5 Known Snippet Issues
- Some snippets don't render `onHeightChange` callback (not all snippets have it)
- Snippets use inline styles exclusively — no CSS classes except for layout containers
- No "keep together" per-snippet — only per-section

---

## 7. PAGE BREAK LOGIC

### 7.1 Force Breaks (Phase 1)
```typescript
// Runs first, finds all forced page breaks
orderedPageData.forEach((pageDataItem, index) => {
  const section = sections[pageDataItem.id];
  if (section.splitting === 'keep') {
    // Entire section keeps together
    // If it doesn't fit on current page, force break
  }
});
```

**Problem**: Force breaks on `keepTogether` sections are expensive — they measure entire section heights before deciding placement.

### 7.2 Content Heights (Phase 2)
```typescript
// Calculates heights for all blocks
const heights = orderedPageData.flatMap(pageDataItem =>
  pageDataItem.children.map((child, index) => ({
    id: child.id,
    height: heights[index]
  }))
);
```

### 7.3 Page Splitting (Phase 3)
```typescript
// Splits content across pages
let currentPage = 0;
let remaining = totalHeight;

heights.forEach(({ id, height }) => {
  if (remaining - height < 0) {
    currentPage++;
    remaining = totalHeight;
    pageBreaks.push({ blockId: id, y: 0 });
  }
  remaining -= height;
});
```

### 7.4 Page Break Injection
```typescript
// Injects page breaks into DOM
pageBreaksRef.current = pageBreaks.map(pageBreak => ({
  blockId: pageBreak.blockId,
  y: pageBreak.y + (margins.top + BOTTOM_PADDING_ALLOWANCE)
}));
```

---

## 8. COLUMN LAYOUT

### 8.1 CSS Columns
Canvas uses CSS `column-count`:
```typescript
<LayoutPage columnCount={columnCount}>
  {/* Content renders as CSS columns */}
</LayoutPage>
```

### 8.2 Column Splitting
When `columnCount > 1`:
```typescript
const columnHeight = (pageHeight - margins.top - margins.bottom) / columnCount;
// Splits content into columns
```

### 8.3 Column Dividers
```typescript
// Column divider SVG
const ColumnDivider = () => (
  <svg className="w-[1px] h-full opacity-20">
    <line x1="0" y1="0" x2="0" y2="100%" stroke="currentColor" />
  </svg>
);
```

### 8.4 Known Column Issues
- CSS columns auto-flow, but page breaks can't be precisely placed within columns
- Column height calculation doesn't account for `sectionGap`, `blockGap`, etc.
- `COLUMN_SPACING_ALLOWANCE` is a fixed constant, not computed from actual spacing

---

## 9. ROOT CAUSES OF LAYOUT/PAGINATION GAPS

### 9.1 Measurement Timing
**Problem**: Heights measured AFTER render via `useEffect` + `getBoundingClientRect()`. This means:
1. Content renders unpaginated first (flash)
2. Then pagination is applied (layout shift)
3. This causes visible jumps in the editor

**Root cause**: DOM measurement requires rendered content. No pre-calculation possible without virtual DOM measurement.

### 9.2 Incomplete Height Accounting
**Problem**: `pageHeights` calculation:
```typescript
height = (blockBottom - sectionTop) + paddingBottom + BOTTOM_PADDING_ALLOWANCE
```
Only accounts for:
- Block's bottom position relative to section top
- Block's padding bottom
- Fixed 8px buffer

Does NOT account for:
- Block's margin bottom
- Gap between blocks (`blockGap`)
- Section gap (`sectionGap`)
- Heading height
- First line height (for column flow)

### 9.3 Section Top Position Timing
**Problem**: `sectionTopPositions` is calculated from `getBlockPositions` which measures section header positions. These positions change after pagination, creating a feedback loop.

### 9.4 Force Break Cost
**Problem**: Force breaks on `keepTogether` sections are O(n²) — they measure all blocks in the section before deciding placement. For large sections (e.g., experience with 10+ entries), this can be expensive.

### 9.5 Column Height Calculation
**Problem**: Column height is calculated as:
```typescript
const columnHeight = adjustedContentHeight / columnCount;
```
But this doesn't account for:
- Section headings taking vertical space
- Gaps between blocks
- Block margins
- Content that doesn't fill a column (wasted space)

### 9.6 CSS Column Limitations
**Problem**: CSS `column-count` auto-flows content, but:
- Can't precisely control where column breaks occur
- `column-break-inside: avoid` is unreliable across browsers
- Can't force content to stay in a column
- No ability to measure "remaining space in current column"

### 9.7 Margin Collapse
**Problem**: CSS margin collapse happens in the DOM but isn't accounted for in measurement. The engine measures `blockBottom - sectionTop` which doesn't collapse margins.

### 9.8 Feedback Loops
**Problem**: 
1. Section components report heights via `onHeightChange`
2. This triggers `forceUpdate()`
3. `forceUpdate()` re-renders pagination
4. Pagination changes layout
5. Section heights change
6. Back to step 1

This creates potential infinite loops (mitigated by `prevHeight` tracking in snippets).

### 9.9 Template Overrides vs Measurement
**Problem**: Template `sectionDesignOverrides` add spacing (padding, margins, gaps) that aren't measured by the DOM measurement system. The system measures raw content height, not styled height.

### 9.10 No Virtual Measurement
**Problem**: No virtual DOM or off-screen measurement possible. All measurement requires actual DOM rendering.

---

## 10. CLASSIFICATION OF GAP TYPES

### Design Gaps (Intentional)
- Spacing between sections (controlled by `sectionGap`)
- Spacing between blocks (controlled by `blockGap`)
- Spacing between snippets (controlled by `snippetGap`)
- Heading margin bottom (controlled by `headingMarginBottom`)

### Measurement Errors
- Height not accounting for `blockMarginBottom`
- Height not accounting for `blockGap` between blocks
- Height not accounting for `sectionGap` between sections
- Height not accounting for `headingMarginBottom`
- Height not accounting for `snippetGap` between snippets

### Pagination Errors
- Force breaks applied too aggressively
- Column height not accounting for actual content flow
- Page break positions off by margins
- `BOTTOM_PADDING_ALLOWANCE` too small (8px) for some templates

### Column Flow Errors
- CSS column auto-flow unpredictable
- Column breaks can't be precisely controlled
- Content can't be measured per-column

### Template-Specific Errors
- V2 templates use spacing presets that may not match canvas measurement
- Section design overrides add spacing not accounted for
- Font differences between canvas and PDF

---

## 11. THE UPSIDE-DOWN TETRIS MODEL

### Current Model (Top-Down)
```
Page 1
┌─────────────────────────────┐
│ Section A (fixed height)    │ ← measured after render
│ Section B (partial)         │ ← cut off
└─────────────────────────────┘
Page 2
┌─────────────────────────────┐
│ Section B (continued)       │
│ Section C                   │
└─────────────────────────────┘
```

**Problem**: Content flows top-to-bottom, measuring after render. Gaps appear when measurements are wrong.

### Target Model (Upside-Down Tetris)
```
Page 1 (available height = 1056 - margins)
┌─────────────────────────────┐
│ ┌───────────────────────────│ ← available space tracking
│ │ Section A (800px)         │ ← fits? YES → place
│ │ Section B (200px)         │ ← fits? YES → place
│ │ Section C (100px)         │ ← fits? NO → move to page 2
│ └───────────────────────────│
└─────────────────────────────┘
Page 2 (available height = 1056 - margins)
┌─────────────────────────────┐
│ Section C (continued)       │
│ Section D                   │
└─────────────────────────────┘
```

**Key principle**: Track available space, place content that fits, defer what doesn't. No measurement after render — pre-calculate.

### Requirements for Upside-Down Tetris
1. **Pre-calculated heights**: Must know content heights BEFORE rendering
2. **Available space tracking**: Must track remaining space per page
3. **Block-level placement**: Must be able to split blocks across pages
4. **Column-aware placement**: Must account for column flow
5. **Section-aware placement**: Must respect keep-together rules
6. **Template-aware spacing**: Must use template's actual spacing values

### Feasibility
- **Pre-calculated heights**: Requires virtual measurement or content estimation
- **Available space tracking**: Straightforward algorithm
- **Block-level splitting**: Already partially implemented (page breaks at block level)
- **Column-aware placement**: CSS columns make this difficult — may need custom column logic
- **Section-aware placement**: Already implemented (keep-together)
- **Template-aware spacing**: Requires parsing template spacing presets

---

## 12. RECOMMENDATIONS

### Immediate (Audit Complete)
1. **Document all root causes** — This document
2. **Create template layout matrix** — All templates' layout properties
3. **Create task tracking** — Prioritized fixes

### Short-Term (Fix Measurement)
1. **Add missing spacing to height calculation**: Account for `blockMarginBottom`, `blockGap`, `sectionGap`, `headingMarginBottom`
2. **Reduce BOTTOM_PADDING_ALLOWANCE**: 8px is too much for most templates
3. **Add measurement validation**: Compare measured vs expected heights
4. **Add layout debug mode**: Visual overlay showing bounding boxes, available regions, page breaks

### Medium-Term (Improve Pagination)
1. **Implement column-aware pagination**: Custom column logic instead of CSS columns
2. **Add content estimation**: Predict heights from content structure before rendering
3. **Reduce force break cost**: Optimize keep-together measurement
4. **Add page break preview**: Show where breaks will occur before rendering

### Long-Term (Upside-Down Tetris)
1. **Virtual measurement**: Measure content off-screen before placing
2. **Available space tracking**: Track remaining space per page
3. **Block splitting**: Split blocks across pages (not just sections)
4. **Custom column logic**: Replace CSS columns with custom placement
5. **Template-aware spacing**: Use template presets in measurement
6. **Regression tests**: Automated tests for all layout scenarios

---

## 13. KEY FILES REFERENCE

| File | Purpose |
|------|---------|
| `src/components/cv-builder-pro/CVCanvasEngine.tsx` | Core canvas engine (2864 lines) |
| `src/components/cv-builder-pro/layoutHelpers.ts` | extractSectionFromChildren, renderLayoutPage |
| `src/components/cv-builder-pro/useLayoutPagination.ts` | Pagination hook |
| `src/components/cv-builder-pro/usePDFExport.ts` | Client-side PDF export |
| `src/components/cv-builder-pro/utils/formatting.ts` | Block rendering, duplicate filtering |
| `src/components/cv-builder-pro/utils/layout.ts` | isChunkEmpty, shouldRenderSection |
| `src/components/cv-builder-pro/CVBuilderProAdapter.tsx` | Props normalization |
| `src/components/cv-builder-pro/CVSnapshotDocument.tsx` | Snapshot/thumbnail renderer |
| `src/components/cv-builder-pro/registry.tsx` | 15 canvas templates |
| `src/components/cv-builder-pro/snippets/` | All snippet components |
| `src/components/cv-builder-pro/sectionWeights.ts` | Section ordering and splitting |
| `src/components/cv-builder-pro/snippetStyle.ts` | Snippet styling defaults |
| `src/components/cv-builder-pro/snippetRegistry.ts` | Snippet component registry |
| `src/components/cv-builder-pro/textMetrics.ts` | Text measurement system |
| `src/components/cv-builder-pro/typingBuffer.ts` | Typing state management |
| `src/lib/templates/v2/template-definitions.ts` | V2 template definitions |
| `src/lib/templates/template-utils.ts` | Template migration/unification |
| `src/lib/utils/page-dimensions.ts` | Page size definitions |
| `src/lib/services/templateRendererService.ts` | Server-side HTML rendering |
| `src/lib/services/pdfService.ts` | PDF generation orchestrator |
| `src/lib/services/puppeteerPoolService.ts` | Browser pool |
| `src/app/api/cvs/[id]/download/route.ts` | CV download API |
| `src/app/api/cv/export/route.ts` | CV export API |
