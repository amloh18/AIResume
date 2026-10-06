import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { userRepository } from '@/lib/repositories/user-repository';
import { getConnection } from '@/lib/database/connection-manager';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    await getConnection();
    const cookieStore = await cookies();
    let anonymousToken = cookieStore.get('buildairesume_anonymous_token')?.value;
    let user = null;

    if (anonymousToken) {
      user = await userRepository.findByAnonymousToken(anonymousToken);
    }

    if (!user) {
      anonymousToken = crypto.randomUUID();
      user = await userRepository.createAnonymousUser(anonymousToken);
      
      cookieStore.set('buildairesume_anonymous_token', anonymousToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: user._id,
        isAnonymous: true,
        onboarding: user.onboarding,
        userLifecycleState: user.userLifecycleState
      }
    });
  } catch (error: any) {
    console.error('Anonymous session error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
