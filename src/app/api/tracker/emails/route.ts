import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database/connection-manager';
import { EmailAccount, EmailMessage, EmailThread, SenderJobMemory, StageChangeLog } from '@/models/TrackerEmail';
import JobApplication from '@/models/JobApplication';
import User from '@/models/User';
import { UnifiedEmailSyncService } from '@/lib/services/unifiedEmailSync';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

// Seed mock emails if the database is empty
async function seedMockEmailsIfNeeded(userId: string, jobId: string, job: any, accountId: string) {
  const existingCount = await EmailMessage.countDocuments({ jobId });
  if (existingCount > 0) return;

  const company = job.company || 'Google';
  const recruiterName = job.contactDetails?.name || 'Jane Smith';
  const recruiterEmail = job.contactDetails?.email || 'jane.smith@google.com';
  const jobTitle = job.jobTitle || job.title || 'Software Engineer';

  // We seed a sequence of emails matching the comms.png mockup exactly
  const emailsToSeed = [
    {
      subject: `Interview Invitation`,
      direction: 'inbound',
      senderEmail: recruiterEmail,
      senderName: recruiterName,
      bodySnippet: `Hi Amarjot,\n\nThank you for applying for the Software Engineer role...`,
      receivedAt: new Date(Date.now() - 36 * 60 * 60 * 1000), // 36 hours ago
      isRead: true,
      hasAttachments: true,
      attachmentNames: ['Interview Invite.ics', 'Screening Details.pdf'],
      stageClassification: 'SCREENING_REQUESTED',
      triggeredStageChange: true,
    },
    {
      subject: `Re: Interview Invitation`,
      direction: 'outbound',
      senderEmail: sessionUserEmail(userId),
      senderName: 'You',
      bodySnippet: `Hi Jane,\n\nThank you so much for the opportunity! I'm available...`,
      receivedAt: new Date(Date.now() - 35 * 60 * 60 * 1000), // 35 hours ago
      isRead: true,
      hasAttachments: false,
      attachmentNames: [],
      stageClassification: 'FOLLOW_UP_ONLY',
      triggeredStageChange: false,
    },
    {
      subject: `Interview Confirmation`,
      direction: 'inbound',
      senderEmail: recruiterEmail,
      senderName: recruiterName,
      bodySnippet: `Great! How about Thursday, June 27 at 2:00 PM PT?\nI'll send a calendar invite.`,
      receivedAt: new Date(Date.now() - 34 * 60 * 60 * 1000), // 34 hours ago
      isRead: false,
      hasAttachments: false,
      attachmentNames: [],
      stageClassification: 'FOLLOW_UP_ONLY',
      triggeredStageChange: false,
    },
    {
      subject: `Interview Scheduled`,
      direction: 'inbound',
      senderEmail: recruiterEmail,
      senderName: recruiterName,
      bodySnippet: `Our interview is confirmed for Thu, Jun 27 at 2:00 PM PT.\nHere's the calendar invite again.`,
      receivedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      isRead: false,
      hasAttachments: true,
      attachmentNames: ['Interview - Amarjot Singh.ics'],
      stageClassification: 'INTERVIEW_SCHEDULED',
      triggeredStageChange: true,
    }
  ];

  // Insert messages
  const threadId = new mongoose.Types.ObjectId().toString();
  for (const m of emailsToSeed) {
    await EmailMessage.create({
      userId,
      accountId,
      providerMessageId: new mongoose.Types.ObjectId().toString(),
      providerThreadId: threadId,
      jobId,
      matchConfidence: 100,
      matchStatus: 'auto',
      direction: m.direction,
      senderEmail: m.senderEmail,
      senderName: m.senderName,
      subject: m.subject,
      bodySnippet: m.bodySnippet,
      hasAttachments: m.hasAttachments,
      attachmentNames: m.attachmentNames,
      receivedAt: m.receivedAt,
      isRead: m.isRead,
      stageClassification: m.stageClassification,
      triggeredStageChange: m.triggeredStageChange,
    });
  }

  // Create thread
  await EmailThread.create({
    userId,
    providerThreadId: threadId,
    jobId,
    lastMessageAt: emailsToSeed[emailsToSeed.length - 1].receivedAt,
    participantEmails: [recruiterEmail],
    threadSubject: emailsToSeed[0].subject,
    messageCount: emailsToSeed.length,
    unreadCount: emailsToSeed.filter(e => !e.isRead && e.direction === 'inbound').length,
  });
}

function sessionUserEmail(userId: string) {
  return 'user@cvcircle.com';
}

