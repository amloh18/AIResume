/**
 * Combined entry-description checks — run with `npm run verify:description-blocks`.
 *
 * Covers the parse/build/reconcile contract that keeps paragraphs and bullets in
 * ONE ordered description (`lib/utils/cv-description-blocks.ts`) and the
 * canvas → Unified → Mori round trip that depends on it.
 */
import assert from 'node:assert/strict';
import {
  parseDescriptionHtml,
  descriptionBlocksToHtml,
  descriptionBlocksToLegacy,
  reconcileRecordDescription,
  writeRecordDescriptionBlocks,
  materializeRecordDescriptionViews,
  descriptionHtmlForRecord,
} from '../src/lib/utils/cv-description-blocks';
import { normalizeCvData } from '../src/types/cv-normalizer';
import { applyEditOperations } from '../src/types/cv-edit-ops';
import { mergeMoriCvIntoCanvas } from '../src/lib/utils/mori-chat-response';

let checks = 0;
const ok = (label: string) => {
  checks += 1;
  console.log(`  ok  ${label}`);
};

// ---------------------------------------------------------------------------
// 1. Parse: bullets first, then a short lead/outro paragraph (the user's shape)
// ---------------------------------------------------------------------------
const html = '<ul><li>Bullet one</li><li>Bullet <strong>two</strong></li></ul><p>Short closing line</p>';
const blocks = parseDescriptionHtml(html);
assert.deepEqual(
  blocks.map((b) => [b.type, b.content]),
  [['bullet', 'Bullet one'], ['bullet', 'Bullet <strong>two</strong>'], ['paragraph', 'Short closing line']]
);
ok('parses bullets-then-paragraph in order, preserving inline formatting');

const rebuilt = descriptionBlocksToHtml(blocks);
assert.equal(
  rebuilt,
  '<ul><li data-highlight-index="0">Bullet one</li><li data-highlight-index="1">Bullet <strong>two</strong></li></ul><p>Short closing line</p>'
);
ok('rebuilds the same order (bullets then paragraph)');

assert.equal(descriptionBlocksToHtml(parseDescriptionHtml(rebuilt)), rebuilt);
ok('parse → build is idempotent');

// ---------------------------------------------------------------------------
// 2. Line semantics match the legacy parser
// ---------------------------------------------------------------------------
const softBlocks = parseDescriptionHtml('<div>Line one</div><div>Line two</div>');
assert.deepEqual(softBlocks.map((b) => [b.type, b.content]), [['paragraph', 'Line one\nLine two']]);
ok('<div> lines stay soft breaks inside one paragraph');

const hardBlocks = parseDescriptionHtml('<p>First para</p><p>Second para</p>');
assert.deepEqual(
  hardBlocks.map((b) => [b.type, b.content]),
  [['paragraph', 'First para'], ['paragraph', 'Second para']]
);
ok('</p> is a hard paragraph boundary');

// ---------------------------------------------------------------------------
// 3. Legacy derive: paragraph text + highlights
// ---------------------------------------------------------------------------
assert.deepEqual(
  descriptionBlocksToLegacy(blocks, 'summary'),
  { summary: 'Short closing line', highlights: ['Bullet one', 'Bullet <strong>two</strong>'] }
);
ok('derives the lossy summary/highlights view');

// ---------------------------------------------------------------------------
// 4. Reconcile rules
// ---------------------------------------------------------------------------
const inSync = {
  summary: 'Short closing line',
  highlights: ['Bullet one', 'Bullet two'],
  descriptions: [
    { id: 'd1', type: 'bullet', content: 'Bullet one' },
    { id: 'd2', type: 'bullet', content: 'Bullet two' },
    { id: 'd3', type: 'paragraph', content: 'Short closing line' },
  ],
};
const kept = reconcileRecordDescription(inSync, 'summary');
assert.deepEqual(kept.map((b) => b.id), ['d1', 'd2', 'd3']);
ok('keeps ordered blocks (bullets before paragraph) when both views agree');

const outOfSync = {
  summary: 'Rewritten by another writer',
  highlights: ['New bullet'],
  descriptions: [{ id: 'old', type: 'bullet', content: 'Stale bullet' }],
};
const rebuiltFromLegacy = reconcileRecordDescription(outOfSync, 'summary');
assert.deepEqual(
  rebuiltFromLegacy.map((b) => [b.type, b.content]),
  [['paragraph', 'Rewritten by another writer'], ['bullet', 'New bullet']]
);
ok('legacy fields win when they disagree (external AI edits still show)');

const blocksOnly = { descriptions: [{ id: 'x', type: 'bullet', content: 'AI-only bullet' }] };
assert.deepEqual(reconcileRecordDescription(blocksOnly, 'summary').map((b) => b.content), ['AI-only bullet']);
ok('blocks-only records are not wiped by an empty legacy view');

