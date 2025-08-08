import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { CV } from '@/models';
import { createPaginationOptions, paginateQuery, createErrorResponse } from '@/lib/db-utils';

// GET - List CVs for a user
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
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

    // Create base query
    let query = CV.find({ userId });
    
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

    // Add status filter if provided
    const status = searchParams.get('status');
    if (status) {
      query = query.find({ status });
    }

    // Apply pagination
    const paginationOptions = createPaginationOptions(Object.fromEntries(searchParams));
    const result = await paginateQuery(query, paginationOptions);

    return NextResponse.json({
      success: true,
      message: 'CVs retrieved successfully',
      data: result
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
      cvData
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
        downloadCount: 0
      }
    });

    await cv.save();

    const cvResponse = cv.toJSON();

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