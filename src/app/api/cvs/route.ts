import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import { CV, Template, User } from '@/models';
import { createPaginationOptions, paginateQuery, createErrorResponse } from '@/lib/db-utils';
import { UnifiedCVAPIResponse, UnifiedCVDocument, UnifiedCVRequest } from '@/types/unified-cv-schema';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { getTemplateById, isHardcodedTemplate } from '@/lib/templates/template-utils';
import mongoose from 'mongoose';

// GET - List CVs for a user with comprehensive filtering
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 CV API - Starting GET request');

    // Check authentication using NextAuth
    const authResult = await getAuthenticatedUser();
    console.log('🔍 CV API - Auth check:', { 
      hasAuth: !!authResult,
      email: authResult?.userEmail 
    });
    
    if (!authResult) {
      console.log('❌ CV API - No valid authentication found');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use auth result
    const userEmail = authResult.userEmail;
    const userId = authResult.userId;
    
    console.log('🔍 CV API - User info:', { userEmail, userId });
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'cv' or 'cover'
    const status = searchParams.get('status');
    const sort = searchParams.get('sort') || 'updatedAt';
    const limit = searchParams.get('limit');
    const projection = searchParams.get('projection') || 'full';
    const starred = searchParams.get('starred');
    const published = searchParams.get('published');
    const searchTerm = searchParams.get('search');

    // Build query conditions
    let baseQuery: Record<string, any> = {
      userId: new mongoose.Types.ObjectId(userId)
    };

    console.log('🔍 CV API - Base query:', baseQuery);

    // Add additional query conditions
    if (type) {
      if (type === 'cover') {
        baseQuery['metadata.type'] = 'cover_letter';
      } else if (type === 'cv') {
        baseQuery.$or = [
          { 'metadata.type': { $ne: 'cover_letter' } },
          { 'metadata.type': { $exists: false } }
        ];
      }
    }
    
    if (status) {
      baseQuery.status = status;
    }
    
    if (starred !== null && starred !== undefined) {
      baseQuery['metadata.starred'] = starred === 'true';
    }
    
    if (published !== null && published !== undefined) {
      const isPublished = published === 'true';
      baseQuery.status = isPublished ? 'published' : { $ne: 'published' };
    }
    
    // Add search filter if provided
    if (searchTerm) {
      baseQuery.$and = baseQuery.$and || [];
      baseQuery.$and.push({
        $or: [
          { title: { $regex: searchTerm, $options: 'i' } },
          { 'cvData.basics.name': { $regex: searchTerm, $options: 'i' } },
          { 'cvData.basics.label': { $regex: searchTerm, $options: 'i' } },
          { 'cvData.basics.email': { $regex: searchTerm, $options: 'i' } }
        ]
      });
    }
    
    // Create the actual query
    let query = CV.find(baseQuery);

    // Apply sorting
    const sortOrder = sort === 'updatedAt' ? -1 : 1;
    query = query.sort({ [sort]: sortOrder });

    // Apply limit if specified
    if (limit) {
      query = query.limit(parseInt(limit));
    }

    // Apply projection for list view (minimal fields)
    if (projection === 'list') {
      query = query.select('id title status metadata.starred metadata.lastModified metadata.viewCount metadata.downloadCount createdAt updatedAt');
    } else if (projection === 'summary') {
      // For summary projection, include template data for preview generation
      query = query.populate('templateId', 'name globalStyles availableSections');
    }

    // Execute query
    console.log('🔍 CV API - Executing database query');
    const cvs = await query.lean();
    console.log('🔍 CV API - Query executed, found CVs:', cvs.length);
    
    // Trigger async thumbnail generation for CVs missing thumbnails
    cvs.forEach(async (cv) => {
      const thumbnailAge = cv.metadata?.thumbnailGeneratedAt 
        ? Date.now() - new Date(cv.metadata.thumbnailGeneratedAt).getTime()
        : Infinity;
      
      const needsThumbnail = !cv.metadata?.thumbnailUrl || thumbnailAge > 7 * 24 * 60 * 60 * 1000; // 7 days
      
      if (needsThumbnail) {
        // Trigger async thumbnail generation (don't await)
        fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/cv/${cv._id}/generate-thumbnail`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }).catch(error => {
          console.error(`Failed to generate thumbnail for CV ${cv._id}:`, error);
        });
      }
    });
    
    // Debug: Show all found CVs
    cvs.forEach((cv, index) => {
      console.log(`🔍 CV API - CV ${index + 1}:`, {
        id: cv._id,
        title: cv.title,
        isMaster: cv.metadata?.isMaster,
        status: cv.status,
        userId: cv.userId,
        firebaseUid: cv.firebaseUid
      });
    });

    // Handle count queries efficiently
    let countBaseQuery = {
      userId: new mongoose.Types.ObjectId(userId)
    };
    
    const counts = await Promise.all([
      CV.countDocuments(countBaseQuery),
      CV.countDocuments({ ...countBaseQuery, status: 'draft' }),
      CV.countDocuments({ ...countBaseQuery, status: 'published' }),
      CV.countDocuments({ ...countBaseQuery, status: 'archived' }),
      CV.countDocuments({ ...countBaseQuery, 'metadata.starred': true })
    ]);

    const [total, drafts, publishedCount, archived, starredCount] = counts;

    // Transform data for response
    const transformedCvs = cvs.map(cv => {
      console.log('🔍 CV API - Transforming CV:', {
        id: cv._id,
        title: cv.title,
        isMaster: cv.metadata?.isMaster,
        rawIsMaster: cv.metadata?.isMaster,
        isMasterType: typeof cv.metadata?.isMaster,
        fullMetadata: cv.metadata
      });
      
      return {
        id: cv._id,
        title: cv.title,
        status: cv.status,
        isMaster: cv.metadata?.isMaster || cv.isMaster || false, // Handle both formats
        starred: cv.metadata?.starred || false,
        lastModified: cv.metadata?.lastModified || cv.updatedAt,
        viewCount: cv.metadata?.viewCount || 0,
        downloadCount: cv.metadata?.downloadCount || 0,
        createdAt: cv.createdAt,
        updatedAt: cv.updatedAt,
        metadata: cv.metadata, // Always include metadata
        ...(projection === 'full' && {
          cvData: cv.cvData,
          templateId: cv.templateId,
          templateName: cv.templateName,
          styling: cv.styling
        }),
        ...(projection === 'summary' && {
          cvData: cv.cvData,
          templateId: cv.templateId,
          template: isHardcodedTemplate(cv.templateId?.toString() || '') 
            ? getTemplateById(cv.templateId?.toString() || '') 
            : cv.templateId // Include populated template data or hardcoded template
        })
      };
    });

    console.log('🔍 CV API - Final transformed CVs:', transformedCvs.map(cv => ({
      id: cv.id,
      title: cv.title,
      isMaster: cv.isMaster,
      metadata: cv.metadata
    })));

    // Convert to unified schema format
    const unifiedCvs: UnifiedCVDocument[] = transformedCvs.map(cv => ({
      id: cv.id,
      userId: userId, // Use the userId from authResult
      title: cv.title,
      cvData: cv.cvData,
      templateId: cv.templateId,
      status: cv.status,
      version: 1, // Default version
      metadata: {
        isMaster: cv.isMaster,
        lastModified: cv.lastModified,
        createdFrom: undefined,
        tags: cv.metadata?.tags || [],
        isPublic: cv.metadata?.isPublic || false,
        viewCount: cv.viewCount,
        downloadCount: cv.downloadCount,
        atsScore: cv.metadata?.atsScore,
        atsScoreDate: cv.metadata?.atsScoreDate,
        thumbnailUrl: cv.metadata?.thumbnailUrl,
        thumbnailGeneratedAt: cv.metadata?.thumbnailGeneratedAt,
        starred: cv.starred
      },
      createdAt: cv.createdAt,
      updatedAt: cv.updatedAt
    }));

    const response: UnifiedCVAPIResponse = {
      success: true,
      message: 'CVs retrieved successfully',
      data: {
        cvs: unifiedCvs,
        total,
        counts: {
          total,
          drafts,
          published: publishedCount,
          archived,
          starred: starredCount
        }
      }
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Get CVs error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}

// POST - Create a new CV
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting CV creation...');

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log('❌ CV POST API - No session found');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    console.log('🚀 CV POST API - Database connected');

    // Extract user identifier from request and session
    const userIdentifier = extractUserIdentifier(request, session);
    
    if (!userIdentifier.id || !userIdentifier.type) {
      console.log('❌ CV POST API - No valid user identifier found');
      return NextResponse.json(
        { success: false, error: 'User identification failed' },
        { status: 401 }
      );
    }
    
    console.log('🔍 CV POST API - User identifier:', userIdentifier);

    const body = await request.json();
    console.log('🚀 CV POST API - Request body received');

    // Extract CV data from request
    const {
      title, 
      templateId,
      cvData, 
      status, 
      isMaster,
      metadata
    } = body;

    // Validate required fields
    if (!title || !cvData) {
      console.log('❌ CV POST API - Missing required fields');
      return NextResponse.json(
        { success: false, error: 'Title and CV data are required' },
        { status: 400 }
      );
    }

    // Ensure templateId is provided or get default template
    let finalTemplateId = templateId;
    if (!finalTemplateId) {
      const defaultTemplate = await Template.findOne({ isDefault: true, category: 'cv' });
      if (!defaultTemplate) {
        console.log('❌ CV POST API - No default template found');
        return NextResponse.json(
          { success: false, error: 'No template specified and no default template available' },
          { status: 400 }
        );
      }
      finalTemplateId = defaultTemplate._id;
      console.log('🔍 CV POST API - Using default template:', defaultTemplate.name);
    }

    // Validate template exists
    const template = await Template.findById(finalTemplateId);
    if (!template) {
      console.log('❌ CV POST API - Template not found:', finalTemplateId);
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 400 }
      );
    }

    // Prepare CV data for creation (clean schema - no styling data)
    const cvDataToCreate = {
      title,
      templateId: finalTemplateId,
      cvData,
      status: status || 'draft',
      isMaster: isMaster || false,
      metadata: {
        lastModified: new Date(),
        tags: metadata?.tags || [],
        isPublic: metadata?.isPublic || false,
        viewCount: 0,
        downloadCount: 0,
        ...metadata
      }
    };

    console.log('🚀 CV POST API - CV data prepared:', {
      title, 
      status: cvDataToCreate.status,
      isMaster: cvDataToCreate.isMaster,
      userIdentifier
    });

    // Get MongoDB userId for Firebase users
    let userId: mongoose.Types.ObjectId;
    let firebaseUid: string;
    
    if (userIdentifier.type === 'firebase') {
      // For Firebase users, get the MongoDB ObjectId from the User collection
      const user = await User.findOne({ firebaseUid: userIdentifier.id }).lean();
      if (!user) {
        console.log('❌ CV POST API - Firebase user not found in database');
        return NextResponse.json(
          { success: false, error: 'User not found in database' },
          { status: 404 }
        );
      }
      userId = user._id;
      firebaseUid = userIdentifier.id;
    } else {
      userId = new mongoose.Types.ObjectId(userIdentifier.id);
      firebaseUid = ''; // This should not happen in the new schema
    }

    const newCV = await createWithFirebaseUid(
      CV,
      cvDataToCreate,
      userId,
      firebaseUid
    );

    console.log('✅ CV POST API - CV saved successfully:', {
      id: newCV._id,
      userId: newCV.userId,
      firebaseUid: newCV.firebaseUid,
      title: newCV.title,
      templateId: newCV.templateId
    });

    return NextResponse.json({
      success: true,
      cv: {
        id: newCV._id,
        title: newCV.title,
        status: newCV.status,
        templateId: newCV.templateId,
        createdAt: newCV.createdAt,
        updatedAt: newCV.updatedAt
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ CV POST API - Error creating CV:', error);
    
    if (error.code === 11000) {
      // Duplicate key error
      return NextResponse.json(
        { success: false, error: 'A CV with this title already exists' },
        { status: 409 }
      );
    }
    
    const errorResponse = createErrorResponse(error);
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}
