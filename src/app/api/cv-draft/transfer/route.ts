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

    // Get authenticated user - CRITICAL: Must be authenticated
    const authResult = await getAuthenticatedUser();
    if (!authResult || !authResult.userId) {
      console.error('❌ Authentication failed - no user found');
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please sign in to transfer your draft' },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    console.log('✅ Authenticated user:', userId);

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId || typeof sessionId !== 'string') {
      console.error('❌ Missing or invalid sessionId:', sessionId);
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Looking for draft with sessionId:', sessionId);

    // First, check if draft already belongs to this user (already transferred)
    let draft = await TemporaryCVDraft.findOne({
      sessionId,
      userId: new mongoose.Types.ObjectId(userId)
    }).sort({ updatedAt: -1 });

    // If draft already belongs to user and is converted, find the CV
    if (draft && draft.convertedAt) {
      const existingCV = await CV.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        'metadata.draftId': draft._id.toString()
      });

      if (existingCV) {
        return NextResponse.json({
          success: true,
          cvId: existingCV._id.toString(),
          step: draft.currentStep || 3,
          cvType: existingCV.cvType || 'standalone',
          isMaster: existingCV.metadata?.isMaster || false,
          alreadyTransferred: true
        });
      }
    }

    // If draft belongs to user but not converted yet, use it
    // Otherwise, look for anonymous drafts
    if (!draft) {
      console.log('🔍 Draft not found for user, searching for anonymous drafts...');
      draft = await TemporaryCVDraft.findOne({
        sessionId,
        $or: [
          { userId: { $exists: false } }, // Anonymous drafts
          { userId: null }, // Also check for null userId
          { userId: { $eq: null } } // Explicit null check
        ]
      }).sort({ updatedAt: -1 });
    }

    if (!draft) {
      console.error('❌ Draft not found for sessionId:', sessionId);
      // Try to find any draft with this sessionId for debugging
      const anyDraft = await TemporaryCVDraft.findOne({ sessionId }).sort({ updatedAt: -1 });
      if (anyDraft) {
        console.log('⚠️ Found draft but it belongs to user:', anyDraft.userId?.toString());
      }
      return NextResponse.json(
        { success: false, error: 'Draft not found. Please try creating a new CV.' },
        { status: 404 }
      );
    }

    // If draft is already linked to a different user, don't transfer
    if (draft.userId && draft.userId.toString() !== userId) {
      console.error('❌ Draft belongs to different user:', {
        draftUserId: draft.userId.toString(),
        currentUserId: userId
      });
      return NextResponse.json(
        { success: false, error: 'Draft belongs to another user' },
        { status: 403 }
      );
    }

    // Validate draft has cvData
    if (!draft.cvData || typeof draft.cvData !== 'object') {
      console.error('❌ Draft has invalid cvData');
      return NextResponse.json(
        { success: false, error: 'Draft data is invalid' },
        { status: 400 }
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
    console.log('📝 Creating CV from draft...');
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

    try {
      await newCV.save();
      console.log('✅ CV saved successfully');
    } catch (saveError: any) {
      console.error('❌ Failed to save CV:', saveError);
      throw new Error(`Failed to create CV: ${saveError.message || 'Database error'}`);
    }

    // Verify CV was created and can be retrieved
    const verifyCV = await CV.findById(newCV._id);
    if (!verifyCV) {
      console.error('❌ CV was not found after creation');
      throw new Error('CV creation failed - CV not found after save');
    }

    console.log('✅ CV created and verified from draft:', {
      cvId: verifyCV._id.toString(),
      cvType: verifyCV.cvType,
      isMaster: verifyCV.metadata?.isMaster
    });

    // Update draft to mark as converted
    try {
      draft.userId = new mongoose.Types.ObjectId(userId);
      draft.convertedAt = new Date();
      draft.conversionMethod = 'user';
      await draft.save();
      console.log('✅ Draft marked as converted');
    } catch (saveError: any) {
      console.error('⚠️ Failed to update draft (non-critical):', saveError);
      // Don't fail the transfer if draft update fails - CV is already created
    }

    // Delete other drafts with same sessionId (cleanup)
    await TemporaryCVDraft.deleteMany({
      sessionId,
      _id: { $ne: draft._id }
    });

    return NextResponse.json({
      success: true,
      cvId: newCV._id.toString(),
      step: draft.currentStep || 3,
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

