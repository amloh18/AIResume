import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { getRedisClientIfReady } from '@/lib/cache/redis-client';
import { getConnection } from '@/lib/database';
import ApiKey from '@/models/b2b/ApiKey';
import Tenant from '@/models/b2b/Tenant';

export async function withB2BAuth(
  req: NextRequest,
  context: any,
  handler: (req: NextRequest, context: any, tenant: any, apiKey: any) => Promise<NextResponse> | NextResponse,
  requiredPermissions: string[] = []
) {
  try {
    const authHeader = req.headers.get('Authorization') || req.headers.get('X-API-Key');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing API Key' }, { status: 401 });
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const keyHash = crypto.createHash('sha256').update(token).digest('hex');

    // Try Redis cache first
    const redis = getRedisClientIfReady();
    let cachedKey = null;
    if (redis) {
      const cached = await redis.get(`b2b:apikey:${keyHash}`);
      if (cached) {
        cachedKey = JSON.parse(cached);
      }
    }

    let apiKeyDoc = cachedKey;
    let tenantDoc = null;

    if (!apiKeyDoc) {
      await getConnection();
      apiKeyDoc = await ApiKey.findOne({ keyHash, isActive: true }).populate('tenantId').lean();

      if (!apiKeyDoc) {
        return NextResponse.json({ error: 'Invalid or inactive API Key' }, { status: 401 });
      }

      tenantDoc = apiKeyDoc.tenantId;

      if (redis) {
        // Cache for 5 minutes
        await redis.setEx(`b2b:apikey:${keyHash}`, 300, JSON.stringify(apiKeyDoc));
      }
    } else {
      tenantDoc = apiKeyDoc.tenantId;
    }

    if (!tenantDoc || !tenantDoc.isActive) {
      return NextResponse.json({ error: 'Tenant inactive' }, { status: 403 });
    }

    // Rate Limiting Logic using redisRateLimiter
    const { rateLimit } = await import('@/lib/redis-rate-limiter');
    
    const maxRequests = tenantDoc.rateLimit || 60;
    const limitResult = await rateLimit.check(`b2b:${tenantDoc._id}`, {
      windowMs: 60 * 1000, // 1 minute window
      maxRequests: maxRequests
    });

    if (!limitResult.allowed) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded',
        message: `Your tier allows ${maxRequests} requests per minute.`
      }, { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': limitResult.remaining.toString(),
          'X-RateLimit-Reset': limitResult.resetTime.toString(),
          'Retry-After': Math.ceil((limitResult.resetTime - Date.now()) / 1000).toString()
        }
      });
    }

    // Check permissions
    if (requiredPermissions.length > 0) {
      const hasPermission = requiredPermissions.every(p => apiKeyDoc.permissions.includes(p));
      if (!hasPermission) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    return await handler(req, context, tenantDoc, apiKeyDoc);
  } catch (error) {
    console.error('B2B Auth Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
