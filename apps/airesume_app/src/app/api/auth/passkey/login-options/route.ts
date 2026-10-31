import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { getConnection } from '@/lib/database';
import { User } from '@/models';
import { getWebAuthnConfig, setChallengeCookie } from '@/lib/auth/passkey-helper';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = body?.email ? String(body.email).toLowerCase().trim() : '';

    await getConnection();

    let allowCredentials: any[] | undefined = undefined;

    // If email is provided, pre-populate allowCredentials so the browser filters authenticators
    if (email) {
      const user = await User.findOne({ email }).select('passkeys');
      if (user && user.passkeys?.length) {
        allowCredentials = user.passkeys.map((p: any) => ({
          id: p.credentialID,
          transports: p.transports as any,
        }));
      }
    }

    const { rpID } = getWebAuthnConfig(request);

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: 'preferred',
    });

    const response = NextResponse.json({ success: true, options });
    setChallengeCookie(response, options.challenge, { email, type: 'authentication' });
    return response;
  } catch (error: any) {
    console.error('Passkey login options error:', error);
    return NextResponse.json({ success: false, message: error?.message || 'Failed to generate authentication options' }, { status: 500 });
  }
}
