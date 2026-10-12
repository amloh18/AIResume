/**
 * Onboarding + editor-polish checks — run with `npm run verify:onboarding-editor`.
 *
 * Two kinds of assertion live here, both of them answering a question that a
 * screenshot cannot:
 *
 *  1. BEHAVIOUR — the tour's card placement is pure, so its flip/clamp rules are
 *     tested directly instead of by clicking on a small screen.
 *  2. CONTRACT — the acceptance criteria for this round are mostly *removals*
 *     ("no gradient card", "no LinkedIn tile", "no black progress bar", "the box
 *     must not grow"). A removal has no runtime behaviour to assert, so the
 *     source of the two files that own them is read and checked for the absence
 *     of the old markup and the presence of the new. These are deliberately
 *     narrow string checks — they fail loudly if the thing is reintroduced, and
 *     they cannot pass by accident.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  placeTourCard,
  EDITOR_TOUR_STEPS,
  TOUR_STORAGE_KEY,
  hasCompletedTour,
  markTourCompleted,
} from '../src/components/resume-enhancer/EditorOnboardingTour';

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, '..');
const read = (rel: string) => readFileSync(path.join(appRoot, rel), 'utf8');

const welcome = read('src/app/welcome/page.tsx');
const rail = read('src/components/resume-enhancer/components/UtilityPanelRail.tsx');
const container = read('src/components/resume-enhancer/ResumeEnhancerContainer.tsx');
const step3 = read('src/components/resume-enhancer/steps/Step3CV.tsx');

let checks = 0;
const ok = (label: string) => {
  checks += 1;
  console.log(`  ok  ${label}`);
};

// ---------------------------------------------------------------------------
// 1. Tour card placement
// ---------------------------------------------------------------------------
const viewport = { width: 1280, height: 800 };
const card = { width: 328, height: 200 };

const centred = placeTourCard(null, card, 'bottom', viewport);
assert.equal(centred.left, Math.round((1280 - 328) / 2));
assert.equal(centred.top, Math.round((800 - 200) / 2));
ok('a step with no anchor centres the card');

// A short target in the middle: bottom placement sits below it, centred on it.
const mid = { top: 300, left: 500, width: 200, height: 60 };
const below = placeTourCard(mid, card, 'bottom', viewport);
assert.equal(below.top, 300 + 60 + 14);
assert.equal(below.left, 500 + 100 - 164);
ok('bottom placement sits below the target, centred on it');

// Same target, top placement: above it.
const above = placeTourCard(mid, card, 'top', viewport);
assert.equal(above.top, 300 - 200 - 14);
ok('top placement sits above the target');

// A target near the bottom edge would push a bottom card off screen — it flips
// to the top instead of being clamped over the thing it describes.
const lowTarget = { top: 700, left: 500, width: 120, height: 40 };
const flipped = placeTourCard(lowTarget, card, 'bottom', viewport);
assert.ok(flipped.top + card.height <= 800 - 16, 'flipped card stays inside the viewport');
assert.ok(flipped.top < lowTarget.top, 'flipped card sits above the target, not on top of it');
ok('a bottom card flips above a target that is too low to fit below');

// The right rail anchors to the right edge of the page; a left-placed card for a
// target against the left edge flips to the right.
const leftEdge = { top: 300, left: 4, width: 200, height: 300 };
const rightOfIt = placeTourCard(leftEdge, card, 'left', viewport);
assert.ok(rightOfIt.left >= leftEdge.left + leftEdge.width);
ok('a left card flips right when the target hugs the left edge');

// Everything is clamped inside the viewport margins, whatever the numbers are.
const huge = { top: 0, left: 0, width: 4000, height: 4000 };
const clamped = placeTourCard(huge, card, 'bottom', viewport);
assert.ok(clamped.left >= 16 && clamped.left + card.width <= 1280 - 16);
assert.ok(clamped.top >= 16 && clamped.top + card.height <= 800 - 16);
ok('placement is clamped to the viewport on every side');

// ---------------------------------------------------------------------------
// 2. The tour covers what it promised to cover
// ---------------------------------------------------------------------------
assert.equal(EDITOR_TOUR_STEPS.length, 5, 'five steps, matching the "n of 5" the card prints');
assert.equal(EDITOR_TOUR_STEPS[0].target, null, 'step one has no anchor');
for (const step of EDITOR_TOUR_STEPS.slice(1)) {
  assert.ok(step.target, `step "${step.id}" must anchor to something`);
  assert.ok(step.title.length > 4 && step.body.length > 40, `step "${step.id}" needs real copy`);
}
ok('five anchored steps, each with a title and body copy');

const targets = EDITOR_TOUR_STEPS.map((s) => s.target).join(' ');
assert.ok(targets.includes('[data-cv-zoom-layer]'), 'points at the CV sheet (click a section)');
assert.ok(targets.includes('[data-editor-panel-rail]'), 'points at the five right-hand panels');
assert.ok(targets.includes('[data-canvas-page-controls]'), 'points at the bottom controls');
assert.ok(targets.includes('[data-canvas-toolrail]'), 'points at the section toolbar');
ok('the tour anchors to the canvas, the panels, the page controls and the section toolbar');

const allCopy = EDITOR_TOUR_STEPS.map((s) => `${s.title} ${s.body}`).join(' ').toLowerCase();
for (const phrase of ['analysis', 'add section', 'design', 'template', 'json']) {
  assert.ok(allCopy.includes(phrase), `the panels step must name "${phrase}"`);
}
assert.ok(allCopy.includes('improve'), 'the AI improve button is explained');
assert.ok(allCopy.includes('ai'), 'the AI entry point is explained');
assert.ok(allCopy.includes('up/down') || allCopy.includes('higher or lower'), 'moving a section up/down is explained');
assert.ok(allCopy.includes('entry'), 'the per-entry side rail is explained');
assert.ok(allCopy.includes('pill'), 'the AI suggestion pill is explained');
assert.ok(allCopy.includes('zoom'), 'zoom is explained');
ok('the copy names every control the tour was asked to explain');

assert.equal(EDITOR_TOUR_STEPS[EDITOR_TOUR_STEPS.length - 1].id, 'selection');
assert.equal(typeof EDITOR_TOUR_STEPS[EDITOR_TOUR_STEPS.length - 1].prepare, 'function');
ok('the final step prepares (selects) a section so its toolbar exists');
assert.equal(TOUR_STORAGE_KEY, 'buildairesume_editor_tour_v1');

// Every anchor the tour uses must exist in the product, or the step silently
// degrades to a centred card. These are the attributes the components publish.
for (const attr of ['data-cv-workspace', 'data-cv-zoom-layer', 'data-canvas-toolrail', 'data-canvas-page-controls']) {
  const found =
    read('src/components/cv-builder-pro/CVCanvasEngine.tsx').includes(attr) ||
    read('src/components/cv-builder-pro/components/CoreUI.tsx').includes(attr);
  assert.ok(found, `no element publishes ${attr}`);
}
assert.ok(rail.includes('data-editor-panel-rail'), 'the panel rail must publish its tour anchor');
ok('every tour anchor is published by the component that owns it');

// ---------------------------------------------------------------------------
// 3. Editor: the onboarding hand-off
// ---------------------------------------------------------------------------
assert.ok(rail.includes('isOnboarding'), 'the rail takes an onboarding flag');
assert.ok(
  /isOnboardingNext \? 'Save & Continue'/.test(rail),
  'the rail relabels its Next tile to "Save & Continue" while onboarding'
);
assert.ok(
  step3.includes('<EditorOnboardingTour active />') && step3.includes('isOnboarding'),
  'step 3 mounts the tour when onboarding',
);
assert.ok(
  !/title="Save & Continue to Onboarding"/.test(container),
  'the duplicate "Save & Continue" button is gone from the editor header'
);
assert.ok(
  /isManualClick && !isFromOnboarding && !isGuestMode/.test(container),
  'the free-plan save paywall is skipped during onboarding'
);
ok('onboarding hand-off: one CTA, in the rail, and no paywall on save');

// ---------------------------------------------------------------------------
// 4. Welcome page: the visual fixes
// ---------------------------------------------------------------------------
assert.ok(
  welcome.includes('const TOTAL_ONBOARDING_STEPS = 14'),
  'the step total is a single named constant'
);
assert.ok(
  /TOTAL_ONBOARDING_STEPS\b/.test(welcome) && !/Job Agent \(\$\{currentStep\}\/13\)/.test(welcome),
  'the header label no longer hard-codes the wrong total'
);
assert.ok(
  (welcome.match(/TOTAL_ONBOARDING_STEPS/g) || []).length >= 4,
  'the bar and the label both derive from the constant'
);
// The Profile Transformation card was the gradient the report was about. The
// step-2 parse bar keeps its gradient on purpose — it is a progress fill inside
// a light card, not a surface, and it is not what looked broken.
assert.ok(
  !/from-emerald-50 via-lime-50\/40 to-white/.test(welcome),
  'the Profile Transformation card gradient is gone'
);
assert.ok(
  /bg-white border border-emerald-200\/80 rounded-3xl/.test(welcome),
  'the Profile Transformation card is now a solid surface'
);
assert.ok(
  !/id: 'linkedin'/.test(welcome),
  'the LinkedIn seeding tile is removed'
);
assert.ok(
  welcome.includes("id: 'scratch'") && welcome.includes("id: 'upload'") && welcome.includes("id: 'json'"),
  'the three real seeding tiles are still there'
);
assert.ok(
  !/border-dashed border-gray-300 hover:border-gray-400 bg-gray-50\/50 text-gray-500/.test(welcome),
  'the "Flexible / Open to offers" tile is no longer greyed out'
);
assert.ok(
  /bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-lime-500 text-center text-lg font-bold text-gray-900/.test(
    welcome,
  ),
  'the custom application-volume input has its own surface and text colour'
);
ok('welcome page: 14 steps, accent bar, no gradient, no LinkedIn tile, live input text');

// The congratulations letter must reserve its final height up front.
assert.ok(
  /aria-hidden="true" className="invisible space-y-4"/.test(welcome),
  'the letter reserves its full height with an invisible copy'
);
assert.ok(
  /absolute inset-0 space-y-4/.test(welcome),
  'the typed letter is layered over that reserve'
);
ok('the congratulations letter cannot grow as it types');

// The pipeline board must not keep the gradient that broke dark mode, and the
// static tiles below it are gone.
assert.ok(
  /bg-white border border-gray-200\/90 rounded-2xl sm:rounded-3xl/.test(welcome),
  'the pipeline board is a solid surface'
);
assert.ok(
  !/4 Feature Highlights Grid/.test(welcome),
  'the four static tiles under the pipeline board are removed'
);
assert.ok(
  /TRACKER_STAGE_MS/.test(welcome) && /layoutId="tracker-live-card"/.test(welcome),
  'the stage timer and the travelling card still drive the animation'
);
assert.ok(
  (welcome.match(/transition=\{\{ type: 'spring', stiffness: 250, damping: 26, mass: 0.9 \}\}/g) || []).length === 4,
  'all four pipeline columns move the card with the same spring'
);
ok('step 11: solid board, no static tiles, one shared spring + timed stage track');

// Accent, not black, on the surfaces the request named.
assert.ok(welcome.includes("const ONBOARDING_ACCENT_BG = 'bg-lime-500'"), 'the onboarding accent is defined once');
assert.ok(
  (welcome.match(/ONBOARDING_ACCENT_BG/g) || []).length >= 5,
  'the accent is applied to the bar, tiles and chips'
);
ok('onboarding accent is lime and shared, not black');

// ---------------------------------------------------------------------------
// 5. The "show once" gate
// ---------------------------------------------------------------------------
// Wrapped in an async function: this file is transformed as CJS, which has no
// top-level await.
async function checkShowOnceGate() {
// localOnly: this is the gate's contract against a stubbed network, so it needs
// no database and no session.
const withFetch = async (impl: (...args: any[]) => any, fn: () => Promise<unknown>) => {
  const original = globalThis.fetch;
  (globalThis as any).fetch = impl;
  try {
    return await fn();
  } finally {
    (globalThis as any).fetch = original;
  }
};

const flagTrue = await withFetch(
  async () => ({ ok: true, json: async () => ({ data: { onboarding: { editor_tour_completed: true } } }) }),
  () => hasCompletedTour(),
);
assert.equal(flagTrue, true, 'a completed tour is recognised from the server flag');

const flagFalse = await withFetch(
  async () => ({ ok: true, json: async () => ({ data: { onboarding: { editor_tour_completed: false } } }) }),
  () => hasCompletedTour(),
);
assert.equal(flagFalse, false, 'an unfinished tour still runs');

const flagMissing = await withFetch(
  async () => ({ ok: true, json: async () => ({ data: { onboarding: {} } }) }),
  () => hasCompletedTour(),
);
assert.equal(flagMissing, false, 'a user with no recorded value sees the tour');

// Every failure mode must fail OPEN (show the tour). The endpoint needs a
// session and loads the master CV, so 401 and slow are the expected cases.
const unauthorised = await withFetch(
  async () => ({ ok: false, status: 401, json: async () => ({ error: 'UNAUTHORIZED' }) }),
  () => hasCompletedTour(),
);
assert.equal(unauthorised, false, 'a 401 shows the tour rather than silently skipping it');

const offline = await withFetch(async () => { throw new Error('network down'); }, () => hasCompletedTour());
assert.equal(offline, false, 'a network error shows the tour');

const malformed = await withFetch(
  async () => ({ ok: true, json: async () => { throw new Error('not json'); } }),
  () => hasCompletedTour(),
);
assert.equal(malformed, false, 'a malformed body shows the tour');

// A hanging request must not hold the tour back: it resolves false by timeout.
const started = Date.now();
const hung = await withFetch(
  (_url: string, init?: any) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    }),
  () => hasCompletedTour(300),
);
assert.equal(hung, false, 'a request that never answers shows the tour');
assert.ok(Date.now() - started < 3000, 'the timeout is bounded, not indefinite');
ok('the tour gate fails open on 401, offline, malformed and hung responses');

let captured: any = null;
await withFetch(
  async (url: string, init?: any) => {
    captured = { url, ...init };
    return { ok: true, json: async () => ({}) };
  },
  () => markTourCompleted(),
);
assert.equal(captured.method, 'PATCH', 'finishing the tour writes, it does not just read');
assert.equal(captured.url, '/api/user/onboarding');
assert.deepEqual(JSON.parse(captured.body), { editor_tour_completed: true });
ok('finishing the tour PATCHes editor_tour_completed to the user record');

const patchFails = await withFetch(async () => { throw new Error('nope'); }, () => markTourCompleted());
assert.equal(patchFails, undefined, 'a failed write never throws into the UI');
ok('a failed flag write is swallowed');

// The user model must actually be able to store it (a strict sub-schema drops
// unknown paths silently, which would make the flag a no-op).
const userModel = read('src/models/User.ts');
assert.ok(/editor_tour_completed\?: boolean;/.test(userModel), 'the User type declares the flag');
assert.ok(
  /editor_tour_completed: \{ type: Boolean, default: false \}/.test(userModel),
  'the User schema declares the flag, or Mongoose would drop it',
);
const onboardingRoute = read('src/app/api/user/onboarding/route.ts');
assert.ok(
  /onboardingData\.editor_tour_completed !== undefined/.test(onboardingRoute),
  'the onboarding PATCH route accepts the flag',
);
ok('the durable flag is declared in the schema and accepted by the route');
}

checkShowOnceGate()
  .then(() => {
    console.log(`\n${checks} checks passed`);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
