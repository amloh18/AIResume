import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import UserSettings from '@/models/UserSettings';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Lightweight per-user UI preferences.
 *
 * Currently backs the Documents grid / compact / list switcher. This is a
 * deliberately narrow endpoint rather than a reuse of PUT /api/user/settings,
 * because that route pushes an `auditLog` entry on every call — and a layout
 * toggle fires on every click, which would flood the audit trail.
 *
 * Stored on UserSettings.preferences.dashboard.layout so the choice follows the
 * user across devices and browsers, not just the one they happened to use.
 */

const LAYOUTS = ['grid', 'list', 'compact'] as const;
type Layout = (typeof LAYOUTS)[number];

function isLayout(value: unknown): value is Layout {
  return typeof value === 'string' && (LAYOUTS as readonly string[]).includes(value);
}

export async function GET() {
  try {
    await getConnection();

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const settings = await UserSettings.findOne({ userId: session.user.id })
      .select('preferences.dashboard.layout')
      .lean();

    const layout = (settings as any)?.preferences?.dashboard?.layout;

    return NextResponse.json({
      success: true,
      data: { layout: isLayout(layout) ? layout : 'grid' },
    });
  } catch (error: any) {
    console.error('Get UI preferences error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to load UI preferences' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await getConnection();

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));

    // Reject rather than silently coerce — a bad value here would be persisted
    // and then render an undefined layout branch on the client.
    if (!isLayout(body?.layout)) {
      return NextResponse.json(
        { success: false, message: `layout must be one of: ${LAYOUTS.join(', ')}` },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Targeted $set on the declared nested path. Upsert so a user who has never
    // opened the settings page still gets a document to write to.
    await UserSettings.findOneAndUpdate(
      { userId },
      { $set: { 'preferences.dashboard.layout': body.layout } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ success: true, data: { layout: body.layout } });
  } catch (error: any) {
    console.error('Update UI preferences error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save UI preferences' },
      { status: 500 }
    );
  }
}
