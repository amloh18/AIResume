import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { getConnection } from '@/lib/database';
import ApiKey from '@/models/b2b/ApiKey';
import crypto from 'crypto';
import mongoose from 'mongoose';

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
    const { name, environment = 'test', permissions = ['parse', 'score'] } = body;

    if (!name) {
      return NextResponse.json({ error: 'Key name is required' }, { status: 400 });
    }

    await getConnection();

    // Generate a secure random key
    const rawKey = crypto.randomBytes(32).toString('hex');
    const prefix = environment === 'live' ? 'live_' : 'test_';
    const fullKey = `cvc_${prefix}${rawKey}`;
    
    // Hash the key before storing
    const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');

    const newApiKey = await ApiKey.create({
      tenantId: new mongoose.Types.ObjectId(user.b2b.tenantId),
      name,
      keyHash,
      prefix: `cvc_${prefix}${rawKey.substring(0, 4)}`,
      environment,
      permissions,
      isActive: true
    });

    // Only return the full key ONCE upon creation
    return NextResponse.json({
      success: true,
      data: {
        _id: newApiKey._id,
        name: newApiKey.name,
        prefix: newApiKey.prefix,
        environment: newApiKey.environment,
        permissions: newApiKey.permissions,
        createdAt: newApiKey.createdAt,
        key: fullKey // <--- This is the only time the user will see this
      }
    });

  } catch (error: any) {
    console.error('Create API Key Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
