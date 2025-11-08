import mongoose, { Document, Schema } from 'mongoose';

export type QueueTaskType =
  | 'job_status_check'
  | 'follow_up'
  | 'deadline_approaching'
  | 'deadline_due_today'
  | 'deadline_missed'
  | 'membership_expiring'
  | 'membership_expired'
  | 'discount_offer'
  | 'system_update'
  | 'achievement'
  | 'broadcast'
  | 'targeted';

export type QueueTaskStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface INotificationQueue extends Document {
  taskType: QueueTaskType;
  payload: {
    userId?: string | mongoose.Types.ObjectId;
    userIds?: string[] | mongoose.Types.ObjectId[]; // For bulk notifications
    notificationType?: string;
    title?: string;
    message?: string;
    actionType?: string;
    actionData?: any;
    metadata?: any;
    channels?: string[];
    persistent?: boolean;
    expiresAt?: Date;
    priority?: string;
    [key: string]: any;
  };
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduledFor: Date;
  status: QueueTaskStatus;
  retries: number;
  maxRetries: number;
  error?: string;
  processedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationQueueSchema = new Schema<INotificationQueue>(
  {
    taskType: {
      type: String,
      enum: [
        'job_status_check',
        'follow_up',
        'deadline_approaching',
        'deadline_due_today',
        'deadline_missed',
        'membership_expiring',
        'membership_expired',
        'discount_offer',
        'system_update',
        'achievement',
        'broadcast',
        'targeted',
      ],
      required: true,
      index: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    scheduledFor: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    retries: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    error: {
      type: String,
    },
    processedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for queue processing
notificationQueueSchema.index({ status: 1, scheduledFor: 1, priority: -1 });
notificationQueueSchema.index({ status: 1, priority: -1, createdAt: 1 });
notificationQueueSchema.index({ taskType: 1, status: 1 });

const NotificationQueue =
  mongoose.models.NotificationQueue ||
  mongoose.model<INotificationQueue>('NotificationQueue', notificationQueueSchema);

export default NotificationQueue;

