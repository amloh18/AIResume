import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import getConnection from '@/lib/database';
import { CV, Template } from '@/models';
import { toObjectId, createErrorResponse } from '@/lib/db-utils';
import { getCVWithTemplate } from '@/lib/cv-template-utils';
import mongoose from 'mongoose';

/**
 * Sanitize and validate CV data to ensure correct structure
 * Fixes issues where field names might be passed as values
 */
function sanitizeCVData(cvData: any): any {
  if (!cvData || typeof cvData !== 'object') {
    return cvData;
  }

  const sanitized = { ...cvData };

  // Array fields that must be arrays
  const arrayFields = [
    'work', 'volunteer', 'education', 'awards', 'certificates',
    'publications', 'skills', 'languages', 'interests', 'references', 'projects'
  ];

  // Ensure all array fields are arrays, not strings or other types
  for (const field of arrayFields) {
    if (sanitized[field] !== undefined) {
      // If it's a string that matches the field name, it's likely an error - convert to empty array
      if (typeof sanitized[field] === 'string' && sanitized[field] === field) {
        console.warn(`⚠️ CV UPDATE API - Field ${field} had string value "${field}", converting to empty array`);
        sanitized[field] = [];
      } else if (!Array.isArray(sanitized[field])) {
        // If it's not an array and not undefined, convert to empty array
        console.warn(`⚠️ CV UPDATE API - Field ${field} is not an array (type: ${typeof sanitized[field]}), converting to empty array`);
        sanitized[field] = [];
      } else {
        // It's an array - sanitize each item to ensure proper structure
        sanitized[field] = sanitized[field].map((item: any, index: number) => {
          if (!item || typeof item !== 'object') {
            // If item is not an object, return a default structure
            return getDefaultItemForField(field);
          }
          
          // Clean each property in the item
          const cleanedItem = { ...item };
          
          // Remove any properties that have field paths as values (e.g., "projects.1.description" as value)
          for (const key in cleanedItem) {
            const value = cleanedItem[key];
            if (typeof value === 'string' && value.includes('.') && value.split('.').length > 1) {
              // Check if the value matches a field path pattern
              const pathParts = value.split('.');
              if (pathParts[0] === field || arrayFields.includes(pathParts[0])) {
                console.warn(`⚠️ CV UPDATE API - Removing invalid value "${value}" from ${field}[${index}].${key}`);
                cleanedItem[key] = '';
              }
            }
          }
          
          return cleanedItem;
        });
      }
    }
  }

  // Ensure basics is an object with proper structure
  if (sanitized.basics && typeof sanitized.basics === 'object') {
    sanitized.basics = {
      name: sanitized.basics.name || '',
      label: sanitized.basics.label || '',
      image: sanitized.basics.image || '',
      email: sanitized.basics.email || '',
      phone: sanitized.basics.phone || '',
      url: sanitized.basics.url || '',
      summary: sanitized.basics.summary || '',
      location: {
        address: sanitized.basics.location?.address || '',
        postalCode: sanitized.basics.location?.postalCode || '',
        city: sanitized.basics.location?.city || '',
        countryCode: sanitized.basics.location?.countryCode || '',
        region: sanitized.basics.location?.region || ''
      },
      profiles: Array.isArray(sanitized.basics.profiles) ? sanitized.basics.profiles : []
    };
  }

  return sanitized;
}

/**
 * Get default item structure for a field
 */
function getDefaultItemForField(field: string): any {
  const defaults: Record<string, any> = {
    work: { name: '', position: '', url: '', startDate: '', endDate: '', summary: '', highlights: [] },
    volunteer: { organization: '', position: '', url: '', startDate: '', endDate: '', summary: '', highlights: [] },
    education: { institution: '', url: '', area: '', studyType: '', startDate: '', endDate: '', score: '', courses: [], description: '' },
    awards: { title: '', date: '', awarder: '', summary: '' },
    certificates: { name: '', date: '', issuer: '', url: '', description: '' },
    publications: { name: '', publisher: '', releaseDate: '', url: '', summary: '' },
    skills: { category: '', skills: [] },
    languages: { language: '', fluency: '' },
    interests: { name: '', keywords: [] },
    references: { name: '', reference: '' },
    projects: { name: '', startDate: '', endDate: '', description: '', highlights: [], keywords: [], url: '' }
  };
  
  return defaults[field] || {};
}

