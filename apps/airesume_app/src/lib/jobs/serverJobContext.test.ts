// @vitest-environment node
import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import ApplicationJourney from '@/models/ApplicationJourney';
import { mapJobApplicationToContext } from '@/lib/jobs/serverJobContext';

/**
 * Regression tests for two front-end ↔ back-end contract breaks.
 *
 * ── 1. State recovery created journeys the schema rejects ─────────────────────
 * `stateRecoveryService.checkJobJourneys()` used to build an ApplicationJourney
 * from a `jobApplicationId` filter that is not a schema path, with a status the
 * enum rejects, a string `currentStep` against a numeric path, a `step` key where
 * the subdocument requires `stepId`/`name`, and no `company`/`jobTitle`. The
 * `create()` therefore threw on every run — the repair had never once succeeded.
 *
 * The negative control below is the important half: it asserts the OLD payload
 * still fails, so a future "fix" that simply relaxes the schema is caught.
 *
 * ── 2. The AI routes could not supply job context ─────────────────────────────
 * `AIAssistantService` reads `jobData.title` / `.description` / `.company`, but
 * no Mongo model stores those names (`jobTitle` / `jobDescription` / `company`).
 * The mapping is load-bearing, so it is asserted directly.
 */

describe('ApplicationJourney schema contract', () => {
  it('does not declare the `jobApplicationId` path the old filter used', () => {
    // If this ever becomes a real path, the old lookup would start matching and
    // the reasoning behind the fix needs revisiting.
    expect(ApplicationJourney.schema.path('jobApplicationId')).toBeUndefined();
  });

  it('keeps an undeclared-path filter (so it could never match a document)', () => {
    // This is the trap that made the bug permanent: `strictQuery` defaults to
    // false, so the filter survives to MongoDB instead of being dropped, and no
    // document carries the field — so the existence check always returned null.
    const filter = ApplicationJourney.findOne({ jobApplicationId: 'x' }).getFilter();
    expect(filter).toEqual({ jobApplicationId: 'x' });
  });

  it('rejects the status value the old repair wrote', () => {
    // `schema.path()` is loosely typed; same cast the models themselves use
    // (see the `source` path fixup in src/models/JobApplication.ts).
    const statusPath = ApplicationJourney.schema.path('status') as unknown as { enumValues?: string[] };
    const enumValues = statusPath.enumValues ?? [];
    expect(enumValues).not.toContain('created');
    expect(enumValues).toContain('in-progress');
  });

  it('NEGATIVE CONTROL: the old repair payload fails validation', async () => {
    const doc = new ApplicationJourney({
      userId: 'user-1',
      status: 'created',
      currentStep: 'application_submitted',
      steps: [{ step: 'application_submitted', status: 'completed', completedAt: new Date() }],
    });

    await expect(doc.validate()).rejects.toThrow();
  });

  it('the current repair payload passes validation', async () => {
    const doc = new ApplicationJourney({
      journeyId: 'journey_1_abc',
      userId: new mongoose.Types.ObjectId(),
      jobId: 'job-1',
      status: 'in-progress',
      currentStep: 1,
      totalSteps: 5,
      jobTitle: 'Backend Engineer',
      company: 'Acme',
      journeyType: 'standard',
      steps: [
        { stepId: 1, name: 'Job Analysis', status: 'active', data: {} },
        { stepId: 2, name: 'CV Tailoring', status: 'pending', data: {} },
      ],
      metadata: { createdAt: new Date(), updatedAt: new Date(), lastAccessedAt: new Date(), tags: [], notes: '' },
    });

    await expect(doc.validate()).resolves.toBeUndefined();
  });

  it('still requires jobTitle and company (negative control)', async () => {
    const doc = new ApplicationJourney({
      userId: 'user-1',
      jobId: 'job-1',
      status: 'in-progress',
      currentStep: 1,
      steps: [{ stepId: 1, name: 'Job Analysis', status: 'active', data: {} }],
    });

    await expect(doc.validate()).rejects.toThrow();
  });
});

describe('mapJobApplicationToContext', () => {
  it('maps the stored field names onto the names the AI services read', () => {
    const ctx = mapJobApplicationToContext({
      _id: 'abc123',
      jobId: 'cat-9',
      jobTitle: 'Senior Platform Engineer',
      company: 'Acme',
      jobDescription: 'Build things.',
      missingKeywords: ['kubernetes', 'terraform'],
      matchedSkills: ['node'],
    });

    // These three are the ones the AI prompts dereference directly.
    expect(ctx.title).toBe('Senior Platform Engineer');
    expect(ctx.description).toBe('Build things.');
    expect(ctx.company).toBe('Acme');
    expect(ctx.id).toBe('abc123');
    expect(ctx.jobId).toBe('cat-9');
    expect(ctx.requirements).toBe('kubernetes, terraform');
  });

  it('falls back to jobDescriptionRaw when jobDescription is empty', () => {
    const ctx = mapJobApplicationToContext({
      _id: 'a',
      jobTitle: 'X',
      jobDescription: '   ',
      jobDescriptionRaw: 'raw text',
    });
    expect(ctx.description).toBe('raw text');
  });

  it('produces an empty title rather than undefined so callers can detect it', () => {
    // `calculateJobTitleScore` returns a neutral 50 when `title` is falsy, so the
    // absence must be an empty string, never `undefined` leaking into prompts.
    const ctx = mapJobApplicationToContext({ _id: 'a' });
    expect(ctx.title).toBe('');
    expect(ctx.description).toBe('');
    expect(ctx.requirements).toBe('');
    expect(ctx.missingKeywords).toEqual([]);
  });
});
