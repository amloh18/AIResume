import { NextRequest, NextResponse } from 'next/server';
import { CV } from '@/models';
import { toObjectId } from '@/lib/db-utils';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 CV Duplicate API - Starting duplication request');
    const body = await request.json();
    const { sourceCvId, userId, jobId, journeyId } = body;

    console.log('🔍 CV Duplicate API - Request data:', {
      sourceCvId,
      userId,
      jobId,
      journeyId
    });

    if (!sourceCvId || !userId) {
      return NextResponse.json(
        { error: 'Source CV ID and User ID are required' },
        { status: 400 }
      );
    }

    // Find the source CV
    const sourceCV = await CV.findById(sourceCvId);
    if (!sourceCV) {
      return NextResponse.json(
        { error: 'Source CV not found' },
        { status: 404 }
      );
    }

    // Verify the CV belongs to the user
    if (String(sourceCV.userId) !== String(userId)) {
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

    // Create the duplicated CV
    const duplicatedCV = new CV({
      userId: toObjectId(userId),
      title: `${sourceCV.title} (Copy)`,
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
        const { CVJourney } = await import('@/models');
        await CVJourney.findOneAndUpdate(
          { 
            _id: toObjectId(journeyId),
            userId: toObjectId(userId),
            jobId: toObjectId(jobId)
          },
          { 
            cvId: savedCV._id,
            currentStep: 3,
            status: 'cv-created',
            updatedAt: new Date()
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
      cvId: savedCV._id,
      title: savedCV.title,
      message: 'CV duplicated successfully'
    });

  } catch (error) {
    console.error('❌ CV Duplicate API - Error:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate CV' },
      { status: 500 }
    );
  }
}
