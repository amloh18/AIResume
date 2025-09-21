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

    // Find the master CV for this user - handle both ObjectId and string formats
    console.log('🔍 Master CV API - Searching for master CV:', {
      userId,
      userIdType: typeof userId,
      userIdLength: userId?.toString().length,
      isMongoDbFormat: /^[0-9a-fA-F]{24}$/.test(userId)
    });

    let queryCondition;
    if (/^[0-9a-fA-F]{24}$/.test(userId)) {
      // MongoDB ObjectId format (24 hex chars)
      queryCondition = {
        userId: new mongoose.Types.ObjectId(userId),
        isMaster: true
      };
      console.log('🔍 Master CV API - Using MongoDB ObjectId query:', queryCondition);
    } else {
      // NextAuth string format - use as string
      queryCondition = {
        userId: userId,
        isMaster: true
      };
      console.log('🔍 Master CV API - Using string query:', queryCondition);
    }

    console.log('🔍 Master CV API - About to execute query with condition:', queryCondition);
    const masterCV = await CV.findOne(queryCondition).lean();
    console.log('🔍 Master CV API - Query executed, result:', {
      found: !!masterCV,
      masterCVId: masterCV?._id,
      masterCVUserId: masterCV?.userId,
      masterCVTitle: masterCV?.title
    });

    console.log('🔍 Master CV API - Query result:', {
      found: !!masterCV,
      masterCVId: masterCV?._id,
      masterCVTitle: masterCV?.title,
      masterCVIsMaster: masterCV?.isMaster
    });

    // Also check all CVs for this user to see what's in the database
    let allCVsQuery;
    if (/^[0-9a-fA-F]{24}$/.test(userId)) {
      // MongoDB ObjectId format (24 hex chars)
      allCVsQuery = CV.find({ userId: new mongoose.Types.ObjectId(userId) });
    } else {
      // NextAuth string format - use as string
      allCVsQuery = CV.find({ userId: userId });
    }

    const allCVs = await allCVsQuery.lean();
    console.log('🔍 Master CV API - All CVs for user:', allCVs.length);
    allCVs.forEach((cv, index) => {
      console.log(`🔍 Master CV API - CV ${index + 1}:`, {
        id: cv._id,
        title: cv.title,
        isMaster: cv.isMaster,
        status: cv.status,
        userId: cv.userId,
        userIdType: typeof cv.userId,
        userIdMatch: cv.userId === userId,
        userIdStringMatch: String(cv.userId) === String(userId)
      });
    });

    // Additional debugging: Check if the specific CV ID exists
    const specificCV = await CV.findById('68ced1acb10456e617b2b01e').lean();
    console.log('🔍 Master CV API - Specific CV check (68ced1acb10456e617b2b01e):', {
      found: !!specificCV,
      userId: specificCV?.userId,
      isMaster: specificCV?.isMaster,
      title: specificCV?.title,
      userIdType: typeof specificCV?.userId,
      requestedUserId: userId,
      userIdMatch: specificCV?.userId === userId,
      userIdStringMatch: String(specificCV?.userId) === String(userId)
    });

    if (!masterCV) {
      return NextResponse.json({
        success: false,
        message: 'No master CV found for this user',
        data: { masterCV: null }
      });
    }

    // Type assertion since we've already checked masterCV exists
    const cv = masterCV as any;

    return NextResponse.json({
      success: true,
      message: 'Master CV retrieved successfully',
      data: {
        masterCV: {
          id: cv._id,
          title: cv.title,
          cvData: cv.cvData,
          status: cv.status,
          isMaster: cv.isMaster,
          createdAt: cv.createdAt,
          updatedAt: cv.updatedAt
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

    // Find the master CV - handle both ObjectId and string formats
    let masterCVQuery;
    if (/^[0-9a-fA-F]{24}$/.test(userId)) {
      // MongoDB ObjectId format (24 hex chars)
      masterCVQuery = CV.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        isMaster: true
      });
    } else {
      // NextAuth string format - use as string
      masterCVQuery = CV.findOne({
        userId: userId,
        isMaster: true
      });
    }

    const masterCV = await masterCVQuery;

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
