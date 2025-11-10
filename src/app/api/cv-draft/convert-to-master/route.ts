import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth-config';
import { getConnection } from '@/lib/database';
import TemporaryCVDraft from '@/models/TemporaryCVDraft';
import CV from '@/models/CV';
import User from '@/models/User';
import mongoose from 'mongoose';

/**
 * Convert temporary CV draft to Master CV after authentication
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await getConnection();

    // Find the draft for this user
    const draft = await TemporaryCVDraft.findOne({ 
      userId: session.user.id, 
      isForMasterCV: true 
    }).sort({ updatedAt: -1 });

    if (!draft) {
      return NextResponse.json(
        { success: false, error: 'No CV draft found' },
        { status: 404 }
      );
    }

    // CRITICAL: Validate and ensure all CV sections are present before conversion
    const draftCVData = draft.cvData || {};
    const requiredSections = ['basics', 'work', 'education', 'skills', 'projects'];
    const missingSections = requiredSections.filter(section => !draftCVData[section]);
    
    if (missingSections.length > 0) {
      console.error('❌ Convert to Master CV: Missing required sections:', missingSections);
      console.error('📋 Draft CV data structure:', {
        hasBasics: !!draftCVData.basics,
        hasWork: !!draftCVData.work,
        hasEducation: !!draftCVData.education,
        hasSkills: !!draftCVData.skills,
        hasProjects: !!draftCVData.projects,
        workCount: Array.isArray(draftCVData.work) ? draftCVData.work.length : 'not array',
        educationCount: Array.isArray(draftCVData.education) ? draftCVData.education.length : 'not array',
        skillsCount: Array.isArray(draftCVData.skills) ? draftCVData.skills.length : 'not array',
        projectsCount: Array.isArray(draftCVData.projects) ? draftCVData.projects.length : 'not array',
        allKeys: Object.keys(draftCVData)
      });
    }

    // Ensure all sections exist (even if empty arrays) to prevent data loss
    const validatedCVData = {
      ...draftCVData,
      basics: draftCVData.basics || {
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
      work: Array.isArray(draftCVData.work) ? draftCVData.work : [],
      education: Array.isArray(draftCVData.education) ? draftCVData.education : [],
      skills: Array.isArray(draftCVData.skills) ? draftCVData.skills : [],
      projects: Array.isArray(draftCVData.projects) ? draftCVData.projects : [],
      volunteer: Array.isArray(draftCVData.volunteer) ? draftCVData.volunteer : [],
      awards: Array.isArray(draftCVData.awards) ? draftCVData.awards : [],
      certificates: Array.isArray(draftCVData.certificates) ? draftCVData.certificates : [],
      publications: Array.isArray(draftCVData.publications) ? draftCVData.publications : [],
      languages: Array.isArray(draftCVData.languages) ? draftCVData.languages : [],
      interests: Array.isArray(draftCVData.interests) ? draftCVData.interests : [],
      references: Array.isArray(draftCVData.references) ? draftCVData.references : []
    };

    // Log section counts for debugging
    console.log('🔄 Converting draft to Master CV with sections:', {
      work: validatedCVData.work.length,
      education: validatedCVData.education.length,
      skills: validatedCVData.skills.length,
      projects: validatedCVData.projects.length,
      hasBasics: !!validatedCVData.basics?.name
    });

    // Find user
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if Master CV already exists
    const existingMasterCV = await CV.findOne({
      userId: user._id,
      $or: [
        { 'metadata.isMaster': true },
        { 'metadata.isMaster': 'true' },
        { isMaster: true },
        { isMaster: 'true' }
      ]
    });

    if (existingMasterCV) {
      // Update existing Master CV instead of creating new one with validated data
      existingMasterCV.cvData = validatedCVData;
      existingMasterCV.metadata = {
        ...existingMasterCV.metadata,
        aiAnalysis: draft.aiAnalysis,
        lastModified: new Date()
      };
      await existingMasterCV.save();

      // Mark draft as converted (don't delete immediately - keep for admin tracking)
      draft.convertedAt = new Date();
      draft.conversionMethod = 'user';
      await draft.save();

      return NextResponse.json({
        success: true,
        cv: existingMasterCV,
        message: 'Master CV updated successfully'
      });
    }

    // Create new Master CV with validated data
    const masterCV = new CV({
      userId: user._id,
      title: `${validatedCVData.basics?.name || 'User'}'s Master CV`,
      cvData: validatedCVData,
      templateId: 'default',
      status: 'draft',
      metadata: {
        isMaster: true,
        tags: ['master-cv', 'ai-career-report'],
        isPublic: false,
        aiAnalysis: draft.aiAnalysis,
        createdVia: 'ai-career-report',
        lastModified: new Date(),
        viewCount: 0,
        downloadCount: 0,
        starred: false
      }
    });

    await masterCV.save();

    // Mark draft as converted (don't delete immediately - keep for admin tracking)
    draft.convertedAt = new Date();
    draft.conversionMethod = 'user';
    await draft.save();

    console.log('✅ Converted draft to Master CV:', {
      draftId: draft._id.toString(),
      cvId: masterCV._id.toString(),
      userId: user._id.toString()
    });

    return NextResponse.json({
      success: true,
      cv: masterCV,
      message: 'Master CV created successfully'
    });

  } catch (error: any) {
    console.error('❌ Convert to Master CV error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to convert draft to Master CV' },
      { status: 500 }
    );
  }
}

