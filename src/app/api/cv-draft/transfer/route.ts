import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import TemporaryCVDraft from '@/models/TemporaryCVDraft';
import CV from '@/models/CV';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting draft transfer...');

    await getConnection();

    // Get authenticated user
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Find draft by sessionId
    const draft = await TemporaryCVDraft.findOne({
      sessionId,
      userId: { $exists: false } // Only get anonymous drafts
    }).sort({ updatedAt: -1 });

    if (!draft) {
      return NextResponse.json(
        { success: false, error: 'Draft not found' },
        { status: 404 }
      );
    }

    console.log('📦 Found draft to transfer:', {
      draftId: draft._id.toString(),
      sessionId: draft.sessionId,
      currentStep: draft.currentStep
    });

    // Check if user already has CVs (first CV = master CV)
    const cvCount = await CV.countDocuments({
      userId: new mongoose.Types.ObjectId(userId)
    });
    const isFirstCV = cvCount === 0;

    // Determine CV type
    let cvType = 'standalone';
    if (isFirstCV) {
      cvType = 'master';
      console.log('✅ First CV detected, setting as Master CV');
    }

    // Get template from draft or use default
    let templateId = (draft as any).templateId || draft.cvData?.templateId || 'executive-professional-layout-template';
    let templateName = 'Executive Professional';
    
    if (!templateId || templateId === 'executive-professional-layout-template') {
      const { HARDCODED_TEMPLATES } = await import('@/lib/templates/hardcoded-templates');
      const executiveProfessional = HARDCODED_TEMPLATES.find(
        t => t.id === 'executive-professional-layout-template' || t.name === 'Executive Professional'
      );
      if (executiveProfessional) {
        templateId = executiveProfessional.id || executiveProfessional._id;
        templateName = executiveProfessional.name || 'Executive Professional';
      }
    } else if ((draft as any).template?.name) {
      templateName = (draft as any).template.name;
    }

    // Get title from draft or generate from CV data
    const cvTitle = (draft as any).cvTitle || 
                    (draft.cvData?.basics?.name ? `${draft.cvData.basics.name}'s CV` : 'My CV');

    // Create CV from draft
    const newCV = new CV({
      userId: new mongoose.Types.ObjectId(userId),
      title: cvTitle,
      cvData: draft.cvData,
      templateId: templateId,
      templateName: templateName,
      templateData: (draft as any).template, // Store full template data
      cvType: cvType,
      status: 'draft',
      metadata: {
        isMaster: isFirstCV,
        isFirstCV: isFirstCV,
        lastModified: new Date(),
        tags: isFirstCV ? ['master-cv', 'onboarding'] : [],
        isPublic: false,
        viewCount: 0,
        downloadCount: 0,
        createdVia: 'resume-enhancer',
        transferredFromDraft: true,
        draftId: draft._id.toString(),
        // Store role context in metadata for future use
        targetRole: (draft as any).targetRole,
        seniorityLevel: (draft as any).seniorityLevel
      }
    });

    await newCV.save();

    console.log('✅ CV created from draft:', {
      cvId: newCV._id.toString(),
      cvType: newCV.cvType,
      isMaster: newCV.metadata.isMaster
    });

    // Update draft to mark as converted
    draft.userId = new mongoose.Types.ObjectId(userId);
    draft.convertedAt = new Date();
    draft.conversionMethod = 'user';
    await draft.save();

    // Delete other drafts with same sessionId (cleanup)
    await TemporaryCVDraft.deleteMany({
      sessionId,
      _id: { $ne: draft._id }
    });

    return NextResponse.json({
      success: true,
      cvId: newCV._id.toString(),
      step: draft.currentStep,
      cvType: cvType,
      isMaster: isFirstCV
    });

  } catch (error: any) {
    console.error('❌ Draft transfer error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to transfer draft' },
      { status: 500 }
    );
  }
}

