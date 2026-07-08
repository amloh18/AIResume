import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth-config';
import { getConnection } from '@/lib/database';
import TemporaryCVDraft from '@/models/TemporaryCVDraft';

type DraftResponseData = {
  cvData: any;
  aiAnalysis?: any;
  currentStep: number;
  jobId?: string;
  jobData?: any;
  completedSteps: number[];
  activeSection?: string;
  availableSections?: string[];
  targetRole?: string;
  seniorityLevel?: string;
  templateId?: string;
  template?: any;
  cvTitle?: string;
  lastSaved: Date;
};

function toResponse(draft: any): DraftResponseData {
  return {
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
    lastSaved: draft.updatedAt,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    await getConnection();

    const cookieSessionId = request.cookies.get('cv-draft-session-id')?.value;
    const querySessionId = new URL(request.url).searchParams.get('sessionId');
    const sessionId = cookieSessionId || querySessionId;

    // Build a single query to find either the auth user's master draft or the anonymous session draft.
    const query: any = { isForMasterCV: true };
    const or: any[] = [];

    if (session?.user?.id) {
      or.push({ userId: session.user.id });
    }
    if (sessionId) {
      or.push({ sessionId });
    }

    if (or.length) {
      query.$or = or;
    }

    // One indexed query instead of up to three sequential findOne calls.
    const drafts = await TemporaryCVDraft.find(query).sort({ updatedAt: -1 }).limit(2).lean();

    let draft = drafts[0] || null;

    // If both user and anonymous drafts exist, prefer the newer one and link it to the user.
    if (drafts.length === 2 && session?.user?.id) {
      const [first, second] = drafts;
      const userDraft = first.userId?.toString() === session.user.id ? first : second;
      const anonDraft = userDraft === first ? second : first;

      if (anonDraft && anonDraft.updatedAt > userDraft.updatedAt) {
        await TemporaryCVDraft.updateOne({ _id: anonDraft._id }, { $set: { userId: session.user.id } });
        await TemporaryCVDraft.deleteOne({ _id: userDraft._id });
        draft = { ...anonDraft, userId: session.user.id };
      } else if (anonDraft) {
        await TemporaryCVDraft.deleteOne({ _id: anonDraft._id });
        draft = userDraft;
      }
    }

    if (!draft) {
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({ success: true, data: toResponse(draft) });
  } catch (error: any) {
    console.error('❌ Load CV draft error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load CV draft' },
      { status: 500 }
    );
  }
}
