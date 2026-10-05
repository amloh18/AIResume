/**
 * Application Outcome Service
 *
 * Records application outcomes for success learning.
 * Tracks the full lifecycle: submitted → response → screening → interview → offer
 *
 * This data powers:
 * - Success rate calculations by dimension (source, role, freshness, matchScore)
 * - Recommendation adjustments
 * - Application strategy improvements
 */

import mongoose from 'mongoose';

export type ApplicationOutcomeType =
  | 'submitted'
  | 'action_required'
  | 'response_received'
  | 'screening_passed'
  | 'interview_scheduled'
  | 'interview_completed'
  | 'offer_received'
  | 'offer_accepted'
  | 'rejected'
  | 'no_response'
  | 'withdrawn';

export interface OutcomeRecord {
  userId: string;
  jobId: string;
  applicationId: string;
  outcome: ApplicationOutcomeType;
  atsType: string;
  source: string;
  matchScore: number;
  recordedAt?: Date;
}

/**
 * Schema for application outcome records
 */
const applicationOutcomeSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  jobId: { type: String, required: true },
  applicationId: { type: String, required: true, index: true },
  outcome: {
    type: String,
    enum: [
      'submitted', 'action_required', 'response_received', 'screening_passed',
      'interview_scheduled', 'interview_completed', 'offer_received',
      'offer_accepted', 'rejected', 'no_response', 'withdrawn',
    ],
    required: true,
  },
  atsType: { type: String, default: 'unknown' },
  source: { type: String, default: 'unknown' },
  matchScore: { type: Number, default: 0 },
  recordedAt: { type: Date, default: Date.now },
}, { timestamps: true });

applicationOutcomeSchema.index({ userId: 1, outcome: 1 });
applicationOutcomeSchema.index({ userId: 1, recordedAt: -1 });

const ApplicationOutcome = mongoose.models.ApplicationOutcome ||
  mongoose.model('ApplicationOutcome', applicationOutcomeSchema);

/**
 * Record an application outcome
 * Best-effort — failures are logged but don't throw
 */
export async function recordApplicationOutcome(record: OutcomeRecord): Promise<void> {
  try {
    await ApplicationOutcome.create({
      userId: record.userId,
      jobId: record.jobId,
      applicationId: record.applicationId,
      outcome: record.outcome,
      atsType: record.atsType,
      source: record.source,
      matchScore: record.matchScore,
      recordedAt: record.recordedAt || new Date(),
    });
  } catch (error) {
    console.warn('[OutcomeService] Failed to record outcome:', error);
  }
}

/**
 * Get success rates by dimension for a user
 */
export async function getSuccessRates(
  userId: string,
  dimensions: Array<'source' | 'atsType' | 'matchScore'> = ['source']
): Promise<Record<string, { total: number; submitted: number; responseRate: number; interviewRate: number }>> {
  try {
    const outcomes = await ApplicationOutcome.find({ userId }).lean();
    const rates: Record<string, any> = {};

    for (const dim of dimensions) {
      const grouped: Record<string, typeof outcomes> = {};
      for (const o of outcomes) {
        const key = String((o as any)[dim] || 'unknown');
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(o);
      }

      for (const [key, records] of Object.entries(grouped)) {
        const total = records.length;
        const submitted = records.filter((r) => r.outcome === 'submitted').length;
        const responded = records.filter((r) =>
          ['response_received', 'screening_passed', 'interview_scheduled', 'interview_completed', 'offer_received', 'offer_accepted'].includes(r.outcome)
        ).length;
        const interviewed = records.filter((r) =>
          ['interview_scheduled', 'interview_completed', 'offer_received', 'offer_accepted'].includes(r.outcome)
        ).length;

        rates[`${dim}:${key}`] = {
          total,
          submitted,
          responseRate: total > 0 ? Math.round((responded / total) * 100) : 0,
          interviewRate: total > 0 ? Math.round((interviewed / total) * 100) : 0,
        };
      }
    }

    return rates;
  } catch (error) {
    console.warn('[OutcomeService] Failed to get success rates:', error);
    return {};
  }
}

export default {
  recordApplicationOutcome,
  getSuccessRates,
};
