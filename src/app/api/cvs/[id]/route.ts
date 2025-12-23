import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import getConnection from '@/lib/database';
import { CV, Template } from '@/models';
import { toObjectId, createErrorResponse } from '@/lib/db-utils';
import { getCVWithTemplate } from '@/lib/cv-template-utils';
import mongoose from 'mongoose';
import { ApplicationJourney } from '@/models/ApplicationJourney';
import JobApplication from '@/models/JobApplication';

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
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await getConnection();

    const { id } = await params;
    const cvId = toObjectId(id);

    // Build query using session user ID
    const query: Record<string, any> = {
      _id: cvId,
      userId: new mongoose.Types.ObjectId(session.user.id)
    };

    // First, find the CV with user ownership check
    const cvDoc = await CV.findOne(query);

    if (!cvDoc) {
      return NextResponse.json(
        { success: false, error: 'CV not found' },
        { status: 404 }
      );
    }

    // Use utility function to get CV with template data
    const cv = await getCVWithTemplate(id);

    if (!cv) {
      return NextResponse.json(
        { success: false, error: 'CV not found' },
        { status: 404 }
      );
    }

    // Load job data if CV has a journeyId
    let jobData = null;
    if (cvDoc.journeyId && !cvDoc.metadata?.isMaster) {
      try {
        // Load journey data
        const journeyId = typeof cvDoc.journeyId === 'string'
          ? cvDoc.journeyId
          : cvDoc.journeyId.toString();

        // Try finding journey by journeyId first, then by cvId as fallback
        let foundJourney = await ApplicationJourney.findOne({
          _id: journeyId,
          userId: session.user.id
        }).lean();

        if (!foundJourney) {
          // Fallback: try finding by cvId
          foundJourney = await ApplicationJourney.findOne({
            cvId: cvId.toString(),
            userId: session.user.id
          }).lean();
        }

        if (foundJourney && foundJourney.jobId) {
          const jobResult = await Promise.allSettled([
            JobApplication.findOne({
              _id: foundJourney.jobId,
              userId: new mongoose.Types.ObjectId(session.user.id)
            }).lean()
          ]);

          if (jobResult[0].status === 'fulfilled' && jobResult[0].value) {
            const jobDoc = jobResult[0].value as any;
            jobData = {
              id: jobDoc._id.toString(),
              _id: jobDoc._id.toString(),
              jobTitle: jobDoc.jobTitle,
              company: jobDoc.company,
              jobDescription: jobDoc.jobDescription,
              location: jobDoc.location,
              status: jobDoc.status,
              salary: jobDoc.salary,
              deadline: jobDoc.deadline,
              jobUrl: jobDoc.jobUrl,
              sponsorship: jobDoc.sponsorship,
              priority: jobDoc.priority,
              notes: jobDoc.notes,
              tags: jobDoc.tags || [],
              createdAt: jobDoc.createdAt,
              updatedAt: jobDoc.updatedAt
            };
          }
        }
      } catch (error) {
        console.error('❌ CV GET API - Error loading job data:', error);
        // Don't fail the request if job loading fails - just log the error
      }
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

    // Ensure journeyId and cvType are included in response (from cvDoc, the source of truth)
    // Also ensure id field is present (maps from _id)
    const responseCv = {
      ...cv,
      id: cv._id || cvDoc._id.toString(), // Ensure id field is present
      journeyId: cvDoc.journeyId ? (typeof cvDoc.journeyId === 'string' ? cvDoc.journeyId : cvDoc.journeyId.toString()) : undefined,
      cvType: cvDoc.cvType || (cvDoc.metadata?.isMaster ? 'master' : cvDoc.journeyId ? 'journey' : 'standalone'),
      jobData: jobData
    };

    return NextResponse.json({
      success: true,
      data: {
        cv: responseCv
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

    // CONFLICT DETECTION: Check if CV was modified since client last fetched it
    const clientUpdatedAt = body.updatedAt ? new Date(body.updatedAt) : null;
    const serverUpdatedAt = cv.updatedAt || cv.metadata?.lastModified || new Date(cv.createdAt);

    if (clientUpdatedAt && serverUpdatedAt > clientUpdatedAt) {
      console.log('⚠️ CV UPDATE API - Conflict detected:', {
        clientUpdatedAt: clientUpdatedAt.toISOString(),
        serverUpdatedAt: serverUpdatedAt.toISOString()
      });

      // Return conflict response with both versions
      return NextResponse.json(
        {
          success: false,
          error: 'Conflict',
          conflict: true,
          message: 'This CV was modified by another session. Please resolve the conflict.',
          serverVersion: {
            id: cv._id.toString(),
            title: cv.title,
            cvData: cv.cvData,
            templateId: cv.templateId?.toString(),
            version: cv.version,
            updatedAt: serverUpdatedAt.toISOString(),
            metadata: cv.metadata
          },
          clientVersion: {
            id: body.id || id,
            title: body.title,
            cvData: body.cvData,
            templateId: body.templateId,
            version: body.version || cv.version,
            updatedAt: clientUpdatedAt.toISOString(),
            metadata: body.metadata
          }
        },
        { status: 409 }
      );
    }

    // Prepare update data (excluding legacy fields)
    const allowedFields = [
      'title', 'cvData', 'templateId', 'cvType', 'status', 'isMaster', 'metadata', 'journeyId'
    ];

    const updateData: Record<string, any> = {};

    // Avoid overwriting existing nested metadata fields with `undefined` during merges
    const removeUndefinedKeys = (obj: Record<string, any>) =>
      Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

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
        } else if (field === 'metadata') {
          // CRITICAL: Merge metadata instead of replacing it to preserve master CV status
          const incomingMetadata =
            body[field] && typeof body[field] === 'object' ? removeUndefinedKeys(body[field]) : {};

          // CRITICAL: Remove surgeonAnalysis if it's undefined, null, or not a valid object
          // This prevents Mongoose validation errors when converting standalone to journey CVs
          if ('surgeonAnalysis' in incomingMetadata) {
            const surgeonAnalysis = incomingMetadata.surgeonAnalysis;
            // Check for invalid values: undefined, null, string "undefined", empty object, or non-object types
            const isValidSurgeonAnalysis = surgeonAnalysis !== undefined &&
              surgeonAnalysis !== null &&
              surgeonAnalysis !== 'undefined' &&
              typeof surgeonAnalysis === 'object' &&
              surgeonAnalysis !== null &&
              Object.keys(surgeonAnalysis).length > 0;

            if (!isValidSurgeonAnalysis) {
              console.log('⚠️ CV UPDATE API - Removing invalid surgeonAnalysis from incoming metadata:', {
                type: typeof surgeonAnalysis,
                value: surgeonAnalysis
              });
              delete (incomingMetadata as any).surgeonAnalysis;
            }
          }

          // CRITICAL: Clean existing CV metadata before merging to remove any undefined surgeonAnalysis
          // This prevents Mongoose validation errors when Object.assign is called
          const existingMetadata = cv.metadata ? { ...(cv.metadata as any) } : {};

          // Remove invalid surgeonAnalysis from existing metadata before merge
          if ('surgeonAnalysis' in existingMetadata) {
            const existingSurgeonAnalysis = existingMetadata.surgeonAnalysis;
            const isValidExisting = existingSurgeonAnalysis !== undefined &&
              existingSurgeonAnalysis !== null &&
              existingSurgeonAnalysis !== 'undefined' &&
              typeof existingSurgeonAnalysis === 'object' &&
              existingSurgeonAnalysis !== null &&
              Object.keys(existingSurgeonAnalysis).length > 0;

            if (!isValidExisting) {
              console.log('⚠️ CV UPDATE API - Removing invalid surgeonAnalysis from existing CV metadata:', {
                type: typeof existingSurgeonAnalysis,
                value: existingSurgeonAnalysis
              });
              delete existingMetadata.surgeonAnalysis;
            }
          }

          // Merge metadata, preserving existing surgeonAnalysis if incoming doesn't have a valid one
          const mergedMetadata = {
            ...existingMetadata,
            ...incomingMetadata
          };

          // Final cleanup: ensure surgeonAnalysis is either a valid object or doesn't exist
          const finalSurgeonAnalysis = mergedMetadata.surgeonAnalysis;
          const isValidFinalSurgeonAnalysis = finalSurgeonAnalysis !== undefined &&
            finalSurgeonAnalysis !== null &&
            finalSurgeonAnalysis !== 'undefined' &&
            typeof finalSurgeonAnalysis === 'object' &&
            finalSurgeonAnalysis !== null &&
            Object.keys(finalSurgeonAnalysis).length > 0;

          if (!isValidFinalSurgeonAnalysis && 'surgeonAnalysis' in mergedMetadata) {
            console.log('⚠️ CV UPDATE API - Removing invalid surgeonAnalysis from merged metadata:', {
              type: typeof finalSurgeonAnalysis,
              value: finalSurgeonAnalysis
            });
            delete mergedMetadata.surgeonAnalysis;
          }

          updateData[field] = mergedMetadata;
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

    // ENFORCE CV TYPE CONSISTENCY
    // If explicitly setting cvType to 'journey', ensure isMaster is false
    if (updateData.cvType === 'journey') {
      console.log('🔄 CV UPDATE API - Converting to Journey CV, removing Master status');
      if (!updateData.metadata) {
        updateData.metadata = { ...cv.metadata };
      }
      updateData.metadata.isMaster = false;
      updateData.isMaster = false; // Legacy root field
    }
    // If explicitly setting cvType to 'master', ensure journeyId is removed
    else if (updateData.cvType === 'master' || updateData.metadata?.isMaster === true) {
      console.log('🔄 CV UPDATE API - Enforcing Master CV, removing Journey link');
      updateData.journeyId = null; // Unset journeyId
      if (!updateData.metadata) {
        updateData.metadata = { ...cv.metadata };
      }
      updateData.metadata.isMaster = true;
    }
    const isCurrentlyMasterCV = cv.metadata?.isMaster === true ||
      cv.metadata?.isMaster === 'true' ||
      cv.isMaster === true ||
      cv.isMaster === 'true';

    // Handle metadata updates properly
    if (body.isMaster !== undefined) {
      // If isMaster is provided at root level, update metadata
      if (!updateData.metadata) {
        updateData.metadata = { ...cv.metadata };
      }
      updateData.metadata.isMaster = body.isMaster;
    } else if (body.metadata?.isMaster !== undefined) {
      // If isMaster is provided in metadata object, use that
      if (!updateData.metadata) {
        updateData.metadata = { ...cv.metadata };
      }
      updateData.metadata.isMaster = body.metadata.isMaster;
    } else {
      // CRITICAL FIX: Preserve master CV status if not being changed
      // If CV is currently a master CV and no isMaster flag is provided, preserve it
      if (isCurrentlyMasterCV) {
        if (!updateData.metadata) {
          updateData.metadata = { ...cv.metadata };
        }
        // Ensure isMaster is preserved - check both merged metadata and existing metadata
        const mergedIsMaster = updateData.metadata.isMaster;
        const existingIsMaster = cv.metadata?.isMaster;
        if (mergedIsMaster === undefined && existingIsMaster === undefined) {
          // If somehow both are undefined but CV is master, set it explicitly
          updateData.metadata.isMaster = true;
        } else if (mergedIsMaster === undefined && (existingIsMaster === true || existingIsMaster === 'true')) {
          // If merged doesn't have it but existing does, preserve it
          updateData.metadata.isMaster = true;
        }
      }
    }

    // Update metadata.lastModified
    if (!updateData.metadata) {
      updateData.metadata = { ...cv.metadata };
    }
    updateData.metadata.lastModified = new Date();

    // Guard: never save metadata.surgeonAnalysis as undefined, null, or invalid values (can trigger schema cast issues)
    // This is critical when converting standalone CVs to journey CVs
    if (updateData.metadata && 'surgeonAnalysis' in updateData.metadata) {
      const surgeonAnalysis = updateData.metadata.surgeonAnalysis;
      const isValidSurgeonAnalysis = surgeonAnalysis !== undefined &&
        surgeonAnalysis !== null &&
        surgeonAnalysis !== 'undefined' &&
        typeof surgeonAnalysis === 'object' &&
        surgeonAnalysis !== null &&
        Object.keys(surgeonAnalysis).length > 0;

      if (!isValidSurgeonAnalysis) {
        console.log('⚠️ CV UPDATE API - Removing invalid surgeonAnalysis from updateData.metadata:', {
          type: typeof surgeonAnalysis,
          value: surgeonAnalysis
        });
        delete updateData.metadata.surgeonAnalysis;
      }
    }

    // Final safety check: if CV was a master CV, ensure it stays that way unless explicitly changed
    if (isCurrentlyMasterCV && updateData.metadata.isMaster !== false && updateData.metadata.isMaster !== 'false') {
      updateData.metadata.isMaster = true;
    }

    console.log('🔍 CV UPDATE API - Updating CV with data:', Object.keys(updateData));
    console.log('🔍 CV UPDATE API - Update data values:', updateData);

    // CRITICAL: Final cleanup of updateData.metadata.surgeonAnalysis before Object.assign
    // Ensure it's completely removed if invalid to prevent Mongoose cast errors
    if (updateData.metadata && 'surgeonAnalysis' in updateData.metadata) {
      const surgeonAnalysis = updateData.metadata.surgeonAnalysis;
      const isValidSurgeonAnalysis = surgeonAnalysis !== undefined &&
        surgeonAnalysis !== null &&
        surgeonAnalysis !== 'undefined' &&
        typeof surgeonAnalysis === 'object' &&
        surgeonAnalysis !== null &&
        Object.keys(surgeonAnalysis).length > 0;

      if (!isValidSurgeonAnalysis) {
        console.log('⚠️ CV UPDATE API - Final cleanup: Removing invalid surgeonAnalysis from updateData.metadata:', {
          type: typeof surgeonAnalysis,
          value: surgeonAnalysis
        });
        delete updateData.metadata.surgeonAnalysis;
      }
    }

    // CRITICAL: Use Mongoose updateOne with $set/$unset to avoid setter validation issues
    // Object.assign triggers Mongoose setters which can cause validation errors with undefined values
    const mongoUpdate: any = { $set: {} };
    const mongoUnset: any = { $unset: {} };

    // Build $set operations
    for (const [key, value] of Object.entries(updateData)) {
      if (key === 'metadata') {
        // Handle metadata specially - ensure surgeonAnalysis is valid or removed
        const cleanMetadata = { ...value };

        // Remove invalid surgeonAnalysis from metadata before setting
        if ('surgeonAnalysis' in cleanMetadata) {
          const surgeonAnalysis = cleanMetadata.surgeonAnalysis;
          const isValidSurgeonAnalysis = surgeonAnalysis !== undefined &&
            surgeonAnalysis !== null &&
            surgeonAnalysis !== 'undefined' &&
            typeof surgeonAnalysis === 'object' &&
            surgeonAnalysis !== null &&
            Object.keys(surgeonAnalysis).length > 0;

          if (!isValidSurgeonAnalysis) {
            console.log('⚠️ CV UPDATE API - Removing invalid surgeonAnalysis before MongoDB update:', {
              type: typeof surgeonAnalysis,
              value: surgeonAnalysis
            });
            delete cleanMetadata.surgeonAnalysis;
            // If surgeonAnalysis exists in existing CV and is invalid, unset it
            if (cv.metadata && 'surgeonAnalysis' in cv.metadata) {
              const existingSurgeonAnalysis = (cv.metadata as any).surgeonAnalysis;
              const isValidExisting = existingSurgeonAnalysis !== undefined &&
                existingSurgeonAnalysis !== null &&
                existingSurgeonAnalysis !== 'undefined' &&
                typeof existingSurgeonAnalysis === 'object' &&
                existingSurgeonAnalysis !== null &&
                Object.keys(existingSurgeonAnalysis).length > 0;
              if (!isValidExisting) {
                mongoUnset.$unset['metadata.surgeonAnalysis'] = '';
              }
            }
          }
        }

        mongoUpdate.$set.metadata = cleanMetadata;
      } else {
        mongoUpdate.$set[key] = value;
      }
    }

    // Perform MongoDB update
    const updateOperations: any = { $set: mongoUpdate.$set };
    if (Object.keys(mongoUnset.$unset).length > 0) {
      updateOperations.$unset = mongoUnset.$unset;
    }

    await CV.updateOne(
      { _id: cvId, userId: new mongoose.Types.ObjectId(session.user.id) },
      updateOperations
    );

    // Reload the CV document to get updated data
    const updatedCVDoc = await CV.findById(cvId);
    if (!updatedCVDoc) {
      return NextResponse.json(
        { success: false, error: 'CV not found after update' },
        { status: 404 }
      );
    }

    // Update cv properties from reloaded document for subsequent operations
    // We update properties individually to avoid Object.assign issues with Mongoose documents
    cv.title = updatedCVDoc.title;
    cv.cvData = updatedCVDoc.cvData;
    cv.templateId = updatedCVDoc.templateId;
    cv.cvType = updatedCVDoc.cvType;
    cv.status = updatedCVDoc.status;
    cv.metadata = updatedCVDoc.metadata;
    cv.journeyId = updatedCVDoc.journeyId;
    cv.updatedAt = updatedCVDoc.updatedAt;

    // Link CV to journey if journeyId is provided (for journey mode)
    if (body.journeyId && cv._id) {
      try {
        const { ApplicationJourneyRelationshipService } = await import('@/lib/services/cvJourneyRelationshipService');
        const linked = await ApplicationJourneyRelationshipService.linkCVToJourney(
          body.journeyId,
          cv._id.toString()
        );
        if (linked) {
          console.log('✅ CV UPDATE API - CV linked to journey:', { journeyId: body.journeyId, cvId: cv._id.toString() });
        } else {
          console.warn('⚠️ CV UPDATE API - Failed to link CV to journey:', { journeyId: body.journeyId, cvId: cv._id.toString() });
        }
      } catch (linkError) {
        console.error('❌ CV UPDATE API - Error linking CV to journey:', linkError);
        // Don't fail the save if linking fails - log and continue
      }
    }

    // Log CV update activity
    try {
      const { ActivityLogService } = await import('@/lib/services/activityLogService');
      await ActivityLogService.logUserAction({
        userId: session.user.id,
        userEmail: session.user.email,
        action: 'cv_updated',
        resourceType: 'cv',
        resourceId: cv._id.toString(),
        resourceName: cv.title,
        status: 'success',
        metadata: {
          templateId: cv.templateId?.toString(),
          status: cv.status
        }
      });
    } catch (logError) {
      console.error('Failed to log CV update:', logError);
      // Don't fail the request if logging fails
    }

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

    // Store CV info before deletion for logging
    const cvTitle = cv.title;
    const cvTemplateId = cv.templateId?.toString();

    await CV.deleteOne({ _id: cvId });
    console.log('✅ CV DELETE API - CV deleted successfully');

    // Log CV deletion activity
    try {
      const { ActivityLogService } = await import('@/lib/services/activityLogService');
      await ActivityLogService.logUserAction({
        userId: session.user.id,
        userEmail: session.user.email,
        action: 'cv_deleted',
        resourceType: 'cv',
        resourceId: cvId.toString(),
        resourceName: cvTitle,
        status: 'success',
        metadata: {
          templateId: cvTemplateId
        }
      });
    } catch (logError) {
      console.error('Failed to log CV deletion:', logError);
      // Don't fail the request if logging fails
    }

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
