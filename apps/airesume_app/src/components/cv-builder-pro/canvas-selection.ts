/**
 * The canvas's selection rules, as pure functions.
 *
 * The canvas holds ONE piece of selection state — `selectedBlockId` — and the
 * stylesheet turns it into the "spotlight": every `.cv-section-wrapper` that is
 * not `[data-selected="true"]` is blurred and dimmed (see the
 * `.cv-has-selection` rules in CVCanvasEngine). That makes a selection which
 * outlives its block uniquely bad: with no wrapper left to be the selected one,
 * the ENTIRE sheet is dimmed and the editor reads as "the whole CV is in focus
 * mode" with nothing to un-focus.
 *
 * The rule that prevents it lives here rather than inline in the component so it
 * can be asserted without a browser (`npm run verify:canvas-focus`).
 */

export type CanvasZoneMap = Record<string, any[]>;

export interface SnippetRemovalSelection {
  /** The block that was at `index`, or `null` when nothing was there. */
  removedId: string | null;
  /** True when the removed block WAS the selected one, so the focus must end. */
  clearSelection: boolean;
}

/**
 * Decide what the selection should do when a section is deleted.
 *
 * `destZone` is the BARE zone id (`main`, `left`, `sidebar`) — the caller strips
 * the `_page_N` suffix the renderer adds — and `index` is the block's index
 * within that zone. Both are read from the CURRENT map, i.e. before the splice,
 * because after it the block is gone and there is nothing left to compare.
 */
export function selectionAfterSnippetRemoval({
  zones,
  destZone,
  index,
  selectedBlockId,
}: {
  zones?: CanvasZoneMap | null;
  destZone: string;
  index: number;
  selectedBlockId?: string | null;
}): SnippetRemovalSelection {
  const list = zones?.[destZone];
  if (!Array.isArray(list) || index < 0 || index >= list.length) {
    return { removedId: null, clearSelection: false };
  }
  const removedId = list[index]?.id ?? null;
  return {
    removedId,
    // `!!removedId` keeps a malformed, id-less block from "matching" a null
    // selection and clearing a focus it never owned.
    clearSelection: Boolean(removedId) && removedId === selectedBlockId,
  };
}
