import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { CV } from '@/models';
import Template from '@/models/Template';
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
          { 'sections.personalInfo.firstName': { $regex: searchTerm, $options: 'i' } },
          { 'sections.personalInfo.lastName': { $regex: searchTerm, $options: 'i' } },
          { 'cvData.personal_info.name': { $regex: searchTerm, $options: 'i' } }
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
      templateName = 'ATS Friendly Finance CV',
      templateData,
      cvData,
      template = 'modern' 
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

    // Get default template from database if not provided
    let defaultTemplateData = templateData;
    if (!templateData) {
      const defaultTemplate = await Template.findOne({ isDefault: true });
      if (defaultTemplate) {
        defaultTemplateData = {
          display: defaultTemplate.display,
          sections: defaultTemplate.sections || [],
          snippetStyles: defaultTemplate.snippetStyles || []
        };
      }
    }

    // Use default CV data if not provided
    const defaultCvData = cvData || {
      personal_info: {
        name: "Your Name",
        contact0: "Phone Number",
        contact1: "your.email@example.com",
        contact2: "LinkedIn Profile",
        summary: "A passionate professional with experience in..."
      },
      education: {},
      experience: {},
      leadership: {},
      project: {},
      skills: {}
    };

    // Create CV with new template format
    const cv = new CV({
      userId,
      title: title.trim(),
      templateName,
      templateData: defaultTemplateData,
      cvData: defaultCvData,
      status: 'draft',
      version: 1,
      // Legacy fields for backward compatibility
      template,
      sections: {
        personalInfo: {
          firstName: 'Your',
          lastName: 'Name',
          email: 'your.email@example.com',
          phone: '',
          location: '',
          website: '',
          linkedin: '',
          github: '',
          summary: 'A passionate professional with experience in...'
        },
        experience: [],
        education: [],
        skills: [],
        projects: [],
        certifications: [],
        languages: [],
        customSections: []
      },
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
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
} 