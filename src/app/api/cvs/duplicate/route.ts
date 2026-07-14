import { NextRequest, NextResponse } from 'next/server';
import { CV } from '@/models';
import { toObjectId } from '@/lib/db-utils';
import { getConnection } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 CV Duplicate API - Starting duplication request');

    // Ensure database connection
    await getConnection();
    console.log('✅ CV Duplicate API - Database connected');

    // Use new authentication system
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      console.log('❌ CV Duplicate API - No valid authentication found');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    console.log('🔍 CV Duplicate API - Using authenticated user:', authResult.userEmail);

    const body = await request.json();
    const { sourceCvId, jobId, journeyId, customTitle } = body;

    console.log('🔍 CV Duplicate API - Request data:', {
      sourceCvId,
      userId,
      jobId,
      journeyId,
      customTitle
    });

    if (!sourceCvId) {
      console.error('❌ CV Duplicate API - Missing required fields:', {
        hasSourceCvId: !!sourceCvId,
        sourceCvId
      });
      return NextResponse.json(
        { error: 'Source CV ID is required' },
        { status: 400 }
      );
    }

    // Find the source CV
    console.log('🔍 CV Duplicate API - Looking for source CV:', sourceCvId);
    console.log('🔍 CV Duplicate API - CV model available:', !!CV);

    const sourceCV = await CV.findById(sourceCvId);
    console.log('🔍 CV Duplicate API - CV query result:', {
      found: !!sourceCV,
      id: sourceCV?._id,
      title: sourceCV?.title
    });

    if (!sourceCV) {
      console.error('❌ CV Duplicate API - Source CV not found:', sourceCvId);
      return NextResponse.json(
        { error: 'Source CV not found' },
        { status: 404 }
      );
    }

    // Verify the CV belongs to the user
    const userOwnsCV = sourceCV.userId?.toString() === userId;

    console.log('🔍 CV Duplicate API - User ownership check:', {
      userId,
      sourceCVUserId: sourceCV.userId?.toString(),
      userOwnsCV
    });

    if (!userOwnsCV) {
      console.error('❌ CV Duplicate API - User does not own CV:', {
        userId,
        sourceCVUserId: sourceCV.userId?.toString()
      });
      return NextResponse.json(
        { error: 'Unauthorized access to CV' },
        { status: 403 }
      );
    }

    console.log('✅ CV Duplicate API - Source CV found:', {
      title: sourceCV.title,
      isMaster: sourceCV.isMaster,
      hasCvData: !!sourceCV.cvData,
      hasData: !!sourceCV.data, // Legacy field check
      hasStructure: !!(sourceCV.cvData?.structure),
      hasContent: !!(sourceCV.cvData?.content),
      templateId: sourceCV.templateId,
      templateName: sourceCV.templateName
    });

    // Generate unique title to avoid conflicts
    const generateUniqueTitle = async (baseTitle: string, userId: string) => {
      let finalTitle = baseTitle;
      let counter = 1;

      // Check for existing CVs with the same title
      while (true) {
        const query = {
          userId: toObjectId(userId),
          title: finalTitle
        };

        const existingCV = await CV.findOne(query);
        if (!existingCV) {
          break;
        }

        finalTitle = `${baseTitle} ${counter}`;
        counter++;
      }

      return finalTitle;
    };

    const uniqueTitle = await generateUniqueTitle(
      customTitle || `${sourceCV.title} (Copy)`,
      userId
    );

    // Deep copy cvData to preserve structure/content map
    // This ensures structure and content are properly preserved during duplication
    const duplicatedCvData = sourceCV.cvData ? JSON.parse(JSON.stringify(sourceCV.cvData)) : sourceCV.cvData;

    // Ensure structure and content are preserved
    if (duplicatedCvData && !duplicatedCvData.structure) {
      console.log('⚠️ CV Duplicate API - Source CV missing structure, will be initialized in studio');
    }

    // Set createdVia based on context:
    // - If journeyId is provided, set to 'journey' (duplicate is always a regular CV)
    // - Otherwise, preserve existing createdVia or leave undefined
    let createdVia: string | undefined;
    if (journeyId) {
      // CV duplicated in journey step 2 - always set createdVia to 'journey' for regular CVs
      createdVia = 'journey';
    } else if (sourceCV.metadata?.createdVia) {
      // Preserve existing createdVia if source has one (for non-journey duplications)
      createdVia = sourceCV.metadata.createdVia;
    }

    // Determine cvType for duplicated CV
    // If journeyId is provided, it's a journey CV
    // Otherwise, preserve source cvType or default to standalone
    let duplicatedCvType: 'master' | 'journey' | 'standalone' = 'standalone';
    if (journeyId) {
      duplicatedCvType = 'journey';
    } else if (sourceCV.cvType && ['master', 'journey', 'standalone'].includes(sourceCV.cvType)) {
      // Preserve source cvType, but never duplicate as master
      duplicatedCvType = sourceCV.cvType === 'master' ? 'standalone' : sourceCV.cvType;
    }

    // Check usage limits for free users creating standalone CVs
    if (duplicatedCvType === 'standalone') {
      const { default: User } = await import('@/models/User');
      const user = await User.findById(userId);
      const { isFreeTierPlan } = await import('@/lib/utils/subscription-helpers');

      if (user && isFreeTierPlan(user.currentPlanKey || 'free')) {
        const standaloneCount = await CV.countDocuments({
          userId: toObjectId(userId),
          cvType: 'standalone'
        });

        if (standaloneCount >= 1) {
          console.log('❌ CV Duplicate API - Free user already has standalone CV');
          return NextResponse.json(
            {
              success: false,
              error: 'Free users can only create 1 Standalone CV. Please upgrade to create more CVs.',
              requiresUpgrade: true
            },
            { status: 403 }
          );
        }
      }
    }

    // Clean and duplicate metadata to prevent Cast to Object validation errors
    const cleanMetadata = sourceCV.metadata 
      ? JSON.parse(JSON.stringify(sourceCV.metadata)) 
      : {};

    // Remove surgeonAnalysis if it is null, undefined, or empty to prevent CastError
    if ('surgeonAnalysis' in cleanMetadata) {
      const sa = cleanMetadata.surgeonAnalysis;
      const isValidSA = sa !== null && 
                        sa !== undefined && 
                        typeof sa === 'object' && 
                        Object.keys(sa).length > 0;
      if (!isValidSA) {
        delete cleanMetadata.surgeonAnalysis;
      }
    }

    // Remove analysisSnapshot if it is null, undefined, or empty to prevent CastError
    if ('analysisSnapshot' in cleanMetadata) {
      const asSnap = cleanMetadata.analysisSnapshot;
      const isValidAS = asSnap !== null && 
                        asSnap !== undefined && 
                        typeof asSnap === 'object' && 
                        Object.keys(asSnap).length > 0;
      if (!isValidAS) {
        delete cleanMetadata.analysisSnapshot;
      }
    }

    // Create the duplicated CV with deep copies to preserve all data
    const duplicatedCV = new CV({
      userId: toObjectId(userId),
      title: uniqueTitle,
      cvData: duplicatedCvData, // Deep copied to preserve structure/content map
      data: sourceCV.data ? JSON.parse(JSON.stringify(sourceCV.data)) : sourceCV.data, // Deep copy legacy data
      status: 'draft',
      isMaster: false, // Duplicated CVs are never master CVs
      cvType: duplicatedCvType, // Set cvType based on journeyId or source
      journeyId: journeyId ? toObjectId(journeyId) : null, // Link to journey if provided
      templateId: sourceCV.templateId,
      templateName: sourceCV.templateName,
      templateData: sourceCV.templateData ? JSON.parse(JSON.stringify(sourceCV.templateData)) : sourceCV.templateData, // Deep copy template data
      styling: sourceCV.styling ? JSON.parse(JSON.stringify(sourceCV.styling)) : sourceCV.styling, // Deep copy styling
      metadata: {
        ...cleanMetadata,
        isMaster: false, // Ensure duplicated CVs are never master CVs
        createdVia: createdVia, // Set createdVia for journey CVs
        lastModified: new Date(),
        createdFrom: sourceCV._id,
        viewCount: 0,
        downloadCount: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Save the duplicated CV
    const savedCV = await duplicatedCV.save();
    console.log('✅ CV Duplicate API - CV duplicated successfully with preserved structure:', {
      newCvId: savedCV._id,
      title: savedCV.title,
      hasCvData: !!savedCV.cvData,
      hasStructure: !!(savedCV.cvData?.structure),
      hasContent: !!(savedCV.cvData?.content),
      cvDataKeys: savedCV.cvData ? Object.keys(savedCV.cvData) : [],
      hasData: !!savedCV.data,
      dataKeys: savedCV.data ? Object.keys(savedCV.data) : [],
      templateId: savedCV.templateId,
      templateName: savedCV.templateName,
      hasTemplateData: !!savedCV.templateData
    });

    // If journeyId is provided, update the journey to link to the new CV
    if (journeyId && jobId) {
      try {
        const { ApplicationJourney } = await import('@/models');

        // Build query
        const journeyQuery: any = {
          _id: toObjectId(journeyId),
          jobId: toObjectId(jobId),
          userId: toObjectId(userId)
        };

        const updatedJourney = await ApplicationJourney.findOneAndUpdate(
          journeyQuery,
          {
            cvId: savedCV._id,
            currentStep: Math.max(2, await ApplicationJourney.findById(toObjectId(journeyId)).then(j => j?.currentStep || 2)),
            status: 'in-progress',
            'metadata.updatedAt': new Date()
          },
          { new: true }
        );

        if (updatedJourney) {
          console.log('✅ CV Duplicate API - Journey updated with new CV:', updatedJourney._id);
        } else {
          console.warn('⚠️ CV Duplicate API - Journey not found for update');
        }
      } catch (error) {
        console.error('⚠️ CV Duplicate API - Failed to update journey:', error);
        // Don't fail the request if journey update fails
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        cv: {
          id: savedCV._id,
          title: savedCV.title
        }
      },
      cvId: savedCV._id,
      title: savedCV.title,
      message: 'CV duplicated successfully'
    });

  } catch (error) {
    console.error('❌ CV Duplicate API - Error:', error);
    console.error('❌ CV Duplicate API - Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown'
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to duplicate CV',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}
