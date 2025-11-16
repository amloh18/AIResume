import mongoose, { Document, Schema } from 'mongoose';

export interface IWebhookLog extends Document {
  provider: 'stripe' | 'razorpay';
  eventType: string;
  payload: Record<string, any>; // Raw webhook payload
  status: 'processed' | 'failed' | 'error' | 'pending' | 'failed_permanently';
  errorMessage?: string;
  processedAt?: Date;
  retryCount?: number;
  lastRetryAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const webhookLogSchema = new Schema<IWebhookLog>({
  provider: {
    type: String,
    required: [true, 'Provider is required'],
    enum: ['stripe', 'razorpay']
  },
  eventType: {
    type: String,
    required: [true, 'Event type is required'],
    trim: true
  },
  payload: {
    type: Schema.Types.Mixed,
    required: [true, 'Payload is required']
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: ['processed', 'failed', 'error', 'pending', 'failed_permanently'],
    default: 'pending'
  },
  errorMessage: {
    type: String,
    trim: true,
    maxlength: [1000, 'Error message cannot exceed 1000 characters']
  },
  processedAt: {
    type: Date
  },
  retryCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastRetryAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
webhookLogSchema.index({ provider: 1, eventType: 1 });
webhookLogSchema.index({ status: 1 });
webhookLogSchema.index({ createdAt: -1 });
webhookLogSchema.index({ status: 1, retryCount: 1 }); // For retry queries
webhookLogSchema.index({ lastRetryAt: 1 }); // For retry timing

// TTL index for automatic cleanup of old logs (90 days)
webhookLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days in seconds

export default mongoose.models.WebhookLog || mongoose.model<IWebhookLog>('WebhookLog', webhookLogSchema);

