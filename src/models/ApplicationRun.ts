/**
 * DEAD CODE INVENTORY (audit 2026-09-24, fix-tasks R8.1) — **do not extend**.
 *
 * No file in the repository imports `models/ApplicationRun` (verified by grep 2026-09-24). Run-level
 * evidence is recorded through `ApplicationEvent` instead (see `applicationStateMachine.transition`).
 * Kept as a removal candidate for the out-of-scope GAP-12 consolidation (fix-tasks Q4).
 */
import mongoose, { Schema, Document } from 'mongoose';

export interface IApplicationRunStep {
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  metadata?: Record<string, any>;
  error?: string;
}

export interface IApplicationRun extends Document {
  runId: string;
  applicationId: mongoose.Types.ObjectId | string;
  attempt: number;
  status: 'running' | 'completed' | 'failed' | 'unknown' | 'review_required';
  platform: string;
  startedAt: Date;
  finishedAt?: Date;
  durationMs?: number;
  steps: IApplicationRunStep[];
  evidence?: Record<string, any>;
  error?: string;
  createdAt: Date;
}

const ApplicationRunSchema = new Schema<IApplicationRun>(
  {
    runId: { type: String, required: true, unique: true },
    applicationId: { type: Schema.Types.Mixed, required: true, index: true },
    attempt: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['running', 'completed', 'failed', 'unknown', 'review_required'],
      default: 'running',
      index: true,
    },
    platform: { type: String, required: true },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date },
    durationMs: { type: Number },
    steps: [
      {
        name: { type: String, required: true },
        status: { type: String, required: true },
        startedAt: { type: Date },
        completedAt: { type: Date },
        durationMs: { type: Number },
        metadata: { type: Schema.Types.Mixed },
        error: { type: String },
      },
    ],
    evidence: { type: Schema.Types.Mixed },
    error: { type: String },
  },
  { timestamps: true }
);

ApplicationRunSchema.index({ applicationId: 1, startedAt: -1 });

export default mongoose.models.ApplicationRun || mongoose.model<IApplicationRun>('ApplicationRun', ApplicationRunSchema);
