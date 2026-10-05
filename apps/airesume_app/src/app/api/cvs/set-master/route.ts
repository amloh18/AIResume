import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { CV } from '@/models';
import { createErrorResponse } from '@/lib/db-utils';
import mongoose from 'mongoose';

// PUT - Set a CV as master CV
export async function PUT(request: NextRequest) {
  try {
    console.log('🔍 Set Master CV API - Starting request');

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await getConnection();
    console.log('🔍 Set Master CV API - Database connected');
    
    const body = await request.json();
    const { cvId } = body;
    
    console.log('🔍 Set Master CV API - Request body:', { cvId });

    if (!cvId) {
      return NextResponse.json(
        {
          success: false,
          message: 'CV ID is required'
        },
        { status: 400 }
      );
    }

    // Validate CV ID format
    let objectIdCvId;
    try {
      objectIdCvId = new mongoose.Types.ObjectId(cvId);
      console.log('🔍 Set Master CV API - Valid CV ID:', objectIdCvId);
    } catch (error: any) {
      console.error('❌ Set Master CV API - Invalid CV ID format:', cvId);
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid CV ID format'
        },
        { status: 400 }
      );
    }

    // Find the CV to set as master
    const cvToSetMaster = await CV.findById(objectIdCvId);
    if (!cvToSetMaster) {
      return NextResponse.json(
        {
          success: false,
          message: 'CV not found'
        },
        { status: 404 }
      );
    }

    console.log('🔍 Set Master CV API - Found CV:', cvToSetMaster.title);

    // First, unset any existing master CV for this user
    await CV.updateMany(
      { userId: cvToSetMaster.userId, _id: { $ne: objectIdCvId } },
      { $set: { 'metadata.isMaster': false } }
    );

    // Set the selected CV as master (use metadata.isMaster, not top-level isMaster)
    cvToSetMaster.metadata.isMaster = true;
    await cvToSetMaster.save();

    console.log('🔍 Set Master CV API - Successfully set master CV');

    return NextResponse.json({
      success: true,
      message: 'Master CV set successfully',
      data: {
        cv: {
          id: cvToSetMaster._id,
          title: cvToSetMaster.title,
          isMaster: cvToSetMaster.metadata.isMaster
        }
      }
    });

  } catch (error: any) {
    console.error('Set Master CV error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}