// GET - Get a specific CV by ID with template data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔍 CV GET API - Starting request');
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await getConnection();
    console.log('🔍 CV GET API - Database connected');
    
    const { id } = await params;
    console.log('🔍 CV GET API - CV ID from params:', id);

    const cvId = toObjectId(id);
    console.log('🔍 CV GET API - Converted CV ID:', cvId);
    
    // Build query using session user ID
    const query: Record<string, any> = { 
      _id: cvId,
      userId: new mongoose.Types.ObjectId(session.user.id)
    };
    
    console.log('🔍 CV GET API - Final query:', query);
    
    // First, find the CV with user ownership check
    const cvDoc = await CV.findOne(query);
    
    if (!cvDoc) {
      console.log('❌ CV GET API - CV not found for user');
      return NextResponse.json(
        { success: false, error: 'CV not found' },
        { status: 404 }
      );
    }

    console.log('✅ CV GET API - CV found, getting template data');
    
    // Use utility function to get CV with template data
    const cv = await getCVWithTemplate(id);
    
    if (!cv) {
      console.log('❌ CV GET API - CV not found after template fetch');
      return NextResponse.json(
        { success: false, error: 'CV not found' },
        { status: 404 }
      );
    }

    // Increment view count if it's a public CV
    if (cv.metadata.isPublic) {
      await CV.updateOne(
        { _id: cvId },
        { 
          $inc: { 'metadata.viewCount': 1 },
          $set: { 'metadata.lastModified': new Date() }
        }
      );
      cv.metadata.viewCount += 1;
    }

    console.log('✅ CV GET API - CV retrieved successfully');

    return NextResponse.json({
      success: true,
      data: {
        cv: cv
      }
    });

  } catch (error: any) {
    console.error('❌ CV GET API - Error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}

// PUT - Update a CV
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔍 CV UPDATE API - Starting update request');
    
    // Check authentication
    const session = await getServerSession(authOptions);
    console.log('🔍 CV UPDATE API - Session:', session);
    console.log('🔍 CV UPDATE API - User ID:', session?.user?.id);
    console.log('🔍 CV UPDATE API - User email:', session?.user?.email);
    
    if (!session?.user?.email) {
      console.log('❌ CV UPDATE API - No valid session found');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await getConnection();
    console.log('🔍 CV UPDATE API - Database connected');
    
    const { id } = await params;
    const body = await request.json();
    console.log('🔍 CV UPDATE API - Request body received');
    
    const cvId = toObjectId(id);
    
    // Build query using session user ID
    const query: Record<string, any> = { 
      _id: cvId,
      userId: new mongoose.Types.ObjectId(session.user.id)
    };
    
    console.log('🔍 CV UPDATE API - Query:', query);
    
    // Find CV and ensure user owns it
    const cv = await CV.findOne(query);
    console.log('🔍 CV UPDATE API - CV found:', !!cv);
    
    if (!cv) {
      console.log('❌ CV UPDATE API - CV not found for user');
      return NextResponse.json(
        { success: false, error: 'CV not found' },
        { status: 404 }
      );
    }

    // Prepare update data (excluding legacy fields)
    const allowedFields = [
      'title', 'cvData', 'templateId', 'status', 'isMaster', 'metadata'
    ];
    
    const updateData: Record<string, any> = {};
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        // Sanitize cvData before adding to updateData
        if (field === 'cvData') {
          updateData[field] = sanitizeCVData(body[field]);
          console.log('🔍 CV UPDATE API - Sanitized cvData:', {
            awards: Array.isArray(updateData[field]?.awards),
            certificates: Array.isArray(updateData[field]?.certificates),
            projects: Array.isArray(updateData[field]?.projects)
          });
        } else {
          updateData[field] = body[field];
        }
      }
    }

    // Validate templateId if provided
    if (updateData.templateId) {
      // Check if it's a hardcoded template first
      const { HARDCODED_TEMPLATES } = await import('@/lib/templates/hardcoded-templates');
      const hardcodedTemplate = HARDCODED_TEMPLATES.find(t => t.id === updateData.templateId || t._id === updateData.templateId);

      if (hardcodedTemplate) {
        // Allow hardcoded templates
        console.log('✅ CV UPDATE API - Using hardcoded template:', hardcodedTemplate.name);
      } else {
        // Check database templates
        const template = await Template.findById(updateData.templateId);
        if (!template || !template.isActive || !template.globalAccess) {
          return NextResponse.json(
            { success: false, error: 'Invalid template specified' },
            { status: 400 }
          );
        }
      }
    }

    // Handle metadata updates properly
    if (body.isMaster !== undefined) {
      // If isMaster is provided at root level, update metadata
      if (!updateData.metadata) {
        updateData.metadata = { ...cv.metadata };
      }
      updateData.metadata.isMaster = body.isMaster;
    }
    
    // Update metadata.lastModified
    if (!updateData.metadata) {
      updateData.metadata = { ...cv.metadata };
    }
    updateData.metadata.lastModified = new Date();

    console.log('🔍 CV UPDATE API - Updating CV with data:', Object.keys(updateData));
    console.log('🔍 CV UPDATE API - Update data values:', updateData);
    
    // Update CV
    Object.assign(cv, updateData);
    await cv.save();
    
    // Save CV with template to S3 as backup
    try {
      // Get template data if available
      let templateData = cv.templateData || null;
      if (!templateData && cv.templateId) {
        const { HARDCODED_TEMPLATES } = await import('@/lib/templates/hardcoded-templates');
        const hardcodedTemplate = HARDCODED_TEMPLATES.find(t => 
          t.id === cv.templateId?.toString() || t._id === cv.templateId?.toString()
        );
        if (hardcodedTemplate) {
          templateData = hardcodedTemplate;
        } else {
          const template = await Template.findById(cv.templateId);
          if (template) {
            templateData = template.toJSON();
          }
        }
      }
      
      const { CVS3Service } = await import('@/lib/services/cvS3Service');
      const s3Url = await CVS3Service.saveCVToS3(
        cv._id.toString(),
        cv.userId.toString(),
        cv.cvData,
        templateData
      );
      
      if (s3Url) {
        // Store S3 URL in metadata
        if (!cv.metadata) {
          cv.metadata = {} as any;
        }
        (cv.metadata as any).s3BackupUrl = s3Url;
        (cv.metadata as any).s3BackupSavedAt = new Date();
        await cv.save();
        console.log('✅ CV UPDATE API - CV saved to S3:', s3Url);
      }
    } catch (s3Error) {
      console.warn('⚠️ CV UPDATE API - Failed to save CV to S3 (non-critical):', s3Error);
      // Continue - S3 backup is non-critical
    }

    // Note: Thumbnail generation moved to studio exit for better performance
    
    console.log('✅ CV UPDATE API - CV saved successfully');

    // Get updated CV with template data
    console.log('🔍 CV UPDATE API - Fetching updated CV with template...');
    const updatedCV = await getCVWithTemplate(id);
    
    if (!updatedCV) {
      console.log('❌ CV UPDATE API - Failed to fetch updated CV with template');
      return NextResponse.json(
        { success: false, error: 'Failed to fetch updated CV' },
        { status: 500 }
      );
    }
    
    console.log('✅ CV UPDATE API - Successfully fetched updated CV with template');

    return NextResponse.json({
      success: true,
      data: {
        cv: updatedCV
      }
    });

  } catch (error: any) {
    console.error('❌ CV UPDATE API - Error:', error);
    console.error('❌ CV UPDATE API - Error message:', error.message);
    console.error('❌ CV UPDATE API - Error stack:', error.stack);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}

// DELETE - Delete a CV
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔍 CV DELETE API - Starting delete request');
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await getConnection();
    console.log('🔍 CV DELETE API - Database connected');
    
    const { id } = await params;
    console.log('🔍 CV DELETE API - CV ID from params:', id);

    const cvId = toObjectId(id);
    console.log('🔍 CV DELETE API - Converted CV ID:', cvId);
    
    // Build query using session user ID (consistent with GET and PUT)
    const query: Record<string, any> = { 
      _id: cvId,
      userId: new mongoose.Types.ObjectId(session.user.id)
    };
    
    console.log('🔍 CV DELETE API - Query:', query);
    
    // Find CV and ensure user owns it
    const cv = await CV.findOne(query);
    
    if (!cv) {
      console.log('❌ CV DELETE API - CV not found for user');
      return NextResponse.json(
        { success: false, error: 'CV not found' },
        { status: 404 }
      );
    }

    console.log('✅ CV DELETE API - CV found, deleting...');
    await CV.deleteOne({ _id: cvId });
    console.log('✅ CV DELETE API - CV deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'CV deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ CV DELETE API - Error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}
