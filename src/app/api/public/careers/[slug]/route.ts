import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import Tenant from '@/models/b2b/Tenant';
import Job from '@/models/Job';

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  try {
    await getConnection();
    const { slug } = params;

    const tenant = await Tenant.findOne({ 
      'settings.careersPage.slug': slug,
      'settings.careersPage.isPublished': true,
      isActive: true
    }).lean();

    if (!tenant) {
      return NextResponse.json({ error: 'Careers page not found' }, { status: 404 });
    }

    // Get active jobs for this tenant
    const activeJobs = await Job.find({ 
      tenantId: tenant._id,
      status: 'created',
      isArchived: false,
      isPublic: true
    })
    .sort({ createdAt: -1 })
    .select('jobTitle company location createdAt')
    .lean();

    return NextResponse.json({ 
      success: true, 
      data: {
        branding: tenant.settings?.careersPage,
        jobs: activeJobs
      } 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
