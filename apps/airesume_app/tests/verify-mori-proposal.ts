/**
 * Mori "review before write" checks — run with `npm run verify:mori-proposal`.
 *
 * `buildMoriProposal` is what stands between a model edit and the user's CV: if
 * it reports nothing, the edit is silently dropped; if it reports nonsense, the
 * user is asked to approve a change they cannot read. These checks pin the
 * behaviour that the chat card depends on.
 */
import assert from 'node:assert/strict';
import { buildMoriProposal } from '../src/lib/utils/mori-proposed-changes';

let checks = 0;
const ok = (label: string) => {
  checks += 1;
  console.log(`  ok  ${label}`);
};

const baseCv = {
  basics: { name: 'Damien Cole', label: 'Product Manager', summary: 'PM with 8 years.' },
  experience: [
    {
      id: 'exp-1',
      role: 'Senior PM',
      company: 'Acme',
      startDate: '2021-01',
      endDate: 'Present',
      description: '<ul><li>Worked on onboarding.</li></ul>',
    },
  ],
  skills: [{ id: 'sk-1', category: 'Product', keywords: ['Roadmapping'] }],
  education: [{ id: 'edu-1', institution: 'UCL', studyType: 'BSc', area: 'Economics' }],
  metadata: { atsScore: 61 },
};

// ---------------------------------------------------------------------------
// 1. Nothing changed → no review card at all
// ---------------------------------------------------------------------------
assert.equal(buildMoriProposal(baseCv, JSON.parse(JSON.stringify(baseCv))), null);
ok('identical CVs produce no proposal');

// Bookkeeping-only edits (ids, cached scores) are not user-facing changes.
const bookkeepingOnly = JSON.parse(JSON.stringify(baseCv));
bookkeepingOnly.experience[0].id = 'exp-renamed';
bookkeepingOnly.metadata.atsScore = 78;
assert.equal(buildMoriProposal(baseCv, bookkeepingOnly), null);
ok('id and metadata-only edits are ignored');

// ---------------------------------------------------------------------------
// 2. Summary rewrite is reported as a single readable Summary row
// ---------------------------------------------------------------------------
const summaryEdit = JSON.parse(JSON.stringify(baseCv));
summaryEdit.basics.summary = 'Senior product leader shipping onboarding used by 400k users.';

const summaryProposal = buildMoriProposal(baseCv, summaryEdit);
assert.ok(summaryProposal, 'summary rewrite must produce a proposal');
assert.equal(summaryProposal.changes.length, 1);
assert.equal(summaryProposal.changes[0].section, 'Summary');
assert.equal(summaryProposal.changes[0].kind, 'updated');
assert.match(summaryProposal.changes[0].after, /400k users/);
ok('summary rewrite surfaces as one Summary row');

// ---------------------------------------------------------------------------
// 3. Experience description rewrite is de-marked-up and labelled by entry
// ---------------------------------------------------------------------------
const bulletEdit = JSON.parse(JSON.stringify(baseCv));
bulletEdit.experience[0].description =
  '<ul><li>Rebuilt onboarding flow, lifting activation <strong>18%</strong>.</li></ul>';

const bulletProposal = buildMoriProposal(baseCv, bulletEdit);
assert.ok(bulletProposal);
const descriptionChange = bulletProposal.changes.find((change) => change.field === 'Description');
assert.ok(descriptionChange, 'description change must be reported');
assert.equal(descriptionChange.section, 'Experience');
assert.equal(descriptionChange.sectionKey, 'experience');
assert.equal(descriptionChange.label, 'Senior PM · Acme');
assert.ok(!descriptionChange.after.includes('<'), 'markup must be stripped from review text');
assert.match(descriptionChange.after, /18%/);
ok('entry description diff is stripped of markup and labelled "Senior PM · Acme"');

// ---------------------------------------------------------------------------
// 4. New entry → "added"; removed entry → "removed"
// ---------------------------------------------------------------------------
const added = JSON.parse(JSON.stringify(baseCv));
added.experience.push({ id: 'exp-2', role: 'PM', company: 'Beta', description: '<p>Led roadmap.</p>' });

const addedProposal = buildMoriProposal(baseCv, added);
assert.ok(addedProposal);
const addedKinds = addedProposal.changes.map((change) => change.kind);
assert.ok(addedKinds.includes('added'), 'a new entry must be reported as added');
assert.ok(addedProposal.changes.some((change) => change.label === 'PM · Beta'));
ok('new experience entry reported as added');

const removed = JSON.parse(JSON.stringify(baseCv));
removed.experience = [];
const removedProposal = buildMoriProposal(baseCv, removed);
assert.ok(removedProposal);
assert.ok(removedProposal.changes.some((change) => change.kind === 'removed'));
assert.ok(removedProposal.changes.some((change) => change.section === 'Experience'));
ok('deleted experience entry reported as removed');

// ---------------------------------------------------------------------------
// 5. Non-description fields get readable field labels
// ---------------------------------------------------------------------------
const retitled = JSON.parse(JSON.stringify(baseCv));
retitled.experience[0].role = 'Principal PM';
const retitledProposal = buildMoriProposal(baseCv, retitled);
assert.ok(retitledProposal);
const titleChange = retitledProposal.changes.find((change) => change.field === 'Title');
assert.ok(titleChange, 'role change must be reported as Title');
assert.equal(titleChange.before, 'Senior PM');
assert.equal(titleChange.after, 'Principal PM');
ok('role change reported as Title with before/after');

// ---------------------------------------------------------------------------
// 6. Review cards stay scannable: cap + hiddenCount
// ---------------------------------------------------------------------------
const wide = JSON.parse(JSON.stringify(baseCv));
wide.experience = Array.from({ length: 30 }, (_, index) => ({
  id: `exp-${index}`,
  role: `Role ${index}`,
  company: `Company ${index}`,
  description: '<p>Did things.</p>',
}));
wide.skills = [{ id: 'sk-1', category: 'Product', keywords: ['Roadmapping'] }];
const wideProposal = buildMoriProposal(baseCv, wide);
assert.ok(wideProposal);
assert.equal(wideProposal.changes.length, 12);
assert.ok(wideProposal.hiddenCount > 0);
ok('proposal capped at 12 visible changes with a hidden remainder count');

console.log(`\n${checks} checks passed`);
