/**
 * Hybrid One-Pager section ordering.
 *
 * The `hybrid-split` layout (tpl-13 "Dense One-Pager") used to be hard-coded as
 * "every full-width section first (`header` + `main`), then paired 50/50 rows
 * from `left` + `right`". A canvas block is only `{ id, type }` and a section's
 * position across the `main` / `left` / `right` zones was never stored, so that
 * model could not express a single section created *after* a 2-column row:
 * a `main` block always floated above every row, making single → 2-col → single
 * impossible.
 *
 * This module adds an optional per-section `order` number. Existing CVs have no
 * `order`, so `legacyHybridOrders()` backfills the *exact* order they render in
 * today (full-width `header` + `main` first, then `left`/`right` rows by index).
 * New and re-zoned sections receive a slot after the last section, which is what
 * makes an arbitrary sequence possible.
 *
 * This is the single source of truth for the hybrid flow: pagination, the
 * interactive canvas render and the static/print renderer all consume
 * `buildHybridBands()`.
 */

export interface HybridBlock {
  id: string;
  type: string;
  /** Optional explicit position in the hybrid flow. Missing on legacy CVs. */
  order?: number;
  /** Zone the block lives in: `header` | `main` | `left` | `right`. */
  zone?: string;
}

/**
 * A canvas zone map. Typed loosely on purpose: the engine stores
 * `Record<string, any[]>` and threading a stricter type through every call site
 * would be a large, riskier edit for no behavioural gain.
 */
/** The subset of a canvas block the hybrid flow needs. */
export type CanvasZoneMap = Record<string, any[]>;

export interface HybridBand {
  kind: 'full' | 'row';
  /** Full-width band: the section. Row band: the left cell (may be null). */
  full?: HybridBlock;
  left?: HybridBlock | null;
  right?: HybridBlock | null;
}

/** Zones that render full width in the hybrid flow, in legacy order. */
export const HYBRID_FULL_ZONES = ['header', 'main'] as const;
/** Zones that pair into 50/50 rows in the hybrid flow. */
export const HYBRID_ROW_ZONES = ['left', 'right'] as const;

export const HYBRID_ZONES: string[] = [...HYBRID_FULL_ZONES, ...HYBRID_ROW_ZONES];

const asBlock = (block: any, zoneId: string): HybridBlock | null =>
  block && block.id ? { ...block, id: block.id, type: block.type, zone: zoneId } : null;

/**
 * Assign the legacy hybrid order to a zone map.
 *
 * Returns a *new* map where every block in a hybrid zone has an `order`.
 * Blocks that already carry an `order` keep it. Because legacy documents list
 * full-width sections first and rows after, this reproduces today's rendering
 * exactly — so shipping the ordering model does not move a single existing
 * section.
 */
export const legacyHybridOrders = <T extends CanvasZoneMap>(zones: T): T => {
  const next: CanvasZoneMap = {};
  Object.keys(zones || {}).forEach((zoneId) => {
    next[zoneId] = (zones[zoneId] || []).map((block: any) => ({ ...block }));
  });

  const isOrdered = HYBRID_ZONES.every((zoneId) =>
    (next[zoneId] || []).every((block: any) => typeof block.order === 'number' && Number.isFinite(block.order))
  );
  if (isOrdered) return next as T;

  // Legacy render order is: every full-width section (header, then main), then
  // rows built by pairing left[i] with right[i]. Interleaving the row cells is
  // what makes the backfill pair identically, so no existing section moves.
  const hasOrder = (block: any) => typeof block.order === 'number' && Number.isFinite(block.order);
  let cursor = 0;
  HYBRID_FULL_ZONES.forEach((zoneId) => {
    (next[zoneId] || []).forEach((block: any) => {
      if (!hasOrder(block)) block.order = cursor;
      cursor = Math.max(cursor, block.order) + 1;
    });
  });

  const left = next.left || [];
  const right = next.right || [];
  const rowCount = Math.max(left.length, right.length);
  for (let i = 0; i < rowCount; i++) {
    [left[i], right[i]].forEach((block: any) => {
      if (!block) return;
      if (!hasOrder(block)) block.order = cursor;
      cursor = Math.max(cursor, block.order) + 1;
    });
  }
  return next as T;
};

