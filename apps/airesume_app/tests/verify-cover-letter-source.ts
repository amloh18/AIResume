/**
 * Cover letter single-source wiring checks — run with `npm run verify:cover-letter-source`.
 *
 * WHY THIS EXISTS
 * ---------------
 * Every defect in this subsystem had the same shape: the mechanism existed and nothing called it.
 *
 *   - `JobApplication.cvId` / `.coverLetterId` were on the schema; 0 of 48 applications had them set.
 *   - `atsPlaywrightService` accepted `coverLetterPdf`; nothing ever passed it.
 *   - `ApplicationJourney.coverLetterId` recorded the letter; the editor never read it, so editing a
 *     journey letter created a duplicate.
 *   - The journey sidebar had its own generation path that bypassed the server generator.
 *
 * None of those would have failed a type-check, a build, or a normal test — the code was valid, it
 * just was not wired. So this asserts the wiring itself.
 *
 * This is deliberately a source-level guard, not a behaviour test. Behaviour for the renderer is
 * covered by `verify:cover-letter-attachment`; the write paths here need a database and a browser,
 * which is not what this test is for. It fails loudly if someone reintroduces a second pipeline.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let checks = 0;
const ok = (label: string) => {
  checks += 1;
  console.log(`  ok  ${label}`);
};

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const read = (relative: string) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

// ---------------------------------------------------------------------------
// 1. The journey sidebar must generate through the server generator.
//
// It used to fetch the CV and job itself, POST to /api/ai/cover-letter-generate,
// save the text via /api/cover-letters and then link it by hand — a second
// pipeline with a different prompt, no cvId, and three independent failure points.
// ---------------------------------------------------------------------------
{
  const source = read('src/components/dashboard/JourneyTimelineCard.tsx');

  assert.ok(
    source.includes('/api/journey-documents/create'),
    'the journey sidebar must generate documents through /api/journey-documents/create'
  );
  assert.ok(
    !source.includes("'/api/ai/cover-letter-generate'"),
    'the journey sidebar must not run its own cover letter generation pipeline'
  );
  ok('journey sidebar generates through the single server-side generator');
}

// ---------------------------------------------------------------------------
// 2. The editor must adopt the journey's letter instead of creating another.
// ---------------------------------------------------------------------------
{
  const source = read('src/components/resume-enhancer/ResumeEnhancerContainer.tsx');

  assert.ok(
    source.includes('/api/application-journey/'),
    'the editor must look up the journey to find its existing cover letter'
  );
  assert.ok(
    /journeyClId|journey\?\.coverLetterId|journey\.coverLetterId/.test(source),
    'the editor must read coverLetterId off the journey'
  );
  ok('editor adopts the journey cover letter id rather than duplicating it');
}

// ---------------------------------------------------------------------------
// 3. The application must record which documents it used.
// ---------------------------------------------------------------------------
{
  const source = read('src/lib/services/unifiedApplyService.ts');

  assert.ok(
    /documentLink\.coverLetterId = String\(docResult\.coverLetterId\)/.test(source),
    'the application must record coverLetterId when documents become ready'
  );
  assert.ok(
    /documentLink\.cvId = String\(docResult\.cvId\)/.test(source),
    'the application must record cvId when documents become ready'
  );
  ok('JobApplication records the cvId and coverLetterId it was prepared with');
}

// ---------------------------------------------------------------------------
// 4. The letter must reach the ATS form.
//
// Four flows (Greenhouse, Lever, Ashby, Workable). A partial wiring would mean
// the letter silently disappears on some ATS types only.
// ---------------------------------------------------------------------------
{
  const source = read('src/lib/services/unifiedApplyService.ts');
  const resolverCalls = (source.match(/resolveCoverLetterAttachment\(/g) || []).length;
  const pdfPasses = (source.match(/coverLetterPdf: coverLetter\?\.buffer/g) || []).length;

  assert.ok(
    resolverCalls >= 5,
    `the resolver must be defined and used in all four ATS flows (saw ${resolverCalls})`
  );
  assert.equal(pdfPasses, 4, `all four ATS flows must pass coverLetterPdf (saw ${pdfPasses})`);
  ok('all four ATS flows resolve and pass the cover letter');
}

// ---------------------------------------------------------------------------
// 5. The ATS filler must still accept the letter, or step 4 is passing into a void.
// ---------------------------------------------------------------------------
{
  const source = read('src/lib/services/atsPlaywrightService.ts');

  assert.ok(source.includes('coverLetterPdf?: Buffer'), 'the ATS filler must accept coverLetterPdf');
  assert.ok(
    source.includes('coverLetterFileName?: string'),
    'the ATS filler must accept coverLetterFileName'
  );
  ok('the ATS filler still accepts the cover letter attachment');
}

// ---------------------------------------------------------------------------
// 6. The download route and the automation must share one renderer.
//
// Two copies drift: the candidate downloads one letter and the employer receives
// another.
// ---------------------------------------------------------------------------
{
  const route = read('src/app/api/cover-letters/[id]/download/route.ts');

  assert.ok(
    route.includes('renderCoverLetterPdf'),
    'the download route must use the shared renderer'
  );
  assert.ok(
    !route.includes('async function generateCoverLetterPDF'),
    'the download route must not keep a private PDF implementation'
  );
  ok('download route and automation share a single renderer');
}

console.log(`\nverify-cover-letter-source: ${checks} checks passed`);