// GET: Fetch synced/mock emails for a jobId
export async function GET(request: NextRequest) {
  try {
    await getConnection();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ success: false, error: 'jobId is required' }, { status: 400 });
    }

    const userId = session.user.id;

    // Fetch the job to ensure it belongs to the user
    const job = await JobApplication.findOne({ _id: jobId, userId });
    if (!job) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }

    // Check if the user has connected an verified email account
    let emailAccount = await EmailAccount.findOne({ userId, syncStatus: 'connected' });
    const isAutomated = !!emailAccount;

    // Seed mock emails only for demo accounts that have an active connection
    const user = await User.findOne({ _id: userId }).select('hasSeededMockEmails');
    const hasSeededMockEmails = user?.hasSeededMockEmails || false;
    if (isAutomated && !hasSeededMockEmails) {
      const connectedAccount = await EmailAccount.findOne({ userId, syncStatus: 'connected' });
      if (connectedAccount) {
        await seedMockEmailsIfNeeded(userId, jobId, job, connectedAccount._id.toString());
        await User.updateOne({ _id: userId }, { $set: { hasSeededMockEmails: true } });
      }
    }

    // Fallback: if still no account, create a disconnected placeholder for frontend state
    if (!emailAccount) {
      emailAccount = await EmailAccount.findOne({ userId });
      if (!emailAccount) {
        emailAccount = await EmailAccount.create({
          userId,
          provider: 'gmail',
          emailAddress: session.user.email || 'user@gmail.com',
          syncStatus: 'disconnected'
        });
      }
    }

    // Fetch emails
    const messages = await EmailMessage.find({ jobId, userId }).sort({ receivedAt: 1 });
    const threads = await EmailThread.find({ jobId, userId }).sort({ lastMessageAt: -1 });

    return NextResponse.json({
      success: true,
      isAutomated,
      emailAddress: emailAccount.emailAddress,
      syncStatus: emailAccount.syncStatus,
      messages,
      threads
    });
  } catch (error: any) {
    console.error('Fetch emails route error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Link/unlink emails or log a new email outbound reply
export async function POST(request: NextRequest) {
  try {
    await getConnection();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { action, jobId, messageId, threadId, subject, bodyText, recipientEmail, recipientName, newStage } = body;

    const job = await JobApplication.findOne({ _id: jobId, userId });
    if (!job) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }

    // ACTION: SEND/LOG MANUAL REPLY
    if (action === 'send_reply') {
      const emailAccount = await EmailAccount.findOne({ userId, syncStatus: 'connected' });
      if (!emailAccount) {
        return NextResponse.json({ success: false, error: 'No connected email account found. Please connect an email account first.' }, { status: 400 });
      }

      const accountId = emailAccount._id.toString();
      const syncService = new UnifiedEmailSyncService({
        accessToken: emailAccount.oauthAccessToken || '',
        refreshToken: emailAccount.oauthRefreshToken,
        provider: emailAccount.provider,
        expiresAt: emailAccount.tokenExpiresAt,
        imapConfig: emailAccount.imapHost ? {
          host: emailAccount.imapHost,
          port: emailAccount.imapPort || 993,
          user: emailAccount.emailAddress,
          password: emailAccount.password || ''
        } : undefined,
        smtpConfig: emailAccount.smtpHost ? {
          host: emailAccount.smtpHost,
          port: emailAccount.smtpPort || 465,
          user: emailAccount.emailAddress,
          password: emailAccount.password || ''
        } : undefined,
      });

      const sendResult = await syncService.sendEmail(recipientEmail, subject || `Re: Communication regarding job`, bodyText, threadId);

      if (!sendResult.success) {
        return NextResponse.json({ success: false, error: sendResult.error || 'Failed to send email' }, { status: 500 });
      }

      const newMsg = await EmailMessage.create({
        userId,
        accountId,
        providerMessageId: sendResult.messageId || new mongoose.Types.ObjectId().toString(),
        providerThreadId: threadId || new mongoose.Types.ObjectId().toString(),
        jobId,
        matchConfidence: 100,
        matchStatus: 'manual',
        direction: 'outbound',
        senderEmail: session.user.email || 'user@cvcircle.com',
        senderName: 'You',
        subject: subject || `Re: Communication regarding job`,
        bodySnippet: bodyText.substring(0, 500),
        hasAttachments: false,
        attachmentNames: [],
        receivedAt: new Date(),
        isRead: true,
      });

      // Update thread
      await EmailThread.findOneAndUpdate(
        { providerThreadId: newMsg.providerThreadId, userId },
        {
          $set: { lastMessageAt: new Date() },
          $inc: { messageCount: 1 },
          $setOnInsert: {
            userId,
            providerThreadId: newMsg.providerThreadId,
            jobId,
            participantEmails: [recipientEmail],
            threadSubject: subject,
            unreadCount: 0
          }
        },
        { upsert: true, new: true }
      );

      // Add to sender job memory
      if (recipientEmail) {
        const domain = recipientEmail.split('@')[1] || '';
        await SenderJobMemory.findOneAndUpdate(
          { userId, senderEmail: recipientEmail },
          { $set: { senderDomain: domain, jobId, confirmedBy: 'user' } },
          { upsert: true }
        );
      }

      return NextResponse.json({ success: true, message: newMsg });
    }

    // ACTION: MOVE STAGE FROM EMAIL OR UNDO
    if (action === 'update_stage') {
      const oldStage = job.status;
      job.status = newStage;
      await job.save();

      // Log stage change
      const log = await StageChangeLog.create({
        userId,
        jobId,
        triggeredBy: messageId || 'user',
        stageFrom: oldStage,
        stageTo: newStage,
        confidence: 100
      });

      return NextResponse.json({ success: true, job, logId: log._id });
    }

    if (action === 'undo_stage_change') {
      const { logId } = body;
      const log = await StageChangeLog.findOne({ _id: logId, userId });
      if (log) {
        log.undoneAt = new Date();
        await log.save();

        job.status = log.stageFrom;
        await job.save();
        return NextResponse.json({ success: true, job });
      }
      return NextResponse.json({ success: false, error: 'Log entry not found' }, { status: 404 });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Post emails route error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
