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

    const update: any = {
      $set: {
        cvData: validatedCVData,
        isForMasterCV: isForMasterCV !== false,
        sessionId,
        lastAccessedAt: new Date(),
        updatedAt: new Date()
      }
    };

    if (session?.user?.id) {
      update.$set.userId = session.user.id;
    }

    if (aiAnalysis !== undefined) update.$set.aiAnalysis = aiAnalysis;
    if (currentStep !== undefined) update.$set.currentStep = currentStep;
    if (jobId !== undefined) update.$set.jobId = jobId;
    if (jobData !== undefined) update.$set.jobData = jobData;
    if (completedSteps !== undefined) update.$set.completedSteps = completedSteps;
    if (activeSection !== undefined) update.$set.activeSection = activeSection;
    if (availableSections !== undefined) update.$set.availableSections = availableSections;
    if (targetRole !== undefined) update.$set.targetRole = targetRole;
    if (seniorityLevel !== undefined) update.$set.seniorityLevel = seniorityLevel;
    if (templateId !== undefined) update.$set.templateId = templateId;
    if (template !== undefined) update.$set.template = template;
    if (cvTitle !== undefined) update.$set.cvTitle = cvTitle;

    const draft = await TemporaryCVDraft.findOneAndUpdate(
      query,
      update,
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    console.log('✅ Verification after save - Draft sections:', {
      work: draft?.cvData?.work?.length || 0,
      education: draft?.cvData?.education?.length || 0,
      skills: draft?.cvData?.skills?.length || 0,
      projects: draft?.cvData?.projects?.length || 0
    });

    // Set session ID cookie for anonymous users (7 days expiry)
    const response = NextResponse.json({
      success: true,
      draftId: draft._id.toString(),
      sessionId: session?.user?.id ? undefined : sessionId
    });

    if (!session?.user?.id) {
      response.cookies.set('cv-draft-session-id', sessionId, {
        httpOnly: false,
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
