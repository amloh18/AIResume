# Plan: Fix Side Panel Rendering and State Synchronization

## Current State Analysis
In `Step3BuilderSurgeon.tsx` and `CVCanvasEngine.tsx`, there is a layout mismatch and a state synchronization issue that causes the rightmost utility panel (Design, Layout, JSON, Mori Chat) to sometimes appear blank.
1. **Portal Unmounting:** `Step3BuilderSurgeon` conditionally rendered the `builder-utility-panel-portal` div. If "Mori Chat" was active, the portal `div` was completely unmounted. If the user then clicked "Design", `CVCanvasEngine` couldn't find the portal target and fell back to rendering the panel inline inside the canvas, resulting in a blank or broken sidebar.
2. **State Mismatch:** `CVCanvasEngine` maintained its own `activeSidebar` state, which didn't reset when "Mori Chat" or "Layout" were triggered from outside, causing multiple panels to try and render at once or get stuck in a broken state.

## Proposed Changes

1. **Always Mount Portal Target (`Step3BuilderSurgeon.tsx`)**:
   - Refactor the conditional rendering of the utility panel to ALWAYS include `<div id="builder-utility-panel-portal" />`.
   - Use CSS classes (`flex` vs `hidden`) to toggle visibility between Mori Chat and the portal, ensuring `document.getElementById` never fails in `CVCanvasEngine`.

2. **Synchronize State (`CVCanvasEngine.tsx`)**:
   - Add event listeners in `CVCanvasEngine` for `open-mori-chat`, `close-utility-panel`, and `open-templates` so it properly resets its own `activeSidebar` and `isTemplateModalOpen` states when the user switches panels.

## Assumptions & Decisions
- All utility panels (Mori Chat, Design, Layout, JSON) are intended to share the exact same 3rd column container next to the Analysis panel.
- By hiding the inactive panels via CSS rather than unmounting the portal target, we preserve React Portal stability.

## Verification
- Open the CV Builder.
- Click "Design", ensure the side panel opens next to Analysis.
- Click "Mori Chat", ensure Mori Chat replaces Design without breaking.
- Click "Raw JSON", ensure it replaces Mori Chat and displays correctly (not blank).