# Plan: Fix CV Builder Pagination Gaps

## Current State Analysis
In the Step 3 CV Editor (`CVCanvasEngine.tsx`), sections with lists (like Work Experience, Projects) are sometimes pushed to the next page prematurely, leaving large empty gaps at the bottom of the current page.

This happens because the pagination logic overestimates the height of list sections:
1. **Header Height Overestimation**: The `headerH` is calculated as `parentHeight - sumEntriesHeight`. However, `parentHeight` includes all the vertical gaps between entries. Therefore, `headerH` incorrectly absorbs all the inter-entry gaps.
2. **Double-counting Gaps**: During pagination, the algorithm adds `gapBefore()` (which equals `--cv-section-gap`) between every list entry. Since the inter-entry gaps are already bundled inside `headerH`, and `gapBefore()` (usually 16px-32px) is used instead of the actual inter-entry gap, the total calculated height of the list block is massively inflated.

## Proposed Changes

Modify `/Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/components/cv-builder-pro/CVCanvasEngine.tsx`:

1. **Accurate Height Measurement**:
   - Calculate `headerH` accurately by measuring the distance from the top of the block to the top of the first entry.
   - Calculate the average `entryGap` by measuring the actual distance between consecutive entry elements.

2. **Fix Pagination Logic for Global Zones**:
   - Retrieve `entryGap` for the block.
   - Use `entryGap` instead of `gapBefore()` when adding the height of subsequent list entries.

3. **Fix Pagination Logic for Column Zones**:
   - Retrieve `entryGap` for the block.
   - Use `entryGap` instead of `gapBefore()` when evaluating if an entry fits on the current page and when accumulating `currentHeight`.

## Assumptions & Decisions
- The visual layout correctly renders the entries and gaps. We just need to extract those exact measurements from the DOM to inform the pagination algorithm accurately.
- `scale` is already handled in the DOM measurements.

## Verification
- Open a CV with a long list of projects or work experiences in a two-column layout.
- Ensure the entries fill the column to the bottom before spilling over to the next page, without leaving unnecessary large gaps.