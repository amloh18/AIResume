import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { CV, User } from '@/models';
import { createErrorResponse } from '@/lib/db-utils';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import mongoose from 'mongoose';

// GET - Get user's master CV
export async function GET(request: NextRequest) {
  try {
    await getConnection();

    // Resolve the user from the authenticated session. The userId query
    // parameter is intentionally ignored: it was previously trusted verbatim,
    // allowing any caller to read another user's master CV if they knew an _id.
    // All legitimate callers are the authenticated user themselves.
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const userId = authResult.userId;

    // First, try to find the master CV created via ai-career-report (the authoritative source)
    // or explicitly marked as master
    let masterCV = await CV.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      $or: [
        { 'metadata.createdVia': 'ai-career-report' },
        { 'metadata.tags': { $in: ['ai-career-report'] } },
        { 'metadata.isMaster': true },
        { 'metadata.isMaster': 'true' },
        { 'isMaster': true },
        { 'isMaster': 'true' },
        { 'cvType': 'master' }
      ]
    }).sort({ createdAt: -1 }).lean() as any;

    // FALLBACK: If no ai-career-report master CV found, use oldest CV by creation date
    if (!masterCV) {
      console.log('🔍 Master CV API - No ai-career-report master CV found, using oldest CV as fallback');
      const allCVs = await CV.find({
        userId: new mongoose.Types.ObjectId(userId)
      }).sort({ createdAt: 1 }).lean() as any[]; // Sort ascending (oldest first)

      if (allCVs && allCVs.length > 0) {
        masterCV = allCVs[0]; // Get the oldest CV
        console.log('🔍 Master CV API - Using oldest CV as master CV fallback:', {
          id: masterCV._id,
          title: masterCV.title,
          createdAt: masterCV.createdAt
        });
      }
    }
    console.log('🔍 Master CV API - Query executed, result:', {
      found: !!masterCV,
      masterCVId: masterCV?._id,
      masterCVUserId: masterCV?.userId,
      masterCVTitle: masterCV?.title,
      isMaster: masterCV?.isMaster,
      metadataIsMaster: masterCV?.metadata?.isMaster,
      createdVia: masterCV?.metadata?.createdVia,
      hasBasics: !!masterCV?.cvData?.basics,
      basicsName: masterCV?.cvData?.basics?.name,
      basicsKeys: masterCV?.cvData?.basics ? Object.keys(masterCV.cvData.basics) : []
    });

    // console.log for production - skip in development for performance
    // Debug logging removed to improve API response time

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
          // CRITICAL: Master CV is identified ONLY by createdVia, not isMaster flag
          createdAt: cv.createdAt,
          updatedAt: cv.updatedAt,
          templateId: cv.templateId,
          metadata: cv.metadata
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
    await getConnection();

    // Use new authentication system
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      console.log('❌ Master CV POST API - No valid authentication found');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    console.log('🔍 Master CV POST API - Using authenticated user:', authResult.userEmail);

    const body = await request.json();
    const { jobTitle, company, jobId } = body;

    // CRITICAL: Master CV is ONLY identified by ai-career-report creation
    // Find the master CV created via ai-career-report
    let masterCV = await CV.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      $or: [
        { 'metadata.createdVia': 'ai-career-report' },
        { 'metadata.tags': { $in: ['ai-career-report'] } }
      ]
    }).sort({ createdAt: -1 });

    // FALLBACK: If no ai-career-report master CV found, use oldest CV by creation date
    if (!masterCV) {
      console.log('🔍 Master CV POST API - No ai-career-report master CV found, using oldest CV as fallback');
      const allCVs = await CV.find({
        userId: new mongoose.Types.ObjectId(userId)
      }).sort({ createdAt: 1 }); // Sort ascending (oldest first)

      if (allCVs && allCVs.length > 0) {
        masterCV = allCVs[0]; // Get the oldest CV
        console.log('🔍 Master CV POST API - Using oldest CV as master CV fallback:', {
          id: masterCV._id,
          title: masterCV.title,
          createdAt: masterCV.createdAt
        });
      }
    }

    if (!masterCV) {
      return NextResponse.json(
        { success: false, message: 'No master CV found to duplicate' },
        { status: 404 }
      );
    }

    // Generate unique title for the duplicated CV to avoid conflicts
    const generateUniqueTitle = async (baseTitle: string, userId: string) => {
      let finalTitle = baseTitle;
      let counter = 1;

      // Check for existing CVs with the same title
      while (true) {
        const query = { userId: new mongoose.Types.ObjectId(userId), title: finalTitle };
        const existingCV = await CV.findOne(query);
        if (!existingCV) {
          break;
        }

        finalTitle = `${baseTitle} ${counter}`;
        counter++;
      }

      return finalTitle;
    };

    const baseTitle = jobTitle && company
      ? `${jobTitle}-${company}-CV`
      : `${masterCV.title} (Copy)`;

    const duplicatedTitle = await generateUniqueTitle(baseTitle, userId);

    // Determine cvType for duplicated CV
    // If jobId is provided, it might be linked to a journey (default to standalone)
    // Otherwise, it's a standalone CV
    const duplicatedCvType: 'master' | 'journey' | 'standalone' = 'standalone';

    // Prepare duplicated CV data
    const duplicatedCVData = {
      title: duplicatedTitle,
      cvData: masterCV.cvData,
      status: 'draft',
      version: 1,
      isMaster: false, // Duplicated CV is not a master
      cvType: duplicatedCvType, // Set cvType
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

    // Create duplicated CV
    const duplicatedCV = new CV({
      ...duplicatedCVData,
      userId: new mongoose.Types.ObjectId(userId)
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
