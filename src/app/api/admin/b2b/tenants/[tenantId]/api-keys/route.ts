import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import ApiKey from '@/models/b2b/ApiKey';
import Tenant from '@/models/b2b/Tenant';
import * as crypto from 'crypto';
import { log } from '@/lib/edge-logger';

export async function POST(
  req: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    await getConnection();
    const { tenantId } = params;
    const body = await req.json();
    const { name, environment, permissions } = body;

    if (!name || !environment) {
      return NextResponse.json({ error: 'Name and environment are required' }, { status: 400 });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Generate secure random key
    const rawKey = crypto.randomBytes(32).toString('hex');
    const prefix = `cvc_${environment === 'live' ? 'live' : 'test'}_`;
    const fullKey = `${prefix}${rawKey}`;

    // Hash the key for storage
    const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');

    const apiKey = new ApiKey({
      tenantId,
      name,
      keyHash,
      prefix: `${prefix}${rawKey.substring(0, 4)}`,
      environment,
      permissions: permissions || ['parse', 'score', 'batch'],
    });

    await apiKey.save();
    
    log.info('B2B API Key generated', { tenantId, name, environment });

    // Return the raw key only once
    return NextResponse.json({
      success: true,
      apiKey: {
        id: apiKey._id,
        name: apiKey.name,
        environment: apiKey.environment,
        permissions: apiKey.permissions,
        prefix: apiKey.prefix,
        createdAt: apiKey.createdAt,
      },
      key: fullKey, // Only time this will ever be shown
    }, { status: 201 });
  } catch (error: any) {
    log.error('Error generating B2B API Key', { error: error.message });
    return NextResponse.json({ error: 'Failed to generate API Key', details: error.message }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    await getConnection();
    const { tenantId } = params;
    
    // We only return safe metadata, never the full key hash
    const apiKeys = await ApiKey.find({ tenantId })
      .select('-keyHash')
      .sort({ createdAt: -1 })
      .lean();
      
    return NextResponse.json({ success: true, apiKeys });
  } catch (error: any) {
    log.error('Error fetching B2B API Keys', { error: error.message });
    return NextResponse.json({ error: 'Failed to fetch API Keys', details: error.message }, { status: 500 });
  }
}
