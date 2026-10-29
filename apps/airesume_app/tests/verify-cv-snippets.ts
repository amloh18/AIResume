/**
 * CV snippet / canvas regressions — run with `npm run verify:cv-snippets`.
 *
 * Pure checks only (no DOM, no browser), one per bug that is easy to reintroduce:
 *
 *  1. Education must never render a dangling "in". A degree built from
 *     `studyType` + `area` used to interpolate `${studyType} in ${area || ''}`
 *     unconditionally, so a CV with a study type but no area showed
 *     "Bachelor of Engineering in" — characters no field contained.
 *  2. The add-section panel must suggest the sections the CV is actually missing,
 *     in a useful order (no languages → languages; languages present → interests/
 *     publications), never one that is already on the canvas.
 *  3. A "blank" CV must arrive with starter content in every section (so the
 *     canvas is not a wall of empty headings), while never overwriting real data.
 */
import assert from 'node:assert/strict';
import { normalizeCvDataForCanvas } from '../src/lib/utils/cv-canvas-normalizer';
import { suggestNextSections } from '../src/components/cv-builder-pro/section-suggestions';
import { withStarterContent } from '../src/lib/utils/cv-starter-content';

let checks = 0;
const ok = (label: string) => {
  checks += 1;
  console.log(`  ok  ${label}`);
};

// ---------------------------------------------------------------------------
// 1. Education degree joins only when there are two halves
// ---------------------------------------------------------------------------
{
  const withBoth = normalizeCvDataForCanvas({
    basics: {},
    education: [{ studyType: 'Bachelor of Engineering', area: 'Computer Science' }],
  } as any);
  assert.equal(withBoth?.education?.[0]?.degree, 'Bachelor of Engineering in Computer Science');
  ok('studyType + area joins with " in "');

  const studyTypeOnly = normalizeCvDataForCanvas({
    basics: {},
    education: [{ studyType: 'Bachelor of Engineering' }],
  } as any);
  assert.equal(studyTypeOnly?.education?.[0]?.degree, 'Bachelor of Engineering');
  assert.ok(!String(studyTypeOnly?.education?.[0]?.degree).endsWith(' in'));
  ok('studyType without area has no dangling "in"');

  const areaOnly = normalizeCvDataForCanvas({
    basics: {},
    education: [{ area: 'Data Science' }],
  } as any);
  assert.equal(areaOnly?.education?.[0]?.degree, 'Data Science');
  ok('area without studyType renders on its own');

  const explicitDegree = normalizeCvDataForCanvas({
    basics: {},
    education: [{ degree: 'MSc Data Science', studyType: 'MSc', area: 'Data Science' }],
  } as any);
  assert.equal(explicitDegree?.education?.[0]?.degree, 'MSc Data Science');
  ok('an explicit degree is preserved verbatim');
}

// ---------------------------------------------------------------------------
// 2. Smart add-section suggestions
// ---------------------------------------------------------------------------
{
  const base = {
    presentCategories: ['Education', 'Experience', 'Skills'],
    cvData: { education: [{}], experience: [{}], skills: [{}] },
    limit: 3,
  };
  const suggestions = suggestNextSections(base);
  assert.equal(suggestions.length, 3);
  assert.ok(!suggestions.some((s) => ['Education', 'Experience', 'Skills'].includes(s.category)));
  ok('never suggests a section the document already has');

  // Hovering the strip BELOW Languages is a positional question, so the section
  // that belongs there must beat the generic "Summary goes first" checklist.
  const belowLanguages = suggestNextSections({
    presentCategories: ['Education', 'Experience', 'Skills', 'Languages'],
    cvData: { education: [{}], experience: [{}], skills: [{}], languages: [{}] },
    afterCategory: 'Languages',
    limit: 3,
  }).map((s) => s.category);
  assert.equal(belowLanguages[0], 'Interests');
  assert.notEqual(belowLanguages[0], 'Summary');
  assert.ok(belowLanguages.includes('Publications'));
  ok('the strip below Languages suggests Interests, then Publications');

  const emptyCv = suggestNextSections({ presentCategories: [], cvData: {}, limit: 2 });
  assert.deepEqual(emptyCv.map((s) => s.category), ['Summary', 'Skills']);
  ok('an empty canvas starts with Summary, then Skills');

  // With no anchor (a fresh zone) the checklist order still wins.
  const unanchored = suggestNextSections({ presentCategories: ['Languages'], afterCategory: '', limit: 2 });
  assert.deepEqual(unanchored.map((s) => s.category), ['Summary', 'Skills']);
  ok('no anchor falls back to the checklist order');

  assert.ok(suggestNextSections({ presentCategories: [], limit: 5 }).every((s) => s.snippetType && s.reason));
  ok('every suggestion carries a style and a reason');
}

// ---------------------------------------------------------------------------
// 3. Blank-CV starter content
// ---------------------------------------------------------------------------
{
  const blank = {
    basics: { name: '', label: '', email: '', phone: '', summary: '', location: {}, profiles: [] },
    work: [],
    education: [],
    projects: [],
    skills: [],
    languages: [],
    interests: [],
    certificates: [],
    awards: [],
    publications: [],
    volunteer: [],
    references: [],
  };
  const seeded = withStarterContent(blank) as any;
  ['work', 'education', 'projects', 'skills', 'languages', 'interests', 'certificates'].forEach((key) => {
    assert.ok(Array.isArray(seeded[key]) && seeded[key].length > 0, `${key} should be seeded`);
  });
  assert.ok(seeded.basics.summary.length > 0);
  assert.equal(seeded.basics.name, '');
  assert.equal(seeded.basics.email, '');
  ok('a blank CV keeps identity blank but fills every section');

  const real = {
    ...blank,
    basics: { ...blank.basics, name: 'Ada Lovelace', summary: 'Real summary' },
    work: [{ position: 'Engineer', name: 'Analytical Engines' }],
  };
  const merged = withStarterContent(real) as any;
  assert.equal(merged.work.length, 1);
  assert.equal(merged.work[0].position, 'Engineer');
  assert.equal(merged.basics.name, 'Ada Lovelace');
  assert.equal(merged.basics.summary, 'Real summary');
  assert.ok(merged.education.length > 0);
  ok('starter content never overwrites real data');
}

console.log(`\n${checks} checks passed`);
