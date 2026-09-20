import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import { encode } from 'next-auth/jwt';
import { isDevBypassRequestAllowed } from '@/lib/auth/dev-bypass';
import { getSessionCookieName, getSessionCookieOptions } from '@/lib/auth/session-cookie';

/**
 * Dev Bypass Login API Route Handler
 *
 * Allows logging in instantly as a User or Admin during local development.
 * Strictly local-only — see `@/lib/auth/dev-bypass` for the two gates.
 */
export async function POST(request: NextRequest) {
  // 1. Local-dev-only gate: env flag AND the request must come from localhost.
  const host = request.headers.get('host') || request.nextUrl.hostname;
  if (!isDevBypassRequestAllowed(host)) {
    return NextResponse.json(
      { success: false, error: 'Dev bypass is not available' },
      { status: 403 }
    );
  }

  try {
    const { role } = await request.json();

    if (!role || !['user', 'admin'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing role' },
        { status: 400 }
      );
    }

    await getConnection();

    let email = '';
    let name = '';
    let userRole: 'user' | 'admin' | 'superadmin' = 'user';

    if (role === 'admin') {
      email = 'amarl@buildairesume.com';
      name = 'Amar L';
      userRole = 'superadmin';
    } else {
      email = 'dev-user@buildairesume.com';
      name = 'Dev User';
      userRole = 'user';
    }

    // Find if user already exists
    const user = await User.findOne({ email: email.toLowerCase() }).lean();

    let userDoc;
    if (!user) {
      // Create new test user
      const newUser = new User({
        authProviderId: `dev_bypass_${role}_${Date.now()}`,
        authProvider: 'local',
        email: email,
        password: null,
        firstName: name.split(' ')[0],
        lastName: name.split(' ')[1] || '',
        isEmailVerified: true,
        role: userRole,
        currentPlanKey: role === 'admin' ? 'focused_yearly' : 'free',
        userLifecycleState: 'ACTIVE',
        usage: {
          cvJourneyCount: 0,
          cvCreatedCount: 0,
          journeysCreated: 0,
          exportCount: 0,
          atsCheckCount: 0,
          lastResetDate: new Date(),
        },
        subscription: {
          planKey: role === 'admin' ? 'focused_yearly' : 'free',
          status: role === 'admin' ? 'active' : 'inactive',
          startDate: new Date(),
          provider: 'none',
          interval: 'one-time',
          seats: 1,
          storageUsed: 0,
        },
        settings: {
          theme: 'auto',
          notifications: {
            email: true,
            push: true,
          },
          timezone: 'UTC',
          languagePreference: 'en',
        },
      });

      await newUser.save();
      userDoc = newUser.toObject();
      console.log(`✅ Created dev bypass user for role ${role}:`, userDoc._id.toString());
    } else {
      userDoc = Array.isArray(user) ? user[0] : user;
      // Update role if needed to keep them in sync with requested role
      const updates: any = {
        isEmailVerified: true,
        lastLogin: new Date(),
      };

      if (role === 'admin') {
        if (userDoc.role !== 'admin' && userDoc.role !== 'superadmin') {
          updates.role = 'superadmin';
        }
      }

      await User.findByIdAndUpdate((userDoc._id as any).toString(), updates);
      userDoc = { ...userDoc, ...updates };
      console.log(`✅ Found and updated dev bypass user for role ${role}:`, (userDoc._id as any).toString());
    }

    // Create JWT token for NextAuth session
    const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;
    if (!NEXTAUTH_SECRET) {
      throw new Error('NEXTAUTH_SECRET is not configured');
    }
    
    const token = await encode({
      token: {
        id: (userDoc._id as any).toString(),
        email: userDoc.email,
        role: userDoc.role,
        type: userDoc.role === 'admin' ? 'admin' : 'user',
      },
      secret: NEXTAUTH_SECRET,
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // Create response
    const response = NextResponse.json({
      success: true,
      user: {
        id: (userDoc._id as any).toString(),
        email: userDoc.email,
        name: `${userDoc.firstName || ''} ${userDoc.lastName || ''}`.trim(),
        role: userDoc.role,
      }
    });

    // Set NextAuth session cookie.
    //
    // Same rule as create-session: the name and the `Secure` flag must match
    // what getToken()/getServerSession() read, which depends on the deployment
    // being on HTTPS — not on NODE_ENV alone. A hardcoded insecure name silently
    // breaks the bypass under `next start` (NODE_ENV=production, http://localhost).
    const cookieName = getSessionCookieName();

    response.cookies.set(cookieName, token, getSessionCookieOptions(7 * 24 * 60 * 60));

    console.log('✅ Dev bypass session created for user:', (userDoc._id as any).toString());

    return response;
  } catch (error: any) {
    console.error('❌ Dev bypass session creation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to bypass login' },
      { status: 500 }
    );
  }
}
