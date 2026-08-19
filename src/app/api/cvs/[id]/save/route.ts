import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { CV } from '@/models';
import { toObjectId, createErrorResponse } from '@/lib/db-utils';
import { getAuthenticatedUser } from '@/lib/auth-helpers';

/**
 * Deep merge function that properly handles arrays
 * Arrays are replaced entirely (not merged) since frontend sends complete arrays
 * Objects are deeply merged
 */
function deepMergeCVData(existing: any, incoming: any): any {
  if (!incoming || typeof incoming !== 'object') {
    return existing;
  }
  
  if (!existing || typeof existing !== 'object') {
    return incoming;
  }

  // Array fields that should be replaced entirely, not merged
  const arrayFields = [
    'work', 'volunteer', 'education', 'awards', 'certificates',
    'publications', 'skills', 'languages', 'interests', 'references', 'projects'
  ];

  const merged = { ...existing };

  for (const key in incoming) {
    // If it's an array field, replace entirely (frontend sends complete arrays)
    // But if incoming array is undefined (missing from request), preserve existing to prevent data loss
    if (arrayFields.includes(key)) {
      if (incoming[key] !== undefined) {
        // Incoming array is provided (even if empty), use it after sanitization
        merged[key] = Array.isArray(incoming[key]) ? [...incoming[key]] : [];
      } else if (Array.isArray(existing[key])) {
        // Incoming array is missing, preserve existing to prevent accidental data loss
        console.log(`⚠️ CV SAVE API - Preserving existing ${key} array (${existing[key].length} items) as incoming is missing`);
        merged[key] = [...existing[key]];
      } else {
        // Neither exists, default to empty array
        merged[key] = [];
      }
    } 
    // Special handling for structure - preserve if incoming doesn't have it
    else if (key === 'structure') {
      // Merge structure sections, preserve existing ones if incoming doesn't overwrite
      if (incoming.structure && typeof incoming.structure === 'object') {
        merged.structure = {
          ...existing.structure,
          ...incoming.structure,
          sections: incoming.structure.sections || existing.structure?.sections || []
        };
      }
    }
    // Special handling for content map
    else if (key === 'content') {
      merged.content = {
        ...existing.content,
        ...incoming.content
      };
    }
    // For nested objects, deep merge
    else if (incoming[key] && typeof incoming[key] === 'object' && !Array.isArray(incoming[key])) {
      merged[key] = deepMergeCVData(existing[key] || {}, incoming[key]);
    }
    // For primitives, replace
    else {
      merged[key] = incoming[key];
    }
  }

  return merged;
}

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
        console.warn(`⚠️ CV SAVE API - Field ${field} had string value "${field}", converting to empty array`);
        sanitized[field] = [];
      } else if (!Array.isArray(sanitized[field])) {
        // If it's not an array and not undefined, convert to empty array
        console.warn(`⚠️ CV SAVE API - Field ${field} is not an array (type: ${typeof sanitized[field]}), converting to empty array`);
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
                console.warn(`⚠️ CV SAVE API - Removing invalid value "${value}" from ${field}[${index}].${key}`);
                cleanedItem[key] = '';
              }
            }
          }
          
          // Remove empty summary fields (empty strings or whitespace-only) to keep database clean
          if (cleanedItem.summary !== undefined) {
            const summaryValue = String(cleanedItem.summary || '').trim();
            if (summaryValue === '' || summaryValue === '<br>' || summaryValue === '<p></p>' || summaryValue === '<p><br></p>') {
              delete cleanedItem.summary;
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
    languages: { language: '', fluency: '', level: 3 },
    interests: { name: '', keywords: [] },
    references: { name: '', reference: '' },
    projects: { name: '', startDate: '', endDate: '', description: '', highlights: [], keywords: [], url: '' }
  };
  
  return defaults[field] || {};
}

// POST - Save CV data during editing
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getConnection();

    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    const userId = authResult.userId;

    const { id } = await params;
    const body = await request.json();
    const { 
      cvData, 
      template, 
      title,
      status = 'draft'
    } = body;

    const cvId = toObjectId(id);
    
    // Find CV and ensure the authenticated user owns it
    const cv = await CV.findOne({ _id: cvId, userId });
    
    if (!cv) {
      return NextResponse.json(
        {
          success: false,
          message: 'CV not found'
        },
        { status: 404 }
      );
    }

    // Update CV data using deep merge and sanitization
    if (cvData) {
      // Sanitize incoming data first
      const sanitizedCvData = sanitizeCVData(cvData);
      
      // Deep merge with existing data to preserve structure and content maps
      cv.cvData = deepMergeCVData(cv.cvData || {}, sanitizedCvData);
      
      console.log('🔍 CV SAVE API - Data merged:', {
        hasSkills: Array.isArray(cv.cvData.skills),
        skillsLength: Array.isArray(cv.cvData.skills) ? cv.cvData.skills.length : 0,
        hasProjects: Array.isArray(cv.cvData.projects),
        projectsLength: Array.isArray(cv.cvData.projects) ? cv.cvData.projects.length : 0,
        hasCertificates: Array.isArray(cv.cvData.certificates),
        certificatesLength: Array.isArray(cv.cvData.certificates) ? cv.cvData.certificates.length : 0
      });
    }
    
    if (template) {
      cv.templateData = template;
    }
    
    if (title) {
      cv.title = title;
    }
    
    cv.status = status;
    
    // Update metadata
    cv.metadata.lastModified = new Date();
    cv.version += 1;

    // Explicitly mark Mixed type fields as modified to ensure Mongoose saves them
    if (cvData) {
      cv.markModified('cvData');
    }
    cv.markModified('metadata');

    await cv.save();

    // Save CV with template to S3 as backup
    try {
      const { CVS3Service } = await import('@/lib/services/cvS3Service');
      const s3Url = await CVS3Service.saveCVToS3(
        cv._id.toString(),
        userId,
        cv.cvData,
        cv.templateData || template
      );
      
      if (s3Url) {
        // Store S3 URL in metadata
        if (!cv.metadata) {
          cv.metadata = {} as any;
        }
        (cv.metadata as any).s3BackupUrl = s3Url;
        (cv.metadata as any).s3BackupSavedAt = new Date();
        await cv.save();
        console.log('✅ CV saved to S3:', s3Url);
      }
    } catch (s3Error) {
      console.warn('⚠️ Failed to save CV to S3 (non-critical):', s3Error);
      // Continue - S3 backup is non-critical
    }

    // Note: Thumbnail generation moved to studio exit for better performance

    const cvResponse = cv.toJSON();

    return NextResponse.json({
      success: true,
      message: 'CV saved successfully',
      data: {
        cv: cvResponse
      }
    });

  } catch (error: any) {
    console.error('Save CV error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}

// GET - Get CV data for editing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getConnection();
    
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    const userId = authResult.userId;

    const { id } = await params;

    const cvId = toObjectId(id);
    
    const cv = await CV.findOne({ _id: cvId, userId });
    
    if (!cv) {
      return NextResponse.json(
        {
          success: false,
          message: 'CV not found'
        },
        { status: 404 }
      );
    }

    const cvResponse = cv.toJSON();

    return NextResponse.json({
      success: true,
      message: 'CV data retrieved successfully',
      data: {
        cv: cvResponse
      }
    });

  } catch (error: any) {
    console.error('Get CV data error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
} 