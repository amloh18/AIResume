import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { getConnection } from '@/lib/database';
import Tenant from '@/models/b2b/Tenant';
import crypto from 'crypto';

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
    const { action, webhookUrl } = body;

    await getConnection();
    const tenant = await Tenant.findById(user.b2b.tenantId);

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    if (action === 'save_url') {
      if (!tenant.settings) tenant.settings = {};
      tenant.settings.webhookUrl = webhookUrl;
      await tenant.save();
      return NextResponse.json({ success: true, message: 'Webhook URL updated' });
    } 
    
    if (action === 'regenerate_secret') {
      if (!tenant.settings) tenant.settings = {};
      const newSecret = crypto.randomBytes(32).toString('hex');
      tenant.settings.webhookSecret = newSecret;
      await tenant.save();
      return NextResponse.json({ success: true, secret: newSecret });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Webhook config error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
