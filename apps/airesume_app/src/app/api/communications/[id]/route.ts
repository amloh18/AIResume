import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database/connection-manager';
import { Communication } from '@/models/Communication';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getConnection();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const communication = await Communication.findOne({
      _id: id,
      userId: session.user.id,
    }).lean();

    if (!communication) {
      return NextResponse.json({ success: false, error: 'Communication not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: communication });
  } catch (error: any) {
    console.error('Communication GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getConnection();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const communication = await Communication.findOne({
      _id: id,
      userId: session.user.id,
    });

    if (!communication) {
      return NextResponse.json({ success: false, error: 'Communication not found' }, { status: 404 });
    }

    if (body.isRead !== undefined) {
      communication.isRead = body.isRead;
      communication.status = body.isRead ? 'read' : 'unread';
    }

    if (body.isStarred !== undefined) {
      communication.isStarred = body.isStarred;
      if (body.isStarred) {
        communication.status = 'starred';
      }
    }

    if (body.status !== undefined) {
      communication.status = body.status;
    }

    await communication.save();

    return NextResponse.json({ success: true, data: communication });
  } catch (error: any) {
    console.error('Communication PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
