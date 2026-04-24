# Plan: Fix Floating Toolbar and AI Suggestion Card Positioning

## 1. Summary
The user reported two UX issues in the Resume Editor (`CVCanvasEngine`):
1. The **Format Toolbar** stays fixed on the screen when the document is scrolled, detaching from the highlighted text.
2. The **AI Contextual Suggestion Card** stays fixed on the screen when scrolled, and the user requested it to be positioned to the right of the section (outside the CV preview) rather than directly below the text.

## 2. Current State Analysis
- **`FloatingToolbar`** (`src/components/cv-builder-pro/components/CoreUI.tsx`): Calculates its `fixed` `top`/`left` based on the `targetNode.getBoundingClientRect()` inside a `useEffect` that only triggers when `targetNode` changes. It does not update when the parent `.overflow-auto` container scrolls.
- **`AI Contextual Suggestion`** (`src/components/cv-builder-pro/CVCanvasEngine.tsx`): Statically captures the `rect` of the element when the AI suggestion is requested and renders a `fixed` div. Because the `rect` is never updated on scroll, the card stays locked to the viewport while the CV document scrolls underneath it.

## 3. Proposed Changes

### A. Fix `FloatingToolbar` scrolling behavior
**File**: `src/components/cv-builder-pro/components/CoreUI.tsx`
- Update the `useEffect` inside `FloatingToolbar` to extract the positioning logic into an `updatePos` function.
- Query the scroll container (`document.querySelectorAll('.overflow-auto')`) and attach an `addEventListener('scroll', updatePos, { passive: true })`.
- Attach a window `resize` event listener as well.
- Ensure proper cleanup of these event listeners on unmount.
- This will cause the toolbar to perfectly track the focused text element as the user scrolls.

### B. Extract and fix `FloatingAICard`
**File**: `src/components/cv-builder-pro/CVCanvasEngine.tsx`
- Modify `handleSuggestPoint` to store the `node` (the actual HTML element) in the `pointSuggestion` state rather than a static `rect`.
- Create a new inline component `FloatingAICard` that receives the `pointSuggestion` state and other necessary handlers.
- In `FloatingAICard`, implement a `useEffect` identical to the toolbar to recalculate position on `scroll` and `resize`.
- **Positioning Logic**: 
  - Calculate `top` to align with `nodeRect.top`.
  - Calculate `left` to align with the right edge of the CV wrapper (`document.querySelector('.cv-document-wrapper')`) + a 20px margin.
  - Add collision bounds: if `left + cardWidth` exceeds `window.innerWidth`, constrain it to `window.innerWidth - cardWidth - 20` to prevent it from bleeding off the screen.
  - Add vertical bounds to prevent it from bleeding off the bottom of the screen.
- Replace the inline AI card JSX in `CVCanvasEngine` with `<FloatingAICard />`.

## 4. Assumptions & Decisions
- We are retaining `fixed` positioning for both elements rather than switching to `absolute` because placing them inside the `.cv-document-wrapper` would subject them to the CSS `transform: scale(...)` applied to the document preview, distorting their size.
- A 420px width is assumed for the AI card (as it is currently defined in the Tailwind classes).

## 5. Verification Steps
- Open the editor, highlight some text to trigger the `FloatingToolbar`.
- Scroll the page up and down and verify the toolbar tracks the text exactly.
- Click "Suggest" to open the AI Contextual Suggestion Card.
- Verify it opens to the **right** of the CV document.
- Scroll the page up and down and verify the AI card tracks the section vertically while staying anchored to the right side of the document.