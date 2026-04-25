import { NextRequest, NextResponse } from 'next/server';
import { withB2BAuth } from '@/lib/middleware/b2b-auth';

export async function GET(req: NextRequest, context: any) {
  return withB2BAuth(req, context, async (req, context, tenant, apiKey) => {
    return NextResponse.json({
      status: 'ok',
      tenant: {
        id: tenant._id,
        name: tenant.name,
        tier: tenant.subscriptionTier,
      },
      environment: apiKey.environment,
    });
  });
}
