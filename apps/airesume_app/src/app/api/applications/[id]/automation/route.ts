import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { getConnection } from '@/lib/database';
import {
  performAutomationAction,
  AutomationActionError,
  type AutomationAction,
} from '@/lib/services/applicationAutomationActionService';

/**
 * POST /api/applications/[id]/automation
 *
 * The one control surface for a parked/failed application:
 *   { action: 'approve' } → allow automated submission (review_required → queued)
 *   { action: 'retry'   } → re-run after a failed/dead-lettered attempt
 *   { action: 'dismiss' } → stop automation; the user applies manually
 *
 * Used by the applications list, the kanban card, the journey sidebar and the
 * notification deep link — all four must behave identically, which is why the
 * logic lives in applicationAutomationActionService rather than here.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth?.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = body?.action as AutomationAction;

    await getConnection();

    const result = await performAutomationAction({
      userId: auth.userId,
      applicationId: id,
      action,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    if (err instanceof AutomationActionError) {
      const status =
        err.code === 'NOT_FOUND'
          ? 404
          : err.code === 'INVALID_ACTION'
            ? 400
            : err.code === 'QUOTA_EXCEEDED'
              ? 403
              : 409;
      return NextResponse.json(
        { success: false, error: err.message, code: err.code, ...(err.extra || {}) },
        { status }
      );
    }
    console.error('Automation action error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to update application' },
      { status: 500 }
    );
  }
}
