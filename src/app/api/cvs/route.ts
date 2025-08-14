import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { CV } from '@/models';
import { createPaginationOptions, paginateQuery, createErrorResponse } from '@/lib/db-utils';

// GET - List CVs for a user with comprehensive filtering
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type'); // 'cv' or 'cover'
    const status = searchParams.get('status');
    const sort = searchParams.get('sort') || 'updatedAt';
    const limit = searchParams.get('limit');
    const projection = searchParams.get('projection') || 'full';
    const starred = searchParams.get('starred');
    const published = searchParams.get('published');
    
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: 'User ID is required'
        },
        { status: 400 }
      );
    }

    // Create base query
    let query = CV.find({ userId });
    
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
    const cvs = await query.lean();

    // Calculate counts for different statuses
    const counts = await Promise.all([
      CV.countDocuments({ userId }),
      CV.countDocuments({ userId, status: 'draft' }),
      CV.countDocuments({ userId, status: 'published' }),
      CV.countDocuments({ userId, status: 'archived' }),
      CV.countDocuments({ userId, 'metadata.starred': true })
    ]);

    const [total, drafts, published, archived, starred] = counts;

    // Transform data for response
    const transformedCvs = cvs.map(cv => ({
      id: cv._id,
      title: cv.title,
      status: cv.status,
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
    }));

    return NextResponse.json({
      success: true,
      message: 'CVs retrieved successfully',
      data: {
        cvs: transformedCvs,
        total,
        counts: {
          total,
          drafts,
          published,
          archived,
          starred
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
    await connectDB();
    
    const body = await request.json();
    const { 
      userId, 
      title, 
      cvData,
      jobId,
      templateId,
      type = 'cv'
    } = body;

    if (!userId || !title) {
      return NextResponse.json(
        {
          success: false,
          message: 'User ID and title are required'
        },
        { status: 400 }
      );
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

    // Use default CV data if not provided
    const defaultCvData = sanitizeCvData(cvData) || {
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
    const cv = new CV({
      userId,
      title: title.trim(),
      cvData: defaultCvData,
      status: 'draft',
      version: 1,
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
        starred: false
      }
    });

    await cv.save();

    const cvResponse = cv.toJSON();

    // Log activity
    try {
      const { ActivityService } = await import('@/lib/services/activityService');
      await ActivityService.logCVCreated(userId, cvResponse.id, title);
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