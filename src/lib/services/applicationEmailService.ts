/**
 * Application Email Service
 *
 * Extends the existing email service to support job application emails.
 * Uses Stalwart Mail Server for self-hosted SMTP.
 *
 * Architecture:
 * BuildAIResume → Email Queue → Email Worker → Nodemailer → Stalwart → Employer
 */

import nodemailer from 'nodemailer';
import mongoose from 'mongoose';

// ============================================================================
// Types
// ============================================================================

export interface ApplicationEmailData {
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
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  retryable?: boolean;
}

export interface EmailQueueItem {
  _id?: mongoose.Types.ObjectId;
  applicationId: string;
  jobId: string;
  userId: string;
  status: 'queued' | 'sending' | 'sent' | 'failed' | 'retrying' | 'cancelled';
  priority: number;
  attempts: number;
  maxAttempts: number;
  scheduledAt: Date;
  lockedAt?: Date;
  lockedBy?: string;
  lastError?: string;
  emailData: ApplicationEmailData;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Email Transport Configuration
// ============================================================================

/**
 * Create Stalwart SMTP transporter
 */
function createStalwartTransporter() {
  const host = process.env.STALWART_SMTP_HOST || process.env.EMAIL_SERVER_HOST || '192.168.1.8';
  const port = parseInt(process.env.STALWART_SMTP_PORT || process.env.EMAIL_SERVER_PORT || '587');
  const secure = process.env.STALWART_SMTP_SECURE === 'true' || port === 465;
  const user = process.env.STALWART_SMTP_USER || process.env.EMAIL_SERVER_USER || 'b9c9d3001@smtp-brevo.com';
  const pass = process.env.STALWART_SMTP_PASSWORD || process.env.EMAIL_SERVER_PASSWORD || '';

  const config = {
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    // Connection pooling for performance
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 10, // 10 emails per second max
  };

  return nodemailer.createTransport(config);
}

/**
 * Get email transporter (Stalwart or fallback SMTP relay for application emails)
 */
function getTransporter() {
  if (process.env.STALWART_SMTP_HOST || process.env.EMAIL_SERVER_HOST) {
    return createStalwartTransporter();
  }
  console.warn('⚠️ Neither STALWART_SMTP_HOST nor EMAIL_SERVER_HOST configured');
  return null;
}

// ============================================================================
// Email Composition
// ============================================================================

/**
 * Compose application email from data
 */
function composeApplicationEmail(data: ApplicationEmailData) {
  const defaultSenderEmail = process.env.APPLICATION_SENDER_EMAIL || 'admin@morigrid.com';
  const defaultSenderName = process.env.APPLICATION_SENDER_NAME || 'BuildAIResume';

  const domain = defaultSenderEmail.includes('@') ? defaultSenderEmail.split('@')[1] : 'morigrid.com';
  const isCandidateEmailOnDomain = data.candidateEmail && data.candidateEmail.toLowerCase().endsWith(`@${domain}`);
  const senderEmail = isCandidateEmailOnDomain ? data.candidateEmail : defaultSenderEmail;
  const senderName = data.candidateName || defaultSenderName;

  const mailOptions: nodemailer.SendMailOptions = {
    from: `"${senderName}" <${senderEmail}>`,
    to: data.employerEmail,
    subject: data.subject,
    text: data.body,
    html: generateApplicationEmailHtml(data),
    replyTo: data.replyTo || data.candidateEmail || senderEmail,
    attachments: [],
  };

  // Add resume attachment
  if (data.resumePdf && data.resumeFileName) {
    mailOptions.attachments?.push({
      filename: data.resumeFileName,
      content: data.resumePdf,
      contentType: 'application/pdf',
    });
  }

  // Add cover letter attachment
  if (data.coverLetterPdf && data.coverLetterFileName) {
    mailOptions.attachments?.push({
      filename: data.coverLetterFileName,
      content: data.coverLetterPdf,
      contentType: 'application/pdf',
    });
  }

  return mailOptions;
}

/**
 * Generate HTML email for application
 */
function generateApplicationEmailHtml(data: ApplicationEmailData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #013f2e; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .footer { background: #f3f4f6; padding: 15px; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280; }
        .btn { display: inline-block; background: #013f2e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; }
        .attachment { background: #e5e7eb; padding: 10px; border-radius: 6px; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin: 0;">${data.jobTitle} Application</h2>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">${data.company}</p>
        </div>
        
        <div class="content">
          <p>Dear ${data.employerName || 'Hiring Manager'},</p>
          
          <div style="white-space: pre-wrap;">${data.body}</div>
          
          ${data.resumePdf ? `
          <div class="attachment">
            <strong>📎 Attached:</strong> ${data.resumeFileName || 'Resume.pdf'}
          </div>
          ` : ''}
          
          ${data.coverLetterPdf ? `
          <div class="attachment">
            <strong>📎 Attached:</strong> ${data.coverLetterFileName || 'Cover Letter.pdf'}
          </div>
          ` : ''}
        </div>
        
        <div class="footer">
          <p>Sent via <strong>BuildAIResume</strong> - AI-Powered Career Platform</p>
          <p>This application was submitted through buildairesume.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ============================================================================
// Email Sending
// ============================================================================

/**
 * Send application email
 */
export async function sendApplicationEmail(
  data: ApplicationEmailData
): Promise<EmailSendResult> {
  const transporter = getTransporter();

  if (!transporter) {
    return {
      success: false,
      error: 'Stalwart SMTP not configured',
      retryable: false,
    };
  }

  try {
    const mailOptions = composeApplicationEmail(data);

    // Send email
    const result = await transporter.sendMail(mailOptions);

    // Track success in MongoDB
    await trackApplicationEmail({
      applicationId: data.applicationId,
      jobId: data.jobId,
      userId: data.userId,
      recipient: data.employerEmail,
      sender: mailOptions.from as string,
      subject: data.subject,
      messageId: result.messageId,
      status: 'sent',
    });

    console.log(`✅ Application email sent successfully: ${result.messageId}`);

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error: any) {
    console.error('❌ Failed to send application email:', error);

    // Track failure in MongoDB
    await trackApplicationEmail({
      applicationId: data.applicationId,
      jobId: data.jobId,
      userId: data.userId,
      recipient: data.employerEmail,
      sender: process.env.APPLICATION_SENDER_EMAIL || 'applications@buildairesume.com',
      subject: data.subject,
      status: 'failed',
      failureReason: error.message,
    });

    // Determine if retryable
    const retryable = isRetryableError(error);

    return {
      success: false,
      error: error.message,
      retryable,
    };
  }
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any): boolean {
  const retryableCodes = [
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'EAGAIN',
    'EHOSTUNREACH',
  ];

  return retryableCodes.includes(error.code) || 
         error.message?.includes('timeout') ||
         error.message?.includes('connection');
}

// ============================================================================
// Email Tracking
// ============================================================================

interface TrackEmailParams {
  applicationId: string;
  jobId: string;
  userId: string;
  recipient: string;
  sender: string;
  subject: string;
  messageId?: string;
  status: 'queued' | 'sending' | 'sent' | 'failed' | 'retrying';
  failureReason?: string;
}

/**
 * Track application email in MongoDB using ApplicationEmailQueue
 */
async function trackApplicationEmail(params: TrackEmailParams): Promise<void> {
  try {
    // Update the queue item status if it exists
    const queueItem = await mongoose.models.ApplicationEmailQueue.findOne({
      applicationId: params.applicationId,
      'emailData.subject': params.subject,
    });

    if (queueItem) {
      queueItem.status = params.status === 'sent' ? 'sent' : 'failed';
      queueItem.completedAt = new Date();
      queueItem.lastError = params.failureReason;
      await queueItem.save();
    }

    // Mirror into Communication collection for unified Comms tab and Journey sidebar display
    if (params.status === 'sent') {
      try {
        const { Communication } = require('@/models/Communication');
        if (Communication) {
          await Communication.create({
            userId: params.userId,
            messageId: params.messageId || `<${Date.now()}@buildairesume.com>`,
            direction: 'outbound',
            type: 'application_submission',
            status: 'sent',
            subject: params.subject,
            bodySnippet: `Application sent to ${params.recipient}`,
            senderEmail: params.sender,
            recipients: [{ email: params.recipient, type: 'to' }],
            jobId: params.jobId,
            applicationId: params.applicationId,
            classification: 'APPLICATION_SUBMISSION',
            classificationConfidence: 1.0,
            matchConfidence: 'exact',
            isRead: true,
            isAutomated: true,
            sentAt: new Date(),
            receivedAt: new Date(),
          });
        }
      } catch (commErr) {
        console.warn('Failed to mirror application email to Communication collection:', commErr);
      }
    }
  } catch (error) {
    console.error('Failed to track application email:', error);
    // Don't throw - tracking failure shouldn't break email sending
  }
}

// ============================================================================
// Email Queue
// ============================================================================

/**
 * Queue application email for async sending
 */
export async function queueApplicationEmail(
  data: ApplicationEmailData,
  priority: number = 50,
  scheduledAt: Date = new Date()
): Promise<{ success: boolean; queueItemId?: string; error?: string }> {
  try {
    // Create queue item
    const queueItem = new (mongoose.models.ApplicationEmailQueue || 
      require('@/models/ApplicationEmailQueue').default)({
      applicationId: data.applicationId,
      jobId: data.jobId,
      userId: data.userId,
      status: 'queued',
      priority,
      attempts: 0,
      maxAttempts: 3,
      scheduledAt,
      emailData: data,
    });

    await queueItem.save();

    console.log(`📧 Application email queued: ${queueItem._id}`);

    return {
      success: true,
      queueItemId: queueItem._id?.toString(),
    };
  } catch (error: any) {
    console.error('Failed to queue application email:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================================================
// Idempotency Check
// ============================================================================

/**
 * Check if application email was already sent
 */
export async function wasApplicationEmailSent(
  applicationId: string,
  emailType: string = 'application'
): Promise<boolean> {
  try {
    // Check ApplicationEmailQueue for sent status
    const existing = await mongoose.models.ApplicationEmailQueue.findOne({
      applicationId,
      status: 'sent',
    });

    return !!existing;
  } catch (error) {
    console.error('Failed to check email idempotency:', error);
    return false; // Assume not sent on error
  }
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Test Stalwart SMTP connection
 */
export async function testStalwartConnection(): Promise<{
  success: boolean;
  message: string;
  latencyMs?: number;
}> {
  const start = Date.now();

  try {
    const transporter = getTransporter();
    if (!transporter) {
      return {
        success: false,
        message: 'Stalwart SMTP not configured',
      };
    }

    await transporter.verify();
    const latencyMs = Date.now() - start;

    return {
      success: true,
      message: 'Stalwart SMTP connection successful',
      latencyMs,
    };
  } catch (error: any) {
    const latencyMs = Date.now() - start;
    return {
      success: false,
      message: `Stalwart SMTP connection failed: ${error.message}`,
      latencyMs,
    };
  }
}

export default {
  sendApplicationEmail,
  queueApplicationEmail,
  wasApplicationEmailSent,
  testStalwartConnection,
};
