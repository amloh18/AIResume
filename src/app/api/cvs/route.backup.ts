import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import { CV } from '@/models';
import { createPaginationOptions, paginateQuery, createErrorResponse } from '@/lib/db-utils';
import mongoose from 'mongoose';

// GET - List CVs for a user with comprehensive filtering
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 CV API - Starting GET request');

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    console.log('🔍 CV API - Database connected');
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    console.log('🔍 CV API - User ID from params:', userId);
    const type = searchParams.get('type'); // 'cv' or 'cover'
    const status = searchParams.get('status');
    const sort = searchParams.get('sort') || 'updatedAt';
    const limit = searchParams.get('limit');
    const projection = searchParams.get('projection') || 'full';
    const starred = searchParams.get('starred');
    const published = searchParams.get('published');
    
    if (!userId) {
      console.log('❌ CV API - No user ID provided');
      return NextResponse.json(
        {
          success: false,
          message: 'User ID is required'
        },
        { status: 400 }
      );
    }
    
    console.log('🔍 CV API - User ID validation passed:', userId);

    // Validate user ID format - support both MongoDB ObjectId and NextAuth formats
    try {
      const mongoose = require('mongoose');
      
      // Check if it's a valid MongoDB ObjectId (24 hex chars)
      if (/^[0-9a-fA-F]{24}$/.test(userId)) {
        const objectId = new mongoose.Types.ObjectId(userId);
        console.log('🔍 CV API - User ID is valid MongoDB ObjectId:', objectId.toString());
      } else {
        // NextAuth format (e.g., N1sLLNSl8sRcruxVGQlBCDQzXy82)
        console.log('🔍 CV API - User ID is NextAuth format:', userId);
      }
    } catch (error) {
      console.error('❌ CV API - Invalid user ID format:', userId, error);
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid user ID format'
        },
        { status: 400 }
      );
    }

    // Create base query - handle both ObjectId and string types
    let query;
    if (/^[0-9a-fA-F]{24}$/.test(userId)) {
      // MongoDB ObjectId format (24 hex chars)
      query = CV.find({ userId: new mongoose.Types.ObjectId(userId) });
    } else {
      // NextAuth string format - use as string
      query = CV.find({ userId: userId });
    }

    console.log('🔍 CV API - Query setup:', {
      userId,
      userIdType: typeof userId,
      isObjectId: /^[0-9a-fA-F]{24}$/.test(userId),
      userIdLength: userId?.toString().length
    });
    
    // Add type filter (CV vs Cover Letter)
    if (type) {
      // For now, we'll use a simple approach - CVs have type field or are default
      // Cover letters might have a specific type or be identified differently
      if (type === 'cover') {
        query = query.find({ 'metadata.type': 'cover_letter' });
      } else if (type === 'cv') {
        query = query.find({ 
          $or: [
            { 'metadata.type': { $ne: 'cover_letter' } },
            { 'metadata.type': { $exists: false } }
          ]
        });
      }
    }

    // Add status filter
    if (status) {
      query = query.find({ status });
    }

    // Add starred filter
    if (starred !== null && starred !== undefined) {
      const isStarred = starred === 'true';
      query = query.find({ 'metadata.starred': isStarred });
    }

    // Add published filter
    if (published !== null && published !== undefined) {
      const isPublished = published === 'true';
      query = query.find({ status: isPublished ? 'published' : { $ne: 'published' } });
    }
    
    // Add search filter if provided
    const searchTerm = searchParams.get('search');
    if (searchTerm) {
      const searchFilter = {
        $or: [
          { title: { $regex: searchTerm, $options: 'i' } },
          { 'cvData.basics.name': { $regex: searchTerm, $options: 'i' } },
          { 'cvData.basics.label': { $regex: searchTerm, $options: 'i' } },
          { 'cvData.basics.email': { $regex: searchTerm, $options: 'i' } }
        ]
      };
      query = query.find(searchFilter);
    }

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
    console.log('🔍 CV API - Executing database query for user:', userId);
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
        userIdType: typeof cv.userId
      });
    });

    // Calculate counts for different statuses - handle both ID types
    const counts = await Promise.all([
      /^[0-9a-fA-F]{24}$/.test(userId) 
        ? CV.countDocuments({ userId: new mongoose.Types.ObjectId(userId) })
        : CV.countDocuments({ userId: userId }),
      /^[0-9a-fA-F]{24}$/.test(userId) 
        ? CV.countDocuments({ userId: new mongoose.Types.ObjectId(userId), status: 'draft' })
        : CV.countDocuments({ userId: userId, status: 'draft' }),
      /^[0-9a-fA-F]{24}$/.test(userId) 
        ? CV.countDocuments({ userId: new mongoose.Types.ObjectId(userId), status: 'published' })
        : CV.countDocuments({ userId: userId, status: 'published' }),
      /^[0-9a-fA-F]{24}$/.test(userId) 
        ? CV.countDocuments({ userId: new mongoose.Types.ObjectId(userId), status: 'archived' })
        : CV.countDocuments({ userId: userId, status: 'archived' }),
      /^[0-9a-fA-F]{24}$/.test(userId) 
        ? CV.countDocuments({ userId: new mongoose.Types.ObjectId(userId), 'metadata.starred': true })
        : CV.countDocuments({ userId: userId, 'metadata.starred': true })
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
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Connect to database
    await connectDB();
    console.log('✅ Database connected for CV creation');
    
    const body = await request.json();
    console.log('📄 Request body received:', JSON.stringify(body, null, 2));
    
    const { 
      userId, 
      title, 
      cvData,
      jobId,
      templateId,
      type = 'cv',
      isMaster = false,
      duplicateFromId
    } = body;

    console.log('🔍 Parsed data:', { userId, title, hasData: !!cvData, type, isMaster, duplicateFromId });

    if (!userId || !title) {
      console.log('❌ Missing required fields:', { userId: !!userId, title: !!title });
      return NextResponse.json(
        {
          success: false,
          message: 'User ID and title are required',
          debug: { userId: !!userId, title: !!title }
        },
        { status: 400 }
      );
    }

    // Handle userId format properly - check if it's MongoDB ObjectId or string
    let objectIdUserId;
    if (/^[0-9a-fA-F]{24}$/.test(userId)) {
      // MongoDB ObjectId format (24 hex chars)
      try {
        objectIdUserId = new mongoose.Types.ObjectId(userId);
        console.log('✅ CV Creation API - User ID is MongoDB ObjectId:', objectIdUserId);
      } catch (error: any) {
        console.error('❌ CV Creation API - Invalid MongoDB ObjectId format:', userId, error);
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid MongoDB ObjectId format',
            debug: { userId, error: error.message }
          },
          { status: 400 }
        );
      }
    } else {
      // NextAuth string format - use as string
      objectIdUserId = userId;
      console.log('✅ CV Creation API - User ID is string format:', objectIdUserId);
    }

    // Handle CV duplication
    let sourceCvData = null;
    if (duplicateFromId) {
      try {
        const sourceCV = await CV.findOne({ _id: duplicateFromId, userId: objectIdUserId });
        if (sourceCV) {
          sourceCvData = sourceCV.cvData;
          console.log('✅ Found source CV for duplication:', duplicateFromId);
        } else {
          console.log('❌ Source CV not found for duplication:', duplicateFromId);
        }
      } catch (error: any) {
        console.error('❌ Error finding source CV:', error);
      }
    }

    // Validate and sanitize CV data
    const sanitizeCvData = (data: any) => {
      if (!data) return null;
      
      const sanitizeString = (str: any): string => {
        if (typeof str !== 'string') return '';
        return str.trim().substring(0, 1000);
      };
      
      const sanitizeArray = (arr: any[]): any[] => {
        if (!Array.isArray(arr)) return [];
        return arr.filter(item => item !== null && item !== undefined);
      };
      
      return {
        basics: {
          name: sanitizeString(data.basics?.name) || "Your Name",
          label: sanitizeString(data.basics?.label) || "Professional Title",
          image: sanitizeString(data.basics?.image) || "",
          email: sanitizeString(data.basics?.email) || "your.email@example.com",
          phone: sanitizeString(data.basics?.phone) || "",
          url: sanitizeString(data.basics?.url) || "",
          summary: sanitizeString(data.basics?.summary) || "A passionate professional with experience in...",
          location: {
            address: sanitizeString(data.basics?.location?.address) || "",
            postalCode: sanitizeString(data.basics?.location?.postalCode) || "",
            city: sanitizeString(data.basics?.location?.city) || "",
            countryCode: sanitizeString(data.basics?.location?.countryCode) || "",
            region: sanitizeString(data.basics?.location?.region) || ""
          },
          profiles: sanitizeArray(data.basics?.profiles || [])
        },
        work: sanitizeArray(data.work || []),
        volunteer: sanitizeArray(data.volunteer || []),
        education: sanitizeArray(data.education || []),
        awards: sanitizeArray(data.awards || []),
        certificates: sanitizeArray(data.certificates || []),
        publications: sanitizeArray(data.publications || []),
        skills: sanitizeArray(data.skills || []),
        languages: sanitizeArray(data.languages || []),
        interests: sanitizeArray(data.interests || []),
        references: sanitizeArray(data.references || []),
        projects: sanitizeArray(data.projects || [])
      };
    };

    // Use source CV data if duplicating, otherwise use provided data or defaults
    console.log('🔍 CV API - Raw cvData received:', JSON.stringify(cvData, null, 2));
    console.log('🔍 CV API - Source CV data:', JSON.stringify(sourceCvData, null, 2));
    
    const sanitizedData = sanitizeCvData(sourceCvData || cvData);
    console.log('🔍 CV API - Sanitized data:', JSON.stringify(sanitizedData, null, 2));
    
    const defaultCvData = sanitizedData || {
      basics: {
        name: "Your Name",
        label: "Professional Title",
        image: "",
        email: "your.email@example.com",
        phone: "",
        url: "",
        summary: "A passionate professional with experience in...",
        location: {
          address: "",
          postalCode: "",
          city: "",
          countryCode: "",
          region: ""
        },
        profiles: []
      },
      work: [],
      volunteer: [],
      education: [],
      awards: [],
      certificates: [],
      publications: [],
      skills: [],
      languages: [],
      interests: [],
      references: [],
      projects: []
    };

    // Create CV with new universal structure
    console.log('📝 Creating CV with data:', { 
      userId: objectIdUserId, 
      title: title.trim(), 
      hasData: !!defaultCvData,
      type 
    });
    
    const cv = new CV({
      userId: objectIdUserId,
      title: title.trim(),
      cvData: defaultCvData,
      status: 'draft',
      version: 1,
      isMaster: isMaster,
      templateId,
      jobId, // Link to job if provided
      styling: {
        primaryColor: '#84cc16',
        secondaryColor: '#22c55e',
        fontFamily: 'Inter',
        fontSize: 'medium',
        spacing: 1.5
      },
      metadata: {
        lastModified: new Date(),
        tags: [],
        isPublic: false,
        viewCount: 0,
        downloadCount: 0,
        type: type, // 'cv' or 'cover_letter'
        starred: false,
        createdFrom: duplicateFromId ? new mongoose.Types.ObjectId(duplicateFromId) : undefined
      }
    });

    console.log('💾 Saving CV to database...');
    console.log('🔍 CV API - CV object before save:', {
      userId: cv.userId,
      title: cv.title,
      isMaster: cv.isMaster,
      hasData: !!cv.cvData,
      dataKeys: cv.cvData ? Object.keys(cv.cvData) : 'No data'
    });
    
    await cv.save();
    
    console.log('✅ CV API - CV saved successfully:', {
      id: cv._id,
      title: cv.title,
      isMaster: cv.isMaster,
      hasData: !!cv.cvData
    });
    console.log('✅ CV saved successfully!');

    const cvResponse = cv.toJSON();

    // Note: CV-to-Journey linking is now handled by ApplicationPackageService
    // CVs are created as freestanding documents and linked to journeys separately
    // This enforces the "Application Package" model where documents belong to specific packages

    // Log activity
    try {
      const { ActivityService } = await import('@/lib/services/activityService');
      await ActivityService.logCVCreated(objectIdUserId.toString(), cvResponse.id, title);
    } catch (activityError) {
      console.error('Failed to log CV creation activity:', activityError);
    }

    return NextResponse.json({
      success: true,
      message: 'CV created successfully',
      data: {
        cv: cvResponse
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Create CV error:', error);
    
    // Handle Mongoose validation errors specifically
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      
      console.error('Validation errors:', validationErrors);
      
      return NextResponse.json({
        success: false,
        message: 'CV data validation failed',
        errors: validationErrors,
        statusCode: 400
      }, { status: 400 });
    }
    
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}
