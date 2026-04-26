import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = authResult.user as any;
    if (!user.b2b?.tenantId || user.b2b.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    await getConnection();
    const teamMembers = await User.find({ 'b2b.tenantId': user.b2b.tenantId })
      .select('email name b2b.role createdAt')
      .lean();
    
    return NextResponse.json({ success: true, data: teamMembers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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
    const { email, role = 'member' } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    await getConnection();

    let userToInvite = await User.findOne({ email: email.toLowerCase() });

    if (userToInvite) {
      if (userToInvite.b2b?.tenantId) {
        return NextResponse.json({ error: 'User is already associated with a B2B tenant' }, { status: 400 });
      }
      // Update existing user
      userToInvite.b2b = {
        tenantId: adminUser.b2b.tenantId,
        role
      };
      await userToInvite.save();
    } else {
      // Create new placeholder user
      const randomPassword = crypto.randomBytes(16).toString('hex');
      userToInvite = new User({
        email: email.toLowerCase(),
        password: randomPassword, // In a real app, send an invite email
        isEmailVerified: true,
        authProvider: 'credentials',
        b2b: {
          tenantId: adminUser.b2b.tenantId,
          role
        }
      });
      await userToInvite.save();
    }

    return NextResponse.json({ success: true, data: { _id: userToInvite._id, email: userToInvite.email, b2b: userToInvite.b2b } }, { status: 201 });
  } catch (error: any) {
    console.error('Invite Team Member Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
