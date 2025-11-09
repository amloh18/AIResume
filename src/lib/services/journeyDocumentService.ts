import mongoose from 'mongoose';
import { ApplicationJourney, CV, CoverLetter, JobApplication } from '@/models';

export interface CreateJourneyDocumentsResult {
  success: boolean;
  cvId: string | null;
  coverLetterId: string | null;
  error?: string;
}

/**
 * Service to create CV and cover letter documents for a journey
 * This can be called directly from API routes without HTTP requests
 */
export async function createJourneyDocuments(
  journeyId: string,
  userId: string
): Promise<CreateJourneyDocumentsResult> {
  try {
    // Find the journey
    const journey = await ApplicationJourney.findById(journeyId);
    
    if (!journey) {
      console.error('❌ Journey Document Service - Journey not found:', journeyId);
      return {
        success: false,
        cvId: null,
        coverLetterId: null,
        error: 'Journey not found'
      };
    }

    // Verify ownership
    const journeyUserId = journey.userId?.toString();
    if (journeyUserId !== userId) {
      console.error('❌ Journey Document Service - Ownership mismatch:', { journeyUserId, userId });
      return {
        success: false,
        cvId: null,
        coverLetterId: null,
        error: 'Unauthorized'
      };
    }

    // Check if documents already exist - refresh journey from DB to get latest state
    const freshJourney = await ApplicationJourney.findById(journey._id);
    if (freshJourney && freshJourney.cvId && freshJourney.coverLetterId) {
      // Documents already created, update status to ready
      freshJourney.status = 'ready';
      freshJourney.metadata.updatedAt = new Date();
      await freshJourney.save();
      
      return {
        success: true,
        cvId: freshJourney.cvId,
        coverLetterId: freshJourney.coverLetterId
      };
    }

    // Update journey reference to use fresh data
    const currentJourney = freshJourney || journey;

    // Get job details
    const job = await JobApplication.findById(currentJourney.jobId);
    
    if (!job) {
      currentJourney.status = 'creation_failed';
      currentJourney.metadata.updatedAt = new Date();
      await currentJourney.save();
      
      return {
        success: false,
        cvId: null,
        coverLetterId: null,
        error: 'Job not found'
      };
    }

    let cvId: string | null = currentJourney.cvId;
    let coverLetterId: string | null = currentJourney.coverLetterId;

    // Create CV if not exists
    if (!cvId) {
      // Check if a CV already exists for this journey (atomic check)
      const existingJourneyCV = await CV.findOne({
        journeyId: currentJourney._id.toString(),
        userId: new mongoose.Types.ObjectId(userId)
      });
      
      if (existingJourneyCV) {
        cvId = existingJourneyCV._id.toString();
        console.log('✅ Journey Document Service - Found existing CV for journey:', cvId);
      }
    }
    
    if (!cvId) {
      // Find master CV
      const masterCVQuery: Record<string, any> = {
        userId: new mongoose.Types.ObjectId(userId),
        $or: [
          { 'metadata.isMaster': true },
          { 'metadata.isMaster': 'true' },
          { isMaster: true },
          { isMaster: 'true' }
        ]
      };

      const masterCV = await CV.findOne(masterCVQuery);
      
      if (masterCV) {
        // Double-check one more time before creating (race condition protection)
        const finalCheck = await CV.findOne({
          journeyId: currentJourney._id.toString(),
          userId: new mongoose.Types.ObjectId(userId)
        });
        
        if (finalCheck) {
          cvId = finalCheck._id.toString();
          console.log('✅ Journey Document Service - CV found in final check (race condition prevented):', cvId);
        } else {
          // Duplicate master CV
          const cvTitle = `${currentJourney.company}_${currentJourney.jobTitle} | CV`;
          
          // Use Executive Professional template as default if master CV doesn't have templateId
          let templateId = masterCV.templateId;
          let templateName = masterCV.templateName;
          let templateData = masterCV.templateData;
          
          if (!templateId) {
            templateId = 'executive-professional-layout-template';
            templateName = 'Executive Professional';
            console.log('✅ Journey Document Service - Using Executive Professional template as default');
          }
          
          // Deep copy cvData to preserve structure/content map
          // This ensures structure and content are properly preserved during duplication
          const duplicatedCvData = masterCV.cvData ? JSON.parse(JSON.stringify(masterCV.cvData)) : masterCV.cvData;
          
          // Ensure structure and content are preserved
          if (duplicatedCvData && !duplicatedCvData.structure) {
            // If master CV doesn't have structure, it will be initialized in studio
            // But we preserve all existing data
            console.log('⚠️ Journey Document Service - Master CV missing structure, will be initialized in studio');
          }
          
          const duplicatedCV = new CV({
            title: cvTitle,
            cvData: duplicatedCvData, // Deep copied to preserve structure/content map
            data: masterCV.data ? JSON.parse(JSON.stringify(masterCV.data)) : masterCV.data, // Deep copy legacy data
            status: 'draft',
            isMaster: false,
            journeyId: currentJourney._id.toString(),
            templateId: templateId,
            templateName: templateName,
            templateData: templateData ? JSON.parse(JSON.stringify(templateData)) : templateData, // Deep copy template data
            styling: masterCV.styling ? JSON.parse(JSON.stringify(masterCV.styling)) : masterCV.styling, // Deep copy styling
            userId: new mongoose.Types.ObjectId(userId),
            metadata: {
              ...masterCV.metadata,
              isMaster: false,
              lastModified: new Date(),
              createdFrom: masterCV._id,
              viewCount: 0,
              downloadCount: 0
            }
          });
          
          const savedCV = await duplicatedCV.save();
          cvId = savedCV._id.toString();
          
          console.log('✅ Journey Document Service - CV created with preserved structure:', {
            cvId,
            hasStructure: !!(savedCV.cvData?.structure),
            hasContent: !!(savedCV.cvData?.content),
            templateId: savedCV.templateId,
            templateName: savedCV.templateName
          });
          // Note: Thumbnail will be generated when CV is opened in studio and exited
        }
      } else {
        console.error('❌ Journey Document Service - Master CV not found');
        throw new Error('Master CV not found');
      }
    }

    // Create Cover Letter if not exists
    if (!coverLetterId) {
      // Check if a cover letter already exists for this journey (atomic check)
      const existingJourneyCoverLetter = await CoverLetter.findOne({
        journeyId: currentJourney._id.toString(),
        userId: new mongoose.Types.ObjectId(userId)
      });
      
      if (existingJourneyCoverLetter) {
        coverLetterId = existingJourneyCoverLetter._id.toString();
        console.log('✅ Journey Document Service - Found existing cover letter for journey:', coverLetterId);
      }
    }
    
    if (!coverLetterId) {
      // Check if user has any existing cover letters (to use as template)
      const existingCoverLetter = await CoverLetter.findOne({
        userId: new mongoose.Types.ObjectId(userId)
      }).sort({ createdAt: -1 });
      
      let sourceContent: string;
      let sourceMetadata: any = {};
      
      if (existingCoverLetter) {
        // Use existing cover letter as template
        sourceContent = existingCoverLetter.content || '';
        sourceMetadata = existingCoverLetter.metadata || {};
        console.log('✅ Journey Document Service - Using existing cover letter as template:', existingCoverLetter._id);
      } else {
        // Create default template content
        sourceContent = `Dear Hiring Manager,

I am writing to express my strong interest in the ${currentJourney.jobTitle} position at ${currentJourney.company}. With my background and experience, I am excited about the opportunity to contribute to your team.

I am particularly drawn to ${currentJourney.company} and am confident that my skills and experience make me a strong candidate for this position.

I would welcome the opportunity to discuss how my qualifications align with your needs. Thank you for considering my application. I look forward to hearing from you.

Sincerely,
[Your Name]`;
        console.log('✅ Journey Document Service - Using default cover letter template');
      }
      
      const coverLetterTitle = `${currentJourney.company}_${currentJourney.jobTitle} | Cover_Letter`;
      
      // Double-check one more time before creating (race condition protection)
      const finalCheck = await CoverLetter.findOne({
        journeyId: currentJourney._id.toString(),
        userId: new mongoose.Types.ObjectId(userId)
      });
      
      if (finalCheck) {
        coverLetterId = finalCheck._id.toString();
        console.log('✅ Journey Document Service - Cover letter found in final check (race condition prevented):', coverLetterId);
      } else {
        const duplicatedCoverLetter = new CoverLetter({
          title: coverLetterTitle,
          content: sourceContent || '',
          status: 'draft',
          userId: new mongoose.Types.ObjectId(userId),
          jobId: currentJourney.jobId,
          journeyId: currentJourney._id.toString(),
          metadata: {
            ...sourceMetadata,
            lastModified: new Date(),
            createdFrom: existingCoverLetter?._id || null,
            viewCount: 0,
            downloadCount: 0
          }
        });
        
        const savedCoverLetter = await duplicatedCoverLetter.save();
        coverLetterId = savedCoverLetter._id.toString();
        
        console.log('✅ Journey Document Service - Cover letter created:', coverLetterId);
      }
    }

    // Update journey with created documents - ensure proper linking
    currentJourney.cvId = cvId;
    currentJourney.coverLetterId = coverLetterId;
    currentJourney.status = 'ready';
    currentJourney.currentStep = Math.max(currentJourney.currentStep, 4); // At least step 4 (CV and Cover Letter created)
    
    // Update step statuses (mapping: Step 2 = CV, Step 3 = ATS, Step 4 = Cover Letter)
    if (currentJourney.steps && Array.isArray(currentJourney.steps)) {
      // Mark step 2 (CV) as completed
      const step2 = currentJourney.steps.find((s: any) => s.stepId === 2);
      if (step2) {
        step2.status = 'completed';
        step2.completedAt = new Date();
      }
      
      // Mark step 4 (Cover Letter) as completed
      const step4 = currentJourney.steps.find((s: any) => s.stepId === 4);
      if (step4) {
        step4.status = 'completed';
        step4.completedAt = new Date();
      }
      
      // Mark step 3 (ATS Check) as active (user needs to calculate manually)
      const step3 = currentJourney.steps.find((s: any) => s.stepId === 3);
      if (step3) {
        step3.status = 'active';
      }
    }
    
    currentJourney.metadata.updatedAt = new Date();
    
    // Save journey and verify it was saved correctly
    const savedJourney = await currentJourney.save();
    console.log('✅ Journey Document Service - Journey updated:', {
      journeyId: savedJourney._id,
      cvId: savedJourney.cvId,
      coverLetterId: savedJourney.coverLetterId,
      status: savedJourney.status
    });
    
    // Verify the save
    if (!savedJourney.cvId || !savedJourney.coverLetterId) {
      console.error('❌ Journey Document Service - Journey not properly updated:', {
        cvId: savedJourney.cvId,
        coverLetterId: savedJourney.coverLetterId
      });
      throw new Error('Journey documents were created but not properly linked');
    }

    console.log('✅ Journey Document Service - Documents created successfully for journey:', journeyId);

    return {
      success: true,
      cvId,
      coverLetterId
    };

  } catch (error) {
    console.error('❌ Journey Document Service - Error creating documents:', error);
    
    // Update journey status to failed
    try {
      const journey = await ApplicationJourney.findById(journeyId);
      if (journey) {
        journey.status = 'creation_failed';
        journey.metadata.updatedAt = new Date();
        await journey.save();
      }
    } catch (updateError) {
      console.error('❌ Journey Document Service - Failed to update journey status:', updateError);
    }
    
    return {
      success: false,
      cvId: null,
      coverLetterId: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

