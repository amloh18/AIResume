import mongoose from 'mongoose';
import { ApplicationJourney } from '@/models';

/**
 * Link a saved cover letter to the application journey it was written for.
 *
 * WHY THIS EXISTS
 * ---------------
 * The link between a journey and its cover letter is stored on **both** sides:
 * `CoverLetter.journeyId` (which letter belongs to which application) and
 * `ApplicationJourney.coverLetterId` (which letter the journey should show).
 * Every creation path wrote only the letter's side — the studio save, the
 * `/api/cover-letters` POST **and** PUT, and the journey generator's own
 * duplicate check. A cover letter written in the studio therefore existed, was
 * listed as a document, and was still invisible to the journey that asked for
 * it, so the journey offered "generate" again and produced a second letter.
 *
 * The journey is only pointed at the letter when it has no cover letter yet.
 * Overwriting a different id would silently detach a letter the user already
 * approved, and there is no way to tell those two cases apart here.
 */
export async function linkCoverLetterToJourney(coverLetter: {
  _id: mongoose.Types.ObjectId | string;
  journeyId?: mongoose.Types.ObjectId | string | null;
} | null | undefined): Promise<void> {
  if (!coverLetter?._id || !coverLetter.journeyId) return;

  const journeyId = String(coverLetter.journeyId);
  if (!mongoose.Types.ObjectId.isValid(journeyId)) return;

  try {
    await ApplicationJourney.updateOne(
      {
        _id: new mongoose.Types.ObjectId(journeyId),
        $or: [
          { coverLetterId: { $exists: false } },
          { coverLetterId: null },
          { coverLetterId: '' },
        ],
      },
      { $set: { coverLetterId: String(coverLetter._id) } }
    );
  } catch (error) {
    /*
      Linking is a consistency repair, not part of storing the document: the
      letter has already been saved and must stay saved. A failure here is
      logged and surfaced by the journey's own "no cover letter" state, which
      can regenerate or relink — it must not turn a successful save into a 500.
    */
    console.error('[coverLetterLinkService] Failed to link cover letter to journey:', error);
  }
}
