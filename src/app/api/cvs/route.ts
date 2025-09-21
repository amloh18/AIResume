import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import { CV } from '@/models';
import { createPaginationOptions, paginateQuery, createErrorResponse } from '@/lib/db-utils';
import { extractUserIdentifier, findManyByFirebaseUid, countByFirebaseUid, createWithFirebaseUid } from '@/lib/firebase-uid-utils';
import mongoose from 'mongoose';

// GET - List CVs for a user with comprehensive filtering
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 CV API - Starting GET request');

    // Check authentication
    const session = await getServerSession(authOptions);
    console.log('🔍 CV API - Session check:', { 
      hasSession: !!session, 
      hasUser: !!session?.user,
      email: session?.user?.email 
    });
    
    if (!session?.user?.email) {
      console.log('❌ CV API - No valid session found');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    console.log('🔍 CV API - Database connected');
    
    // Extract user identifier from request and session
    const userIdentifier = extractUserIdentifier(request, session);
    
    if (!userIdentifier.id || !userIdentifier.type) {
      console.log('❌ CV API - No valid user identifier found');
      return NextResponse.json(
        { success: false, error: 'User identification failed' },
        { status: 401 }
      );
    }
    
    console.log('🔍 CV API - User identifier:', userIdentifier);
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'cv' or 'cover'
    const status = searchParams.get('status');
    const sort = searchParams.get('sort') || 'updatedAt';
    const limit = searchParams.get('limit');
    const projection = searchParams.get('projection') || 'full';
    const starred = searchParams.get('starred');
    const published = searchParams.get('published');
    const searchTerm = searchParams.get('search');

    // Build query conditions based on user identifier type
    let baseQuery: Record<string, any> = {};
    
    if (userIdentifier.type === 'firebase') {
      baseQuery.firebaseUid = userIdentifier.id;
      console.log('🔍 CV API - Using Firebase UID query:', userIdentifier.id);
    } else if (userIdentifier.type === 'objectid') {
      baseQuery.userId = new mongoose.Types.ObjectId(userIdentifier.id);
      console.log('🔍 CV API - Using MongoDB ObjectId query:', userIdentifier.id);
    }

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
    }

    // Execute query
    console.log('🔍 CV API - Executing database query');
    const cvs = await query.lean();
    console.log('🔍 CV API - Query executed, found CVs:', cvs.length);
    
    // Debug: Show all found CVs
    cvs.forEach((cv, index) => {
      console.log(`🔍 CV API - CV ${index + 1}:`, {
        id: cv._id,
        title: cv.title,
        isMaster: cv.isMaster,
        status: cv.status,
        userId: cv.userId,
        firebaseUid: cv.firebaseUid
      });
    });

    // Handle count queries efficiently
    let countBaseQuery = {};
    if (userIdentifier.type === 'firebase') {
      countBaseQuery = { firebaseUid: userIdentifier.id };
    } else {
      countBaseQuery = { userId: new mongoose.Types.ObjectId(userIdentifier.id) };
    }
    
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
        isMaster: cv.isMaster,
        rawIsMaster: cv.isMaster,
        isMasterType: typeof cv.isMaster
      });
      
      return {
        id: cv._id,
        title: cv.title,
        status: cv.status,
        isMaster: cv.isMaster || false,
        starred: cv.metadata?.starred || false,
        lastModified: cv.metadata?.lastModified || cv.updatedAt,
        viewCount: cv.metadata?.viewCount || 0,
        downloadCount: cv.metadata?.downloadCount || 0,
        createdAt: cv.createdAt,
        updatedAt: cv.updatedAt,
        ...(projection === 'full' && {
          cvData: cv.cvData,
          templateId: cv.templateId,
          templateName: cv.templateName,
          styling: cv.styling,
          metadata: cv.metadata
        })
      };
    });

    return NextResponse.json({
      success: true,
      message: 'CVs retrieved successfully',
      data: {
        cvs: transformedCvs,
        total,
        counts: {
          total,
          drafts,
          published: publishedCount,
          archived,
          starred: starredCount
        }
      }
    });

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
      templateName,
      templateData, 
      cvData, 
      status, 
      isMaster,
      styling,
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

    // Prepare CV data for creation
    const cvDataToCreate = {
      title,
      templateId,
      templateName,
      templateData,
      cvData,
      status: status || 'draft',
      isMaster: isMaster || false,
      styling: styling || {
        primaryColor: '#84cc16',
        secondaryColor: '#22c55e',
        fontFamily: 'Inter',
        fontSize: 'medium',
        spacing: 1.5
      },
      metadata: {
        lastModified: new Date(),
        tags: metadata?.tags || [],
        isPublic: metadata?.isPublic || false,
        viewCount: 0,
        downloadCount: 0,
        starred: metadata?.starred || false,
        ...metadata
      }
    };

    console.log('🚀 CV POST API - CV data prepared:', {
      title, 
      status: cvDataToCreate.status,
      isMaster: cvDataToCreate.isMaster,
      userIdentifier
    });

    // Create new CV using the helper function
    let userId: string | mongoose.Types.ObjectId;
    let firebaseUid: string;
    
    if (userIdentifier.type === 'firebase') {
      userId = new mongoose.Types.ObjectId().toString(); // Generate new ObjectId for userId
      firebaseUid = userIdentifier.id;
    } else {
      userId = new mongoose.Types.ObjectId(userIdentifier.id);
      firebaseUid = ''; // Empty string for non-Firebase users
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
      title: newCV.title
    });

    return NextResponse.json({
      success: true,
      cv: {
        id: newCV._id,
        title: newCV.title,
        status: newCV.status,
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
