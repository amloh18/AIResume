/**
 * Empty-field label + section-title wiring checks — `npm run verify:field-labels`.
 *
 * Two layers, because the behaviour has two halves:
 *  1. the pure resolver (`lib/utils/cv-field-labels.ts`) — what an empty slot
 *     says, per section, for both the canvas (`experience.2.company`) and the
 *     Unified (`work.2.name`) spellings of the same field;
 *  2. the WIRING — that the editor uses the resolver (and no longer the old
 *     "Type here..." ladder), that every title style carries `cv-section-title`,
 *     and that both stylesheets (canvas + snapshot) drive the title's gap from
 *     --cv-item-gap and its icon from the title's own type size. Those rules are
 *     the difference between "Item gap also moves the title" and "Item gap only
 *     moves the entries", and a silent regression there is invisible in review.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveEmptyFieldPlaceholder } from '../src/lib/utils/cv-field-labels';

let checks = 0;
const ok = (label: string) => {
  checks += 1;
  console.log(`  ok  ${label}`);
};

// The app is always run from `apps/airesume_app` (its own package script, its
// own Docker working directory), so the source tree hangs off process.cwd().
const APP_ROOT = process.cwd();
const read = (...segments: string[]) => {
  const file = join(APP_ROOT, ...segments);
  assert.ok(existsSync(file), `expected ${file} to exist — run this from apps/airesume_app`);
  return readFileSync(file, 'utf8');
};

// ---------------------------------------------------------------------------
// 1. Resolver — the labels the user asked for, in canvas AND Unified spellings
// ---------------------------------------------------------------------------
const label = (path: string, network?: string) => resolveEmptyFieldPlaceholder(path, network);

assert.equal(label('experience.2.company'), 'Company/Organisation');
assert.equal(label('work.2.name'), 'Company/Organisation');
ok('work company: canvas "experience.2.company" and Unified "work.2.name" agree');

assert.equal(label('experience.0.role'), 'Role/Designation');
assert.equal(label('work.0.position'), 'Role/Designation');
ok('work role: both spellings read "Role/Designation"');

assert.equal(label('experience.0.description'), 'Work summary or achievements');
ok('work description names the work summary');

assert.equal(label('education.0.degree'), 'Degree');
assert.equal(label('education.0.studyType'), 'Degree');
assert.equal(label('education.1.institution'), 'Institution');
assert.equal(label('education.0.description'), 'Modules summary or achievements');
ok('education: degree / institution / modules summary are all named');

assert.equal(label('projects.1.description'), 'Project summary or achievements');
assert.equal(label('projects.733.name'), 'Project name');
assert.equal(label('projects.0.role'), 'Role');
ok('projects mirror work: named project, role and description');

assert.equal(label('experience.0.startDate'), 'Start');
assert.equal(label('experience.0.endDate'), 'End');
assert.equal(label('education.0.startDate'), 'Start');
assert.equal(label('projects.0.endDate'), 'End');
ok('dates read "Start" / "End" in every section');

assert.equal(label('basics.email'), 'Email');
assert.equal(label('basics.phone'), 'Phone');
assert.equal(label('basics.location'), 'Location');
assert.equal(label('basics.summary'), 'Professional summary');
assert.equal(label('basics.profiles.0.url', 'LinkedIn'), 'LinkedIn');
assert.equal(label('basics.profiles.0.url', 'GitHub'), 'GitHub');
assert.equal(label('basics.profiles.0.url'), 'Profile link');
ok('contact + named-profile slots keep their specific labels');

assert.equal(label('certifications.0.name'), 'Certification name');
assert.equal(label('certificates.0.issuer'), 'Issuer');
assert.equal(label('awards.0.awarder'), 'Awarding organisation');
assert.equal(label('publications.0.publisher'), 'Publisher');
assert.equal(label('volunteer.0.description'), 'Volunteer summary or achievements');
assert.equal(label('references.0.contact'), 'Email or phone');
assert.equal(label('languages.0.fluency'), 'Fluency level');
assert.equal(label('interests.0.name'), 'Interest');
ok('every remaining list section has its own labels');

// The whole point of the change: no dead-end "Type here..." / "No text".
const samples = [
  'experience.0.company',
  'education.0.degree',
  'projects.0.description',
  'unknownSection.0.someNewField',
  'basics.someNewField',
  '',
];
for (const sample of samples) {
  const resolved = label(sample);
  assert.ok(resolved.length > 0, `empty label for ${sample}`);
  assert.ok(!/type here|no text/i.test(resolved), `generic label "${resolved}" for ${sample}`);
}
ok('no path falls back to "Type here..." / "No text"');

// An unlisted field still names itself rather than going generic.
assert.equal(label('custom.0.studyType'), 'Study type');
assert.equal(label(''), 'Add text');
ok('unlisted fields are prettified from the path; blank paths stay neutral');

// ---------------------------------------------------------------------------
// 2. Wiring — editor uses the resolver, titles carry the token class
// ---------------------------------------------------------------------------
const coreUi = read('src', 'components', 'cv-builder-pro', 'components', 'CoreUI.tsx');
assert.ok(
  coreUi.includes("import { resolveEmptyFieldPlaceholder } from '@/lib/utils/cv-field-labels'"),
  'CoreUI must import the resolver'
);
assert.ok(
  coreUi.includes('resolveEmptyFieldPlaceholder(path, profileNetwork)'),
  'CoreUI must resolve the placeholder from the field path'
);
assert.ok(
  !coreUi.includes('emptyText = "Type here..."'),
  'the old "Type here..." ladder must be gone'
);
assert.ok(coreUi.includes('empty:after:text-gray-300'), 'placeholder text must stay light (gray-300)');
assert.ok(!coreUi.includes('empty:after:text-gray-400'), 'placeholder text must not be gray-400 again');
ok('empty-field labels are resolved per field and rendered faintly');

const registry = read('src', 'components', 'cv-builder-pro', 'registry.tsx');
const titleStyleCount = (registry.match(/TITLE_TOKEN_CLASS\}/g) || []).length;
assert.equal(titleStyleCount, 7, `all 7 title styles must carry cv-section-title (found ${titleStyleCount})`);
ok('every section-title style carries the cv-section-title token class');

const canvas = read('src', 'components', 'cv-builder-pro', 'CVCanvasEngine.tsx');
const snapshot = read('src', 'components', 'cv-builder-pro', 'CVSnapshotDocument.tsx');
for (const [name, source] of [['canvas', canvas], ['snapshot', snapshot]] as const) {
  assert.ok(
    /\.cv-section-title \{ margin-bottom: calc\(var\(--cv-item-gap, 12px\) \* 0\.5 \* var\(--cv-spacing\)\) !important; \}/.test(
      source
    ),
    `${name}: the title gap must follow --cv-item-gap`
  );
  assert.ok(
    /\.cv-section-title \.lucide \{ width: 1em !important; height: 1em !important; \}/.test(source),
    `${name}: the title icon must be sized to the title's own type`
  );
}
ok('canvas and snapshot agree on the title gap (0.5 × item gap) and icon size (1em)');

// The title gap rule has to come AFTER the mb-* spacing block, otherwise the
// Tailwind margin the templates pass in wins and Item gap stops moving the title.
for (const [name, source] of [['canvas', canvas], ['snapshot', snapshot]] as const) {
  const mbBlock = source.indexOf('margin-bottom: calc(6px * var(--cv-spacing))');
  const titleRule = source.indexOf('.cv-section-title { margin-bottom: calc(var(--cv-item-gap, 12px) * 0.5');
  assert.ok(mbBlock > -1 && titleRule > mbBlock, `${name}: title gap rule must follow the mb-* block`);
}
ok('the title gap rule wins the cascade in both stylesheets');

console.log(`\n  ${checks}/${checks} checks passed\n`);
