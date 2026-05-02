// @ts-nocheck
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { getConnection } from '@/lib/database';
import Tenant from '@/models/b2b/Tenant';

export async function GET(req: Request) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = authResult.user as any;
    if (!user.b2b?.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await getConnection();
    const tenant = await Tenant.findById(user.b2b.tenantId).lean();

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: tenant.settings?.careersPage || {} });
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
    const { slug, brandColor, logoUrl, companyDescription, isPublished } = body;

    await getConnection();
    
    // Check if slug is taken by another tenant
    if (slug) {
      const existing = await Tenant.findOne({ 
        'settings.careersPage.slug': slug, 
        _id: { $ne: user.b2b.tenantId } 
      });
      if (existing) {
        return NextResponse.json({ error: 'This slug is already taken' }, { status: 400 });
      }
    }

    const tenant = await Tenant.findByIdAndUpdate(
      user.b2b.tenantId,
      { 
        $set: { 
          'settings.careersPage.slug': slug,
          'settings.careersPage.brandColor': brandColor,
          'settings.careersPage.logoUrl': logoUrl,
          'settings.careersPage.companyDescription': companyDescription,
          'settings.careersPage.isPublished': isPublished
        } 
      },
      { new: true }
    );

    return NextResponse.json({ success: true, data: tenant?.settings?.careersPage });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
