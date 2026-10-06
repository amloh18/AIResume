import mongoose, { Document, Schema } from 'mongoose';

// EMAIL ACCOUNT
export interface IEmailAccount extends Document {
  userId: mongoose.Types.ObjectId | string;
  provider: 'gmail' | 'outlook' | 'imap';
  emailAddress: string;
  oauthAccessToken?: string;
  oauthRefreshToken?: string;
  tokenExpiresAt?: Date;
  lastSyncedAt?: Date;
  syncStatus: 'connected' | 'expired' | 'error' | 'disconnected';
  webhookSubscriptionId?: string;
  imapHost?: string;
  imapPort?: number;
  smtpHost?: string;
  smtpPort?: number;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmailAccountSchema = new Schema<IEmailAccount>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  provider: { type: String, enum: ['gmail', 'outlook', 'imap'], required: true },
  emailAddress: { type: String, required: true },
  oauthAccessToken: { type: String },
  oauthRefreshToken: { type: String },
  tokenExpiresAt: { type: Date },
  lastSyncedAt: { type: Date },
  syncStatus: { type: String, enum: ['connected', 'expired', 'error', 'disconnected'], default: 'connected' },
  webhookSubscriptionId: { type: String },
  imapHost: { type: String },
  imapPort: { type: Number },
  smtpHost: { type: String },
  smtpPort: { type: Number },
  password: { type: String },
}, { timestamps: true });

EmailAccountSchema.index({ userId: 1, emailAddress: 1 }, { unique: true });

export const EmailAccount = mongoose.models.EmailAccount || mongoose.model<IEmailAccount>('EmailAccount', EmailAccountSchema);

// EMAIL MESSAGE
export interface IEmailMessage extends Document {
  userId: mongoose.Types.ObjectId | string;
  accountId: mongoose.Types.ObjectId | string;
  providerMessageId: string;
  providerThreadId: string;
  jobId: mongoose.Types.ObjectId | string | null;
  matchConfidence: number;
  matchStatus: 'auto' | 'manual' | 'unlinked';
  direction: 'inbound' | 'outbound';
  senderEmail: string;
  senderName?: string;
  subject: string;
  bodySnippet: string;
  hasAttachments: boolean;
  attachmentNames: string[];
  receivedAt: Date;
  isRead: boolean;
  stageClassification?: string;
  stageClassificationConfidence?: number;
  triggeredStageChange: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EmailMessageSchema = new Schema<IEmailMessage>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  accountId: { type: Schema.Types.ObjectId, ref: 'EmailAccount', required: true },
  providerMessageId: { type: String, required: true },
  providerThreadId: { type: String, required: true },
  jobId: { type: Schema.Types.ObjectId, ref: 'JobApplication', default: null },
  matchConfidence: { type: Number, default: 0 },
  matchStatus: { type: String, enum: ['auto', 'manual', 'unlinked'], default: 'unlinked' },
  direction: { type: String, enum: ['inbound', 'outbound'], required: true },
  senderEmail: { type: String, required: true },
  senderName: { type: String },
  subject: { type: String, required: true },
  bodySnippet: { type: String, required: true },
  hasAttachments: { type: Boolean, default: false },
  attachmentNames: [{ type: String }],
  receivedAt: { type: Date, required: true },
  isRead: { type: Boolean, default: false },
  stageClassification: { type: String },
  stageClassificationConfidence: { type: Number },
  triggeredStageChange: { type: Boolean, default: false },
}, { timestamps: true });

EmailMessageSchema.index({ userId: 1, jobId: 1 });
EmailMessageSchema.index({ providerMessageId: 1 }, { unique: true });

export const EmailMessage = mongoose.models.EmailMessage || mongoose.model<IEmailMessage>('EmailMessage', EmailMessageSchema);

// EMAIL THREAD
export interface IEmailThread extends Document {
  userId: mongoose.Types.ObjectId | string;
  providerThreadId: string;
  jobId: mongoose.Types.ObjectId | string | null;
  lastMessageAt: Date;
  participantEmails: string[];
  threadSubject: string;
  messageCount: number;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const EmailThreadSchema = new Schema<IEmailThread>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  providerThreadId: { type: String, required: true },
  jobId: { type: Schema.Types.ObjectId, ref: 'JobApplication', default: null },
  lastMessageAt: { type: Date, required: true },
  participantEmails: [{ type: String }],
  threadSubject: { type: String, required: true },
  messageCount: { type: Number, default: 0 },
  unreadCount: { type: Number, default: 0 },
}, { timestamps: true });

EmailThreadSchema.index({ userId: 1, jobId: 1 });
EmailThreadSchema.index({ providerThreadId: 1 }, { unique: true });

export const EmailThread = mongoose.models.EmailThread || mongoose.model<IEmailThread>('EmailThread', EmailThreadSchema);

// SENDER JOB MEMORY
export interface ISenderJobMemory extends Document {
  userId: mongoose.Types.ObjectId | string;
  senderEmail: string;
  senderDomain: string;
  jobId: mongoose.Types.ObjectId | string;
  confirmedBy: 'auto' | 'user';
  createdAt: Date;
}

const SenderJobMemorySchema = new Schema<ISenderJobMemory>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  senderEmail: { type: String, required: true },
  senderDomain: { type: String, required: true },
  jobId: { type: Schema.Types.ObjectId, ref: 'JobApplication', required: true },
  confirmedBy: { type: String, enum: ['auto', 'user'], required: true },
}, { timestamps: true });

SenderJobMemorySchema.index({ userId: 1, senderEmail: 1 }, { unique: true });

export const SenderJobMemory = mongoose.models.SenderJobMemory || mongoose.model<ISenderJobMemory>('SenderJobMemory', SenderJobMemorySchema);

// STAGE CHANGE LOG
export interface IStageChangeLog extends Document {
  userId: mongoose.Types.ObjectId | string;
  jobId: mongoose.Types.ObjectId | string;
  triggeredBy: string; // 'user' or emailMessageId
  stageFrom: string;
  stageTo: string;
  confidence?: number;
  undoneAt?: Date;
  createdAt: Date;
}

const StageChangeLogSchema = new Schema<IStageChangeLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  jobId: { type: Schema.Types.ObjectId, ref: 'JobApplication', required: true },
  triggeredBy: { type: String, required: true },
  stageFrom: { type: String, required: true },
  stageTo: { type: String, required: true },
  confidence: { type: Number },
  undoneAt: { type: Date },
}, { timestamps: true });

StageChangeLogSchema.index({ jobId: 1, createdAt: -1 });

export const StageChangeLog = mongoose.models.StageChangeLog || mongoose.model<IStageChangeLog>('StageChangeLog', StageChangeLogSchema);
