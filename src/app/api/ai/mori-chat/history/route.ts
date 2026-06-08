import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import MoriChat from '@/models/MoriChat';

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

    const query: any = { userId: session.user.id };
    if (cvId) {
      query.cvId = cvId;
    }

    const chats = await MoriChat.find(query)
      .select('_id title updatedAt cvId')
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({ chats });
  } catch (error: any) {
    console.error('Failed to fetch Mori Chat history:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
