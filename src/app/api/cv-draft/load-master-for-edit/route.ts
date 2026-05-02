// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth-config';
import { getConnection } from '@/lib/database';
import CV from '@/models/CV';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - must be authenticated to edit master CV' },
        { status: 401 }
      );
    }

    await getConnection();

    const { searchParams } = new URL(request.url);
    const masterCVId = searchParams.get('masterCVId');

    // Fetch master CV - use masterCVId if provided, otherwise find by user
    let masterCV;
    if (masterCVId) {
      masterCV = await CV.findOne({
        _id: masterCVId,
        userId: session.user.id,
        $or: [
          { 'metadata.isMaster': true },
          { 'metadata.isMaster': 'true' },
          { isMaster: true },
          { 'metadata.createdVia': 'ai-career-report' }
        ]
      }).lean();
    } else {
      // Find master CV by user
      masterCV = await CV.findOne({
        userId: session.user.id,
        $or: [
          { 'metadata.isMaster': true },
          { 'metadata.isMaster': 'true' },
          { isMaster: true },
          { 'metadata.createdVia': 'ai-career-report' }
        ]
      }).sort({ createdAt: -1 }).lean();
    }

    if (!masterCV) {
      return NextResponse.json(
        { success: false, error: 'Master CV not found' },
        { status: 404 }
      );
    }

    // Return structured draft data format compatible with AICareerReportContext
    return NextResponse.json({
      success: true,
      data: {
        cvData: masterCV.cvData,
        aiAnalysis: masterCV.metadata?.aiAnalysis || null,
        currentStep: 2, // Start at step 2 (CV builder) when editing master CV
        jobId: null,
        jobData: null,
        completedSteps: [0, 1], // Mark steps 0 and 1 as completed
        activeSection: 'personal',
        availableSections: [],
        masterCVId: masterCV._id.toString(), // Preserve master CV ID for update operation
        lastSaved: masterCV.updatedAt || masterCV.createdAt
      }
    });

  } catch (error: any) {
    console.error('❌ Load master CV for edit error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load master CV for editing' },
      { status: 500 }
    );
  }
}

