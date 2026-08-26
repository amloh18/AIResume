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

export type ApplicationEventSource = 'user' | 'automation' | 'email_intelligence' | 'admin' | (string & {});

export interface IApplicationEventDocument extends Document {
  applicationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  
  type: ApplicationEventType;
  previousStage?: string;
  newStage?: string;
  source: ApplicationEventSource;
  
  metadata?: Record<string, any>;
  createdAt: Date;
}

const ApplicationEventSchema = new Schema<IApplicationEventDocument>(
  {
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'ApplicationUnified',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    
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
    source: {
      type: String,
      enum: ['user', 'automation', 'email_intelligence', 'admin'],
      required: true,
    },
    
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
