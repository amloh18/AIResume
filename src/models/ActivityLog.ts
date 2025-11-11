import mongoose, { Document, Schema } from 'mongoose';

export type LogType = 'api' | 'ai' | 'user_action' | 'system' | 'payment' | 'export' | 'admin_action';
export type LogStatus = 'success' | 'failed' | 'warning';

export interface IActivityLog extends Document {
  // Core categorization
  logType: LogType;
  
  // Common fields
  timestamp: Date;
  userId?: mongoose.Types.ObjectId;
  userEmail?: string;
  sessionId?: string;
  ipAddress?: string;
  
  // Request context (API/AI logs)
  endpoint?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number; // milliseconds
  
  // Resource details
  resource?: {
    type: 'cv' | 'cover_letter' | 'job' | 'journey' | 'user' | 'campaign' | 'plan' | 'other';
    id?: mongoose.Types.ObjectId | string;
    name?: string;
  };
  
  // Action metadata
  action: string; // 'created', 'updated', 'deleted', 'exported', 'ats_check', etc.
  
  // AI-specific fields
  aiMetadata?: {
    model?: string;
    tokensUsed?: number;
    cost?: number;
    prompt?: string;
    responseLength?: number;
  };
  
  // API-specific fields
  apiMetadata?: {
    requestSize?: number; // bytes
    responseSize?: number; // bytes
    errorCode?: string;
    userAgent?: string;
  };
  
  // Export-specific fields
  exportMetadata?: {
    format?: 'pdf' | 'docx' | 'txt';
    templateUsed?: string;
    fileSize?: number; // bytes
  };
  
  // Payment-specific fields
  paymentMetadata?: {
    amount?: number;
    currency?: string;
    provider?: 'stripe' | 'razorpay';
    transactionId?: string;
    planKey?: string;
  };
  
  // Admin action fields
  adminMetadata?: {
    adminUserId?: mongoose.Types.ObjectId;
    adminEmail?: string;
    targetUserId?: mongoose.Types.ObjectId;
    actionType?: string;
  };
  
  // Common metadata
  status: LogStatus;
  errorMessage?: string;
  metadata?: Record<string, any>; // Additional flexible data
  
  // For admin panel filtering
  tags?: string[];
}

const activityLogSchema = new Schema<IActivityLog>({
  logType: {
    type: String,
    required: true,
    enum: ['api', 'ai', 'user_action', 'system', 'payment', 'export', 'admin_action']
    // Note: Index defined in compound indexes below
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
    // Note: Index defined in compound indexes below (and TTL index)
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
    // Note: Index defined in compound index below
  },
  userEmail: {
    type: String
    // Note: Index defined in text search index below
  },
  sessionId: String,
  ipAddress: String,
  endpoint: String,
  method: String,
  statusCode: Number,
  responseTime: Number,
  resource: {
    type: {
      type: String,
      enum: ['cv', 'cover_letter', 'job', 'journey', 'user', 'campaign', 'plan', 'other']
    },
    id: Schema.Types.Mixed,
    name: String
  },
  action: {
    type: String,
    required: true
    // Note: Index defined in compound index and text search below
  },
  aiMetadata: {
    model: String,
    tokensUsed: Number,
    cost: Number,
    prompt: String,
    responseLength: Number
  },
  apiMetadata: {
    requestSize: Number,
    responseSize: Number,
    errorCode: String,
    userAgent: String
  },
  exportMetadata: {
    format: {
      type: String,
      enum: ['pdf', 'docx', 'txt']
    },
    templateUsed: String,
    fileSize: Number
  },
  paymentMetadata: {
    amount: Number,
    currency: String,
    provider: {
      type: String,
      enum: ['stripe', 'razorpay']
    },
    transactionId: String,
    planKey: String
  },
  adminMetadata: {
    adminUserId: Schema.Types.ObjectId,
    adminEmail: String,
    targetUserId: Schema.Types.ObjectId,
    actionType: String
  },
  status: {
    type: String,
    required: true,
    enum: ['success', 'failed', 'warning']
    // Note: Index defined in compound index below
  },
  errorMessage: String,
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  tags: [String]
}, {
  timestamps: true
});

// Compound indexes for common queries
activityLogSchema.index({ timestamp: -1, logType: 1 });
activityLogSchema.index({ userId: 1, timestamp: -1 });
activityLogSchema.index({ logType: 1, status: 1, timestamp: -1 });
activityLogSchema.index({ 'resource.type': 1, 'resource.id': 1 });
activityLogSchema.index({ endpoint: 1, timestamp: -1 });
activityLogSchema.index({ action: 1, timestamp: -1 });

// TTL index for auto-deletion (90 days)
activityLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 7776000 } // 90 days
);

// Text search index
activityLogSchema.index({ userEmail: 'text', action: 'text', errorMessage: 'text' });

const ActivityLog = mongoose.models.ActivityLog || mongoose.model<IActivityLog>('ActivityLog', activityLogSchema);

export default ActivityLog;

