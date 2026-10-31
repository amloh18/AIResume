import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { getConnection } from '@/lib/database';
import { User } from '@/models';

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult?.userId) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    await getConnection();
    const user = await User.findById(authResult.userId).select('passkeys');
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const passkeys = (user.passkeys || []).map((p: any) => ({
      credentialID: p.credentialID,
      name: p.name || 'Passkey',
      deviceType: p.deviceType,
      backedUp: p.backedUp,
      createdAt: p.createdAt,
      lastUsedAt: p.lastUsedAt,
    }));

    return NextResponse.json({ success: true, passkeys });
  } catch (error: any) {
    console.error('List passkeys error:', error);
    return NextResponse.json({ success: false, message: error?.message || 'Failed to list passkeys' }, { status: 500 });
  }
}
