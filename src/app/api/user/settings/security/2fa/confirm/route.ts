import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import UserSettings from '@/models/UserSettings';
import { verifyTwoFactorCode } from '@/lib/services/twoFactorService';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check for Firebase user ID in headers or query params
    const firebaseUserId = request.headers.get('x-firebase-user-id') || 
                          request.nextUrl.searchParams.get('firebaseUserId');
                          
    let userId: string | undefined;

    if (session?.user?.id) {
      userId = session.user.id;
    } else if (firebaseUserId) {
      await getConnection();
      const user = await import('@/models/User').then(m => m.default.findOne({ authProviderId: firebaseUserId }));
      if (user) {
        userId = user._id.toString();
      }
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { sessionId, code } = await request.json();

    if (!sessionId || !code) {
      return NextResponse.json(
        { success: false, error: 'Session ID and verification code are required' },
        { status: 400 }
      );
    }

    // Verify code
    const verification = await verifyTwoFactorCode(sessionId, code);

    if (!verification.valid) {
      return NextResponse.json(
        { success: false, error: verification.error || 'Invalid code' },
        { status: 400 }
      );
    }

    // Connect to DB and update settings
    await getConnection();

    let userSettings = await UserSettings.findOne({ userId });
    
    if (!userSettings) {
      userSettings = new UserSettings({ userId });
    }

    // Generate 2FA secret and backup codes if they don't exist
    const secret = crypto.randomBytes(32).toString('base64');
    const backupCodes = Array.from({ length: 10 }, () => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    userSettings.security.twoFactorEnabled = true;
    userSettings.security.twoFactorSecret = userSettings.security.twoFactorSecret || secret;
    if (!userSettings.security.backupCodes || userSettings.security.backupCodes.length === 0) {
      userSettings.security.backupCodes = backupCodes;
    }

    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    userSettings.auditLog.push({
      action: 'two_factor_enabled',
      timestamp: new Date(),
      ipAddress: clientIP,
      userAgent: userAgent,
      changes: { twoFactorEnabled: true }
    });

    await userSettings.save();

    return NextResponse.json({
      success: true,
      message: 'Two-factor authentication enabled successfully',
      backupCodes: userSettings.security.backupCodes
    });

  } catch (error: any) {
    console.error('Error confirming 2FA:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to confirm 2FA' },
      { status: 500 }
    );
  }
}