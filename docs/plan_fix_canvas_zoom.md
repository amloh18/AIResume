# Plan: Fix Smooth Canvas Zoom Readjusting

## Current State Analysis
When the user adjusts the zoom slider on the CV canvas, the CV content "readjusts" (recalculates pagination and jumps around) on every single tick of the zoom level. This prevents a smooth zooming experience.
This occurs because `zoom` is included in the dependency array of the `useEffect` responsible for calculating DOM heights and page assignments. On every zoom change, the effect runs, re-measures the DOM with `getBoundingClientRect()`, and due to sub-pixel rendering differences during scaling, the calculated heights fluctuate slightly, causing items to jump between pages.

## Proposed Changes

Modify `/Users/amlohsl/Documents/VScode_projects/PROJECTS/cvcircle_app/src/components/cv-builder-pro/CVCanvasEngine.tsx`:

1. **Decouple Zoom from Pagination Effect**:
   - Create a `zoomRef` to hold the latest zoom value (`zoomRef.current = zoom`) during render.
   - Update `measureAndPaginate` to use `zoomRef.current` instead of `zoom` to calculate the `scale`.
   - Remove `zoom` from the dependency array of the pagination `useEffect` (around line 1314).

By doing this, zooming will only trigger a CSS `transform: scale(...)` re-render for visual smoothness, but will *not* trigger the heavy DOM-measurement and pagination-recalculation loop. The `MutationObserver` will still have access to the correct `scale` via `zoomRef` if the user types while zoomed in.

## Assumptions & Decisions
- The visual layout scales perfectly with CSS `transform`, so recalculating pagination during a pure zoom action is unnecessary and harmful.
- Storing `zoom` in a ref during render is safe for the `MutationObserver` closure to read the correct scale when DOM mutations occur.

## Verification
- Adjust the zoom slider on the canvas.
- Ensure the canvas zooms in and out smoothly without items jumping between pages or the layout "readjusting" continuously.