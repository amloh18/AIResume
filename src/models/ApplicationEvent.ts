import mongoose, { Schema, Document } from 'mongoose';

export type ApplicationEventType =
  | 'APPLICATION_CREATED'
  | 'APPLICATION_STAGED'
  | 'CV_READY'
  | 'COVER_LETTER_READY'
  | 'APPLICATION_QUEUED'
  | 'APPLICATION_STARTED'
  | 'FORM_DETECTED'
  | 'FORM_FILLED'
  | 'DOCUMENTS_UPLOADED'
  | 'SUBMISSION_STARTED'
  | 'SUBMISSION_CONFIRMED'
  | 'APPLICATION_FAILED'
  | 'APPLICATION_UNKNOWN'
  | 'APPLICATION_REQUIRES_REVIEW'
  | 'INTERVIEW_DETECTED'
  | 'OFFER_DETECTED'
  | 'REJECTION_DETECTED'
  | 'MANUAL_STAGE_CHANGE';

export interface IApplicationEvent extends Document {
  applicationId: mongoose.Types.ObjectId | string;
  userId: mongoose.Types.ObjectId | string;
  jobId: mongoose.Types.ObjectId | string;
  type: ApplicationEventType;
  previousStage?: string;
  newStage?: string;
  previousStatus?: string;
  newStatus?: string;
  source: 'user' | 'automation_worker' | 'email_intelligence' | 'admin' | 'system';
  runId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const ApplicationEventSchema = new Schema<IApplicationEvent>(
  {
    applicationId: { type: Schema.Types.Mixed, required: true, index: true },
    userId: { type: Schema.Types.Mixed, required: true, index: true },
    jobId: { type: Schema.Types.Mixed, required: true },
    type: { type: String, required: true, index: true },
    previousStage: { type: String },
    newStage: { type: String },
    previousStatus: { type: String },
    newStatus: { type: String },
    source: {
      type: String,
      enum: ['user', 'automation_worker', 'email_intelligence', 'admin', 'system'],
      default: 'system',
    },
    runId: { type: String },
    metadata: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

ApplicationEventSchema.index({ applicationId: 1, createdAt: -1 });

export default mongoose.models.ApplicationEvent || mongoose.model<IApplicationEvent>('ApplicationEvent', ApplicationEventSchema);
