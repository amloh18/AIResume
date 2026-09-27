import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import Advocate from '@/models/Advocate';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { mixedIdFilter } from '@/lib/utils/mixed-id';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getConnection();
    
    const auth = await authenticateRequest(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await request.json();

    const advocate = await Advocate.findOne({
      _id: id,
      userId: mixedIdFilter(auth.userId)
    });

    if (!advocate) {
      return NextResponse.json(
        { error: 'Advocate not found' },
        { status: 404 }
      );
    }

    // Update fields
    if (body.name !== undefined) advocate.name = body.name;
    if (body.email !== undefined) advocate.email = body.email;
    if (body.linkedinUrl !== undefined) advocate.linkedinUrl = body.linkedinUrl;
    if (body.relation !== undefined) advocate.relation = body.relation;
    if (body.company !== undefined) advocate.company = body.company;
    if (body.notes !== undefined) advocate.notes = body.notes;

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
    console.error('Error updating advocate:', error);
    return NextResponse.json(
      { error: 'Failed to update advocate' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getConnection();
    
    const auth = await authenticateRequest(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const advocate = await Advocate.findOneAndDelete({
      _id: id,
      userId: mixedIdFilter(auth.userId)
    });

    if (!advocate) {
      return NextResponse.json(
        { error: 'Advocate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Advocate deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting advocate:', error);
    return NextResponse.json(
      { error: 'Failed to delete advocate' },
      { status: 500 }
    );
  }
}

