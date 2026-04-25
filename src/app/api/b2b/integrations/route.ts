import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { getConnection } from '@/lib/database';
import B2BIntegration from '@/models/b2b/B2BIntegration';
import mongoose from 'mongoose';

export async function GET(req: Request) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = authResult.user as any;
    if (!user.b2b?.tenantId) {
      return NextResponse.json({ error: 'Forbidden. B2B access required.' }, { status: 403 });
    }

    await getConnection();

    const integrations = await B2BIntegration.find({ tenantId: user.b2b.tenantId }).lean();
    return NextResponse.json({ success: true, data: integrations });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = authResult.user as any;
    if (!user.b2b?.tenantId || user.b2b.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    const body = await req.json();
    const { provider, apiKey, webhookSecret, status = 'active' } = body;

    if (!['greenhouse', 'lever'].includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    await getConnection();

    const integration = await B2BIntegration.findOneAndUpdate(
      { tenantId: user.b2b.tenantId, provider },
      { 
        status,
        'credentials.apiKey': apiKey,
        'credentials.webhookSecret': webhookSecret,
      },
      { new: true, upsert: true }
    );

    return NextResponse.json({ success: true, data: integration });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
