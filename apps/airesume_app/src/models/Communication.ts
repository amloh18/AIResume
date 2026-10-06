/**
 * Communication Model
 *
 * Unified communication model for all email/thread interactions.
 * Extends the existing EmailMessage/EmailThread models with
 * job/application association and classification.
 *
 * One Communication record = one email message, referenced from:
 * - Jobs → Comms tab
 * - Journey → Email section
 * - Application → Timeline
 */

import mongoose, { Schema, Document } from 'mongoose';

// ============================================================================
// Types
// ============================================================================

export type CommunicationDirection = 'inbound' | 'outbound';
export type CommunicationType =
  | 'application_submission'
  | 'employer_response'
  | 'recruiter_outreach'
  | 'interview_invitation'
  | 'interview_confirmation'
  | 'follow_up'
  | 'thank_you'
  | 'offer'
  | 'rejection'
  | 'withdrawal'
  | 'automated'
  | 'system'
  | 'user_composed'
  | 'unknown';

export type CommunicationStatus =
  | 'unread'
  | 'read'
  | 'archived'
  | 'starred'
  | 'needs_action'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'queued';

export type CommunicationClassification =
  | 'APPLICATION_ACKNOWLEDGEMENT'
  | 'APPLICATION_UPDATE'
  | 'REJECTION'
  | 'INTERVIEW_INVITATION'
  | 'INTERVIEW_CONFIRMATION'
  | 'ASSESSMENT'
  | 'RECRUITER_MESSAGE'
  | 'REQUEST_FOR_INFORMATION'
  | 'OFFER'
  | 'FOLLOW_UP'
  | 'GENERAL_RECRUITING'
  | 'MARKETING'
  | 'SYSTEM'
  | 'UNKNOWN';

export type MatchConfidence = 'high' | 'medium' | 'low' | 'unmatched';

// ============================================================================
// Interface
// ============================================================================

export interface ICommunication extends Document {
  userId: mongoose.Types.ObjectId | string;

  // JMAP/Message identifiers
  jmapEmailId?: string;
  jmapThreadId?: string;
  messageId: string;          // RFC 5322 Message-ID
  inReplyTo?: string;         // RFC 5322 In-Reply-To
  references?: string[];      // RFC 5322 References
  providerMessageId?: string;

  // Direction & type
  direction: CommunicationDirection;
  type: CommunicationType;
  status: CommunicationStatus;

  // Content
  subject: string;
  bodySnippet: string;
  textBody?: string;
  htmlBody?: string;

  // Participants
  senderEmail: string;
  senderName?: string;
  recipients: Array<{ email: string; name?: string; type: 'to' | 'cc' | 'bcc' }>;
  replyTo?: string;

  // Associations
  jobId?: mongoose.Types.ObjectId | string;
  applicationId?: mongoose.Types.ObjectId | string;
  companyId?: mongoose.Types.ObjectId | string;
  contactId?: mongoose.Types.ObjectId | string;
  threadId?: mongoose.Types.ObjectId | string;  // Internal thread ID

  // Classification
  classification: CommunicationClassification;
  classificationConfidence: number;
  classificationReasons?: string[];

  // Matching
  matchConfidence: MatchConfidence;
  matchScore?: number;

  // Status tracking
  isRead: boolean;
  isStarred: boolean;

  // Attachments
  hasAttachments: boolean;
  attachments: Array<{
    filename: string;
    size: number;
    contentType: string;
    blobId?: string;
  }>;

  // Automation
  isAutomated: boolean;
  automationId?: string;
  followUpId?: string;

  // Scheduling
  sentAt?: Date;
  receivedAt: Date;
  scheduledAt?: Date;
  completedAt?: Date;

  // Stalwart metadata
  stalwartMailboxIds?: string[];
  stalwartKeywords?: Record<string, boolean>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Schema
// ============================================================================

const CommunicationSchema = new Schema<ICommunication>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // JMAP identifiers
    jmapEmailId: { type: String, sparse: true },
    jmapThreadId: { type: String, sparse: true },
    messageId: { type: String, required: true, index: true },
    inReplyTo: { type: String },
    references: [{ type: String }],
    providerMessageId: { type: String, sparse: true },

    // Direction & type
    direction: { type: String, enum: ['inbound', 'outbound'], required: true, index: true },
    type: {
      type: String,
      enum: [
        'application_submission', 'employer_response', 'recruiter_outreach',
        'interview_invitation', 'interview_confirmation', 'follow_up',
        'thank_you', 'offer', 'rejection', 'withdrawal', 'automated',
        'system', 'user_composed', 'unknown',
      ],
      default: 'unknown',
      index: true,
    },
    status: {
      type: String,
      enum: ['unread', 'read', 'archived', 'starred', 'needs_action', 'scheduled', 'sending', 'sent', 'failed', 'queued'],
      default: 'unread',
      index: true,
    },

    // Content
    subject: { type: String, required: true },
    bodySnippet: { type: String, required: true },
    textBody: { type: String },
    htmlBody: { type: String },

    // Participants
    senderEmail: { type: String, required: true, index: true },
    senderName: { type: String },
    recipients: [{
      email: { type: String, required: true },
      name: { type: String },
      type: { type: String, enum: ['to', 'cc', 'bcc'], default: 'to' },
    }],
    replyTo: { type: String },

