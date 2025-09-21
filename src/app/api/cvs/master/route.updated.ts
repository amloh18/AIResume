import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import { CV } from '@/models';
import { createErrorResponse } from '@/lib/db-utils';
import { extractUserIdentifier, findByFirebaseUid, createWithFirebaseUid } from '@/lib/firebase-uid-utils';
import mongoose from 'mongoose';

// GET - Get user's master CV
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Extract user identifier from request and session
    const userIdentifier = extractUserIdentifier(request, session);
    
    if (!userIdentifier.id || !userIdentifier.type) {
      console.log('❌ Master CV API - No valid user identifier found');
      return NextResponse.json(
        { success: false, error: 'User identification failed' },
        { status: 401 }
      );
    }
    
    console.log('🔍 Master CV API - User identifier:', userIdentifier);

    // Build query condition based on user identifier type
    let queryCondition: Record<string, any> = { isMaster: true };
    
    if (userIdentifier.type === 'firebase') {
      queryCondition.firebaseUid = userIdentifier.id;
    } else if (userIdentifier.type === 'objectid') {
      queryCondition.userId = new mongoose.Types.ObjectId(userIdentifier.id);
    }

    console.log('🔍 Master CV API - Query condition:', queryCondition);

    const masterCV = await CV.findOne(queryCondition).lean();
    console.log('🔍 Master CV API - Query executed, result:', {
      found: !!masterCV,
      masterCVId: masterCV?._id,
      masterCVUserId: masterCV?.userId,
      masterCVFirebaseUid: masterCV?.firebaseUid,
      masterCVTitle: masterCV?.title
    });

    // Also check all CVs for this user to see what's in the database
    let allCVsQuery: Record<string, any> = {};
    if (userIdentifier.type === 'firebase') {
      allCVsQuery.firebaseUid = userIdentifier.id;
    } else {
      allCVsQuery.userId = new mongoose.Types.ObjectId(userIdentifier.id);
    }

    const allCVs = await CV.find(allCVsQuery).lean();
    console.log('🔍 Master CV API - All CVs for user:', allCVs.length);
    allCVs.forEach((cv, index) => {
      console.log(`🔍 Master CV API - CV ${index + 1}:`, {
        id: cv._id,
        title: cv.title,
        isMaster: cv.isMaster,
        status: cv.status,
        userId: cv.userId,
        firebaseUid: cv.firebaseUid
      });
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
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Extract user identifier from request and session
    const userIdentifier = extractUserIdentifier(request, session);
    
    if (!userIdentifier.id || !userIdentifier.type) {
      console.log('❌ Master CV POST API - No valid user identifier found');
      return NextResponse.json(
        { success: false, error: 'User identification failed' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { jobTitle, company, jobId } = body;

    // Find the master CV based on user identifier type
    let masterCVQuery: Record<string, any> = { isMaster: true };
    
    if (userIdentifier.type === 'firebase') {
      masterCVQuery.firebaseUid = userIdentifier.id;
    } else if (userIdentifier.type === 'objectid') {
      masterCVQuery.userId = new mongoose.Types.ObjectId(userIdentifier.id);
    }

    const masterCV = await CV.findOne(masterCVQuery);

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

    // Prepare duplicated CV data
    const duplicatedCVData = {
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
    };

    // Create duplicated CV using the helper function
    let userId: string | mongoose.Types.ObjectId;
    let firebaseUid: string;
    
    if (userIdentifier.type === 'firebase') {
      userId = masterCV.userId || new mongoose.Types.ObjectId().toString();
      firebaseUid = userIdentifier.id;
    } else {
      userId = new mongoose.Types.ObjectId(userIdentifier.id);
      firebaseUid = masterCV.firebaseUid || '';
    }

    const duplicatedCV = await createWithFirebaseUid(
      CV,
      duplicatedCVData,
      userId,
      firebaseUid
    );

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
