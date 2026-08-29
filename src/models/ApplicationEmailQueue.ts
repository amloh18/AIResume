/**
 * ApplicationEmailQueue Model
 *
 * MongoDB-backed queue for async application email sending.
 * Ensures emails are sent reliably with retry handling.
 */

import mongoose, { Schema, Document } from 'mongoose';

export type EmailQueueStatus = 'queued' | 'sending' | 'sent' | 'failed' | 'retrying' | 'cancelled';

export interface IApplicationEmailQueue extends Document {
  applicationId: string;
  jobId: string;
  userId: string;
  status: EmailQueueStatus;
  priority: number;
  attempts: number;
  maxAttempts: number;
  scheduledAt: Date;
  lockedAt?: Date;
  lockedBy?: string;
  startedAt?: Date;
  completedAt?: Date;
  lastError?: string;
  retryCount: number;
  nextRetryAt?: Date;
  emailData: {
    applicationId: string;
    jobId: string;
    userId: string;
    candidateName: string;
    candidateEmail: string;
    jobTitle: string;
    company: string;
    employerEmail: string;
    employerName?: string;
    subject: string;
    body: string;
    resumePdf?: Buffer;
    resumeFileName?: string;
    coverLetterPdf?: Buffer;
    coverLetterFileName?: string;
    customMessage?: string;
    replyTo?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationEmailQueueSchema = new Schema<IApplicationEmailQueue>(
  {
    applicationId: { type: String, required: true, index: true },
    jobId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['queued', 'sending', 'sent', 'failed', 'retrying', 'cancelled'],
      default: 'queued',
      index: true,
    },
    priority: { type: Number, default: 50, index: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    scheduledAt: { type: Date, default: Date.now, index: true },
    lockedAt: { type: Date },
    lockedBy: { type: String },
    startedAt: { type: Date },
    completedAt: { type: Date },
    lastError: { type: String },
    retryCount: { type: Number, default: 0 },
    nextRetryAt: { type: Date },
    emailData: {
      applicationId: { type: String, required: true },
      jobId: { type: String, required: true },
      userId: { type: String, required: true },
      candidateName: { type: String, required: true },
      candidateEmail: { type: String, required: true },
      jobTitle: { type: String, required: true },
      company: { type: String, required: true },
      employerEmail: { type: String, required: true },
      employerName: { type: String },
      subject: { type: String, required: true },
      body: { type: String, required: true },
      resumePdf: { type: Buffer },
      resumeFileName: { type: String },
      coverLetterPdf: { type: Buffer },
      coverLetterFileName: { type: String },
      customMessage: { type: String },
      replyTo: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queue processing
ApplicationEmailQueueSchema.index({ status: 1, priority: -1, scheduledAt: 1 });
ApplicationEmailQueueSchema.index({ applicationId: 1, status: 1 });
ApplicationEmailQueueSchema.index({ lockedAt: 1, status: 1 });

// Prevent duplicate emails (idempotency)
ApplicationEmailQueueSchema.index(
  { applicationId: 1, 'emailData.subject': 1 },
  { unique: true, name: 'email_idempotency' }
);

export default mongoose.models.ApplicationEmailQueue || 
  mongoose.model<IApplicationEmailQueue>('ApplicationEmailQueue', ApplicationEmailQueueSchema);
