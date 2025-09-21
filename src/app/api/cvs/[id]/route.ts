import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import { CV, Template } from '@/models';
import { toObjectId, createErrorResponse } from '@/lib/db-utils';
import { extractUserIdentifier } from '@/lib/firebase-uid-utils';
import { getCVWithTemplate } from '@/lib/cv-template-utils';
import mongoose from 'mongoose';

// GET - Get a specific CV by ID with template data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔍 CV GET API - Starting request');
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    console.log('🔍 CV GET API - Database connected');
    
    const { id } = await params;
    
    // Extract user identifier from request and session
    const userIdentifier = extractUserIdentifier(request, session);
    
    if (!userIdentifier.id || !userIdentifier.type) {
      console.log('❌ CV GET API - No valid user identifier found');
      return NextResponse.json(
        { success: false, error: 'User identification failed' },
        { status: 401 }
      );
    }

    console.log('🔍 CV GET API - User identifier:', userIdentifier);

    const cvId = toObjectId(id);
    
    // Build query based on user identifier type
    let query: Record<string, any> = { _id: cvId };
    
    if (userIdentifier.type === 'firebase') {
      query.firebaseUid = userIdentifier.id;
    } else {
      query.userId = new mongoose.Types.ObjectId(userIdentifier.id);
    }
    
    console.log('🔍 CV GET API - Query:', query);
    
    // Use utility function to get CV with template data
    const cv = await getCVWithTemplate(id);
    
    if (!cv) {
      console.log('❌ CV GET API - CV not found');
      return NextResponse.json(
        { success: false, error: 'CV not found' },
        { status: 404 }
      );
    }

    // Verify user owns the CV
    const userOwnsCV = userIdentifier.type === 'firebase' 
      ? cv.firebaseUid === userIdentifier.id
      : cv.userId.toString() === userIdentifier.id;

    if (!userOwnsCV) {
      console.log('❌ CV GET API - User does not own CV');
      return NextResponse.json(
        { success: false, error: 'CV not found' },
        { status: 404 }
      );
    }

    // Increment view count if it's a public CV
    if (cv.metadata.isPublic) {
      await CV.updateOne(
        { _id: cvId },
        { 
          $inc: { 'metadata.viewCount': 1 },
          $set: { 'metadata.lastModified': new Date() }
        }
      );
      cv.metadata.viewCount += 1;
    }

    console.log('✅ CV GET API - CV retrieved successfully');

    return NextResponse.json({
      success: true,
      cv: cv
    });

  } catch (error: any) {
    console.error('❌ CV GET API - Error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}

// PUT - Update a CV
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔍 CV UPDATE API - Starting update request');
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    console.log('🔍 CV UPDATE API - Database connected');
    
    const { id } = await params;
    const body = await request.json();
    console.log('🔍 CV UPDATE API - Request body received');
    
    // Extract user identifier from request and session
    const userIdentifier = extractUserIdentifier(request, session);
    
    if (!userIdentifier.id || !userIdentifier.type) {
      console.log('❌ CV UPDATE API - No valid user identifier found');
      return NextResponse.json(
        { success: false, error: 'User identification failed' },
        { status: 401 }
      );
    }

    const cvId = toObjectId(id);
    
    // Build query based on user identifier type
    let query: Record<string, any> = { _id: cvId };
    
    if (userIdentifier.type === 'firebase') {
      query.firebaseUid = userIdentifier.id;
    } else {
      query.userId = new mongoose.Types.ObjectId(userIdentifier.id);
    }
    
    console.log('🔍 CV UPDATE API - Query:', query);
    
    // Find CV and ensure user owns it
    const cv = await CV.findOne(query);
    console.log('🔍 CV UPDATE API - CV found:', !!cv);
    
    if (!cv) {
      console.log('❌ CV UPDATE API - CV not found for user');
      return NextResponse.json(
        { success: false, error: 'CV not found' },
        { status: 404 }
      );
    }

    // Prepare update data (excluding legacy fields)
    const allowedFields = [
      'title', 'cvData', 'templateId', 'status', 'isMaster', 'metadata'
    ];
    
    const updateData: Record<string, any> = {};
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Validate templateId if provided
    if (updateData.templateId) {
      const template = await Template.findById(updateData.templateId);
      if (!template || !template.isActive || !template.globalAccess) {
        return NextResponse.json(
          { success: false, error: 'Invalid template specified' },
          { status: 400 }
        );
      }
    }

    // Update metadata.lastModified
    if (!updateData.metadata) {
      updateData.metadata = cv.metadata;
    }
    updateData.metadata.lastModified = new Date();

    console.log('🔍 CV UPDATE API - Updating CV with data:', Object.keys(updateData));
    
    // Update CV
    Object.assign(cv, updateData);
    await cv.save();
    
    console.log('✅ CV UPDATE API - CV saved successfully');

    // Get updated CV with template data
    const updatedCV = await getCVWithTemplate(id);

    return NextResponse.json({
      success: true,
      cv: updatedCV
    });

  } catch (error: any) {
    console.error('❌ CV UPDATE API - Error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}

// DELETE - Delete a CV
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔍 CV DELETE API - Starting delete request');
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    console.log('🔍 CV DELETE API - Database connected');
    
    const { id } = await params;
    
    // Extract user identifier from request and session
    const userIdentifier = extractUserIdentifier(request, session);
    
    if (!userIdentifier.id || !userIdentifier.type) {
      console.log('❌ CV DELETE API - No valid user identifier found');
      return NextResponse.json(
        { success: false, error: 'User identification failed' },
        { status: 401 }
      );
    }

    console.log('🔍 CV DELETE API - User identifier:', userIdentifier);

    const cvId = toObjectId(id);
    
    // Build query based on user identifier type
    let query: Record<string, any> = { _id: cvId };
    
    if (userIdentifier.type === 'firebase') {
      query.firebaseUid = userIdentifier.id;
    } else {
      query.userId = new mongoose.Types.ObjectId(userIdentifier.id);
    }
    
    console.log('🔍 CV DELETE API - Query:', query);
    
    // Find CV and ensure user owns it
    const cv = await CV.findOne(query);
    
    if (!cv) {
      console.log('❌ CV DELETE API - CV not found for user');
      return NextResponse.json(
        { success: false, error: 'CV not found' },
        { status: 404 }
      );
    }

    console.log('✅ CV DELETE API - CV found, deleting...');
    await CV.deleteOne({ _id: cvId });
    console.log('✅ CV DELETE API - CV deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'CV deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ CV DELETE API - Error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}