    // Associations
    jobId: { type: Schema.Types.Mixed, index: true },
    applicationId: { type: Schema.Types.Mixed, index: true },
    companyId: { type: Schema.Types.Mixed },
    contactId: { type: Schema.Types.Mixed },
    threadId: { type: Schema.Types.Mixed, index: true },

    // Classification
    classification: {
      type: String,
      enum: [
        'APPLICATION_ACKNOWLEDGEMENT', 'APPLICATION_UPDATE', 'REJECTION',
        'INTERVIEW_INVITATION', 'INTERVIEW_CONFIRMATION', 'ASSESSMENT',
        'RECRUITER_MESSAGE', 'REQUEST_FOR_INFORMATION', 'OFFER',
        'FOLLOW_UP', 'GENERAL_RECRUITING', 'MARKETING', 'SYSTEM', 'UNKNOWN',
      ],
      default: 'UNKNOWN',
    },
    classificationConfidence: { type: Number, default: 0 },
    classificationReasons: [{ type: String }],

    // Matching
    matchConfidence: {
      type: String,
      enum: ['high', 'medium', 'low', 'unmatched'],
      default: 'unmatched',
    },
    matchScore: { type: Number },

    // Status tracking
    isRead: { type: Boolean, default: false, index: true },
    isStarred: { type: Boolean, default: false },

    // Attachments
    hasAttachments: { type: Boolean, default: false },
    attachments: [{
      filename: { type: String, required: true },
      size: { type: Number, required: true },
      contentType: { type: String, required: true },
      blobId: { type: String },
    }],

    // Automation
    isAutomated: { type: Boolean, default: false },
    automationId: { type: String },
    followUpId: { type: String },

    // Scheduling
    sentAt: { type: Date },
    receivedAt: { type: Date, required: true, index: true },
    scheduledAt: { type: Date },
    completedAt: { type: Date },

    // Stalwart metadata
    stalwartMailboxIds: [{ type: String }],
    stalwartKeywords: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

// ============================================================================
// Indexes
// ============================================================================

// Compound indexes for common queries
CommunicationSchema.index({ userId: 1, jobId: 1, receivedAt: -1 });
CommunicationSchema.index({ userId: 1, applicationId: 1, receivedAt: -1 });
CommunicationSchema.index({ userId: 1, direction: 1, receivedAt: -1 });
CommunicationSchema.index({ userId: 1, classification: 1, receivedAt: -1 });
CommunicationSchema.index({ userId: 1, status: 1, receivedAt: -1 });
CommunicationSchema.index({ userId: 1, threadId: 1, receivedAt: 1 });
CommunicationSchema.index({ userId: 1, isRead: 1, receivedAt: -1 });

// Unique constraint on messageId per user (prevent duplicates)
CommunicationSchema.index(
  { userId: 1, messageId: 1 },
  { unique: true, name: 'communication_idempotency' }
);

// TTL index for old failed/sent items (optional, 90 days)
// CommunicationSchema.index({ completedAt: 1 }, { expireAfterSeconds: 7776000 });

// ============================================================================
// Static Methods
// ============================================================================

CommunicationSchema.statics.getByJob = function (
  userId: string | mongoose.Types.ObjectId,
  jobId: string,
  options: { limit?: number; skip?: number; sort?: 'asc' | 'desc' } = {}
) {
  const { limit = 50, skip = 0, sort = 'desc' } = options;
  return this.find({ userId, jobId })
    .sort({ receivedAt: sort === 'desc' ? -1 : 1 })
    .skip(skip)
    .limit(limit);
};

CommunicationSchema.statics.getByApplication = function (
  userId: string | mongoose.Types.ObjectId,
  applicationId: string,
  options: { limit?: number; skip?: number; sort?: 'asc' | 'desc' } = {}
) {
  const { limit = 50, skip = 0, sort = 'desc' } = options;
  return this.find({ userId, applicationId })
    .sort({ receivedAt: sort === 'desc' ? -1 : 1 })
    .skip(skip)
    .limit(limit);
};

CommunicationSchema.statics.getUnreadCount = function (
  userId: string | mongoose.Types.ObjectId,
  jobId?: string
) {
  const query: any = { userId, isRead: false, direction: 'inbound' };
  if (jobId) query.jobId = jobId;
  return this.countDocuments(query);
};

CommunicationSchema.statics.getThread = function (
  userId: string | mongoose.Types.ObjectId,
  threadId: string
) {
  return this.find({ userId, threadId })
    .sort({ receivedAt: 1 });
};

CommunicationSchema.statics.getCommsForJobsTab = function (
  userId: string | mongoose.Types.ObjectId,
  options: {
    jobId?: string;
    applicationId?: string;
    direction?: CommunicationDirection;
    classification?: CommunicationClassification;
    status?: CommunicationStatus;
    limit?: number;
    skip?: number;
  } = {}
) {
  const query: any = { userId };
  if (options.jobId) query.jobId = options.jobId;
  if (options.applicationId) query.applicationId = options.applicationId;
  if (options.direction) query.direction = options.direction;
  if (options.classification) query.classification = options.classification;
  if (options.status) query.status = options.status;

  return this.find(query)
    .sort({ receivedAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 50);
};

// ============================================================================
// Export
// ============================================================================

export const Communication = mongoose.models.Communication ||
  mongoose.model<ICommunication>('Communication', CommunicationSchema);

export default Communication;
