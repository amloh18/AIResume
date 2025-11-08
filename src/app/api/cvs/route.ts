import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { CV, Template } from '@/models';
import { createPaginationOptions, paginateQuery, createErrorResponse } from '@/lib/db-utils';
import { UnifiedCVAPIResponse, UnifiedCVDocument, UnifiedCVRequest } from '@/types/unified-cv-schema';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { getTemplateById, isHardcodedTemplate } from '@/lib/templates/template-utils';
import { HARDCODED_TEMPLATES } from '@/lib/templates/hardcoded-templates';
import mongoose from 'mongoose';
import usageLimitsService from '@/lib/services/usageLimitsService';

// GET - List CVs for a user with comprehensive filtering
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 CV API - Starting GET request');

    // Ensure database is connected first
    await getConnection();
    console.log('🔍 CV API - Database connected');

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
    
    // Validate userId
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      console.error('❌ CV API - Invalid userId:', userId);
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'cv' or 'cover'
    const status = searchParams.get('status');
    const sort = searchParams.get('sort') || 'updatedAt';
    const limit = searchParams.get('limit');
    const projection = searchParams.get('projection') || 'full';
    const starred = searchParams.get('starred');
    const published = searchParams.get('published');
    const searchTerm = searchParams.get('search');
    const journeyId = searchParams.get('journeyId'); // Filter by journeyId

    // Build query conditions
    let baseQuery: Record<string, any> = {
      userId: new mongoose.Types.ObjectId(userId)
    };
    
    // Add journeyId filter if provided
    if (journeyId && mongoose.Types.ObjectId.isValid(journeyId)) {
      baseQuery.journeyId = new mongoose.Types.ObjectId(journeyId);
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
    // Note: For summary projection, we'll populate templateId after query execution
    // to avoid CastError when templateId is a string (hardcoded templates)

    // Execute query
    console.log('🔍 CV API - Executing database query');
    const cvs = await query.lean();
    
    // For summary projection, populate ObjectId templateIds only
    if (projection === 'summary') {
      // Separate CVs with ObjectId templateIds from those with string templateIds
      const objectIdTemplateIds = cvs
        .filter(cv => cv.templateId && mongoose.Types.ObjectId.isValid(cv.templateId))
        .map(cv => new mongoose.Types.ObjectId(cv.templateId));
      
      if (objectIdTemplateIds.length > 0) {
        // Fetch templates for ObjectId templateIds
        const templates = await Template.find({
          _id: { $in: objectIdTemplateIds }
        }).select('name globalStyles availableSections').lean();
        
        // Create a map for quick lookup
        const templateMap = new Map(
          templates.map((t: any) => [t._id.toString(), t])
        );
        
        // Populate templateId in CVs that have ObjectId templateIds
        cvs.forEach(cv => {
          if (cv.templateId && mongoose.Types.ObjectId.isValid(cv.templateId)) {
            const templateIdStr = cv.templateId.toString();
            if (templateMap.has(templateIdStr)) {
              cv.templateId = templateMap.get(templateIdStr);
            }
          }
        });
      }
    }
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
        userId: cv.userId
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
          templateData: cv.templateData, // Include saved template data
          template: cv.templateData || (isHardcodedTemplate(cv.templateId?.toString() || '') 
            ? getTemplateById(cv.templateId?.toString() || '') 
            : cv.templateId), // Use saved templateData if available
          styling: cv.styling
        }),
        ...(projection === 'summary' && {
          cvData: cv.cvData,
          templateId: cv.templateId,
          templateName: cv.templateName,
          templateData: cv.templateData, // Include saved template data
          template: cv.templateData || (isHardcodedTemplate(cv.templateId?.toString() || '') 
            ? getTemplateById(cv.templateId?.toString() || '') 
            : cv.templateId) // Use saved templateData if available
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
      id: String(cv.id),
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
    console.error('❌ Get CVs error:', error);
    console.error('❌ Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      cause: error?.cause
    });
    
    // More detailed error logging
    if (error instanceof mongoose.Error) {
      console.error('❌ Mongoose error:', error.message);
    }
    if (error instanceof Error) {
      console.error('❌ Error stack:', error.stack);
    }
    
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

    await getConnection();
    console.log('🚀 CV POST API - Database connected');

    // Use new authentication system
    const authResult = await getAuthenticatedUser();
    
    if (!authResult) {
      console.log('❌ CV POST API - No valid authentication found');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = authResult.userId;
    console.log('🔍 CV POST API - Using authenticated user:', authResult.userEmail);

    // Note: Credit check removed - CV creation is unlimited
    // Master CV can be created/edited unlimited times
    // Journey CVs are auto-created with job (credit already spent at job creation)

    const body = await request.json();
    console.log('🚀 CV POST API - Request body received');

    // Extract CV data from request
    const {
      title, 
      templateId,
      cvData, 
      status, 
      isMaster,
      journeyId,
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

    // Check if trying to create Master CV - limit to 1 per user
    const isCreatingMasterCV = isMaster === true || 
                                isMaster === 'true' || 
                                metadata?.isMaster === true || 
                                metadata?.isMaster === 'true';

    if (isCreatingMasterCV) {
      // Check if Master CV already exists
      const existingMasterCV = await CV.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        $or: [
          { 'metadata.isMaster': true },
          { 'metadata.isMaster': 'true' },
          { isMaster: true },
          { isMaster: 'true' }
        ]
      });

      if (existingMasterCV) {
        console.log('❌ CV POST API - Master CV already exists for user');
        return NextResponse.json(
          { 
            success: false, 
            error: 'Master CV already exists. You can only have one Master CV. Please edit your existing Master CV instead.',
            existingMasterCVId: existingMasterCV._id.toString()
          },
          { status: 409 } // 409 Conflict
        );
      }
    }

    // Ensure templateId is provided or get default template (Executive Professional)
    let finalTemplateId = templateId;
    if (!finalTemplateId) {
      // Use Executive Professional as default template
      const { HARDCODED_TEMPLATES } = await import('@/lib/templates/hardcoded-templates');
      const executiveProfessional = HARDCODED_TEMPLATES.find(
        t => t.id === 'executive-professional-layout-template' || t.name === 'Executive Professional'
      );
      
      if (executiveProfessional) {
        finalTemplateId = executiveProfessional.id || executiveProfessional._id;
        console.log('✅ CV POST API - Using Executive Professional as default template');
      } else {
        // Fallback to any default template
        const hardcodedDefault = HARDCODED_TEMPLATES.find(
          t => t.isDefault === true && t.category === 'cv'
        );
        
        if (hardcodedDefault) {
          finalTemplateId = hardcodedDefault.id || hardcodedDefault._id;
          console.log('✅ CV POST API - Using hardcoded default template:', hardcodedDefault.name);
        } else {
          // Fallback to database
          const defaultTemplate = await Template.findOne({ isDefault: true, category: 'cv' });
          if (!defaultTemplate) {
            console.log('❌ CV POST API - No default template found');
            return NextResponse.json(
              { success: false, error: 'No template specified and no default template available' },
              { status: 400 }
            );
          }
          finalTemplateId = defaultTemplate._id;
          console.log('🔍 CV POST API - Using database default template:', defaultTemplate.name);
        }
      }
    }

    // Validate template exists (check hardcoded templates first)
    const hardcodedTemplate = HARDCODED_TEMPLATES.find(t => t.id === finalTemplateId || t._id === finalTemplateId);

    if (!hardcodedTemplate) {
      const template = await Template.findById(finalTemplateId);
      if (!template) {
        console.log('❌ CV POST API - Template not found:', finalTemplateId);
        return NextResponse.json(
          { success: false, error: 'Template not found' },
          { status: 400 }
        );
      }
    } else {
      console.log('✅ CV POST API - Using hardcoded template:', hardcodedTemplate.name);
    }

    // Check if CV already exists for this journey to prevent duplicates
    if (journeyId) {
      const existingCV = await CV.findOne({
        journeyId: journeyId,
        userId: new mongoose.Types.ObjectId(userId)
      });
      
      if (existingCV) {
        console.log('✅ CV POST API - Found existing CV for journey:', existingCV._id);
        return NextResponse.json({
          success: true,
          cv: {
            id: existingCV._id,
            title: existingCV.title,
            status: existingCV.status,
            templateId: existingCV.templateId,
            journeyId: existingCV.journeyId,
            createdAt: existingCV.createdAt,
            updatedAt: existingCV.updatedAt
          }
        }, { status: 200 });
      }
    }

    // Get template name for storage
    let templateName = '';
    if (hardcodedTemplate) {
      templateName = hardcodedTemplate.name || '';
    } else if (finalTemplateId) {
      const template = await Template.findById(finalTemplateId);
      if (template) {
        templateName = template.name || '';
      }
    }

    // Prepare CV data for creation (clean schema - no styling data)
    const cvDataToCreate = {
      title,
      templateId: finalTemplateId,
      templateName: templateName,
      cvData,
      status: status || 'draft',
      isMaster: isMaster || false,
      journeyId: journeyId || undefined, // Store journeyId if provided
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
      userId,
      journeyId: cvDataToCreate.journeyId
    });

    // Create CV directly with MongoDB userId
    const newCV = new CV({
      userId: new mongoose.Types.ObjectId(userId),
      ...cvDataToCreate,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newCV.save();

    // Note: Credit spending removed - CV creation is unlimited
    // Credits are only spent at job creation

    // Save CV with template to S3 as backup
    try {
      // Get template data if available
      let templateData = null;
      if (finalTemplateId) {
        const { HARDCODED_TEMPLATES } = await import('@/lib/templates/hardcoded-templates');
        const hardcodedTemplate = HARDCODED_TEMPLATES.find(t => t.id === finalTemplateId || t._id === finalTemplateId);
        if (hardcodedTemplate) {
          templateData = hardcodedTemplate;
        } else {
          const template = await Template.findById(finalTemplateId);
          if (template) {
            templateData = template.toJSON();
          }
        }
      }
      
      const { CVS3Service } = await import('@/lib/services/cvS3Service');
      const s3Url = await CVS3Service.saveCVToS3(
        newCV._id.toString(),
        userId,
        newCV.cvData,
        templateData
      );
      
      if (s3Url) {
        // Store S3 URL in metadata
        if (!newCV.metadata) {
          newCV.metadata = {} as any;
        }
        (newCV.metadata as any).s3BackupUrl = s3Url;
        (newCV.metadata as any).s3BackupSavedAt = new Date();
        await newCV.save();
        console.log('✅ CV POST API - CV saved to S3:', s3Url);
      }
    } catch (s3Error) {
      console.warn('⚠️ CV POST API - Failed to save CV to S3 (non-critical):', s3Error);
      // Continue - S3 backup is non-critical
    }

    // Note: Thumbnail generation moved to studio exit for better performance

    console.log('✅ CV POST API - CV saved successfully:', {
      id: newCV._id,
      userId: newCV.userId,
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
