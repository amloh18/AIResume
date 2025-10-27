import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import { CV, User } from '@/models';
import { createErrorResponse } from '@/lib/db-utils';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import mongoose from 'mongoose';

// GET - Get user's master CV
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Check for explicit userId parameter (backward compatibility)
    const { searchParams } = new URL(request.url);
    const explicitUserId = searchParams.get('userId');
    
    let userId: string;
    
    if (explicitUserId) {
      // Use explicit userId parameter (backward compatibility)
      console.log('🔍 Master CV API - Using explicit userId:', explicitUserId);
      userId = explicitUserId;
    } else {
      // Use new authentication system
      const authResult = await getAuthenticatedUser(request);
      if (!authResult) {
        console.log('❌ Master CV API - No valid authentication found');
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
      userId = authResult.userId;
      console.log('🔍 Master CV API - Using authenticated user:', authResult.userEmail);
    }
    
    console.log('🔍 Master CV API - User ID:', userId);

    // Build query condition - handle both old format (isMaster at root) and new format (metadata.isMaster)
    const queryCondition: Record<string, any> = {
      userId: new mongoose.Types.ObjectId(userId),
      $or: [
        { 'metadata.isMaster': true },
        { 'metadata.isMaster': 'true' },
        { isMaster: true },
        { isMaster: 'true' }
      ]
    };

    console.log('🔍 Master CV API - Query condition:', queryCondition);

    const masterCV = await CV.findOne(queryCondition).lean();
    console.log('🔍 Master CV API - Query executed, result:', {
      found: !!masterCV,
      masterCVId: masterCV?._id,
      masterCVUserId: masterCV?.userId,
      masterCVTitle: masterCV?.title,
      isMaster: masterCV?.isMaster,
      metadataIsMaster: masterCV?.metadata?.isMaster
    });

    // Also check all CVs for this user to see what's in the database
    const allCVsQuery = { userId: new mongoose.Types.ObjectId(userId) };
    const allCVs = await CV.find(allCVsQuery).lean();
    console.log('🔍 Master CV API - All CVs for user:', allCVs.length);
    allCVs.forEach((cv, index) => {
      console.log(`🔍 Master CV API - CV ${index + 1}:`, {
        id: cv._id,
        title: cv.title,
        isMaster: cv.isMaster,
        metadataIsMaster: cv.metadata?.isMaster,
        status: cv.status,
        userId: cv.userId
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
          isMaster: cv.metadata?.isMaster || cv.isMaster || true, // Handle both formats
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
    
    // Use new authentication system
    const authResult = await getAuthenticatedUser(request);
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

    // Find the master CV - handle both old format (isMaster at root) and new format (metadata.isMaster)
    const masterCVQuery: Record<string, any> = {
      userId: new mongoose.Types.ObjectId(userId),
      $or: [
        { 'metadata.isMaster': true },
        { 'metadata.isMaster': 'true' },
        { isMaster: true },
        { isMaster: 'true' }
      ]
    };

    const masterCV = await CV.findOne(masterCVQuery);

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
