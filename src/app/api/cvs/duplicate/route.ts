import { NextRequest, NextResponse } from 'next/server';
import { CV } from '@/models';
import { toObjectId } from '@/lib/db-utils';
import { isValidObjectId } from '@/lib/firebase-uid-utils';
import { createWithFirebaseUid } from '@/lib/firebase-uid-utils';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 CV Duplicate API - Starting duplication request');
    
    // Ensure database connection
    const connectDB = (await import('@/lib/database')).default;
    await connectDB();
    console.log('✅ CV Duplicate API - Database connected');
    
    const body = await request.json();
    const { sourceCvId, userId, jobId, journeyId, customTitle } = body;

    console.log('🔍 CV Duplicate API - Request data:', {
      sourceCvId,
      userId,
      jobId,
      journeyId,
      customTitle
    });

    if (!sourceCvId || !userId) {
      console.error('❌ CV Duplicate API - Missing required fields:', {
        hasSourceCvId: !!sourceCvId,
        hasUserId: !!userId,
        sourceCvId,
        userId
      });
      return NextResponse.json(
        { error: 'Source CV ID and User ID are required' },
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

    // Verify the CV belongs to the user (handle both MongoDB ObjectId and Firebase UID)
    const isFirebaseUser = !isValidObjectId(userId);
    let userOwnsCV = false;
    
    console.log('🔍 CV Duplicate API - User ownership check:', {
      userId,
      isFirebaseUser,
      sourceCVUserId: sourceCV.userId,
      sourceCVFirebaseUid: sourceCV.firebaseUid
    });
    
    if (isFirebaseUser) {
      // For Firebase users, check firebaseUid field
      userOwnsCV = String(sourceCV.firebaseUid) === String(userId);
      console.log('🔍 CV Duplicate API - Firebase user check:', {
        sourceCVFirebaseUid: String(sourceCV.firebaseUid),
        userId: String(userId),
        match: userOwnsCV
      });
    } else {
      // For MongoDB users, check userId field
      userOwnsCV = String(sourceCV.userId) === String(userId);
      console.log('🔍 CV Duplicate API - MongoDB user check:', {
        sourceCVUserId: String(sourceCV.userId),
        userId: String(userId),
        match: userOwnsCV
      });
    }
    
    if (!userOwnsCV) {
      console.error('❌ CV Duplicate API - User does not own CV:', {
        userId,
        sourceCVUserId: sourceCV.userId,
        sourceCVFirebaseUid: sourceCV.firebaseUid,
        isFirebaseUser
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
    const generateUniqueTitle = async (baseTitle: string, userId: string, isFirebaseUser: boolean) => {
      let finalTitle = baseTitle;
      let counter = 1;
      
      // Check for existing CVs with the same title
      while (true) {
        const query = isFirebaseUser 
          ? { firebaseUid: userId, title: finalTitle }
          : { userId: toObjectId(userId), title: finalTitle };
          
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
      userId,
      isFirebaseUser
    );

    // Create the duplicated CV based on user type
    let savedCV;
    
    if (isFirebaseUser) {
      // For Firebase users, use createWithFirebaseUid helper
      const duplicatedCVData = {
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
        }
      };
      
      // Get the MongoDB userId from the source CV
      const mongoUserId = sourceCV.userId?.toString() || new mongoose.Types.ObjectId().toString();
      
      savedCV = await createWithFirebaseUid(
        CV,
        duplicatedCVData,
        mongoUserId,
        userId // Firebase UID
      );
    } else {
      // For MongoDB users, create directly
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
      savedCV = await duplicatedCV.save();
    }
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
        await ApplicationJourney.findOneAndUpdate(
          { 
            _id: toObjectId(journeyId),
            userId: toObjectId(userId),
            jobId: toObjectId(jobId)
          },
          { 
            cvId: savedCV._id,
            currentStep: 2, // CV step completed
            status: 'in-progress',
            'metadata.updatedAt': new Date()
          }
        );
        console.log('✅ CV Duplicate API - Journey updated with new CV');
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
