import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { CV } from '@/models';
import { toObjectId, createErrorResponse } from '@/lib/db-utils';

// POST - Save CV data during editing
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const { id } = params;
    const body = await request.json();
    const { 
      userId, 
      cvData, 
      templateData, 
      title,
      status = 'draft'
    } = body;

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
    if (cvData) {
      cv.cvData = { ...cv.cvData, ...cvData };
    }
    
    if (templateData) {
      cv.templateData = templateData;
    }
    
    if (title) {
      cv.title = title;
    }
    
    cv.status = status;
    
    // Update metadata
    cv.metadata.lastModified = new Date();
    cv.version += 1;

    await cv.save();

    const cvResponse = cv.toJSON();

    return NextResponse.json({
      success: true,
      message: 'CV saved successfully',
      data: {
        cv: cvResponse
      }
    });

  } catch (error: any) {
    console.error('Save CV error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}

// GET - Get CV data for editing
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

    const cvResponse = cv.toJSON();

    return NextResponse.json({
      success: true,
      message: 'CV data retrieved successfully',
      data: {
        cv: cvResponse,
        templateData: cv.templateData,
        cvData: cv.cvData
      }
    });

  } catch (error: any) {
    console.error('Get CV data error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
} 