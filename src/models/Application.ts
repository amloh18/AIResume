import mongoose, { Schema, Document } from 'mongoose';

export type CanonicalStage = 'saved' | 'staging' | 'applied' | 'interview' | 'offer' | 'rejected';

export type InternalApplicationStatus =
  | 'saved'
  | 'staging_cv_generating'
  | 'staging_cover_letter_generating'
  | 'staging_ready'
  | 'queued'
  | 'processing'
  | 'form_detected'
  | 'submitting'
  | 'verification'
  | 'applied'
  | 'automation_failed'
  | 'automation_unknown'
  | 'review_required'
  | 'interview'
  | 'offer'
  | 'rejected';

export interface IApplicationEvidence {
  confirmationId?: string;
  confirmationUrl?: string;
  confirmationText?: string;
  emailMessageId?: string;
  capturedAt?: Date;
  verificationConfidence?: number;
}

export interface IApplication extends Document {
  userId: mongoose.Types.ObjectId | string;
  jobId: mongoose.Types.ObjectId | string;
  currentStage: CanonicalStage;
  internalStatus: InternalApplicationStatus;
  applicationMethod: 'manual' | 'auto';
  cvId?: mongoose.Types.ObjectId | string;
  coverLetterId?: mongoose.Types.ObjectId | string;
  automationEnabled: boolean;
  automationRunId?: string;
  attempts: number;
  stageHistory: Array<{
    stage: CanonicalStage;
    internalStatus: InternalApplicationStatus;
    changedAt: Date;
    reason?: string;
    source: 'user' | 'automation' | 'email_intelligence' | 'admin';
  }>;
  evidence?: IApplicationEvidence;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema = new Schema<IApplication>(
  {
    userId: { type: Schema.Types.Mixed, required: true, index: true },
    jobId: { type: Schema.Types.Mixed, required: true, index: true },
    currentStage: {
      type: String,
      enum: ['saved', 'staging', 'applied', 'interview', 'offer', 'rejected'],
      default: 'saved',
      index: true,
    },
    internalStatus: {
      type: String,
      default: 'saved',
      index: true,
    },
    applicationMethod: {
      type: String,
      enum: ['manual', 'auto'],
      default: 'manual',
    },
    cvId: { type: Schema.Types.Mixed },
    coverLetterId: { type: Schema.Types.Mixed },
    automationEnabled: { type: Boolean, default: false },
    automationRunId: { type: String },
    attempts: { type: Number, default: 0 },
    stageHistory: [
      {
        stage: { type: String, required: true },
        internalStatus: { type: String, required: true },
        changedAt: { type: Date, default: Date.now },
        reason: { type: String },
        source: {
          type: String,
          enum: ['user', 'automation', 'email_intelligence', 'admin'],
          default: 'user',
        },
      },
    ],
    evidence: {
      confirmationId: String,
      confirmationUrl: String,
      confirmationText: String,
      emailMessageId: String,
      capturedAt: Date,
      verificationConfidence: Number,
    },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

ApplicationSchema.index({ userId: 1, jobId: 1 }, { unique: true });
ApplicationSchema.index({ userId: 1, currentStage: 1 });

export default mongoose.models.Application || mongoose.model<IApplication>('Application', ApplicationSchema);
