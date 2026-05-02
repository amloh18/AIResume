import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import Tenant from '@/models/b2b/Tenant';
import { log } from '@/lib/edge-logger';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    await getConnection();
    const { tenantId } = await params;
    const body = await req.json();
    const { isActive, rateLimit, subscriptionTier } = body;

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    if (isActive !== undefined) {
      tenant.isActive = isActive;
    }
    
    if (rateLimit !== undefined) {
      tenant.rateLimit = rateLimit;
    }
    
    if (subscriptionTier !== undefined) {
      tenant.subscriptionTier = subscriptionTier;
    }

    await tenant.save();

    log.info('B2B Tenant updated', { tenantId: tenant._id, isActive, rateLimit, subscriptionTier });

    return NextResponse.json({ success: true, tenant });
  } catch (error: any) {
    log.error('Error updating B2B tenant', error);
    return NextResponse.json({ error: 'Failed to update tenant', details: error.message }, { status: 500 });
  }
}
