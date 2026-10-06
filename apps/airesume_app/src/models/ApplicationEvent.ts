import mongoose, { Schema, Document } from 'mongoose';

export type ApplicationEventType =
  | 'stage_change'
  | 'status_update'
  | 'note_added'
  | 'tag_updated'
  | 'SUBMISSION_CONFIRMED'
  | 'APPLICATION_REQUIRES_REVIEW'
  | 'APPLICATION_STAGED'
  | 'INTERVIEW_DETECTED'
  | 'OFFER_DETECTED'
  | 'REJECTION_DETECTED'
  | (string & {});

export type ApplicationEventSource =
  | 'user'
  | 'automation'
  | 'automation_worker'
  | 'email_intelligence'
  | 'admin'
  | 'system'
  | (string & {});

export interface IApplicationEventDocument extends Document {
  applicationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  jobId?: mongoose.Types.ObjectId | string;

  type: ApplicationEventType;
  previousStage?: string;
  newStage?: string;
  previousStatus?: string;
  newStatus?: string;
  source: ApplicationEventSource;
  runId?: string;

  metadata?: Record<string, any>;
  createdAt: Date;
}

const ApplicationEventSchema = new Schema<IApplicationEventDocument>(
  {
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'JobApplication',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    jobId: { type: Schema.Types.Mixed },
    
    type: {
      type: String,
      required: true,
      index: true,
    },
    previousStage: {
      type: String,
      enum: ['saved', 'staging', 'applied', 'interview', 'offer', 'rejected'],
    },
    newStage: {
      type: String,
      enum: ['saved', 'staging', 'applied', 'interview', 'offer', 'rejected'],
    },
    previousStatus: { type: String },
    newStatus: { type: String },
    source: {
      type: String,
      // Must stay in sync with JobApplication.stageHistory[].source and with the
      // `source` values the state machine is called with — `automation_worker`
      // (application worker) and `system` (reconciliation watchdog).
      enum: ['user', 'automation', 'automation_worker', 'email_intelligence', 'admin', 'system'],
      required: true,
    },
    runId: { type: String },
    
    metadata: { type: Schema.Types.Mixed },
    
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true, // Events cannot be modified
    },
  },
  {
    timestamps: false, // No updatedAt — immutable
    toJSON: {
      transform: function (doc, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
ApplicationEventSchema.index({ applicationId: 1, createdAt: -1 });
ApplicationEventSchema.index({ userId: 1, type: 1 });
ApplicationEventSchema.index({ createdAt: -1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL

// Prevent updates — events are immutable
ApplicationEventSchema.pre('findOneAndUpdate', function () {
  throw new Error('ApplicationEvents are immutable and cannot be updated');
});

ApplicationEventSchema.pre('updateOne', function () {
  throw new Error('ApplicationEvents are immutable and cannot be updated');
});

export default mongoose.models.ApplicationEvent ||
  mongoose.model<IApplicationEventDocument>('ApplicationEvent', ApplicationEventSchema);
