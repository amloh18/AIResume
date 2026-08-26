import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import TemporaryCVDraft from '@/models/TemporaryCVDraft';

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    
    await getConnection();

    const query = session?.user?.id 
      ? { userId: session.user.id }
      : { sessionId: request.cookies.get('cv-draft-session-id')?.value };

    if (!query.userId && !query.sessionId) {
      return NextResponse.json(
        { success: false, error: 'No session found' },
        { status: 400 }
      );
    }

    const result = await TemporaryCVDraft.deleteMany(query);

    const response = NextResponse.json({ 
      success: true,
      deletedCount: result.deletedCount
    });
    
    // Clear session cookie if exists
    if (!session?.user?.id) {
      response.cookies.delete('cv-draft-session-id');
    }

    console.log('🗑️ Deleted CV draft(s):', {
      deletedCount: result.deletedCount,
      userId: session?.user?.id || 'anonymous'
    });

    return response;

  } catch (error: any) {
    console.error('❌ Delete CV draft error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete CV draft' },
      { status: 500 }
    );
  }
}

