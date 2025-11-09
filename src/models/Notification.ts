import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType = 
  | 'job_status_check'
  | 'follow_up'
  | 'deadline_approaching'
  | 'deadline_due_today'
  | 'deadline_missed'
  | 'membership_expiring'
  | 'membership_expired'
  | 'discount_offer'
  | 'system_update'
  | 'achievement';

export type NotificationChannel = 'in-app' | 'email' | 'push';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId | string;
  firebaseUid?: string;
  type: NotificationType;
  title: string;
  message: string;
  actionType?: string; // e.g., 'move_to_next_stage', 'review_job', 'view_offer'
  actionData?: {
    jobId?: string;
    journeyId?: string;
    url?: string;
    [key: string]: any;
  };
  read: boolean;
  readAt?: Date;
  interactive: boolean;
  priority: NotificationPriority;
  expiresAt?: Date; // For time-sensitive notifications
  persistent: boolean; // Must be dismissed by user
  channels: NotificationChannel[]; // Which channels to deliver to
  deliveryStatus: {
    'in-app'?: {
      delivered: boolean;
      deliveredAt?: Date;
      error?: string;
    };
    email?: {
      delivered: boolean;
      deliveredAt?: Date;
      error?: string;
    };
    push?: {
      delivered: boolean;
      deliveredAt?: Date;
      error?: string;
    };
  };
  metadata?: {
    jobId?: string;
    journeyId?: string;
    discountCode?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    firebaseUid: {
      type: String,
      sparse: true,
      index: true,
    },
    type: {
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
      ],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    actionType: {
      type: String,
      trim: true,
    },
    actionData: {
      type: Schema.Types.Mixed,
      default: {},
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    interactive: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    persistent: {
      type: Boolean,
      default: false,
      index: true,
    },
    channels: {
      type: [String],
      enum: ['in-app', 'email', 'push'],
      default: ['in-app'],
    },
    deliveryStatus: {
      'in-app': {
        delivered: { type: Boolean, default: false },
        deliveredAt: Date,
        error: String,
      },
      email: {
        delivered: { type: Boolean, default: false },
        deliveredAt: Date,
        error: String,
      },
      push: {
        delivered: { type: Boolean, default: false },
        deliveredAt: Date,
        error: String,
      },
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
notificationSchema.index({ userId: 1, read: 1 }); // createdAt index handled by timestamps: true
notificationSchema.index({ userId: 1, type: 1, read: 1 });
notificationSchema.index({ expiresAt: 1, persistent: 1 });
// createdAt index handled by timestamps: true

const Notification =
  mongoose.models.Notification ||
  mongoose.model<INotification>('Notification', notificationSchema);

export default Notification;
