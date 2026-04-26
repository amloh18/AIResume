import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { getConnection } from '@/lib/database';
import B2BCandidate from '@/models/b2b/B2BCandidate';
import crypto from 'crypto';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult || !authResult.user.b2b?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();
    const tenantId = authResult.user.b2b.tenantId;

    const candidate = await B2BCandidate.findOne({
      _id: params.id,
      tenantId
    });

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    // Generate token if not exists
    let token = candidate.metadata?.shareToken;
    if (!token) {
      token = crypto.randomBytes(16).toString('hex');
      if (!candidate.metadata) candidate.metadata = {};
      candidate.metadata.shareToken = token;
      await candidate.save();
    }

    return NextResponse.json({
      success: true,
      data: { token }
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
