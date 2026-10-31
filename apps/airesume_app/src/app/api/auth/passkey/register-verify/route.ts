import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { getConnection } from '@/lib/database';
import { User } from '@/models';
import { getWebAuthnConfig, getChallengeFromRequest, clearChallengeCookie } from '@/lib/auth/passkey-helper';

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult?.userId) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    await getConnection();
    const user = await User.findById(authResult.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const challengeData = getChallengeFromRequest(request);
    if (!challengeData?.challenge) {
      return NextResponse.json({ success: false, message: 'Registration session expired. Please try again.' }, { status: 400 });
    }

    const body = await request.json();
    const { response: registrationResponse, name } = body;

    if (!registrationResponse) {
      return NextResponse.json({ success: false, message: 'Missing registration payload' }, { status: 400 });
    }

    const { origin, rpID } = getWebAuthnConfig(request);

    const verification = await verifyRegistrationResponse({
      response: registrationResponse,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ success: false, message: 'Passkey verification failed' }, { status: 400 });
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    const newPasskey = {
      credentialID: credential.id,
      credentialPublicKey: Buffer.from(credential.publicKey).toString('base64'),
      counter: credential.counter,
      transports: (registrationResponse.response as any)?.transports || [],
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      name: (name || '').trim() || 'Passkey',
      createdAt: new Date(),
      lastUsedAt: new Date(),
    };

    // Prevent duplicate registration of the same credential ID
    const exists = (user.passkeys || []).some((p: any) => p.credentialID === credential.id);
    if (!exists) {
      if (!user.passkeys) user.passkeys = [];
      user.passkeys.push(newPasskey as any);
      await user.save();
    }

    const response = NextResponse.json({
      success: true,
      message: 'Passkey registered successfully',
      passkey: {
        credentialID: newPasskey.credentialID,
        name: newPasskey.name,
        deviceType: newPasskey.deviceType,
        backedUp: newPasskey.backedUp,
        createdAt: newPasskey.createdAt,
      },
    });

    clearChallengeCookie(response);
    return response;
  } catch (error: any) {
    console.error('Passkey register verify error:', error);
    return NextResponse.json({ success: false, message: error?.message || 'Verification failed' }, { status: 500 });
  }
}
