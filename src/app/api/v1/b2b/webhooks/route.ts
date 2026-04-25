import { NextRequest, NextResponse } from 'next/server';
import { withB2BAuth } from '@/lib/middleware/b2b-auth';
import { getConnection } from '@/lib/database';
import Tenant from '@/models/b2b/Tenant';
import crypto from 'crypto';

export async function POST(req: NextRequest, context: any) {
  return withB2BAuth(req, context, async (req, context, tenant, apiKey) => {
    try {
      const body = await req.json();
      const { webhookUrl } = body;

      if (!webhookUrl) {
        return NextResponse.json({ error: 'webhookUrl is required' }, { status: 400 });
      }

      try {
        new URL(webhookUrl);
      } catch (e) {
        return NextResponse.json({ error: 'Invalid webhookUrl format' }, { status: 400 });
      }

      await getConnection();
      
      // Generate a new webhook secret if one doesn't exist or if requested
      const webhookSecret = tenant.settings?.webhookSecret || crypto.randomBytes(32).toString('hex');
      
      await Tenant.findByIdAndUpdate(tenant._id, {
        $set: {
          'settings.webhookUrl': webhookUrl,
          'settings.webhookSecret': webhookSecret
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Webhook registered successfully',
        data: {
          webhookUrl,
          webhookSecret // Only returned once, client must store it
        }
      });
    } catch (error: any) {
      return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
  }, ['webhooks']);
}

export async function GET(req: NextRequest, context: any) {
  return withB2BAuth(req, context, async (req, context, tenant, apiKey) => {
    try {
      return NextResponse.json({
        success: true,
        data: {
          webhookUrl: tenant.settings?.webhookUrl || null,
          hasSecret: !!tenant.settings?.webhookSecret
        }
      });
    } catch (error: any) {
      return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
  }, ['webhooks']);
}
