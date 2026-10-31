import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { getConnection } from '@/lib/database';
import { User } from '@/models';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult?.userId) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const { id: credentialID } = await params;
    if (!credentialID) {
      return NextResponse.json({ success: false, message: 'Credential ID required' }, { status: 400 });
    }

    await getConnection();
    const result = await User.updateOne(
      { _id: authResult.userId },
      { $pull: { passkeys: { credentialID } } }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json({ success: false, message: 'Passkey not found or already deleted' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Passkey deleted successfully' });
  } catch (error: any) {
    console.error('Delete passkey error:', error);
    return NextResponse.json({ success: false, message: error?.message || 'Failed to delete passkey' }, { status: 500 });
  }
}
