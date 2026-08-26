import mongoose, { Schema, Document } from 'mongoose';

export type QueueItemStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'dead_letter' | 'cancelled';

export interface IApplicationQueue extends Document {
  applicationId: mongoose.Types.ObjectId | string;
  userId: mongoose.Types.ObjectId | string;
  jobId: mongoose.Types.ObjectId | string;
  status: QueueItemStatus;
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
  },
  { timestamps: true }
);

ApplicationQueueSchema.index({ status: 1, priority: -1, scheduledAt: 1 });

export default mongoose.models.ApplicationQueue || mongoose.model<IApplicationQueue>('ApplicationQueue', ApplicationQueueSchema);
