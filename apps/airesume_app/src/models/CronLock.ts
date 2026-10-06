import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * One document per named cron job — the cross-process half of `acquireCronLock` (SB-07).
 *
 * `src/lib/cron/runCron.ts` used to guard overlap with an in-process `Map`, which is correct only
 * while exactly one app container exists. The moment a second replica runs, two ticks of
 * `daily-summary` can be in flight at once and enqueue the same emails twice. This collection is the
 * lease that makes the guard hold across processes.
 *
 * It is deliberately **not** the only guard: the in-process `Map` is still checked first, because it
 * answers without a round trip and keeps the 409 payload's `runningForMs` meaningful.
 *
 * Lifecycle:
 *   - `name` is unique, so two racing acquires cannot both insert.
 *   - `expiresAt` bounds the lease, so a container killed mid-run cannot wedge the job forever.
 *   - the TTL index is a *tidiness* net, not the correctness mechanism — expiry is enforced by the
 *     acquire filter (`expiresAt <= now`), because Mongo's TTL monitor only sweeps about once a
 *     minute and must never be what decides whether a job may start.
 */
export interface ICronLock extends Document {
  /** The job name passed to `runCron`, e.g. `daily-summary`. */
  name: string;
  /** Random per-acquisition token, so a run can only release the lease it actually holds. */
  owner: string;
  startedAt: Date;
  expiresAt: Date;
}

const cronLockSchema = new Schema<ICronLock>(
  {
    name: { type: String, required: true, unique: true },
    owner: { type: String, required: true },
    startedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: false, collection: 'cronlocks' }
);

const CronLock: Model<ICronLock> =
  (mongoose.models.CronLock as Model<ICronLock>) ||
  mongoose.model<ICronLock>('CronLock', cronLockSchema);

export default CronLock;
