import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import Tenant from '@/models/b2b/Tenant';
import { log } from '@/lib/edge-logger';

export async function POST(req: NextRequest) {
  try {
    await getConnection();
    const body = await req.json();
    const { name, contactEmail, subscriptionTier, rateLimit } = body;

    if (!name || !contactEmail) {
      return NextResponse.json({ error: 'Name and contact email are required' }, { status: 400 });
    }

    const tier = subscriptionTier || 'free';
    let defaultRateLimit = 60;
    let defaultRetentionDays = 30;
    
    if (tier === 'pro') {
      defaultRateLimit = 600;
      defaultRetentionDays = 60;
    }
    if (tier === 'enterprise') {
      defaultRateLimit = 6000;
      defaultRetentionDays = 90;
    }

    const tenant = new Tenant({
      name,
      contactEmail,
      subscriptionTier: tier,
      rateLimit: rateLimit || defaultRateLimit,
      settings: {
        dataRetentionDays: defaultRetentionDays
      }
    });

    await tenant.save();
    
    log.info('B2B Tenant created', { tenantId: tenant._id, name });

    return NextResponse.json({ success: true, tenant }, { status: 201 });
  } catch (error: any) {
    log.error('Error creating B2B tenant', error);
    return NextResponse.json({ error: 'Failed to create tenant', details: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await getConnection();
    const tenants = await Tenant.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, tenants });
  } catch (error: any) {
    log.error('Error fetching B2B tenants', error);
    return NextResponse.json({ error: 'Failed to fetch tenants', details: error.message }, { status: 500 });
  }
}
