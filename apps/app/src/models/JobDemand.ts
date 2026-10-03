/**
 * JobDemand Model
 *
 * Tracks aggregated search demand for role families across locations.
 * Enables the shared ingestion scheduler to prioritize high-value refreshes.
 *
 * Design: Each demand segment is identified by roleFamily + country + remote.
 * Individual search events are aggregated into counters rather than stored
 * permanently to avoid excessive volume.
 */

import mongoose, { Schema, Model } from 'mongoose';

// ── Types ───────────────────────────────────────────────────────────────────

export interface IJobDemand {
  _id: string; // e.g., "IT_SUPPORT:GB:REMOTE"
  normalizedQuery: string;
  roleFamily: string;
  location: string;
  country: string;
  remote: boolean;

  demandCount: number;
  uniqueUsers: number;
  userSample: string[];

  lastRequestedAt: Date;
  lastFetchedAt: Date | null;
  nextEligibleFetchAt: Date | null;

  priority: number;
  activeRunId: string | null;
  status: 'idle' | 'queued' | 'fetching' | 'stale';

  sourcePerformance: Array<{
    source: string;
    lastYield: number;
    lastDuration: number;
    lastSuccess: Date | null;
    lastFailure: Date | null;
    consecutiveFailures: number;
  }>;

  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ──────────────────────────────────────────────────────────────────

const JobDemandSchema = new Schema(
  {
    _id: { type: String, required: true },
    normalizedQuery: { type: String, required: true },
    roleFamily: { type: String, required: true, index: true },
    location: { type: String, default: '' },
    country: { type: String, default: 'GLOBAL', index: true },
    remote: { type: Boolean, default: false },

    demandCount: { type: Number, default: 1 },
    uniqueUsers: { type: Number, default: 1 },
    userSample: [{ type: String }],

    lastRequestedAt: { type: Date, default: Date.now, index: true },
    lastFetchedAt: { type: Date, default: null },
    nextEligibleFetchAt: { type: Date, default: null },

    priority: { type: Number, default: 50, index: true },
    activeRunId: { type: String, default: null },
    status: {
      type: String,
      enum: ['idle', 'queued', 'fetching', 'stale'],
      default: 'idle',
      index: true,
    },

    sourcePerformance: [
      {
        source: { type: String, required: true },
        lastYield: { type: Number, default: 0 },
        lastDuration: { type: Number, default: 0 },
        lastSuccess: { type: Date, default: null },
        lastFailure: { type: Date, default: null },
        consecutiveFailures: { type: Number, default: 0 },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound indexes for scheduler queries
JobDemandSchema.index({ priority: -1, nextEligibleFetchAt: 1, status: 1 });
JobDemandSchema.index({ status: 1, priority: -1 });
JobDemandSchema.index({ lastFetchedAt: -1 });

// JSON transform
JobDemandSchema.set('toJSON', {
  transform(_doc, ret: Record<string, any>) {
    delete ret.__v;
    return ret;
  },
});

// ── Model ───────────────────────────────────────────────────────────────────

let _Model: Model<IJobDemand> | null = null;

export function getJobDemandModel(): Model<IJobDemand> {
  if (_Model) return _Model;
  const conn = mongoose.connection;
  _Model = conn.models['JobDemand'] || conn.model('JobDemand', JobDemandSchema, 'jobDemand');
  return _Model;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Generate a deterministic demand segment ID from parameters.
 */
export function buildDemandId(params: {
  roleFamily: string;
  country?: string;
  remote?: boolean;
}): string {
  const country = params.country || 'GLOBAL';
  const remote = params.remote ? 'REMOTE' : 'ONSITE';
  return `${params.roleFamily}:${country}:${remote}`;
}

/**
 * Maximum number of unique user IDs to store in the sample.
 * Beyond this, we only track the count.
 */
export const MAX_USER_SAMPLE_SIZE = 50;
