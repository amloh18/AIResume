import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth-config';
import { getConnection } from '@/lib/database';
import TemporaryCVDraft from '@/models/TemporaryCVDraft';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    const body = await request.json();
    
    const { 
      cvData, 
      aiAnalysis, 
      currentStep, 
      jobId, 
      jobData, 
      completedSteps, 
      activeSection, 
      availableSections 
    } = body;
    
    if (!cvData) {
      return NextResponse.json(
        { success: false, error: 'CV data is required' },
        { status: 400 }
      );
    }

    await getConnection();

    // Get or create session ID for anonymous users
    let sessionId = request.cookies.get('cv-draft-session-id')?.value;
    
    if (!sessionId) {
      // Generate new session ID
      sessionId = randomBytes(16).toString('hex');
    }

    // Find existing draft by session ID (or user ID if authenticated)
    const query = session?.user?.id 
      ? { userId: session.user.id, isForMasterCV: true }
      : { sessionId, isForMasterCV: true };

    let draft = await TemporaryCVDraft.findOne(query);

    if (draft) {
      // Update existing draft
      draft.cvData = cvData;
      draft.aiAnalysis = aiAnalysis !== undefined ? aiAnalysis : draft.aiAnalysis;
      draft.currentStep = currentStep || draft.currentStep;
      draft.jobId = jobId || draft.jobId;
      draft.jobData = jobData || draft.jobData;
      draft.completedSteps = completedSteps || draft.completedSteps;
      draft.activeSection = activeSection || draft.activeSection;
      draft.availableSections = availableSections || draft.availableSections;
      
      // If user just authenticated, link to user
      if (session?.user?.id && !draft.userId) {
        draft.userId = session.user.id;
        // Keep sessionId for now (will be cleaned up later)
        console.log('✅ Linking draft to authenticated user:', session.user.id);
      }
      
      await draft.save();
    } else {
      // Create new draft
      draft = new TemporaryCVDraft({
        userId: session?.user?.id || undefined,
        sessionId,
        cvData,
        aiAnalysis,
        currentStep: currentStep || 1,
        jobId,
        jobData,
        completedSteps: completedSteps || [],
        activeSection,
        availableSections: availableSections || [],
        isForMasterCV: true // Mark as Master CV draft
      });
      
      await draft.save();
    }

    // Set session ID cookie for anonymous users (7 days expiry)
    const response = NextResponse.json({
      success: true,
      draftId: draft._id.toString(),
      sessionId: session?.user?.id ? undefined : sessionId
    });

    if (!session?.user?.id) {
      response.cookies.set('cv-draft-session-id', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/'
      });
    }

    console.log('💾 Saved CV draft to database:', {
      draftId: draft._id.toString(),
      userId: draft.userId?.toString() || 'anonymous',
      sessionId: draft.sessionId,
      currentStep: draft.currentStep
    });

    return response;

  } catch (error: any) {
    console.error('❌ Save CV draft error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save CV draft' },
      { status: 500 }
    );
  }
}

