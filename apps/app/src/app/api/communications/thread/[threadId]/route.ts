import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database/connection-manager';
import { Communication } from '@/models/Communication';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    await getConnection();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { threadId } = await params;
    const userId = session.user.id;

    // 1. Try direct threadId match
    let communications = await Communication.find({
      userId,
      threadId,
    })
      .sort({ receivedAt: 1 })
      .lean();

    // 2. If no direct matches or only one, check if threadId is a Communication _id
    if (!communications || communications.length <= 1) {
      let targetComm: any = null;
      try {
        targetComm = await Communication.findOne({ _id: threadId, userId }).lean();
      } catch {
        // Not a valid ObjectId or not found
      }

      if (targetComm) {
        const queryOr: any[] = [{ _id: targetComm._id }];

        if (targetComm.threadId) {
          queryOr.push({ threadId: targetComm.threadId });
        }
        if (targetComm.jmapThreadId) {
          queryOr.push({ jmapThreadId: targetComm.jmapThreadId });
        }
        if (targetComm.jobId) {
          queryOr.push({ jobId: targetComm.jobId });
        }
        if (targetComm.applicationId) {
          queryOr.push({ applicationId: targetComm.applicationId });
        }
        if (targetComm.messageId) {
          queryOr.push({ inReplyTo: targetComm.messageId });
          queryOr.push({ references: targetComm.messageId });
        }
        if (targetComm.inReplyTo) {
          queryOr.push({ messageId: targetComm.inReplyTo });
        }

        const related = await Communication.find({
          userId,
          $or: queryOr,
        })
          .sort({ receivedAt: 1 })
          .lean();

        if (related && related.length > 0) {
          // Deduplicate by string id
          const seen = new Set<string>();
          communications = related.filter((c: any) => {
            const id = String(c._id);
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: communications,
      communications,
    });
  } catch (error: any) {
    console.error('Communication thread GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
