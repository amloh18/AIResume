import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { getConnection } from '@/lib/database';
import ApiKey from '@/models/b2b/ApiKey';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = authResult.user as any;
    if (!user.b2b?.tenantId || user.b2b.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    const { id: apiKeyId } = await params;
    if (!apiKeyId) {
      return NextResponse.json({ error: 'API Key ID is required' }, { status: 400 });
    }

    await getConnection();

    // Soft delete / revoke by setting isActive to false
    const apiKey = await ApiKey.findOneAndUpdate(
      { _id: apiKeyId, tenantId: user.b2b.tenantId },
      { isActive: false },
      { new: true }
    );

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key not found or you do not have permission' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'API Key revoked successfully'
    });

  } catch (error: any) {
    console.error('Revoke API Key Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
