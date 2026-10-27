/**
 * Canvas selection checks — run with `npm run verify:canvas-focus`.
 *
 * The one invariant these pin: the section spotlight is driven by a single
 * `selectedBlockId`, and the stylesheet dims every section that is not the
 * selected one. So when the selected section is DELETED, the selection has to
 * end with it — otherwise the id points at a block that no longer exists, no
 * wrapper is `[data-selected="true"]`, and the whole sheet stays blurred and
 * dimmed with nothing for the user to un-focus.
 *
 * The rule is a pure function so this file needs no DOM and no browser.
 */
import assert from 'node:assert/strict';
import { selectionAfterSnippetRemoval } from '../src/components/cv-builder-pro/canvas-selection';

let checks = 0;
const ok = (label: string) => {
  checks += 1;
  console.log(`  ok  ${label}`);
};

const zones = {
  main: [{ id: 'summary' }, { id: 'experience' }, { id: 'education' }],
  left: [{ id: 'skills' }],
};

// ---------------------------------------------------------------------------
// 1. Deleting the selected section ends the focus
// ---------------------------------------------------------------------------
{
  const result = selectionAfterSnippetRemoval({
    zones,
    destZone: 'main',
    index: 1,
    selectedBlockId: 'experience',
  });
  assert.equal(result.removedId, 'experience');
  assert.equal(result.clearSelection, true);
  ok('deleting the selected section clears the selection');
}

// ---------------------------------------------------------------------------
// 2. Deleting some OTHER section leaves the focus alone
// ---------------------------------------------------------------------------
{
  const result = selectionAfterSnippetRemoval({
    zones,
    destZone: 'main',
    index: 2,
    selectedBlockId: 'experience',
  });
  assert.equal(result.removedId, 'education');
  assert.equal(result.clearSelection, false);
  ok('deleting another section keeps the current focus');
}

{
  const result = selectionAfterSnippetRemoval({
    zones,
    destZone: 'main',
    index: 0,
    selectedBlockId: null,
  });
  assert.equal(result.clearSelection, false);
  ok('with nothing selected there is nothing to clear');
}

// ---------------------------------------------------------------------------
// 3. The same id in a different zone is a different section
// ---------------------------------------------------------------------------
{
  const duplicate = {
    main: [{ id: 'skills' }, { id: 'summary' }],
    left: [{ id: 'skills' }],
  };
  const mainCopy = selectionAfterSnippetRemoval({
    zones: duplicate,
    destZone: 'main',
    index: 0,
    selectedBlockId: 'skills',
  });
  assert.equal(mainCopy.clearSelection, true, 'ids are unique, so the main-zone copy is the selection');

  const leftCopy = selectionAfterSnippetRemoval({
    zones: { main: [{ id: 'summary' }], left: [{ id: 'skills' }] },
    destZone: 'left',
    index: 0,
    selectedBlockId: 'summary',
  });
  assert.equal(leftCopy.removedId, 'skills');
  assert.equal(leftCopy.clearSelection, false);
  ok('the removal is scoped to the zone it happened in');
}

// ---------------------------------------------------------------------------
// 4. Malformed / stale input never throws and never clears a foreign focus
// ---------------------------------------------------------------------------
{
  const outOfRange = selectionAfterSnippetRemoval({
    zones,
    destZone: 'main',
    index: 9,
    selectedBlockId: 'experience',
  });
  assert.deepEqual(outOfRange, { removedId: null, clearSelection: false });

  const negative = selectionAfterSnippetRemoval({
    zones,
    destZone: 'main',
    index: -1,
    selectedBlockId: 'experience',
  });
  assert.deepEqual(negative, { removedId: null, clearSelection: false });

  const unknownZone = selectionAfterSnippetRemoval({
    zones,
    destZone: 'sidebar',
    index: 0,
    selectedBlockId: 'experience',
  });
  assert.deepEqual(unknownZone, { removedId: null, clearSelection: false });

  const noZones = selectionAfterSnippetRemoval({
    zones: null,
    destZone: 'main',
    index: 0,
    selectedBlockId: 'experience',
  });
  assert.deepEqual(noZones, { removedId: null, clearSelection: false });
  ok('a stale index or zone is a no-op, not a crash');

  // A block with no id can never be the selection, so it must not clear one.
  const idless = selectionAfterSnippetRemoval({
    zones: { main: [{ type: 'summary' }] },
    destZone: 'main',
    index: 0,
    selectedBlockId: null,
  });
  assert.deepEqual(idless, { removedId: null, clearSelection: false });
  ok('an id-less block never matches a null selection');
}

console.log(`\nverify:canvas-focus — ${checks} checks passed`);
