/**
 * Entry duplication checks — run with `npm run verify:entry-duplicate`.
 *
 * The entry rail's "Duplicate" button must put a copy of the entry DIRECTLY
 * below the original, and the copy must carry its own id: the id is the entry's
 * identity for pagination (`<blockId>_entry_<entryId>`), for React keys and for
 * the `collection.index` field paths the snippet renders. Sharing it would make
 * the two entries claim the same page assignment and collide on render.
 *
 * Pure function, so this needs no DOM.
 */
import assert from 'node:assert/strict';
import { duplicateEntryAt } from '../src/components/cv-builder-pro/helpers';

let checks = 0;
const ok = (label: string) => {
  checks += 1;
  console.log(`  ok  ${label}`);
};

const makeId = () => 'copy-id';

const experience = [
  { id: 'a', company: 'Acme', role: 'Engineer' },
  { id: 'b', company: 'Globex', role: 'Designer' },
  { id: 'c', company: 'Initech', role: 'Analyst' },
];

// ---------------------------------------------------------------------------
// 1. The copy lands directly BELOW the source
// ---------------------------------------------------------------------------
{
  const next = duplicateEntryAt(experience, 1, makeId);
  assert.ok(next, 'a valid index must produce a list');
  assert.equal(next!.length, 4);
  assert.deepEqual(next!.map((e) => e.id), ['a', 'b', 'copy-id', 'c']);
  assert.equal(next![2].company, 'Globex');
  assert.equal(next![2].role, 'Designer');
  ok('the copy is inserted at index + 1 and keeps the source fields');
}

// ---------------------------------------------------------------------------
// 2. First and last positions behave like any other
// ---------------------------------------------------------------------------
{
  const first = duplicateEntryAt(experience, 0, makeId);
  assert.deepEqual(first!.map((e) => e.id), ['a', 'copy-id', 'b', 'c']);

  const last = duplicateEntryAt(experience, 2, makeId);
  assert.deepEqual(last!.map((e) => e.id), ['a', 'b', 'c', 'copy-id']);
  ok('the first and last entries duplicate in place, not at an edge');
}

// ---------------------------------------------------------------------------
// 3. The source is never mutated, and the copy is not the same object
// ---------------------------------------------------------------------------
{
  const before = JSON.stringify(experience);
  const next = duplicateEntryAt(experience, 0, makeId)!;
  assert.equal(JSON.stringify(experience), before, 'the input list must be untouched');
  assert.notEqual(next[1], experience[0], 'the copy must be a new object');
  assert.equal(next[0], experience[0], 'the original entry object is reused, not cloned');
  ok('duplication does not mutate the source list');
}

// ---------------------------------------------------------------------------
// 4. Nothing to duplicate is a no-op, not an empty list
// ---------------------------------------------------------------------------
{
  assert.equal(duplicateEntryAt(null, 0), null);
  assert.equal(duplicateEntryAt(undefined, 0), null);
  assert.equal(duplicateEntryAt([], 0), null);
  assert.equal(duplicateEntryAt(experience, -1), null);
  assert.equal(duplicateEntryAt(experience, 3), null);
  assert.equal(duplicateEntryAt([{ id: 'x' }, null], 1), null);
  ok('a stale index, a missing collection or an empty slot returns null');
}

// ---------------------------------------------------------------------------
// 5. Default id factory is unique per call
// ---------------------------------------------------------------------------
{
  const next = duplicateEntryAt(experience, 0)!;
  const again = duplicateEntryAt(experience, 0)!;
  assert.notEqual(next[1].id, 'a', 'the copy must not keep the source id');
  assert.notEqual(next[1].id, again[1].id, 'two copies must not share an id');
  ok('the default id factory mints a fresh id per copy');
}

console.log(`\nverify:entry-duplicate — ${checks} checks passed`);
