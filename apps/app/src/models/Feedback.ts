import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IFeedback extends Document {
  name: string;
  email: string;
  rating: number;
  message?: string;
  page?: string;
  userId?: string | mongoose.Types.ObjectId;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const feedbackSchema = new Schema<IFeedback>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  message: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  page: {
    type: String,
    trim: true
  },
  userId: {
    type: Schema.Types.Mixed,
    ref: 'User'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

feedbackSchema.index({ email: 1 });
feedbackSchema.index({ userId: 1, createdAt: -1 });
feedbackSchema.index({ createdAt: -1 });

const Feedback: Model<IFeedback> = mongoose.models.Feedback || mongoose.model<IFeedback>('Feedback', feedbackSchema);

export default Feedback;