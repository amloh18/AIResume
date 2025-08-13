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
    
    const cv = await CV.findOne({ _id: cvId, userId });
    
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
    await connectDB();
    
    const { id } = await params;
    const body = await request.json();
    const { userId, ...updateData } = body;

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
    
    // Find CV and ensure user owns it
    const cv = await CV.findOne({ _id: cvId, userId });
    
    if (!cv) {
      return NextResponse.json(
        {
          success: false,
          message: 'CV not found'
        },
        { status: 404 }
      );
    }

    // Update CV with new data
    Object.assign(cv, updateData);
    cv.metadata.updatedAt = new Date();
    
    await cv.save();

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
    await connectDB();
    
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    console.log('DELETE CV request - id:', id, 'userId:', userId);

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: 'User ID is required'
        },
        { status: 400 }
      );
    }

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
      console.log('User ID converted successfully:', userObjectId);
    } catch (error) {
      console.error('Invalid User ID format:', userId);
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid User ID format'
        },
        { status: 400 }
      );
    }
    
    console.log('Converted IDs - cvId:', cvId, 'userObjectId:', userObjectId);
    
    // Find CV and ensure user owns it
    const cv = await CV.findOne({ _id: cvId, userId: userObjectId });
    
    if (!cv) {
      console.log('CV not found for user');
      return NextResponse.json(
        {
          success: false,
          message: 'CV not found'
        },
        { status: 404 }
      );
    }

    console.log('CV found, deleting...');
    await CV.deleteOne({ _id: cvId });

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