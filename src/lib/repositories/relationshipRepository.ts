import { ApplicationJourney, CV, CoverLetter } from '@/models';

export class RelationshipRepository {
  static async findPrimaryJourney(jobId: string, userId: string) {
    const journeys = await ApplicationJourney.find({ jobId, userId })
      .sort({ 'metadata.updatedAt': -1 })
      .lean();
    return journeys[0] || null;
  }

  static async findJourneysForJobs(jobIds: string[], userId: string) {
    return await ApplicationJourney.find({
      jobId: { $in: jobIds },
      userId
    }).sort({ 'metadata.updatedAt': -1 }).lean();
  }

  static async findCV(cvId: string) {
    return await CV.findById(cvId).lean();
  }

  static async findCoverLetter(clId: string) {
    return await CoverLetter.findById(clId).lean();
  }

  static async findCVs(cvIds: string[]) {
    return await CV.find({ _id: { $in: cvIds } }).lean();
  }

  static async findCoverLetters(clIds: string[]) {
    return await CoverLetter.find({ _id: { $in: clIds } }).lean();
  }
}
