/**
 * Guards for the single document-readiness derivation.
 *
 * These pin the exact divergences that made one application read three
 * different ways: a job with no journey rendering "Partially generated", a
 * Master CV counting as a tailored CV, a retry split across two journey rows,
 * and an index keyed on the wrong id.
 *
 * Run: npx vitest run src/tests/regression/journey-documents.test.ts
 */
import { describe, it, expect } from 'vitest';
import {
  getJourneyDocuments,
  getJourneyDocumentsForJob,
  getJourneyDocumentState,
  getJourneyDocumentStateForJob,
  buildJourneyIndex,
  getJobJourneysFromIndex,
  isJourneyProcessing,
  isJourneyFailed,
  toJourneyView,
} from '@/lib/utils/journey-documents';

const journey = (over: Record<string, any> = {}) => ({
  id: 'j1',
  jobId: 'app1',
  status: 'ready',
  cvId: 'cv1',
  coverLetterId: 'cl1',
  ...over,
}) as any;

describe('getJourneyDocuments — one definition of ready', () => {
  it('both links present is the only "ready"', () => {
    const docs = getJourneyDocuments(journey());
    expect(docs.hasCV).toBe(true);
    expect(docs.hasCoverLetter).toBe(true);
    expect(docs.ready).toBe(true);
    expect(docs.partial).toBe(false);
  });

  it('a missing half is partial, not ready', () => {
    const docs = getJourneyDocuments(journey({ coverLetterId: null }));
    expect(docs.ready).toBe(false);
    expect(docs.partial).toBe(true);
  });

  it('no journey at all reports nothing, and is NOT "partial"', () => {
    const docs = getJourneyDocuments(null);
    expect(docs.ready).toBe(false);
    // `partial: false` is what stops the card painting two red icons for a job
    // that simply has no journey yet.
    expect(docs.partial).toBe(false);
    expect(docs.hasCV).toBe(false);
  });
});

describe('getJourneyDocumentsForJob — union across the job\'s journeys', () => {
  it('a CV on one row and a cover letter on another is a complete application', () => {
    const docs = getJourneyDocumentsForJob([
      journey({ id: 'a', coverLetterId: null }),
      journey({ id: 'b', cvId: null }),
    ]);
    expect(docs.hasCV).toBe(true);
    expect(docs.hasCoverLetter).toBe(true);
    expect(docs.ready).toBe(true);
  });

  it('an empty list reports nothing (not partial)', () => {
    const docs = getJourneyDocumentsForJob([]);
    expect(docs.ready).toBe(false);
    expect(docs.partial).toBe(false);
  });
});

describe('getJourneyDocumentStateForJob — what the card is allowed to say', () => {
  it('no journey and no request in flight is "none"', () => {
    expect(getJourneyDocumentStateForJob([])).toBe('none');
  });

  it('no journey but a request in flight is "generating"', () => {
    expect(getJourneyDocumentStateForJob([], { isPending: true })).toBe('generating');
  });

  it('links win over a stale sibling failure', () => {
    const state = getJourneyDocumentStateForJob([
      journey({ id: 'old', status: 'creation_failed', cvId: null, coverLetterId: null }),
      journey({ id: 'new', status: 'ready' }),
    ]);
    expect(state).toBe('ready');
  });

  it('a settled journey missing a document is "partial"', () => {
    expect(getJourneyDocumentStateForJob([journey({ status: 'ready', coverLetterId: null })]))
      .toBe('partial');
  });

  it('a half-finished journey past the poll deadline is "failed"', () => {
    expect(
      getJourneyDocumentStateForJob([journey({ status: 'ready', coverLetterId: null })], {
        timedOut: true,
      })
    ).toBe('failed');
  });

  it('processing statuses keep the card in "generating"', () => {
    for (const status of ['processing_documents', 'in-progress', 'paused']) {
      expect(
        getJourneyDocumentStateForJob([journey({ status, cvId: null, coverLetterId: null })])
      ).toBe('generating');
    }
  });

  it('every failed journey is "failed"', () => {
    expect(
      getJourneyDocumentStateForJob([
        journey({ status: 'creation_failed', cvId: null, coverLetterId: null }),
      ])
    ).toBe('failed');
  });

  it('the single-journey form agrees with the list form', () => {
    const one = journey({ status: 'ready', coverLetterId: null });
    expect(getJourneyDocumentState(one)).toBe(getJourneyDocumentStateForJob([one]));
  });
});

describe('status predicates', () => {
  it('classifies processing and failed statuses', () => {
    expect(isJourneyProcessing('processing_documents')).toBe(true);
    expect(isJourneyProcessing('ready')).toBe(false);
    expect(isJourneyProcessing(undefined)).toBe(false);
    expect(isJourneyFailed('creation_failed')).toBe(true);
    expect(isJourneyFailed('ready')).toBe(false);
  });
});

describe('buildJourneyIndex — one key space, application id', () => {
  it('keys the list by journey.jobId and the embedded copy by the application id', () => {
    const index = buildJourneyIndex(
      [journey({ id: 'list-1', jobId: 'app1' })],
      [{ _id: 'app1', journey: { _id: 'embedded-1', cvId: 'cv1', coverLetterId: 'cl1' } }]
    );

    expect(getJobJourneysFromIndex(index, 'app1').length).toBe(1);
    // The list wins — the embedded copy must not duplicate the row.
    expect(getJobJourneysFromIndex(index, 'app1')[0].id).toBe('list-1');
  });

  it('fills a gap from the embedded journey when the list is empty', () => {
    const index = buildJourneyIndex([], [
      {
        _id: 'app1',
        journey: { _id: 'embedded-1', status: 'ready', cvId: 'cv1', coverLetterId: 'cl1' },
      },
    ]);

    const found = getJobJourneysFromIndex(index, 'app1');
    expect(found.length).toBe(1);
    expect(found[0].id).toBe('embedded-1');
    // Normalised so the same consumers can read it as a CVJourney.
    expect(found[0].jobId).toBe('app1');
    expect(getJourneyDocumentsForJob(found).ready).toBe(true);
  });

  it('does not confuse JobApplication.jobId (external id) with the application id', () => {
    const index = buildJourneyIndex(
      [journey({ id: 'list-1', jobId: 'app1' })],
      // `jobId` here is the *external* posting id — a different namespace.
      [{ _id: 'app1', jobId: 'workable-123' }]
    );

    expect(getJobJourneysFromIndex(index, 'app1').length).toBe(1);
    expect(getJobJourneysFromIndex(index, 'workable-123').length).toBe(0);
  });

  it('returns nothing for an unknown or absent id', () => {
    const index = buildJourneyIndex([journey()], []);
    expect(getJobJourneysFromIndex(index, 'nope').length).toBe(0);
    expect(getJobJourneysFromIndex(index, undefined).length).toBe(0);
    expect(getJobJourneysFromIndex(index, null).length).toBe(0);
  });
});

describe('toJourneyView', () => {
  it('falls back to journeyId, then the jobId, for the id', () => {
    expect(toJourneyView({ journeyId: 'jr-1' }, 'app1').id).toBe('jr-1');
    expect(toJourneyView({}, 'app1').id).toBe('app1');
  });
});
