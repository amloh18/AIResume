import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { EmailAccount } from '@/models/TrackerEmail';
import { EmailMessage } from '@/models/TrackerEmail';
import { EmailThread } from '@/models/TrackerEmail';
import { UnifiedEmailSyncService } from '@/lib/services/unifiedEmailSync';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { action, jobId, recipientEmail, subject, bodyText, threadId } = body;

    if (action === 'sync') {
      const account = await EmailAccount.findOne({ userId, syncStatus: 'connected' });
      if (!account) {
        return NextResponse.json({ success: false, error: 'No connected email account' }, { status: 400 });
      }

      const syncService = new UnifiedEmailSyncService({
        accessToken: account.oauthAccessToken || '',
        refreshToken: account.oauthRefreshToken,
        provider: account.provider as any,
        expiresAt: account.tokenExpiresAt,
        ...(account.provider === 'imap' ? {
          imapConfig: {
            host: account.imapHost || '',
            port: Number(account.imapPort || 993),
            user: account.emailAddress,
            password: account.password,
          },
          smtpConfig: account.provider === 'imap' ? {
            host: account.smtpHost || '',
            port: Number(account.smtpPort || 465),
            user: account.emailAddress,
            password: account.password,
          } : undefined,
        } : {}),
      });

      const syncResult = await syncService.fetchMessages(jobId, 50);

      if (syncResult.success) {
        await EmailAccount.findOneAndUpdate({ userId }, { $set: { lastSyncedAt: new Date() } });

        // Save messages to database
        for (const msg of syncResult.messages) {
          await EmailMessage.findOneAndUpdate(
            { userId, providerMessageId: msg.id },
            {
              $set: {
                accountId: account._id,
                providerThreadId: msg.threadId,
                jobId: jobId || null,
                direction: msg.direction,
                senderEmail: msg.from.email,
                senderName: msg.from.name || msg.from.email,
                subject: msg.subject,
                bodySnippet: msg.snippet,
                hasAttachments: msg.hasAttachments,
                attachmentNames: msg.attachments.map(a => a.name),
                receivedAt: msg.receivedAt,
                isRead: msg.isRead,
                stageClassification: msg.stageClassification,
                triggeredStageChange: false,
              },
            },
            { upsert: true, new: true }
          );
        }
      }

      return NextResponse.json({
        success: syncResult.success,
        provider: syncResult.provider,
        emailAddress: syncResult.emailAddress,
        syncedCount: syncResult.syncedCount,
        errors: syncResult.errors,
        messages: syncResult.messages,
      });
    }

    // SEND EMAIL
    if (action === 'send') {
      const account = await EmailAccount.findOne({ userId, syncStatus: 'connected' });
      if (!account) {
        return NextResponse.json({ success: false, error: 'No connected email account' }, { status: 400 });
      }

      if (!recipientEmail || !subject || !bodyText) {
        return NextResponse.json({ success: false, error: 'recipientEmail, subject, and bodyText are required' }, { status: 400 });
      }

      const syncService = new UnifiedEmailSyncService({
        accessToken: account.oauthAccessToken || '',
        refreshToken: account.oauthRefreshToken,
        provider: account.provider as any,
        expiresAt: account.tokenExpiresAt,
        ...(account.provider === 'imap' ? {
          imapConfig: { host: account.imapHost || '', port: Number(account.imapPort || 993), user: account.emailAddress, password: account.password || '' },
          smtpConfig: { host: account.smtpHost || '', port: Number(account.smtpPort || 465), user: account.emailAddress, password: account.password || '' },
        } : {}),
      });

      const sendResult = await syncService.sendEmail(recipientEmail, subject, bodyText, threadId);

      if (sendResult.success) {
        // Log the sent message
        const newMsg = await EmailMessage.create({
          userId,
          accountId: account._id,
          providerMessageId: sendResult.messageId || `sent-${Date.now()}`,
          providerThreadId: threadId || new (await import('mongoose')).default.Types.ObjectId().toString(),
          jobId: jobId || null,
          matchConfidence: 100,
          matchStatus: 'manual',
          direction: 'outbound',
          senderEmail: account.emailAddress,
          senderName: 'You',
          subject,
          bodySnippet: bodyText.substring(0, 500),
          hasAttachments: false,
          attachmentNames: [],
          receivedAt: new Date(),
          isRead: true,
        });

        await EmailThread.findOneAndUpdate(
          { providerThreadId: newMsg.providerThreadId, userId },
          {
            $set: { lastMessageAt: new Date() },
            $inc: { messageCount: 1 },
            $setOnInsert: {
              userId,
              providerThreadId: newMsg.providerThreadId,
              jobId: jobId || null,
              participantEmails: [recipientEmail],
              threadSubject: subject,
              unreadCount: 0,
            },
          },
          { upsert: true, new: true }
        );

        return NextResponse.json({ success: true, message: newMsg });
      } else {
        return NextResponse.json({ success: false, error: sendResult.error }, { status: 500 });
      }
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Email sync route error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await getConnection();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const account = await EmailAccount.findOne({ userId });

    return NextResponse.json({
      success: true,
      connected: account ? account.syncStatus === 'connected' : false,
      emailAddress: account ? account.emailAddress : '',
      provider: account ? account.provider : 'gmail',
      syncStatus: account ? account.syncStatus : 'disconnected',
      lastSyncedAt: account ? account.lastSyncedAt : null,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
