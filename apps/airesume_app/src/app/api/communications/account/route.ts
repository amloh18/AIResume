import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database/connection-manager';
import User from '@/models/User';
import { EmailAccount } from '@/models/TrackerEmail';
import { testJmapConnection } from '@/lib/services/jmapService';

export const dynamic = 'force-dynamic';

function getStalwartDomain(): string {
  if (process.env.STALWART_DOMAIN) return process.env.STALWART_DOMAIN;
  if (process.env.APPLICATION_SENDER_EMAIL && process.env.APPLICATION_SENDER_EMAIL.includes('@')) {
    return process.env.APPLICATION_SENDER_EMAIL.split('@')[1];
  }
  return 'morigrid.com';
}

function sanitizeEmailLocalPart(name: string): string {
  const sanitized = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9.]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .replace(/\.{2,}/g, '.');
  return sanitized || 'candidate';
}

/**
 * Generate a guaranteed-unique email address on morigrid.com for a given user.
 */
async function generateUniqueEmail(user: any, preferredLocalPart?: string): Promise<string> {
  const domain = getStalwartDomain();
  const userIdStr = user._id ? user._id.toString() : user.id?.toString();

  let baseLocal = '';
  if (preferredLocalPart && typeof preferredLocalPart === 'string') {
    baseLocal = sanitizeEmailLocalPart(preferredLocalPart);
  } else if (user.firstName && user.lastName) {
    baseLocal = sanitizeEmailLocalPart(`${user.firstName}.${user.lastName}`);
  } else if (user.username) {
    baseLocal = sanitizeEmailLocalPart(user.username);
  } else if (user.email && user.email.includes('@')) {
    baseLocal = sanitizeEmailLocalPart(user.email.split('@')[0]);
  } else {
    baseLocal = `candidate.${userIdStr ? userIdStr.slice(-6) : 'app'}`;
  }

  let candidate = `${baseLocal}@${domain}`;
  let counter = 1;

  while (true) {
    // Check both User.stalwartEmail and EmailAccount.emailAddress
    const [existingUser, existingAccount] = await Promise.all([
      User.findOne({
        stalwartEmail: candidate,
        _id: { $ne: user._id || user.id },
      }).select('_id').lean(),
      EmailAccount.findOne({
        emailAddress: candidate,
        userId: { $ne: user._id || user.id },
      }).select('_id').lean(),
    ]);

    if (!existingUser && !existingAccount) {
      return candidate;
    }

    counter++;
    candidate = `${baseLocal}${counter}@${domain}`;
  }
}

export async function GET(request: NextRequest) {
  try {
    await getConnection();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const domain = getStalwartDomain();

    // 1. Check EmailAccount with provider stalwart
    const stalwartAccount: any = await EmailAccount.findOne({ userId, provider: 'stalwart' }).lean();

    // 2. Check User model
    const userDoc: any = await User.findById(userId);
    if (!userDoc) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    let assignedEmail: string | null = null;
    if (stalwartAccount?.emailAddress) {
      assignedEmail = stalwartAccount.emailAddress;
    } else if (userDoc?.stalwartEmail) {
      assignedEmail = userDoc.stalwartEmail;
    }

    // Auto-provision unique email if not yet assigned so user entering Emails tab gets their email immediately
    if (!assignedEmail) {
      assignedEmail = await generateUniqueEmail(userDoc);
      userDoc.stalwartEmail = assignedEmail;
      await userDoc.save();

      await EmailAccount.findOneAndUpdate(
        { userId, provider: 'stalwart' },
        {
          userId,
          provider: 'stalwart',
          emailAddress: assignedEmail,
          syncStatus: 'connected',
          lastSyncedAt: new Date(),
        },
        { upsert: true, new: true }
      );
    }

    return NextResponse.json({
      success: true,
      assignedEmail,
      domain,
      status: 'active',
      suggestedEmail: assignedEmail,
    });
  } catch (error: any) {
    console.error('Communications account GET error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await getConnection();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json().catch(() => ({}));
    const domain = getStalwartDomain();

    // Fetch user details
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // If user already has an assigned email and custom localPart is not requested, return it
    if (!body.customLocalPart && user.stalwartEmail) {
      return NextResponse.json({
        success: true,
        assignedEmail: user.stalwartEmail,
        domain,
        status: 'active',
        message: 'Existing application email retrieved',
      });
    }

    // Generate unique email address with collision protection
    const candidateEmail = await generateUniqueEmail(user, body.customLocalPart);

    // Verify Stalwart connection (non-blocking)
    let stalwartStatus = 'connected';
    try {
      const jmapTest = await testJmapConnection();
      if (!jmapTest.success) {
        stalwartStatus = 'ready';
      }
    } catch {
      stalwartStatus = 'ready';
    }

    // Save to User
    user.stalwartEmail = candidateEmail;
    await user.save();

    // Upsert into EmailAccount
    await EmailAccount.findOneAndUpdate(
      { userId, provider: 'stalwart' },
      {
        userId,
        provider: 'stalwart',
        emailAddress: candidateEmail,
        syncStatus: 'connected',
        lastSyncedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      assignedEmail: candidateEmail,
      domain,
      status: stalwartStatus,
      message: 'Application email assigned successfully',
    });
  } catch (error: any) {
    console.error('Communications account POST error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
