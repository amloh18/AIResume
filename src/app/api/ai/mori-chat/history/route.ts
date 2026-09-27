import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import MoriChat from '@/models/MoriChat';
import { isFreeTierPlan } from '@/lib/utils/subscription-helpers';
import { mixedIdFilter } from '@/lib/utils/mixed-id';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();

    // Get CV ID from search params if needed, or just all chats for user
    const { searchParams } = new URL(req.url);
    const cvId = searchParams.get('cvId');

    // `MoriChat.userId` / `.cvId` are `Schema.Types.Mixed` and therefore uncast (SB-06).
    const query: any = { userId: mixedIdFilter(session.user.id) };
    if (cvId) {
      query.cvId = mixedIdFilter(cvId);
    }

    const chats = await MoriChat.find(query)
      .select('_id title updatedAt cvId')
      .sort({ updatedAt: -1 })
      .lean();

    // Check limits for starter_monthly user
    const User = (await import('@/models/User')).default;
    const user = await User.findById(session.user.id).select('currentPlanKey credits.lastResetDate').lean() as any;
    
    let limitExhausted = false;
    let planKey = 'free';

    if (user) {
      planKey = user.currentPlanKey || 'free';
      // Apply message limit for free-tier users (free + starter_monthly are the same plan)
      if (isFreeTierPlan(planKey)) {
        const lastResetDate = user.credits?.lastResetDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        // Count messages since lastResetDate
        const userChats = await MoriChat.find({
          userId: mixedIdFilter(session.user.id),
          updatedAt: { $gte: lastResetDate }
        }).lean();

        let inwardCount = 0;
        let outwardCount = 0;

        userChats.forEach((chat: any) => {
          if (Array.isArray(chat.messages)) {
            chat.messages.forEach((msg: any) => {
              if (msg.id === 'welcome') return;
              if (msg.role === 'user') {
                inwardCount++;
              } else if (msg.role === 'assistant') {
                outwardCount++;
              }
            });
          }
        });

        if (inwardCount >= 5 || outwardCount >= 5) {
          limitExhausted = true;
        }
      }
    }

    return NextResponse.json({ chats, limitExhausted, planKey });
  } catch (error: any) {
    console.error('Failed to fetch Mori Chat history:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
