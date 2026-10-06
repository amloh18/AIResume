import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import TemporaryCVDraft from '@/models/TemporaryCVDraft';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    
    await getConnection();

    let draft = null;
    
    // Try to find draft by user ID first (if authenticated)
    if (session?.user?.id) {
      draft = await TemporaryCVDraft.findOne({ 
        userId: session.user.id, 
        isForMasterCV: true 
      }).sort({ updatedAt: -1 });
      
      // If found by user ID, also check session ID to merge any anonymous drafts
      if (draft) {
        const sessionId = request.cookies.get('cv-draft-session-id')?.value;
        if (sessionId) {
          const anonymousDraft = await TemporaryCVDraft.findOne({ 
            sessionId, 
            isForMasterCV: true 
          }).sort({ updatedAt: -1 });
          
          // If anonymous draft is newer, adopt it and link to user.
          // NOTE: we intentionally do NOT delete either draft here - a GET must
          // not have destructive side effects (deleting the user's older draft
          // could destroy an edit made from another device).
          if (anonymousDraft && anonymousDraft.updatedAt > draft.updatedAt) {
            anonymousDraft.userId = session.user.id;
            await anonymousDraft.save();
            draft = anonymousDraft;
          }
        }
      }
    }
    
    // If no user draft, try session ID (for anonymous users)
    if (!draft) {
      const sessionId = request.cookies.get('cv-draft-session-id')?.value || 
                        new URL(request.url).searchParams.get('sessionId');
      if (sessionId) {
        draft = await TemporaryCVDraft.findOne({ 
          sessionId, 
          isForMasterCV: true 
        }).sort({ updatedAt: -1 });
        
        // If user is now authenticated, link the draft to user
        if (draft && session?.user?.id) {
          draft.userId = session.user.id;
          await draft.save();
          console.log('✅ Linked anonymous draft to authenticated user:', session.user.id);
        }
      }
    }

    if (!draft) {
      return NextResponse.json({
        success: true,
        data: null
      });
    }

    console.log('📦 Loaded CV draft from database:', {
      draftId: draft._id.toString(),
      userId: draft.userId?.toString() || 'anonymous',
      currentStep: draft.currentStep,
      hasCvData: !!draft.cvData,
      hasAiAnalysis: !!draft.aiAnalysis
    });

    return NextResponse.json({
      success: true,
      data: {
        cvData: draft.cvData,
        aiAnalysis: draft.aiAnalysis,
        currentStep: draft.currentStep,
        jobId: draft.jobId?.toString(),
        jobData: draft.jobData,
        completedSteps: draft.completedSteps || [],
        activeSection: draft.activeSection,
        availableSections: draft.availableSections || [],
        targetRole: (draft as any).targetRole,
        seniorityLevel: (draft as any).seniorityLevel,
        templateId: (draft as any).templateId,
        template: (draft as any).template,
        cvTitle: (draft as any).cvTitle,
        lastSaved: draft.updatedAt
      }
    });

  } catch (error: any) {
    console.error('❌ Load CV draft error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load CV draft' },
      { status: 500 }
    );
  }
}
