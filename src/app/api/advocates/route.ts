// @ts-nocheck pre-existing type escape — removal tracked as R14 in docs/application-automation/fix-tasks.md
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import Advocate from '@/models/Advocate';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';

export async function GET(request: NextRequest) {
  try {
    await getConnection();
    
    const auth = await authenticateRequest(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const advocates = await Advocate.find({ userId: auth.userId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: advocates.map(adv => ({
        id: adv._id.toString(),
        ...adv,
        _id: undefined
      }))
    });
  } catch (error) {
    console.error('Error fetching advocates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch advocates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await getConnection();
    
    const auth = await authenticateRequest(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, email, linkedinUrl, relation, company, notes } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const advocate = new Advocate({
      userId: auth.userId,
      name,
      email,
      linkedinUrl,
      relation: relation || 'other',
      company,
      notes
    });

    await advocate.save();

    return NextResponse.json({
      success: true,
      data: {
        id: advocate._id.toString(),
        ...advocate.toObject(),
        _id: undefined
      }
    });
  } catch (error) {
    console.error('Error creating advocate:', error);
    return NextResponse.json(
      { error: 'Failed to create advocate' },
      { status: 500 }
    );
  }
}

