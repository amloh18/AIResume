import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { getConnection } from '@/lib/database';
import Job from '@/models/Job';

export async function GET(req: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = authResult.user as any;
    if (!user.b2b?.tenantId) {
      return NextResponse.json({ error: 'Forbidden. B2B access required.' }, { status: 403 });
    }

    await getConnection();
    const jobs = await Job.find({ tenantId: user.b2b.tenantId }).sort({ createdAt: -1 }).lean();
    
    return NextResponse.json({ success: true, data: jobs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = authResult.user as any;
    if (!user.b2b?.tenantId) {
      return NextResponse.json({ error: 'Forbidden. B2B access required.' }, { status: 403 });
    }

    const body = await req.json();
    const { jobTitle, company, location, jobDescription, status = 'created' } = body;

    if (!jobTitle || !company) {
      return NextResponse.json({ error: 'Job Title and Company are required' }, { status: 400 });
    }

    await getConnection();

    const newJob = await Job.create({
      userId: user._id,
      tenantId: user.b2b.tenantId,
      jobTitle,
      company,
      location,
      jobDescription,
      status,
      isArchived: false,
      priority: 'medium'
    });

    return NextResponse.json({ success: true, data: newJob }, { status: 201 });
  } catch (error: any) {
    console.error('Create B2B Job Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
