import mongoose, { Schema, Document, Model } from 'mongoose';


export interface IEmailCampaign extends Document {
  campaignName: string;
  subject: string;
  htmlContent: string;
  plainTextContent?: string;
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled' | 'sending' | 'recurring';

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
      minUsageMinutes?: number;
    };
    emailVerified?: boolean;
    isDeleted?: boolean; // Target deleted users
  };

  // A/B Testing Configuration
  abTestConfig?: {
    enabled: boolean;
    testType: 'subject' | 'cta' | 'both';
    variants: Array<{
      id: string;
      subjectLine?: string;
      ctaText?: string;
    }>;
    sampleSize: number; // Percentage (10-50%)
    testDuration: number; // Hours (1-48)
    winningMetric: 'opens' | 'clicks';
    winningVariantId?: string;
    testStartedAt?: Date;
    testCompletedAt?: Date;
  };

  // Campaign metadata
  targetedUserCount: number;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  unsubscribedCount: number;

  // Enhanced Performance Tracking
  performance: {
    sent: number;
    delivered: number;
    bounced: number;
    hardBounces: number;
    softBounces: number;
    opened: number;
    uniqueOpens: number;
    clicked: number;
    uniqueClicks: number;
    unsubscribed: number;
    spamReports: number;
    goalCompletions: number;
    revenue?: number;
    /** Set for system-generated containers (e.g. 'verification_code'); used as a dedup key. */
    systemType?: string;
  };

  // Verification Status
  verification?: {
    hasUnsubscribeLink: boolean;
    allLinksValid: boolean;
    personalizationValid: boolean;
    mobileResponsive: boolean;
    spamScore?: number;
    checkedAt?: Date;
  };

  // Review & Approval
  review?: {
    requestedFrom?: mongoose.Types.ObjectId; // User ID
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    rejectedAt?: Date;
    notes?: string;
  };

  // Filter Preset Reference
  filterPresetId?: string;
  filterPresetName?: string;

  // Scheduling
  scheduledAt?: Date;
  sentAt?: Date;

  // Recurrence
  isRecurring?: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly';
  nextRunAt?: Date;
  lastRunAt?: Date;
  endDate?: Date;
  parentCampaignId?: mongoose.Types.ObjectId;

  // Campaign Goal
  campaignGoal?: string; // 'clicks', 'conversions', 'opens', 'signups', 'revenue'

  // Sender Info
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;

  // Template info
  templateId?: string;
  templateName?: string;

  // CSV Recipients
  csvRecipients?: Array<{
    name: string;
    email: string;
  }>;

  // Saved Recipients
  recipients?: Array<{
    userId?: mongoose.Types.ObjectId;
    email: string;
    firstName?: string;
    lastName?: string;
    isCsv: boolean;
    currentPlanKey?: string | null;
    registrationDate?: Date | null;
    lastActiveAt?: Date | null;
    status: 'pending' | 'sent' | 'failed';
    error?: string;
    removed?: boolean;
    sentAt?: Date;
  }>;

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
      enum: ['draft', 'scheduled', 'sent', 'cancelled', 'sending', 'recurring'],
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
        minUsageMinutes: Number,
      },
      emailVerified: Boolean,
      isDeleted: Boolean,
    },
    abTestConfig: {
      enabled: Boolean,
      testType: {
        type: String,
        enum: ['subject', 'cta', 'both'],
      },
      variants: [{
        id: String,
        subjectLine: String,
        ctaText: String,
      }],
      sampleSize: Number,
      testDuration: Number,
      winningMetric: {
        type: String,
        enum: ['opens', 'clicks'],
      },
      winningVariantId: String,
      testStartedAt: Date,
      testCompletedAt: Date,
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
    performance: {
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      bounced: { type: Number, default: 0 },
      hardBounces: { type: Number, default: 0 },
      softBounces: { type: Number, default: 0 },
      opened: { type: Number, default: 0 },
      uniqueOpens: { type: Number, default: 0 },
      clicked: { type: Number, default: 0 },
      uniqueClicks: { type: Number, default: 0 },
      unsubscribed: { type: Number, default: 0 },
      spamReports: { type: Number, default: 0 },
      goalCompletions: { type: Number, default: 0 },
      revenue: Number,
      // Must be declared: SystemEmailTracker writes it and then uses
      // 'performance.systemType' as a find-or-create dedup key. Undeclared, Mongoose
      // strict mode silently dropped it on write while the (unstripped) query filter
      // still required it — so findOne never matched and every system email created a
      // brand-new container document instead of incrementing today's.
      systemType: { type: String, index: true },
    },
    verification: {
      hasUnsubscribeLink: Boolean,
      allLinksValid: Boolean,
      personalizationValid: Boolean,
      mobileResponsive: Boolean,
      spamScore: Number,
      checkedAt: Date,
    },
    review: {
      requestedFrom: Schema.Types.ObjectId,
      approvedBy: Schema.Types.ObjectId,
      approvedAt: Date,
      rejectedAt: Date,
      notes: String,
    },
    filterPresetId: String,
    filterPresetName: String,
    scheduledAt: Date,
    sentAt: Date,
    isRecurring: Boolean,
    recurringFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly']
    },
    nextRunAt: Date,
    lastRunAt: Date,
    endDate: Date,
    parentCampaignId: Schema.Types.ObjectId,
    campaignGoal: String,
    fromName: String,
    fromEmail: String,
    replyTo: String,
    templateId: String,
    templateName: String,
    csvRecipients: [{
      name: String,
      email: String,
    }],
    recipients: [{
      userId: Schema.Types.ObjectId,
      email: { type: String, required: true },
      firstName: String,
      lastName: String,
      isCsv: Boolean,
      currentPlanKey: String,
      registrationDate: Date,
      lastActiveAt: Date,
      status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
      error: String,
      removed: { type: Boolean, default: false },
      sentAt: Date,
    }],
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

