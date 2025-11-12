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
    
    // Get optional masterCVId from request body (for Flow 3: explicit update)
    let masterCVId: string | undefined;
    try {
      const body = await request.json();
      masterCVId = body.masterCVId;
    } catch (error) {
      // Request body is empty or invalid - this is fine for Flow 1/2
      console.log('🔍 Convert to Master CV - No request body, will check for existing master CV');
    }

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

    // CRITICAL: Log draft data BEFORE processing to debug data loss
    console.log('🔍 Convert to Master CV - Draft data BEFORE processing:', {
      draftId: draft._id.toString(),
      hasCvData: !!draft.cvData,
      cvDataType: typeof draft.cvData,
      cvDataKeys: draft.cvData ? Object.keys(draft.cvData) : [],
      workCount: draft.cvData?.work ? (Array.isArray(draft.cvData.work) ? draft.cvData.work.length : 'not array') : 'missing',
      educationCount: draft.cvData?.education ? (Array.isArray(draft.cvData.education) ? draft.cvData.education.length : 'not array') : 'missing',
      skillsCount: draft.cvData?.skills ? (Array.isArray(draft.cvData.skills) ? draft.cvData.skills.length : 'not array') : 'missing',
      projectsCount: draft.cvData?.projects ? (Array.isArray(draft.cvData.projects) ? draft.cvData.projects.length : 'not array') : 'missing',
      basicsKeys: draft.cvData?.basics ? Object.keys(draft.cvData.basics) : [],
      fullCvDataString: JSON.stringify(draft.cvData).substring(0, 500) // First 500 chars for debugging
    });

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

    // Log section counts for debugging BEFORE save
    console.log('🔄 Converting draft to Master CV with sections:', {
      work: Array.isArray(validatedCVData.work) ? validatedCVData.work.length : (validatedCVData.work === null ? 'null' : 'not array'),
      education: Array.isArray(validatedCVData.education) ? validatedCVData.education.length : (validatedCVData.education === null ? 'null' : 'not array'),
      skills: Array.isArray(validatedCVData.skills) ? validatedCVData.skills.length : (validatedCVData.skills === null ? 'null' : 'not array'),
      projects: Array.isArray(validatedCVData.projects) ? validatedCVData.projects.length : (validatedCVData.projects === null ? 'null' : 'not array'),
      volunteer: Array.isArray(validatedCVData.volunteer) ? validatedCVData.volunteer.length : (validatedCVData.volunteer === null ? 'null' : 'not array'),
      awards: Array.isArray(validatedCVData.awards) ? validatedCVData.awards.length : (validatedCVData.awards === null ? 'null' : 'not array'),
      certificates: Array.isArray(validatedCVData.certificates) ? validatedCVData.certificates.length : (validatedCVData.certificates === null ? 'null' : 'not array'),
      hasBasics: !!validatedCVData.basics,
      basicsName: validatedCVData.basics?.name,
      basicsFieldsPreserved: validatedBasics ? Object.keys(validatedBasics).length : 0,
      allSectionKeys: Object.keys(validatedCVData),
      validatedCVDataString: JSON.stringify(validatedCVData).substring(0, 1000) // First 1000 chars for debugging
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

    // CRITICAL: Explicit Master ID for Update (Flow 3)
    // If masterCVId is provided, explicitly update that specific master CV (guaranteed UPDATE operation)
    let existingMasterCV = null;
    
    if (masterCVId) {
      // Flow 3: Explicit master CV update - find by ID
      console.log('🔍 Convert to Master CV - Explicit masterCVId provided, updating specific master CV:', masterCVId);
      existingMasterCV = await CV.findOne({
        _id: masterCVId,
        userId: user._id,
        $or: [
          { 'metadata.isMaster': true },
          { 'metadata.isMaster': 'true' },
          { isMaster: true },
          { 'metadata.createdVia': 'ai-career-report' }
        ]
      });
      
      if (!existingMasterCV) {
        return NextResponse.json(
          { success: false, error: 'Master CV not found or does not belong to user' },
          { status: 404 }
        );
      }
      
      console.log('✅ Convert to Master CV - Found master CV for explicit update:', existingMasterCV._id.toString());
    } else {
      // Flow 1/2: Check if Master CV already exists (created via ai-career-report)
      existingMasterCV = await CV.findOne({
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
    }

    if (existingMasterCV) {
      // CRITICAL FIX: Use markModified to ensure Mongoose saves the Mixed type field
      // Update existing Master CV instead of creating new one with validated data
      // Ensure ALL sections including basics are fully preserved with all fields (including null)
      // Create complete CV data with all sections explicitly set
      const completeCVDataForUpdate = {
        ...validatedCVData,
        basics: validatedBasics, // Ensure basics is fully preserved with all fields including null
        // Explicitly ensure all sections are present (even if empty arrays)
        work: Array.isArray(validatedCVData.work) ? validatedCVData.work : [],
        education: Array.isArray(validatedCVData.education) ? validatedCVData.education : [],
        skills: Array.isArray(validatedCVData.skills) ? validatedCVData.skills : [],
        projects: Array.isArray(validatedCVData.projects) ? validatedCVData.projects : [],
        volunteer: Array.isArray(validatedCVData.volunteer) ? validatedCVData.volunteer : [],
        awards: Array.isArray(validatedCVData.awards) ? validatedCVData.awards : [],
        certificates: Array.isArray(validatedCVData.certificates) ? validatedCVData.certificates : [],
        publications: Array.isArray(validatedCVData.publications) ? validatedCVData.publications : [],
        languages: Array.isArray(validatedCVData.languages) ? validatedCVData.languages : [],
        interests: Array.isArray(validatedCVData.interests) ? validatedCVData.interests : [],
        references: Array.isArray(validatedCVData.references) ? validatedCVData.references : []
      };

      console.log('🔍 Convert to Master CV - Updating existing master CV with sections:', {
        workCount: completeCVDataForUpdate.work.length,
        educationCount: completeCVDataForUpdate.education.length,
        skillsCount: completeCVDataForUpdate.skills.length,
        projectsCount: completeCVDataForUpdate.projects.length
      });

      existingMasterCV.cvData = completeCVDataForUpdate;
      existingMasterCV.markModified('cvData'); // Tell Mongoose the Mixed field changed
      existingMasterCV.metadata = {
        ...existingMasterCV.metadata,
        isMaster: true, // Ensure isMaster flag is set for studio/canvas compatibility
        aiAnalysis: draft.aiAnalysis,
        createdVia: 'ai-career-report', // Ensure this is set
        tags: existingMasterCV.metadata?.tags?.includes('ai-career-report') 
          ? existingMasterCV.metadata.tags 
          : [...(existingMasterCV.metadata?.tags || []), 'ai-career-report'],
        lastModified: new Date()
      };
      existingMasterCV.markModified('metadata'); // Tell Mongoose the metadata changed
      
      // Use direct MongoDB update to ensure all data is saved (more reliable than Mongoose save for Mixed types)
      try {
        await CV.updateOne(
          { _id: existingMasterCV._id },
          { 
            $set: { 
              cvData: completeCVDataForUpdate,
              metadata: existingMasterCV.metadata,
              title: `${validatedBasics.name || 'User'}'s Master CV`
            }
          }
        );
        console.log('✅ Convert to Master CV - Direct MongoDB update (existing) successful');
      } catch (updateError) {
        console.error('❌ Convert to Master CV - Direct update failed, trying Mongoose save:', updateError);
        // Fallback to Mongoose save
        await existingMasterCV.save();
      }

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

    const actionMessage = masterCVId 
      ? 'Master CV updated successfully (explicit update)' 
      : 'Master CV updated successfully';
    
    return NextResponse.json({
      success: true,
      cv: existingMasterCV,
      message: actionMessage,
      action: 'updated'
    });
    }

    // Create new Master CV with validated data
    // CRITICAL: Ensure ALL sections are fully preserved - create complete cvData object
    const completeCVData = {
      ...validatedCVData,
      basics: validatedBasics, // Ensure basics is fully preserved
      // Explicitly ensure all sections are present (even if empty arrays)
      work: Array.isArray(validatedCVData.work) ? validatedCVData.work : [],
      education: Array.isArray(validatedCVData.education) ? validatedCVData.education : [],
      skills: Array.isArray(validatedCVData.skills) ? validatedCVData.skills : [],
      projects: Array.isArray(validatedCVData.projects) ? validatedCVData.projects : [],
      volunteer: Array.isArray(validatedCVData.volunteer) ? validatedCVData.volunteer : [],
      awards: Array.isArray(validatedCVData.awards) ? validatedCVData.awards : [],
      certificates: Array.isArray(validatedCVData.certificates) ? validatedCVData.certificates : [],
      publications: Array.isArray(validatedCVData.publications) ? validatedCVData.publications : [],
      languages: Array.isArray(validatedCVData.languages) ? validatedCVData.languages : [],
      interests: Array.isArray(validatedCVData.interests) ? validatedCVData.interests : [],
      references: Array.isArray(validatedCVData.references) ? validatedCVData.references : []
    };

    console.log('🔍 Convert to Master CV - Complete CV data BEFORE save:', {
      workCount: completeCVData.work.length,
      educationCount: completeCVData.education.length,
      skillsCount: completeCVData.skills.length,
      projectsCount: completeCVData.projects.length,
      allKeys: Object.keys(completeCVData),
      cvDataSize: JSON.stringify(completeCVData).length
    });

    let masterCV = new CV({
      userId: user._id,
      title: `${validatedBasics.name || 'User'}'s Master CV`,
      cvData: completeCVData, // Use complete CV data with all sections
      templateId: 'default',
      status: 'draft',
      metadata: {
        // CRITICAL: Master CV is identified by both createdVia AND isMaster flag for compatibility
        isMaster: true, // Set isMaster flag for studio/canvas compatibility
        tags: ['master-cv', 'ai-career-report'],
        isPublic: false,
        aiAnalysis: draft.aiAnalysis,
        createdVia: 'ai-career-report', // Primary identifier for master CV
        lastModified: new Date(),
        viewCount: 0,
        downloadCount: 0,
        starred: false
      }
    });

    // CRITICAL FIX: Use direct MongoDB insertOne instead of Mongoose save for Mixed types
    // Mongoose save() can have issues with Mixed types, especially with default values in schema
    try {
      // Save the CV using direct MongoDB insert to avoid Mongoose Mixed type issues
      const cvDoc = {
        userId: user._id,
        title: `${validatedBasics.name || 'User'}'s Master CV`,
        cvData: completeCVData,
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
        },
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const insertResult = await CV.collection.insertOne(cvDoc);
      console.log('✅ Convert to Master CV - Direct MongoDB insert successful');
      
      // Fetch the saved CV to return
      const savedCV = await CV.findById(insertResult.insertedId).lean();
      masterCV = savedCV as any;
    } catch (insertError) {
      console.error('❌ Convert to Master CV - Direct insert failed, trying Mongoose save:', insertError);
      // Fallback: Use Mongoose save with markModified
      masterCV.markModified('cvData');
      masterCV.markModified('metadata');
      await masterCV.save();
      console.log('✅ Convert to Master CV - Mongoose save (fallback) successful');
    }

    // Verify data was saved correctly by re-fetching
    const cvIdToVerify = masterCV._id || (masterCV as any).id || (masterCV as any)._id;
    let verifyCV = await CV.findById(cvIdToVerify).lean();
    console.log('✅ Verification after save - Master CV sections:', {
      work: verifyCV?.cvData?.work?.length || 0,
      education: verifyCV?.cvData?.education?.length || 0,
      skills: verifyCV?.cvData?.skills?.length || 0,
      projects: verifyCV?.cvData?.projects?.length || 0,
      volunteer: verifyCV?.cvData?.volunteer?.length || 0,
      awards: verifyCV?.cvData?.awards?.length || 0,
      certificates: verifyCV?.cvData?.certificates?.length || 0,
      hasBasics: !!verifyCV?.cvData?.basics?.name,
      basicsKeys: verifyCV?.cvData?.basics ? Object.keys(verifyCV.cvData.basics) : [],
      allCvDataKeys: verifyCV?.cvData ? Object.keys(verifyCV.cvData) : [],
      cvDataSize: verifyCV?.cvData ? JSON.stringify(verifyCV.cvData).length : 0
    });

    // Check if any data was lost
    const workLost = completeCVData.work.length > 0 && (!verifyCV?.cvData?.work || verifyCV.cvData.work.length === 0);
    const educationLost = completeCVData.education.length > 0 && (!verifyCV?.cvData?.education || verifyCV.cvData.education.length === 0);
    const skillsLost = completeCVData.skills.length > 0 && (!verifyCV?.cvData?.skills || verifyCV.cvData.skills.length === 0);
    const projectsLost = completeCVData.projects.length > 0 && (!verifyCV?.cvData?.projects || verifyCV.cvData.projects.length === 0);

    if (workLost || educationLost || skillsLost || projectsLost) {
      console.error('❌ CRITICAL: Data was lost during save!');
      console.error('Expected:', {
        work: completeCVData.work.length,
        education: completeCVData.education.length,
        skills: completeCVData.skills.length,
        projects: completeCVData.projects.length
      });
      console.error('Actual:', {
        work: verifyCV?.cvData?.work?.length || 0,
        education: verifyCV?.cvData?.education?.length || 0,
        skills: verifyCV?.cvData?.skills?.length || 0,
        projects: verifyCV?.cvData?.projects?.length || 0
      });
      
      // Attempt recovery by directly updating the document with complete data
      await CV.updateOne(
        { _id: cvIdToVerify },
        { $set: { cvData: completeCVData } }
      );
      console.log('🔄 Attempted recovery with direct update using completeCVData');
      
      // Re-fetch after recovery and update verifyCV
      verifyCV = await CV.findById(cvIdToVerify).lean();
      console.log('✅ After recovery - Master CV sections:', {
        work: verifyCV?.cvData?.work?.length || 0,
        education: verifyCV?.cvData?.education?.length || 0,
        skills: verifyCV?.cvData?.skills?.length || 0,
        projects: verifyCV?.cvData?.projects?.length || 0
      });
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

    const finalCvId = cvIdToVerify || masterCV._id || (masterCV as any).id;
    console.log('✅ Converted draft to Master CV:', {
      draftId: draft._id.toString(),
      cvId: finalCvId?.toString(),
      userId: user._id.toString(),
      allSectionsMigrated
    });

    // Fetch final CV to return (ensure we have the latest data with all sections)
    const finalCV = await CV.findById(finalCvId).lean();
    
    return NextResponse.json({
      success: true,
      cv: finalCV || masterCV,
      message: 'Master CV created successfully',
      action: 'created'
    });

  } catch (error: any) {
    console.error('❌ Convert to Master CV error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to convert draft to Master CV' },
      { status: 500 }
    );
  }
}

