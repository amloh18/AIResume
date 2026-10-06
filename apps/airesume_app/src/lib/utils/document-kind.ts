/**
 * Document classification: is this a *job-specific* (journey) artefact, or one
 * of the user's own standalone documents?
 *
 * WHY THIS IS SHARED
 * ------------------
 * The same question was being answered with a slightly different inline
 * expression on every surface that asked it — the dashboard KPI counts, the
 * dashboard CV table, and the documents page each had their own field list. A
 * document classified as a journey CV in one place and as a user CV in another
 * is exactly how journey CVs ended up listed in the dashboard's "My CVs" table
 * and on the documents page, where they do not belong: those documents are
 * generated *for a specific job*, they are already surfaced in the application
 * tracker, and listing them alongside the user's real CVs makes the list look
 * like it is full of duplicates.
 *
 * The field lists below are deliberately permissive. A false positive hides a
 * generated document that is still reachable from its job; a false negative
 * leaks it into the user's own library, which is the bug being fixed.
 */

/** Any document shape we might be handed, from any API projection. */
type DocumentLike = Record<string, any> | null | undefined;

/**
 * A CV generated for a specific job application.
 *
 * `cvType` is the declared field on the CV model, but the *link* fields are
 * checked too, because they are what the API projections and older documents
 * actually carry — `cv.jobId` / `cv.targetJobId` are read defensively elsewhere
 * in the app for exactly that reason.
 *
 * Booleans are deliberately NOT checked. Nothing in the codebase writes an
 * `isJourney` flag, and per Mongoose strict an undeclared path cannot be
 * persisted anyway, so testing for one only manufactures a false sense of
 * coverage — while reading as load-bearing to the next person.
 */
export function isJourneyCv(cv: DocumentLike): boolean {
  if (!cv) return false;
  return Boolean(
    cv.cvType === 'journey' ||
      cv.journeyId ||
      cv.metadata?.journeyId ||
      cv.jobId ||
      cv.targetJobId
  );
}

/**
 * The user's own CV — their Profile/Master CV, or one they created directly.
 * These are the documents the dashboard CV table is for.
 */
export function isUserOwnedCv(cv: DocumentLike): boolean {
  return Boolean(cv) && !isJourneyCv(cv);
}

/**
 * The single Profile CV, which the dashboard pins to the top of the table.
 *
 * `metadata.isMaster` predates `cvType` and is still written by parts of the
 * app, so either marker is accepted.
 */
export function isMasterCv(cv: DocumentLike): boolean {
  if (!cv) return false;
  return cv.cvType === 'master' || cv.metadata?.isMaster === true;
}

/**
 * A cover letter generated for a specific job application.
 *
 * A cover letter carrying a `jobId` is job-specific by definition, so it is a
 * journey document even if the `journeyId` link was never written.
 *
 * `isTailored` is deliberately NOT checked, despite the name suggesting it
 * should be: nothing writes it and the model does not declare it. Worse, if it
 * were ever introduced as a generic "this was tailored" flag, every
 * manually-tailored cover letter would silently vanish from the documents page
 * with no job to reach it from — the exact failure this module exists to
 * prevent, inverted.
 */
export function isJourneyCoverLetter(coverLetter: DocumentLike): boolean {
  if (!coverLetter) return false;
  return Boolean(
    coverLetter.journeyId ||
      coverLetter.jobId ||
      coverLetter.jobApplicationId ||
      coverLetter.metadata?.journeyId
  );
}

/** A cover letter the user owns outright, rather than one generated for a job. */
export function isUserOwnedCoverLetter(coverLetter: DocumentLike): boolean {
  return Boolean(coverLetter) && !isJourneyCoverLetter(coverLetter);
}

/**
 * Order a list of CVs for display: the Profile CV first, then most-recently
 * updated. Returns a new array; the input is not mutated.
 */
export function sortCvsForDisplay<T extends DocumentLike>(cvs: T[]): T[] {
  return [...cvs].sort((a, b) => {
    const aMaster = isMasterCv(a);
    const bMaster = isMasterCv(b);
    if (aMaster !== bMaster) return aMaster ? -1 : 1;

    const aTime = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
    const bTime = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
    return bTime - aTime;
  });
}

/**
 * Order a list of cover letters for display: most-recently updated first.
 *
 * The cover-letter counterpart of `sortCvsForDisplay`, and here for the same
 * reason — the dashboard's two tables had the same date-sort inlined
 * separately, which is how they end up disagreeing about ordering. Cover
 * letters have no "pinned" entry, so this is the recency rule alone.
 */
export function sortCoverLettersForDisplay<T extends DocumentLike>(coverLetters: T[]): T[] {
  return [...coverLetters].sort((a, b) => {
    const aTime = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
    const bTime = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
    return bTime - aTime;
  });
}
