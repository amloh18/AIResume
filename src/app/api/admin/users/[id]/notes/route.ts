import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { User, SupportNote } from '@/models';
import { withAdminAuth, requireAdmin } from '@/lib/middleware/admin-auth';
import { ActivityLogService } from '@/lib/services/activityLogService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/users/[id]/notes
 *
 * Adds an administrative support note for a user.
 *
 * This route was missing from disk while both halves of the feature existed:
 * `GET /api/admin/users/[id]/activity` already reads `SupportNote` and returns
 * `data.supportNotes`, and the SupportNote model already existed. So the admin
 * panel rendered the notes list correctly but the "Add Note" button POSTed to
 * a 404 and silently did nothing (the caller only checks `res.ok`, with no
 * else-branch, so no error was ever surfaced).
 */
export const POST = withAdminAuth(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    await getConnection();

    const session = await requireAdmin(request);
    const adminUser = session.user as any;
    const adminUserId = adminUser.id || (session.user.id as string);
    const adminEmail = adminUser.email || session.user.email || undefined;

    const { id: userId } = await params;
    const body = await request.json();
    const content = typeof body?.content === 'string' ? body.content.trim() : '';

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Note content is required' },
        { status: 400 }
      );
    }

    // Confirm the target user exists so we don't create an orphaned note.
    const user = await User.findById(userId).select('_id').lean();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const note = await SupportNote.create({
      userId: (user as any)._id,
      adminId: adminUserId,
      adminEmail: adminEmail || 'unknown',
      content,
      timestamp: new Date()
    });

    // Mirror the audit trail the other admin write routes record.
    try {
      await ActivityLogService.logAdminAction({
        adminUserId,
        adminEmail,
        action: 'support_note_added',
        actionType: 'user_management',
        targetUserId: String((user as any)._id),
        resourceType: 'user',
        resourceId: String((user as any)._id),
        status: 'success',
        metadata: { noteId: String(note._id), contentLength: content.length }
      });
    } catch (logError) {
      // The note itself is saved; a failed audit write must not fail the request.
      console.error('Failed to log support note activity:', logError);
    }

    return NextResponse.json({ success: true, data: note });
  } catch (error: any) {
    console.error('Error adding support note:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add support note', details: error?.message },
      { status: 500 }
    );
  }
});
