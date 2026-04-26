import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { getConnection } from '@/lib/database';
import User from '@/models/User';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminUser = authResult.user as any;
    if (!adminUser.b2b?.tenantId || adminUser.b2b.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    const body = await req.json();
    const { role } = body;

    await getConnection();

    const userToUpdate = await User.findOneAndUpdate(
      { _id: params.id, 'b2b.tenantId': adminUser.b2b.tenantId },
      { $set: { 'b2b.role': role } },
      { new: true }
    );

    if (!userToUpdate) {
      return NextResponse.json({ error: 'User not found in your tenant' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { _id: userToUpdate._id, email: userToUpdate.email, b2b: userToUpdate.b2b } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminUser = authResult.user as any;
    if (!adminUser.b2b?.tenantId || adminUser.b2b.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    // Don't let the admin remove themselves
    if (adminUser._id.toString() === params.id) {
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });
    }

    await getConnection();
    
    // Remove the b2b object entirely from the user
    const userToRemove = await User.findOneAndUpdate(
      { _id: params.id, 'b2b.tenantId': adminUser.b2b.tenantId },
      { $unset: { b2b: 1 } },
      { new: true }
    );

    if (!userToRemove) {
      return NextResponse.json({ error: 'User not found in your tenant' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'User removed from team successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
