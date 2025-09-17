import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { CV } from '@/models';
import { toObjectId, createErrorResponse } from '@/lib/db-utils';

// GET - Get a specific CV by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: 'User ID is required'
        },
        { status: 400 }
      );
    }

    const cvId = toObjectId(id);
    const userIdObjectId = toObjectId(userId);
    
    const cv = await CV.findOne({ _id: cvId, userId: userIdObjectId });
    
    if (!cv) {
      return NextResponse.json(
        {
          success: false,
          message: 'CV not found'
        },
        { status: 404 }
      );
    }

    // Increment view count if it's a public CV
    if (cv.metadata.isPublic) {
      cv.metadata.viewCount += 1;
      await cv.save();
    }

    const cvResponse = cv.toJSON();

    return NextResponse.json({
      success: true,
      message: 'CV retrieved successfully',
      data: {
        cv: cvResponse
      }
    });

  } catch (error: any) {
    console.error('Get CV error:', error);
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
    await connectDB();
    console.log('🔍 CV UPDATE API - Database connected');
    
    const { id } = await params;
    const body = await request.json();
    console.log('🔍 CV UPDATE API - Request body:', body);
    
    const { userId, ...updateData } = body;
    console.log('🔍 CV UPDATE API - Extracted data:', { userId, hasUpdateData: !!updateData });

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: 'User ID is required'
        },
        { status: 400 }
      );
    }

    const cvId = toObjectId(id);
    const userIdObjectId = toObjectId(userId);
    console.log('🔍 CV UPDATE API - CV ID:', cvId, 'User ID:', userIdObjectId);
    
    // Find CV and ensure user owns it
    const cv = await CV.findOne({ _id: cvId, userId: userIdObjectId });
    console.log('🔍 CV UPDATE API - CV found:', !!cv);
    
    if (!cv) {
      console.log('❌ CV UPDATE API - CV not found for user');
      return NextResponse.json(
        {
          success: false,
          message: 'CV not found'
        },
        { status: 404 }
      );
    }

    // Update CV with new data
    console.log('🔍 CV UPDATE API - Updating CV with data:', updateData);
    Object.assign(cv, updateData);
    cv.metadata.lastModified = new Date();
    
    console.log('🔍 CV UPDATE API - Saving CV...');
    await cv.save();
    console.log('✅ CV UPDATE API - CV saved successfully');

    return NextResponse.json({
      success: true,
      message: 'CV updated successfully',
      data: {
        cv: cv.toJSON()
      }
    });

  } catch (error: any) {
    console.error('Update CV error:', error);
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
    await connectDB();
    console.log('🔍 CV DELETE API - Database connected');
    
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    console.log('🔍 CV DELETE API - CV ID:', id, 'User ID:', userId);

    if (!userId) {
      console.log('❌ CV DELETE API - No user ID provided');
      return NextResponse.json(
        {
          success: false,
          message: 'User ID is required'
        },
        { status: 400 }
      );
    }
    
    console.log('🔍 CV DELETE API - User ID validation passed');

    let cvId, userObjectId;
    
    try {
      cvId = toObjectId(id);
      console.log('CV ID converted successfully:', cvId);
    } catch (error) {
      console.error('Invalid CV ID format:', id);
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid CV ID format'
        },
        { status: 400 }
      );
    }
    
    try {
      userObjectId = toObjectId(userId);
      console.log('✅ CV DELETE API - User ID converted successfully:', userObjectId);
    } catch (error) {
      console.error('❌ CV DELETE API - Invalid User ID format:', userId, error);
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid User ID format'
        },
        { status: 400 }
      );
    }
    
    console.log('Converted IDs - cvId:', cvId, 'userObjectId:', userObjectId);
    
    console.log('🔍 CV DELETE API - Looking for CV with ID:', cvId, 'and user ID:', userObjectId);
    
    // Find CV and ensure user owns it
    const cv = await CV.findOne({ _id: cvId, userId: userObjectId });
    
    if (!cv) {
      console.log('❌ CV DELETE API - CV not found for user');
      console.log('🔍 CV DELETE API - Checking if CV exists without user filter...');
      const cvWithoutUser = await CV.findOne({ _id: cvId });
      if (cvWithoutUser) {
        console.log('🔍 CV DELETE API - CV exists but belongs to different user:', cvWithoutUser.userId);
      } else {
        console.log('🔍 CV DELETE API - CV does not exist at all');
      }
      return NextResponse.json(
        {
          success: false,
          message: 'CV not found'
        },
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
    console.error('Delete CV error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
} 