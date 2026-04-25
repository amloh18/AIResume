import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { getConnection } from '@/lib/database';
import B2BCandidate from '@/models/b2b/B2BCandidate';
import Tenant from '@/models/b2b/Tenant';

export async function POST(req: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult || !authResult.user.b2b?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();
    const tenantId = authResult.user.b2b.tenantId;
    const body = await req.json();

    const { candidates } = body; // Array of parsed CV data
    if (!candidates || !Array.isArray(candidates)) {
      return NextResponse.json({ error: 'Invalid candidates data' }, { status: 400 });
    }

    const newCandidates = await Promise.all(
      candidates.map(async (cvData: any) => {
        return await B2BCandidate.create({
          tenantId,
          firstName: cvData?.basics?.name?.split(' ')[0] || '',
          lastName: cvData?.basics?.name?.split(' ').slice(1).join(' ') || '',
          email: cvData?.basics?.email || '',
          phone: cvData?.basics?.phone || '',
          cvData,
          status: 'new',
          score: Math.floor(Math.random() * 40) + 60, // Simulate a match score for now
        });
      })
    );

    // Update API Usage count
    await Tenant.findByIdAndUpdate(tenantId, { $inc: { apiUsageCount: newCandidates.length } });

    return NextResponse.json({ success: true, data: newCandidates });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult || !authResult.user.b2b?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();
    const tenantId = authResult.user.b2b.tenantId;
    const searchParams = req.nextUrl.searchParams;

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || '';
    const minScore = searchParams.get('minScore') ? parseInt(searchParams.get('minScore') as string, 10) : undefined;
    const status = searchParams.get('status');
    const skill = searchParams.get('skill') || '';
    const location = searchParams.get('location') || '';

    const query: any = { tenantId };

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (minScore !== undefined) {
      query.score = { $gte: minScore };
    }

    if (status) {
      query.status = status;
    }

    if (skill) {
      query['cvData.skills.keywords'] = { $regex: skill, $options: 'i' };
    }

    if (location) {
      query.$or = [
        { 'cvData.basics.location.city': { $regex: location, $options: 'i' } },
        { 'cvData.basics.location.countryCode': { $regex: location, $options: 'i' } },
        { 'cvData.basics.location.region': { $regex: location, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [candidates, total] = await Promise.all([
      B2BCandidate.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      B2BCandidate.countDocuments(query)
    ]);

    return NextResponse.json({
      success: true,
      data: candidates,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
