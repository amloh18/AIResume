import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database/connection-manager';
import { EmailAccount, EmailMessage, EmailThread, SenderJobMemory, StageChangeLog } from '@/models/TrackerEmail';
import JobApplication from '@/models/JobApplication';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

// GET: Fetch synced emails for a jobId
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

    // Check if the user has connected an email account
    let emailAccount = await EmailAccount.findOne({ userId, syncStatus: 'connected' });
    const isAutomated = !!emailAccount;

    // If there is no email account, create a disconnected default
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
      const emailAccount = await EmailAccount.findOne({ userId });
      const accountId = emailAccount ? emailAccount._id : new mongoose.Types.ObjectId();

      const newMsg = await EmailMessage.create({
        userId,
        accountId,
        providerMessageId: new mongoose.Types.ObjectId().toString(),
        providerThreadId: threadId || new mongoose.Types.ObjectId().toString(),
        jobId,
        matchConfidence: 100,
        matchStatus: 'manual',
        direction: 'outbound',
        senderEmail: session.user.email || 'user@buildairesume.com',
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
