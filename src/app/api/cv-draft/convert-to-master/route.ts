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

    // Deep clone the draft CV data to prevent reference issues
    const clonedDraftData = JSON.parse(JSON.stringify(draftCVData));
    
    // CRITICAL FIX: Ensure ALL sections are fully preserved with ALL fields (including null)
    // Preserve original values including null, don't convert to empty strings
    const preserveField = (value: any, defaultValue: any = null) => {
      return value !== undefined ? value : defaultValue;
    };

    // Preserve basics section with all fields including null values
    const basicsData = clonedDraftData.basics || {};
    const validatedBasics = {
      name: preserveField(basicsData.name, null),
      label: preserveField(basicsData.label, null),
      image: preserveField(basicsData.image, null),
      email: preserveField(basicsData.email, null),
      phone: preserveField(basicsData.phone, null),
      url: preserveField(basicsData.url, null),
      summary: preserveField(basicsData.summary, null),
      location: basicsData.location ? {
        address: preserveField(basicsData.location.address, null),
        postalCode: preserveField(basicsData.location.postalCode, null),
        city: preserveField(basicsData.location.city, null),
        countryCode: preserveField(basicsData.location.countryCode, null),
        region: preserveField(basicsData.location.region, null)
      } : null,
      profiles: Array.isArray(basicsData.profiles) ? basicsData.profiles : []
    };

    // Preserve all sections with all fields including null values
    // Use preserveField to maintain null values instead of converting to empty strings/arrays
    const validatedCVData = {
      ...clonedDraftData,
      basics: validatedBasics,
      work: Array.isArray(clonedDraftData.work) ? clonedDraftData.work : (clonedDraftData.work === null ? null : []),
      education: Array.isArray(clonedDraftData.education) ? clonedDraftData.education : (clonedDraftData.education === null ? null : []),
      skills: Array.isArray(clonedDraftData.skills) ? clonedDraftData.skills : (clonedDraftData.skills === null ? null : []),
      projects: Array.isArray(clonedDraftData.projects) ? clonedDraftData.projects : (clonedDraftData.projects === null ? null : []),
      volunteer: Array.isArray(clonedDraftData.volunteer) ? clonedDraftData.volunteer : (clonedDraftData.volunteer === null ? null : []),
      awards: Array.isArray(clonedDraftData.awards) ? clonedDraftData.awards : (clonedDraftData.awards === null ? null : []),
      certificates: Array.isArray(clonedDraftData.certificates) ? clonedDraftData.certificates : (clonedDraftData.certificates === null ? null : []),
      publications: Array.isArray(clonedDraftData.publications) ? clonedDraftData.publications : (clonedDraftData.publications === null ? null : []),
      languages: Array.isArray(clonedDraftData.languages) ? clonedDraftData.languages : (clonedDraftData.languages === null ? null : []),
      interests: Array.isArray(clonedDraftData.interests) ? clonedDraftData.interests : (clonedDraftData.interests === null ? null : []),
      references: Array.isArray(clonedDraftData.references) ? clonedDraftData.references : (clonedDraftData.references === null ? null : [])
    };

    // Log section counts for debugging
    console.log('🔄 Converting draft to Master CV with sections:', {
      work: Array.isArray(validatedCVData.work) ? validatedCVData.work.length : (validatedCVData.work === null ? 'null' : 'not array'),
      education: Array.isArray(validatedCVData.education) ? validatedCVData.education.length : (validatedCVData.education === null ? 'null' : 'not array'),
      skills: Array.isArray(validatedCVData.skills) ? validatedCVData.skills.length : (validatedCVData.skills === null ? 'null' : 'not array'),
      projects: Array.isArray(validatedCVData.projects) ? validatedCVData.projects.length : (validatedCVData.projects === null ? 'null' : 'not array'),
      hasBasics: !!validatedCVData.basics,
      basicsName: validatedCVData.basics?.name,
      basicsFieldsPreserved: validatedBasics ? Object.keys(validatedBasics).length : 0
    });

    // Find user
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user profile from CV data if available
    if (validatedCVData.basics) {
      const basics = validatedCVData.basics;
      let profileUpdated = false;

      // Update name (split full name into firstName and lastName)
      if (basics.name && (!user.firstName || !user.lastName || user.firstName === 'User' || user.lastName === 'User')) {
        const nameParts = basics.name.trim().split(/\s+/);
        if (nameParts.length >= 2) {
          user.firstName = nameParts[0];
          user.lastName = nameParts.slice(1).join(' ');
          profileUpdated = true;
        } else if (nameParts.length === 1) {
          user.firstName = nameParts[0];
          user.lastName = '';
          profileUpdated = true;
        }
      }

      // Update phone
      if (basics.phone && !user.phone) {
        user.phone = basics.phone.trim();
        profileUpdated = true;
      }

      // Update website
      if (basics.url && !user.website) {
        user.website = basics.url.trim();
        profileUpdated = true;
      }

      // Update LinkedIn from profiles array
      if (basics.profiles && Array.isArray(basics.profiles) && !user.linkedin) {
        const linkedinProfile = basics.profiles.find((p: any) => 
          p.network && p.network.toLowerCase() === 'linkedin' && p.url
        );
        if (linkedinProfile && linkedinProfile.url) {
          user.linkedin = linkedinProfile.url.trim();
          profileUpdated = true;
        }
      }

      // Update summary
      if (basics.summary && !user.summary) {
        user.summary = basics.summary.trim();
        profileUpdated = true;
      }

      // Save user if any profile fields were updated
      if (profileUpdated) {
        try {
          await user.save();
          console.log('✅ Updated user profile from CV data');
        } catch (profileError) {
          console.error('⚠️ Failed to update user profile:', profileError);
          // Don't fail the entire request if profile update fails
        }
      }
    }

    // CRITICAL: Master CV is ONLY identified by ai-career-report creation
    // Check if Master CV already exists (created via ai-career-report)
    let existingMasterCV = await CV.findOne({
      userId: user._id,
      $or: [
        { 'metadata.createdVia': 'ai-career-report' },
        { 'metadata.tags': { $in: ['ai-career-report'] } }
      ]
    });

    // FALLBACK: If no ai-career-report master CV, use oldest CV by creation date
    if (!existingMasterCV) {
      console.log('🔍 Convert to Master CV - No ai-career-report master CV found, checking for oldest CV as fallback');
      const allCVs = await CV.find({
        userId: user._id
      }).sort({ createdAt: 1 }); // Sort ascending (oldest first)

      if (allCVs && allCVs.length > 0) {
        existingMasterCV = allCVs[0]; // Get the oldest CV
        console.log('🔍 Convert to Master CV - Using oldest CV as master CV fallback:', {
          id: existingMasterCV._id,
          title: existingMasterCV.title,
          createdAt: existingMasterCV.createdAt
        });
      }
    }

    if (existingMasterCV) {
      // CRITICAL FIX: Use markModified to ensure Mongoose saves the Mixed type field
      // Update existing Master CV instead of creating new one with validated data
      // Ensure ALL sections including basics are fully preserved with all fields (including null)
      existingMasterCV.cvData = {
        ...validatedCVData,
        basics: validatedBasics // Ensure basics is fully preserved with all fields including null
      };
      existingMasterCV.markModified('cvData'); // Tell Mongoose the Mixed field changed
      existingMasterCV.metadata = {
        ...existingMasterCV.metadata,
        aiAnalysis: draft.aiAnalysis,
        createdVia: 'ai-career-report', // Ensure this is set
        tags: existingMasterCV.metadata?.tags?.includes('ai-career-report') 
          ? existingMasterCV.metadata.tags 
          : [...(existingMasterCV.metadata?.tags || []), 'ai-career-report'],
        lastModified: new Date()
      };
      existingMasterCV.markModified('metadata'); // Tell Mongoose the metadata changed
      await existingMasterCV.save();

    // Verify data was saved correctly by re-fetching
    const verifyCV = await CV.findById(existingMasterCV._id).lean();
    console.log('✅ Verification after save - Master CV sections:', {
      work: verifyCV?.cvData?.work?.length || 0,
      education: verifyCV?.cvData?.education?.length || 0,
      skills: verifyCV?.cvData?.skills?.length || 0,
      projects: verifyCV?.cvData?.projects?.length || 0,
      hasBasics: !!verifyCV?.cvData?.basics?.name
    });

    if (!verifyCV?.cvData?.work?.length && validatedCVData.work.length > 0) {
      console.error('❌ CRITICAL: Work experience was lost during save!');
      console.error('Expected work count:', validatedCVData.work.length);
      console.error('Actual work count:', verifyCV?.cvData?.work?.length || 0);
    }

    // Verify all sections are migrated before deleting draft
    const allSectionsMigrated = !!(
      verifyCV?.cvData?.basics &&
      Array.isArray(verifyCV.cvData.work) &&
      Array.isArray(verifyCV.cvData.education) &&
      Array.isArray(verifyCV.cvData.skills) &&
      Array.isArray(verifyCV.cvData.projects)
    );

    if (allSectionsMigrated) {
      // Delete the temporary draft after successful conversion
      try {
        await TemporaryCVDraft.deleteOne({ _id: draft._id });
        console.log('✅ Deleted temporary CV draft after successful conversion');
      } catch (deleteError) {
        console.error('⚠️ Failed to delete temporary draft:', deleteError);
        // Mark as converted even if deletion fails
        draft.convertedAt = new Date();
        draft.conversionMethod = 'user';
        await draft.save();
      }
    } else {
      // Mark draft as converted but don't delete if sections aren't fully migrated
      console.warn('⚠️ Not all sections migrated, keeping draft for reference');
      draft.convertedAt = new Date();
      draft.conversionMethod = 'user';
      await draft.save();
    }

    return NextResponse.json({
      success: true,
      cv: existingMasterCV,
      message: 'Master CV updated successfully'
    });
    }

    // Create new Master CV with validated data
    // CRITICAL: Ensure basics section is fully preserved
    const masterCV = new CV({
      userId: user._id,
      title: `${validatedBasics.name || 'User'}'s Master CV`,
      cvData: {
        ...validatedCVData,
        basics: validatedBasics // Ensure basics is fully preserved
      },
      templateId: 'default',
      status: 'draft',
      metadata: {
        // CRITICAL: Master CV is identified ONLY by createdVia, not isMaster flag
        tags: ['master-cv', 'ai-career-report'],
        isPublic: false,
        aiAnalysis: draft.aiAnalysis,
        createdVia: 'ai-career-report', // CRITICAL: This is the ONLY identifier for master CV
        lastModified: new Date(),
        viewCount: 0,
        downloadCount: 0,
        starred: false
      }
    });

    // CRITICAL FIX: Mark cvData as modified for Mongoose Mixed type
    masterCV.markModified('cvData');
    await masterCV.save();

    // Verify data was saved correctly by re-fetching
    let verifyCV = await CV.findById(masterCV._id).lean();
    console.log('✅ Verification after save - Master CV sections:', {
      work: verifyCV?.cvData?.work?.length || 0,
      education: verifyCV?.cvData?.education?.length || 0,
      skills: verifyCV?.cvData?.skills?.length || 0,
      projects: verifyCV?.cvData?.projects?.length || 0,
      hasBasics: !!verifyCV?.cvData?.basics?.name
    });

    if (!verifyCV?.cvData?.work?.length && validatedCVData.work.length > 0) {
      console.error('❌ CRITICAL: Work experience was lost during save!');
      console.error('Expected work count:', validatedCVData.work.length);
      console.error('Actual work count:', verifyCV?.cvData?.work?.length || 0);
      
      // Attempt recovery by directly updating the document
      await CV.updateOne(
        { _id: masterCV._id },
        { $set: { cvData: validatedCVData } }
      );
      console.log('🔄 Attempted recovery with direct update');
      
      // Re-fetch after recovery and update verifyCV
      verifyCV = await CV.findById(masterCV._id).lean();
    }

    // Verify all sections are migrated before deleting draft
    const allSectionsMigrated = !!(
      verifyCV?.cvData?.basics &&
      Array.isArray(verifyCV.cvData.work) &&
      Array.isArray(verifyCV.cvData.education) &&
      Array.isArray(verifyCV.cvData.skills) &&
      Array.isArray(verifyCV.cvData.projects)
    );

    if (allSectionsMigrated) {
      // Delete the temporary draft after successful conversion
      try {
        await TemporaryCVDraft.deleteOne({ _id: draft._id });
        console.log('✅ Deleted temporary CV draft after successful conversion');
      } catch (deleteError) {
        console.error('⚠️ Failed to delete temporary draft:', deleteError);
        // Mark as converted even if deletion fails
        draft.convertedAt = new Date();
        draft.conversionMethod = 'user';
        await draft.save();
      }
    } else {
      // Mark draft as converted but don't delete if sections aren't fully migrated
      console.warn('⚠️ Not all sections migrated, keeping draft for reference');
      draft.convertedAt = new Date();
      draft.conversionMethod = 'user';
      await draft.save();
    }

    console.log('✅ Converted draft to Master CV:', {
      draftId: draft._id.toString(),
      cvId: masterCV._id.toString(),
      userId: user._id.toString(),
      allSectionsMigrated
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

