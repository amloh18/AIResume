# CV Layout Engine — Implementation Plan

> **Date**: 2026-08-31
> **Goal**: Fix measurement, pagination, and gaps. Implement debug mode.

---

## CRITICAL FINDING: Audit Was Misleading

The audit referenced files that DON'T EXIST:
- `layoutHelpers.ts` — DOES NOT EXIST
- `useLayoutPagination.ts` — DOES NOT EXIST
- `sectionWeights.ts` — DOES NOT EXIST

**Everything is in `CVCanvasEngine.tsx`** (2864 lines).

## ACTUAL ARCHITECTURE

### Pagination Algorithm (lines 1284-1671)
- DOM measurement via `getBoundingClientRect()` / scale
- Entry-level pagination for list sections (experience, education, etc.)
- Block-level pagination for non-list sections
- Three layout families via `templateLayoutFlows`:
  - `hybrid-split`: header + main + left/right rows
  - Global zones: sequential stacked
  - Column zones: independent pagination

### Key Code Structure
```
measureAndPaginate() — main function (lines 1288-1637)
├── 1. Measure block/entry heights from DOM
├── 2. Classify zones (global vs column)
├── 3. Paginate based on layout type
│   ├── hybrid-split: full-width + rows
│   ├── global zones: sequential
│   └── column zones: independent
└── 4. Update page assignments
```

### Default Fallback Heights
- Block: `80px`
- Header: `40px`
- Entry gap: `16px`

These are used when DOM measurement fails.

### Spacing Model
- `usableHeight = pageHeight - 2 * pageMargin`
- `sectionGap` applied between sections
- `entryGap` applied between entries within a section

## ROOT CAUSES OF GAPS

1. **Default fallback heights**: 80px/40px/16px may not match actual content
2. **Gap accounting**: `sectionGap` applied at zone level but may double-count
3. **No debug visibility**: Can't see why content moves
4. **Column zones**: Independent pagination may not coordinate with global zones

## FILES THAT WILL CHANGE

1. `src/components/cv-builder-pro/CVCanvasEngine.tsx` — Main fixes
2. `src/components/cv-builder-pro/LayoutDebugOverlay.tsx` — NEW debug component

## IMPLEMENTATION ORDER

### Step 1: Add Debug Mode (Phase 10)
- Create `LayoutDebugOverlay.tsx`
- Add `?debug=layout` URL param detection
- Show page boundaries, margins, zones, blocks, heights
- Show placement reasons (BLOCK_FIT, BLOCK_TOO_TALL, etc.)

### Step 2: Fix Measurement (Phase 3)
- Improve fallback heights based on content type
- Account for `sectionGap` in height calculation
- Reduce default fallback values

### Step 3: Fix Pagination (Phase 7)
- Ensure `sectionGap` is properly applied
- Fix column zone coordination with global zones
- Ensure no unnecessary gaps

### Step 4: Test All Templates
- Test all 15 templates
- Test short/normal/dense content
- Test multi-page scenarios
- Verify no regressions

## TESTS

1. **Build**: `npm run build` must pass
2. **TypeScript**: `npx tsc --noEmit` must pass
3. **Visual**: Screenshot comparison of templates
4. **Pagination**: Multi-page content must not have unnecessary gaps

## KNOWN RISKS

1. Changing measurement may affect existing layouts
2. Debug mode must not affect production performance
3. Column pagination coordination is complex
