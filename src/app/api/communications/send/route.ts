import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database/connection-manager';
import User from '@/models/User';
import { Communication } from '@/models/Communication';
import { sendEmailViaSmtp } from '@/lib/services/jmapService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await getConnection();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const { to, cc, bcc, subject, body: textBody, htmlBody, jobId, applicationId, inReplyTo, replyTo } = body;

    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one recipient is required' }, { status: 400 });
    }

    if (!subject) {
      return NextResponse.json({ success: false, error: 'Subject is required' }, { status: 400 });
    }

    if (!textBody) {
      return NextResponse.json({ success: false, error: 'Body is required' }, { status: 400 });
    }

    // Resolve candidate identity
    const user: any = await User.findById(userId).select('stalwartEmail firstName lastName email').lean();
    const senderEmail = user?.stalwartEmail || process.env.APPLICATION_SENDER_EMAIL || 'admin@morigrid.com';
    const senderName = (user?.firstName && user?.lastName)
      ? `${user.firstName} ${user.lastName}`
      : (process.env.APPLICATION_SENDER_NAME || 'BuildAIResume');

    const sendResult = await sendEmailViaSmtp({
      from: senderEmail,
      fromName: senderName,
      to,
      cc: cc?.length ? cc : undefined,
      bcc: bcc?.length ? bcc : undefined,
      subject,
      textBody,
      htmlBody,
      replyTo: replyTo || senderEmail,
      inReplyTo,
    });

    if (!sendResult.success) {
      return NextResponse.json(
        { success: false, error: sendResult.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    const recipients: Array<{ email: string; type: 'to' | 'cc' | 'bcc' }> = to.map((email: string) => ({ email, type: 'to' }));
    if (cc?.length) {
      cc.forEach((email: string) => recipients.push({ email, type: 'cc' }));
    }
    if (bcc?.length) {
      bcc.forEach((email: string) => recipients.push({ email, type: 'bcc' }));
    }

    const communication = await Communication.create({
      userId,
      messageId: sendResult.messageId || `<${Date.now()}@buildairesume.com>`,
      inReplyTo,
      direction: 'outbound',
      type: 'user_composed',
      status: 'sent',
      subject,
      bodySnippet: textBody.substring(0, 500),
      textBody,
      htmlBody,
      senderEmail,
      senderName,
      recipients,
      replyTo: replyTo || senderEmail,
      jobId: jobId || undefined,
      applicationId: applicationId || undefined,
      classification: 'UNKNOWN',
      classificationConfidence: 0,
      matchConfidence: 'unmatched',
      isRead: true,
      isStarred: false,
      hasAttachments: false,
      attachments: [],
      isAutomated: false,
      sentAt: new Date(),
      receivedAt: new Date(),
    });

    return NextResponse.json({ success: true, data: communication });
  } catch (error: any) {
    console.error('Communications send error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
