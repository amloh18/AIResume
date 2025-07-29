import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { CV } from '@/models';
import { toObjectId, createErrorResponse } from '@/lib/db-utils';

// GET - Get a specific CV by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const { id } = params;
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
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const { id } = params;
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

    // Update CV data
    Object.assign(cv, updateData);
    
    // Update metadata
    cv.metadata.lastModified = new Date();
    cv.version += 1;

    await cv.save();

    const cvResponse = cv.toJSON();

    return NextResponse.json({
      success: true,
      message: 'CV updated successfully',
      data: {
        cv: cvResponse
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
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const { id } = params;
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