import mongoose, { Schema, Document } from 'mongoose';

export type QueueItemStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'dead_letter' | 'cancelled';

export interface IApplicationQueue extends Document {
  applicationId: mongoose.Types.ObjectId | string;
  userId: mongoose.Types.ObjectId | string;
  jobId: mongoose.Types.ObjectId | string;
  status: QueueItemStatus;  /**
   * Execution gate decided by the decision engine at enqueue time (`auto` | `review` | `manual`).
   *
   * Previously the decision's mode was folded into `priority` alone, so the worker could not tell an
   * AUTO application from a MANUAL one and every queued item was submitted with Playwright. The worker
   * reads this to enforce the gate — see `src/lib/worker/processApplication.ts`.
   *
   * `review` is the default so documents queued before this field existed keep working: they are
   * prepared and held for approval rather than blocked outright.
   */
  mode?: 'auto' | 'review' | 'manual' | 'skip';
  /**
   * Trace id minted where the application was enqueued (request → queue → worker).
   *
   * The worker re-opens this context when it claims the item, so every log line of the eventual
   * processing run joins the request that created it — even though the two happen minutes apart in
   * different processes. Optional: queue documents written before this field existed simply start a
   * fresh trace at claim time.
   */
  correlationId?: string;
  priority: number;
  attempts: number;
  maxAttempts: number;
  scheduledAt: Date;
  lockedAt?: Date;
  lockedBy?: string;
  startedAt?: Date;
  completedAt?: Date;
  lastError?: string;
  idempotencyKey: string;
  /** Link to AutoApplyReservation for quota tracking */
  reservationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationQueueSchema = new Schema<IApplicationQueue>(
  {
    applicationId: { type: Schema.Types.Mixed, required: true, index: true },
    userId: { type: Schema.Types.Mixed, required: true, index: true },
    jobId: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ['queued', 'processing', 'completed', 'failed', 'dead_letter', 'cancelled'],
      default: 'queued',
      index: true,
    },
    mode: {
      type: String,
      enum: ['auto', 'review', 'manual', 'skip'],
      default: 'review',
    },
    correlationId: { type: String },
    priority: { type: Number, default: 50, index: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    scheduledAt: { type: Date, default: Date.now, index: true },
    lockedAt: { type: Date },
    lockedBy: { type: String },
    startedAt: { type: Date },
    completedAt: { type: Date },
    lastError: { type: String },
    idempotencyKey: { type: String, required: true, unique: true },
    reservationId: { type: String },
  },
  { timestamps: true }
);

ApplicationQueueSchema.index({ status: 1, priority: -1, scheduledAt: 1 });

export default mongoose.models.ApplicationQueue || mongoose.model<IApplicationQueue>('ApplicationQueue', ApplicationQueueSchema);
