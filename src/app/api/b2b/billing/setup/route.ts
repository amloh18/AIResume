import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { B2BBillingService } from '@/lib/services/b2b-billing-service';
import { log } from '@/lib/edge-logger';
import { getConnection } from '@/lib/database';

export async function POST(req: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = authResult;
    if (!user.b2b || !user.b2b.tenantId) {
      return NextResponse.json({ error: 'Not a B2B user' }, { status: 403 });
    }

    if (user.b2b.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can set up billing' }, { status: 403 });
    }

    const body = await req.json();
    const { priceId } = body;

    if (!priceId) {
      return NextResponse.json({ error: 'priceId is required' }, { status: 400 });
    }

    await getConnection();
    const result = await B2BBillingService.setupTenantBilling(user.b2b.tenantId, priceId);

    return NextResponse.json(result);
  } catch (error: any) {
    log.error('Error in B2B billing setup endpoint', error);
    return NextResponse.json({ error: 'Failed to set up billing', details: error.message }, { status: 500 });
  }
}
