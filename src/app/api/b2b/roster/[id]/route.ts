import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { getConnection } from '@/lib/database';
import B2BCandidate from '@/models/b2b/B2BCandidate';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = authResult.user as any;
    const isGlobalAdmin = user.role === 'admin' || user.role === 'superadmin';
    
    if (!isGlobalAdmin && !user.b2b?.tenantId) {
      return NextResponse.json({ error: 'Forbidden. B2B access required.' }, { status: 403 });
    }

    const { id } = await params;
    await getConnection();
    const tenantId = user.b2b?.tenantId;

    const query: any = { _id: id };
    if (!isGlobalAdmin) {
      query.tenantId = tenantId;
    }

    const candidate = await B2BCandidate.findOne(query).lean();

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: candidate
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = authResult.user as any;
    const isGlobalAdmin = user.role === 'admin' || user.role === 'superadmin';
    
    if (!isGlobalAdmin && !user.b2b?.tenantId) {
      return NextResponse.json({ error: 'Forbidden. B2B access required.' }, { status: 403 });
    }

    const { id } = await params;
    await getConnection();
    const tenantId = user.b2b?.tenantId;

    const query: any = { _id: id };
    if (!isGlobalAdmin) {
      query.tenantId = tenantId;
    }

    const candidate = await B2BCandidate.findOneAndDelete(query);

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Candidate deleted successfully'
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = authResult.user as any;
    const isGlobalAdmin = user.role === 'admin' || user.role === 'superadmin';
    
    if (!isGlobalAdmin && !user.b2b?.tenantId) {
      return NextResponse.json({ error: 'Forbidden. B2B access required.' }, { status: 403 });
    }

    const { id } = await params;
    await getConnection();
    const tenantId = user.b2b?.tenantId;
    const body = await req.json();

    const query: any = { _id: id };
    if (!isGlobalAdmin) {
      query.tenantId = tenantId;
    }

    const updateData: any = {};
    if (body.status) {
      updateData.status = body.status;
    }
    
    // Allow updating specific metadata fields
    if (body.metadata) {
      for (const [key, value] of Object.entries(body.metadata)) {
        updateData[`metadata.${key}`] = value;
      }
    }

    const candidate = await B2BCandidate.findOneAndUpdate(
      query,
      { $set: updateData },
      { new: true }
    ).lean();

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: candidate
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
