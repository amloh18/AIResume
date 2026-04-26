import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import Tenant from '@/models/b2b/Tenant';
import Job from '@/models/Job';

export async function GET(req: Request, { params }: { params: { slug: string, jobId: string } }) {
  try {
    await getConnection();
    const { slug, jobId } = params;

    const tenant = await Tenant.findOne({ 
      'settings.careersPage.slug': slug,
      'settings.careersPage.isPublished': true,
      isActive: true
    }).lean();

    if (!tenant) {
      return NextResponse.json({ error: 'Careers page not found' }, { status: 404 });
    }

    const job = await Job.findOne({ 
      _id: jobId,
      tenantId: tenant._id,
      status: 'created',
      isArchived: false,
      isPublic: true
    }).lean();

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        branding: tenant.settings?.careersPage,
        job,
        tenantId: tenant._id
      } 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
