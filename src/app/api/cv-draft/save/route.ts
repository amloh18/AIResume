// @ts-nocheck
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
      availableSections,
      targetRole,
      seniorityLevel,
      templateId,
      template,
      cvTitle,
      sessionId: providedSessionId,
      isForMasterCV
    } = body;
    
    if (!cvData) {
      return NextResponse.json(
        { success: false, error: 'CV data is required' },
        { status: 400 }
      );
    }

    // CRITICAL: Validate that all CV sections are present before saving
    const requiredSections = ['basics', 'work', 'education', 'skills', 'projects'];
    const missingSections = requiredSections.filter(section => !cvData[section]);
    
    if (missingSections.length > 0) {
      console.error('❌ CV draft save: Missing required sections:', missingSections);
      console.error('📋 Received CV data structure:', {
        hasBasics: !!cvData.basics,
        hasWork: !!cvData.work,
        hasEducation: !!cvData.education,
        hasSkills: !!cvData.skills,
        hasProjects: !!cvData.projects,
        workCount: Array.isArray(cvData.work) ? cvData.work.length : 'not array',
        educationCount: Array.isArray(cvData.education) ? cvData.education.length : 'not array',
        skillsCount: Array.isArray(cvData.skills) ? cvData.skills.length : 'not array',
        projectsCount: Array.isArray(cvData.projects) ? cvData.projects.length : 'not array',
        allKeys: Object.keys(cvData)
      });
    }

    // Ensure all sections exist (even if empty arrays) to prevent data loss
    const validatedCVData = {
      ...cvData,
      basics: cvData.basics || {
        name: '',
        label: '',
        image: '',
        email: '',
        phone: '',
        url: '',
        summary: '',
        location: { address: '', postalCode: '', city: '', countryCode: '', region: '' },
        profiles: []
      },
      work: Array.isArray(cvData.work) ? cvData.work : [],
      education: Array.isArray(cvData.education) ? cvData.education : [],
      skills: Array.isArray(cvData.skills) ? cvData.skills : [],
      projects: Array.isArray(cvData.projects) ? cvData.projects : [],
      volunteer: Array.isArray(cvData.volunteer) ? cvData.volunteer : [],
      awards: Array.isArray(cvData.awards) ? cvData.awards : [],
      certificates: Array.isArray(cvData.certificates) ? cvData.certificates : [],
      publications: Array.isArray(cvData.publications) ? cvData.publications : [],
      languages: Array.isArray(cvData.languages) ? cvData.languages : [],
      interests: Array.isArray(cvData.interests) ? cvData.interests : [],
      references: Array.isArray(cvData.references) ? cvData.references : []
    };

    // Log section counts for debugging
    console.log('💾 Saving CV draft with sections:', {
      work: validatedCVData.work.length,
      education: validatedCVData.education.length,
      skills: validatedCVData.skills.length,
      projects: validatedCVData.projects.length,
      hasBasics: !!validatedCVData.basics?.name
    });

    await getConnection();

    // Get or create session ID for anonymous users
    // Use provided sessionId first (from guestCVService), then cookie, then generate new
    let sessionId = providedSessionId || request.cookies.get('cv-draft-session-id')?.value;
    
    if (!sessionId) {
      // Generate new session ID
      sessionId = randomBytes(16).toString('hex');
    }

    // Find existing draft by session ID (or user ID if authenticated)
    // For guest users, prioritize sessionId; for authenticated, use userId
    const query = session?.user?.id 
      ? { userId: session.user.id, isForMasterCV: isForMasterCV !== false }
      : { sessionId, isForMasterCV: isForMasterCV !== false };

    let draft = await TemporaryCVDraft.findOne(query);

    if (draft) {
      // Update existing draft with validated data
      draft.cvData = validatedCVData;
      draft.aiAnalysis = aiAnalysis !== undefined ? aiAnalysis : draft.aiAnalysis;
      draft.currentStep = currentStep || draft.currentStep;
      draft.jobId = jobId || draft.jobId;
      draft.jobData = jobData || draft.jobData;
      draft.completedSteps = completedSteps || draft.completedSteps;
      draft.activeSection = activeSection || draft.activeSection;
      draft.availableSections = availableSections || draft.availableSections;
      draft.targetRole = targetRole !== undefined ? targetRole : draft.targetRole;
      draft.seniorityLevel = seniorityLevel !== undefined ? seniorityLevel : draft.seniorityLevel;
      draft.templateId = templateId !== undefined ? templateId : draft.templateId;
      draft.template = template !== undefined ? template : draft.template;
      draft.cvTitle = cvTitle !== undefined ? cvTitle : draft.cvTitle;
      
      // If user just authenticated, link to user
      if (session?.user?.id && !draft.userId) {
        draft.userId = session.user.id;
        // Keep sessionId for now (will be cleaned up later)
        console.log('✅ Linking draft to authenticated user:', session.user.id);
      }
      
      // CRITICAL FIX: Mark cvData as modified for Mongoose Mixed type
      draft.markModified('cvData');
      await draft.save();
      
      // Verify data was saved correctly by re-fetching
      const verifyDraft = await TemporaryCVDraft.findById(draft._id).lean();
      console.log('✅ Verification after save - Draft sections:', {
        work: verifyDraft?.cvData?.work?.length || 0,
        education: verifyDraft?.cvData?.education?.length || 0,
        skills: verifyDraft?.cvData?.skills?.length || 0,
        projects: verifyDraft?.cvData?.projects?.length || 0
      });
    } else {
      // Create new draft with validated data
      draft = new TemporaryCVDraft({
        userId: session?.user?.id || undefined,
        sessionId,
        cvData: validatedCVData,
        aiAnalysis,
        currentStep: currentStep || 1,
        jobId,
        jobData,
        completedSteps: completedSteps || [],
        activeSection,
        availableSections: availableSections || [],
        targetRole,
        seniorityLevel,
        templateId,
        template,
        cvTitle,
        isForMasterCV: isForMasterCV !== false // Default to true for Master CV draft
      });
      
      // CRITICAL FIX: Mark cvData as modified for Mongoose Mixed type
      draft.markModified('cvData');
      await draft.save();
      
      // Verify data was saved correctly by re-fetching
      const verifyDraft = await TemporaryCVDraft.findById(draft._id).lean();
      console.log('✅ Verification after save - Draft sections:', {
        work: verifyDraft?.cvData?.work?.length || 0,
        education: verifyDraft?.cvData?.education?.length || 0,
        skills: verifyDraft?.cvData?.skills?.length || 0,
        projects: verifyDraft?.cvData?.projects?.length || 0
      });
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

