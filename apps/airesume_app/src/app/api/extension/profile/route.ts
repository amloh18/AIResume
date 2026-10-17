import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { buildAutofillProfile } from '@/lib/jobs/autofillProfile';

export const dynamic = 'force-dynamic';

/**
 * GET /api/extension/profile
 *
 * The candidate profile the browser extension's autofill engine fills job
 * application forms from: identity, contact details, links, address, headline,
 * preferences, full work history, education, skills, certifications and
 * languages — merged from the account profile and the Master CV.
 *
 * Read-only and private: the response is `no-store` so a shared machine never
 * serves one user's personal details to the next request.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Please sign in to autofill applications.' },
        { status: 401 }
      );
    }

    await getConnection();
    const profile = await buildAutofillProfile(auth.userId);

    return NextResponse.json(
      { success: true, profile },
      { headers: { 'Cache-Control': 'no-store, private' } }
    );
  } catch (err: any) {
    console.error('GET /api/extension/profile Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to build profile' }, { status: 500 });
  }
}