// ---------------------------------------------------------------------------
// 5. Canvas → Unified → canvas round trip keeps mixed order
// ---------------------------------------------------------------------------
const canvasRecord: any = { id: 'exp1', position: 'Lead', name: 'Acme' };
writeRecordDescriptionBlocks(canvasRecord, 'summary', parseDescriptionHtml(html), []);
assert.equal(canvasRecord.summary, 'Short closing line');
assert.deepEqual(canvasRecord.highlights, ['Bullet one', 'Bullet <strong>two</strong>']);
assert.equal(descriptionHtmlForRecord(canvasRecord, 'work'), rebuilt);
ok('canvas → Unified → canvas round trip preserves bullets-then-paragraph order');

// Legacy record with no descriptions still renders paragraph first (unchanged)
const legacyRecord = { id: 'exp2', position: 'Old', name: 'Old Co', summary: 'Lead in', highlights: ['Did a thing'] };
assert.equal(
  descriptionHtmlForRecord(legacyRecord, 'work'),
  '<p>Lead in</p><ul><li data-highlight-index="0">Did a thing</li></ul>'
);
ok('legacy records render exactly as before (paragraph then bullets)');

// ---------------------------------------------------------------------------
// 6. normalizeCvData reconciles and materializes
// ---------------------------------------------------------------------------
const normalized = normalizeCvData({
  basics: {},
  work: [{ id: 'w1', position: 'Engineer', name: 'Acme', summary: 'Short closing line', highlights: ['Bullet one', 'Bullet two'] }],
});
assert.equal(normalized.work[0].summary, 'Short closing line');
assert.deepEqual(normalized.work[0].highlights, ['Bullet one', 'Bullet two']);
assert.equal(normalized.work[0].descriptions.length, 3);
ok('normalizeCvData produces ordered description blocks + legacy views');

// ---------------------------------------------------------------------------
// 7. Mori: an AI description edit reaches the legacy fields (so the canvas shows it)
// ---------------------------------------------------------------------------
const moriStart = normalizeCvData({
  basics: {},
  work: [{ id: 'w1', position: 'Engineer', name: 'Acme', summary: '', highlights: ['Existing bullet'] }],
});
const existingId = moriStart.work[0].descriptions[0].id;
const moriOut = mergeMoriCvIntoCanvas(moriStart, {
  operations: [
    {
      operation: 'add_description',
      sectionId: 'work',
      recordId: 'w1',
      afterDescriptionId: existingId,
      type: 'bullet',
      content: 'AI added bullet',
    } as any,
  ],
});
assert.ok(moriOut, 'merge must return updated CV data');
const moriWork = moriOut.work.find((w: any) => w.id === 'w1');
assert.deepEqual(moriWork.highlights, ['Existing bullet', 'AI added bullet']);
assert.equal(moriWork.descriptions.length, 2);
assert.equal(
  descriptionHtmlForRecord(moriWork, 'work'),
  '<ul><li data-highlight-index="0">Existing bullet</li><li data-highlight-index="1">AI added bullet</li></ul>'
);
ok('Mori description edit is visible to the canvas/legacy readers');

// ---------------------------------------------------------------------------
// 8. A canvas edit keeps the AI's addressing stable (ids preserved)
// ---------------------------------------------------------------------------
const before = normalizeCvData({
  basics: {},
  work: [{ id: 'w1', position: 'Engineer', name: 'Acme', summary: '', highlights: ['Bullet one', 'Bullet two'] }],
});
const idsBefore = before.work[0].descriptions.map((d: any) => d.id);
const typedRecord: any = { id: 'w1', position: 'Engineer', name: 'Acme' };
writeRecordDescriptionBlocks(
  typedRecord,
  'summary',
  parseDescriptionHtml('<ul><li>Bullet one</li><li>Bullet two edited</li></ul>'),
  before.work[0].descriptions
);
assert.deepEqual(typedRecord.descriptions.map((d: any) => d.id), idsBefore);
ok('typing in the canvas keeps description ids stable');

// ---------------------------------------------------------------------------
// 9. Description type changes materialize into the legacy view
// ---------------------------------------------------------------------------
const session = applyEditOperations(before, [
  {
    operation: 'change_description_type',
    sectionId: 'work',
    recordId: 'w1',
    descriptionId: idsBefore[0],
    type: 'paragraph',
  } as any,
]);
assert.equal(session.allSucceeded, true);
const materialized = materializeRecordDescriptionViews({ ...session.cvData.work[0] }, 'summary', {
  preferExisting: true,
});
assert.equal(materialized[0].type, 'paragraph');
ok('description type changes materialize into summary/highlights');

console.log(`\nAll ${checks} checks passed.`);
