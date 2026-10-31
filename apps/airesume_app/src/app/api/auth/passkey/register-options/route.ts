import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { getConnection } from '@/lib/database';
import { User } from '@/models';
import { getWebAuthnConfig, setChallengeCookie } from '@/lib/auth/passkey-helper';

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

    const { rpName, rpID } = getWebAuthnConfig(request);

    // Build list of existing credentials to exclude so user doesn't re-register the same key
    const excludeCredentials = (user.passkeys || []).map((pk: any) => ({
      id: pk.credentialID,
      transports: pk.transports as any,
    }));

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new Uint8Array(Buffer.from(user._id.toString())),
      userName: user.email,
      userDisplayName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    const response = NextResponse.json({ success: true, options });
    setChallengeCookie(response, options.challenge, { userId: user._id.toString(), type: 'registration' });
    return response;
  } catch (error: any) {
    console.error('Passkey register options error:', error);
    return NextResponse.json({ success: false, message: error?.message || 'Failed to generate registration options' }, { status: 500 });
  }
}
