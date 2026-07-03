import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ActivityLogService } from '@/lib/services/activityLogService';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
    }

    const action = String((body as any).action || '').trim();
    const resourceType = (body as any).resourceType as 'cv' | 'journey' | 'job' | 'cover_letter' | undefined;
    const resourceId = (body as any).resourceId as string | undefined;
    const resourceName = (body as any).resourceName as string | undefined;
    const metadata = (body as any).metadata as Record<string, any> | undefined;

    // Safety: only allow whitelisted client events through this endpoint
    const allowedPrefixes = ['resume_enhancer_', 'cv_builder_', 'linkedin_enhancer_', 'job_tracker_', 'dashboard_', 'mori_chat_', 'page_view_', 'click_', 'navigation_'];
    const isValidAction = allowedPrefixes.some(prefix => action.startsWith(prefix));
    
    if (!action || !isValidAction) {
      return NextResponse.json({ success: false, error: 'Invalid action prefix' }, { status: 400 });
    }

    await ActivityLogService.logUserAction({
      userId: session.user.id,
      userEmail: (session.user as any).email,
      action,
      resourceType,
      resourceId,
      resourceName,
      status: 'success',
      metadata: {
        ...metadata,
        source: 'client'
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ activity-log POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}


















