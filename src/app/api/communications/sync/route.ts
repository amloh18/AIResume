import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database/connection-manager';
import { ingestForUser } from '@/services/emailIngestionService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await getConnection();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const result = await ingestForUser(session.user.id);

    return NextResponse.json({
      success: true,
      data: {
        processed: result.processed,
        errors: result.errors,
      },
    });
  } catch (error: any) {
    console.error('Communications sync POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await getConnection();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { getIngestionStatus } = await import('@/services/emailIngestionService');
    const status = getIngestionStatus();

    return NextResponse.json({ success: true, data: status });
  } catch (error: any) {
    console.error('Communications sync GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
