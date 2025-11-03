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
      hasData: !!sourceCV.data // Legacy field check
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

    // Create the duplicated CV
    const duplicatedCV = new CV({
      userId: toObjectId(userId),
      title: uniqueTitle,
      cvData: sourceCV.cvData, // Copy the CV data (JSON Resume format)
      data: sourceCV.data, // Also copy legacy data field for compatibility
      status: 'draft',
      isMaster: false, // Duplicated CVs are never master CVs
      journeyId: journeyId ? toObjectId(journeyId) : null, // Link to journey if provided
      templateId: sourceCV.templateId,
      templateName: sourceCV.templateName,
      templateData: sourceCV.templateData,
      styling: sourceCV.styling,
      metadata: {
        ...sourceCV.metadata,
        isMaster: false, // Ensure duplicated CVs are never master CVs
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
    console.log('✅ CV Duplicate API - CV duplicated successfully:', {
      newCvId: savedCV._id,
      title: savedCV.title,
      hasCvData: !!savedCV.cvData,
      cvDataKeys: savedCV.cvData ? Object.keys(savedCV.cvData) : [],
      hasData: !!savedCV.data,
      dataKeys: savedCV.data ? Object.keys(savedCV.data) : []
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
