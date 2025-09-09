import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { CV } from '@/models';
import { createErrorResponse } from '@/lib/db-utils';
import mongoose from 'mongoose';

// GET - Get user's master CV
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Find the master CV for this user
    const masterCV = await CV.findOne({ 
      userId: new mongoose.Types.ObjectId(userId), 
      isMaster: true 
    }).lean();

    if (!masterCV) {
      return NextResponse.json({
        success: false,
        message: 'No master CV found for this user',
        data: { masterCV: null }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Master CV retrieved successfully',
      data: { 
        masterCV: {
          id: masterCV._id,
          title: masterCV.title,
          cvData: masterCV.cvData,
          status: masterCV.status,
          isMaster: masterCV.isMaster,
          createdAt: masterCV.createdAt,
          updatedAt: masterCV.updatedAt
        }
      }
    });

  } catch (error: any) {
    console.error('Get master CV error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}

// POST - Duplicate master CV for a job
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { userId, jobTitle, company, jobId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Find the master CV
    const masterCV = await CV.findOne({ 
      userId: new mongoose.Types.ObjectId(userId), 
      isMaster: true 
    });

    if (!masterCV) {
      return NextResponse.json(
        { success: false, message: 'No master CV found to duplicate' },
        { status: 404 }
      );
    }

    // Generate title for the duplicated CV
    const duplicatedTitle = jobTitle && company 
      ? `${jobTitle}-${company}-CV`
      : `${masterCV.title} (Copy)`;

    // Create duplicated CV
    const duplicatedCV = new CV({
      userId: masterCV.userId,
      title: duplicatedTitle,
      cvData: masterCV.cvData,
      status: 'draft',
      version: 1,
      isMaster: false, // Duplicated CV is not a master
      templateId: masterCV.templateId,
      jobId: jobId, // Link to specific job if provided
      styling: masterCV.styling,
      metadata: {
        ...masterCV.metadata,
        lastModified: new Date(),
        createdFrom: masterCV._id,
        viewCount: 0,
        downloadCount: 0
      }
    });

    await duplicatedCV.save();

    return NextResponse.json({
      success: true,
      message: 'Master CV duplicated successfully',
      data: {
        cv: {
          id: duplicatedCV._id,
          title: duplicatedCV.title,
          status: duplicatedCV.status,
          isMaster: duplicatedCV.isMaster,
          jobId: duplicatedCV.jobId,
          createdAt: duplicatedCV.createdAt
        }
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Duplicate master CV error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}