/** The next free hybrid slot — appended after every existing section. */
export const nextHybridOrder = (zones: CanvasZoneMap): number => {
  let max = -1;
  HYBRID_ZONES.forEach((zoneId) => {
    (zones[zoneId] || []).forEach((block: any) => {
      if (typeof block.order === 'number' && Number.isFinite(block.order)) {
        max = Math.max(max, block.order);
      }
    });
  });
  const total = HYBRID_ZONES.reduce((count, zoneId) => count + (zones[zoneId] || []).length, 0);
  return Math.max(max, total - 1) + 1;
};

/**
 * Give a section the last slot in the hybrid flow.
 *
 * Used when a section is added, dropped into a different hybrid zone, or has a
 * sibling moved past it — the legacy model only reordered *within* a zone, so
 * the safest expression of "move this" is "put it last".
 */
export const moveToEndOfHybridFlow = <T extends CanvasZoneMap>(zones: T, blockId: string): T => {
  const next = legacyHybridOrders(zones);
  const order = nextHybridOrder(next);
  HYBRID_ZONES.forEach((zoneId) => {
    (next[zoneId] || []).forEach((block: any) => {
      if (block.id === blockId) block.order = order;
    });
  });
  return next;
};

const sortByOrder = (blocks: HybridBlock[]): HybridBlock[] => {
  return [...blocks].sort((a, b) => {
    const ao = typeof a.order === 'number' && Number.isFinite(a.order) ? a.order : Number.MAX_SAFE_INTEGER;
    const bo = typeof b.order === 'number' && Number.isFinite(b.order) ? b.order : Number.MAX_SAFE_INTEGER;
    return ao - bo;
  });
};

/**
 * Build the ordered hybrid flow: full-width bands and 2-column row bands
 * interleaved by each section's `order`.
 *
 * Rows are paired in flow order — the earliest full-width section that is still
 * unpaired becomes the row's left cell, the next one its right cell. So
 * `[full, row, full]` is expressible, as is `[row, full, row]`.
 */
export const buildHybridBands = (zones: CanvasZoneMap): HybridBand[] => {
  const ordered = legacyHybridOrders(zones);

  const fullWidth = sortByOrder(
    HYBRID_FULL_ZONES.flatMap((zoneId) => (ordered[zoneId] || []).map((b) => asBlock(b, zoneId)).filter(Boolean) as HybridBlock[])
  );
  const rowCells = sortByOrder(
    HYBRID_ROW_ZONES.flatMap((zoneId) => (ordered[zoneId] || []).map((b) => asBlock(b, zoneId)).filter(Boolean) as HybridBlock[])
  );

  const bands: HybridBand[] = [];
  let rowCursor = 0;

  fullWidth.forEach((block) => {
    // A row band belongs before this full-width section when *both* of the
    // cells that will form it come earlier in the flow.
    const nextLeft = rowCells[rowCursor];
    const nextRight = rowCells[rowCursor + 1];
    const blockOrder = typeof block.order === 'number' ? block.order : Number.MAX_SAFE_INTEGER;
    const leftOrder = nextLeft && typeof nextLeft.order === 'number' ? nextLeft.order : Number.MAX_SAFE_INTEGER;
    const rightOrder = nextRight && typeof nextRight.order === 'number' ? nextRight.order : Number.MAX_SAFE_INTEGER;

    if (nextLeft && nextRight && leftOrder < blockOrder && rightOrder < blockOrder) {
      bands.push({ kind: 'row', left: nextLeft, right: nextRight });
      rowCursor += 2;
    }
    bands.push({ kind: 'full', full: block });
  });

  while (rowCursor < rowCells.length) {
    bands.push({
      kind: 'row',
      left: rowCells[rowCursor] || null,
      right: rowCells[rowCursor + 1] || null,
    });
    rowCursor += 2;
  }

  return bands;
};

/**
 * True when the hybrid zone map has no explicit ordering yet (a legacy CV).
 * Callers that render read-only (thumbnails, print, overlays) can use this to
 * keep their previous zone-based grouping.
 */
export const isLegacyHybridFlow = (zones: CanvasZoneMap): boolean =>
  HYBRID_ZONES.every((zoneId) =>
    (zones[zoneId] || []).every((block: any) => typeof block.order !== 'number' || !Number.isFinite(block.order))
  );