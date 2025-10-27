import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEmailCampaign extends Document {
  campaignName: string;
  subject: string;
  htmlContent: string;
  plainTextContent?: string;
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled';
  
  // Targeting filters
  targetFilters: {
    membershipPlans?: string[]; // ['free', 'basic', 'premium', 'enterprise']
    userAge?: {
      type: 'new_users' | 'existing_users';
      days?: number; // e.g., 7, 15, 30
    };
    registrationDateRange?: {
      startDate?: Date;
      endDate?: Date;
    };
    lastActiveRange?: {
      startDate?: Date;
      endDate?: Date;
    };
    usageMetrics?: {
      minCVsCreated?: number;
      maxCVsCreated?: number;
      minJourneysCompleted?: number;
      maxJourneysCompleted?: number;
    };
    emailVerified?: boolean;
    isDeleted?: boolean; // Target deleted users
  };
  
  // Campaign metadata
  targetedUserCount: number;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  unsubscribedCount: number;
  
  // Scheduling
  scheduledAt?: Date;
  sentAt?: Date;
  
  // Template info
  templateId?: string;
  templateName?: string;
  
  // Creator info
  createdBy: mongoose.Types.ObjectId;
  createdByName: string;
  createdByEmail: string;
  
  // Metadata
  tags?: string[];
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const EmailCampaignSchema = new Schema<IEmailCampaign>(
  {
    campaignName: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    htmlContent: {
      type: String,
      required: true,
    },
    plainTextContent: {
      type: String,
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'sent', 'cancelled'],
      default: 'draft',
    },
    targetFilters: {
      membershipPlans: [String],
      userAge: {
        type: {
          type: String,
          enum: ['new_users', 'existing_users'],
        },
        days: Number,
      },
      registrationDateRange: {
        startDate: Date,
        endDate: Date,
      },
      lastActiveRange: {
        startDate: Date,
        endDate: Date,
      },
      usageMetrics: {
        minCVsCreated: Number,
        maxCVsCreated: Number,
        minJourneysCompleted: Number,
        maxJourneysCompleted: Number,
      },
      emailVerified: Boolean,
      isDeleted: Boolean,
    },
    targetedUserCount: {
      type: Number,
      default: 0,
    },
    sentCount: {
      type: Number,
      default: 0,
    },
    deliveredCount: {
      type: Number,
      default: 0,
    },
    openedCount: {
      type: Number,
      default: 0,
    },
    clickedCount: {
      type: Number,
      default: 0,
    },
    bouncedCount: {
      type: Number,
      default: 0,
    },
    unsubscribedCount: {
      type: Number,
      default: 0,
    },
    scheduledAt: Date,
    sentAt: Date,
    templateId: String,
    templateName: String,
    createdBy: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    createdByName: {
      type: String,
      required: true,
    },
    createdByEmail: {
      type: String,
      required: true,
    },
    tags: [String],
    notes: String,
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
EmailCampaignSchema.index({ status: 1, createdAt: -1 });
EmailCampaignSchema.index({ createdBy: 1 });
EmailCampaignSchema.index({ 'targetFilters.membershipPlans': 1 });
EmailCampaignSchema.index({ scheduledAt: 1 });

let EmailCampaign: Model<IEmailCampaign>;

try {
  // Try to get existing model
  EmailCampaign = mongoose.model<IEmailCampaign>('EmailCampaign');
} catch {
  // Create new model if it doesn't exist
  EmailCampaign = mongoose.model<IEmailCampaign>('EmailCampaign', EmailCampaignSchema, 'emailcampaigns');
}

export default EmailCampaign;

