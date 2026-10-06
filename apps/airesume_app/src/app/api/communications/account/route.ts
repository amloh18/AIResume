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
  return 'buildairesume.com';
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
    const user: any = await User.findById(userId).select('firstName lastName username email stalwartEmail').lean();

    let assignedEmail: string | null = null;
    if (stalwartAccount?.emailAddress) {
      assignedEmail = stalwartAccount.emailAddress;
    } else if (user?.stalwartEmail) {
      assignedEmail = user.stalwartEmail;
    }

    // Determine suggestion if not yet assigned
    let suggestedName = '';
    if (user?.firstName && user?.lastName) {
      suggestedName = `${user.firstName}.${user.lastName}`;
    } else if (user?.username) {
      suggestedName = user.username;
    } else if (session.user.name) {
      suggestedName = session.user.name;
    } else if (user?.email) {
      suggestedName = user.email.split('@')[0];
    }
    const suggestedEmail = `${sanitizeEmailLocalPart(suggestedName)}@${domain}`;

    return NextResponse.json({
      success: true,
      assignedEmail,
      domain,
      status: assignedEmail ? 'active' : 'unassigned',
      suggestedEmail,
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

    // Generate local part
    let localPart = '';
    if (body.customLocalPart && typeof body.customLocalPart === 'string') {
      localPart = sanitizeEmailLocalPart(body.customLocalPart);
    } else if (user.firstName && user.lastName) {
      localPart = sanitizeEmailLocalPart(`${user.firstName}.${user.lastName}`);
    } else if (user.username) {
      localPart = sanitizeEmailLocalPart(user.username);
    } else if (session.user.name) {
      localPart = sanitizeEmailLocalPart(session.user.name);
    } else if (user.email) {
      localPart = sanitizeEmailLocalPart(user.email.split('@')[0]);
    } else {
      localPart = `candidate.${userId.toString().slice(-6)}`;
    }

    let candidateEmail = `${localPart}@${domain}`;

    // Check for collisions with other users
    const existing = await EmailAccount.findOne({
      emailAddress: candidateEmail,
      userId: { $ne: userId },
    });

    if (existing) {
      const suffix = Math.floor(100 + Math.random() * 900);
      candidateEmail = `${localPart}.${suffix}@${domain}`;
    }

    // Verify Stalwart connection (non-blocking if server offline in dev)
    let stalwartStatus = 'connected';
    try {
      const jmapTest = await testJmapConnection();
      if (!jmapTest.success) {
        stalwartStatus = 'ready'; // configured locally, Stalwart server awaiting sync
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
