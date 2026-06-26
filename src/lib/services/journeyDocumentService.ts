import mongoose from 'mongoose';
import { ApplicationJourney, CV, CoverLetter, JobApplication } from '@/models';
import { callAIWithFallback } from '@/lib/utils/ai-api-helper';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import creditService from '@/lib/services/creditService';
import { aiCoverLetterService } from '@/lib/services/aiCoverLetterService';
import {
  createCompletedGenerationState,
  createFailedGenerationState,
  createInProgressGenerationState,
  deriveCompanyType,
  fillTrackerPrompt,
  getJourneyGenerationEntitlement,
  serializeExperienceForPrompt
} from '@/lib/utils/journey-generation';
import { formatCoverLetterHeader, formatCoverLetterFooter, mergeCoverLetterContent } from '@/lib/utils/coverLetterUtils';

export interface CreateJourneyDocumentsResult {
  success: boolean;
  cvId: string | null;
  coverLetterId: string | null;
  error?: string;
  generationState?: any;
}

function getTrackerCvGenerationReason(options: {
  wasTailored: boolean;
  tailoringRequested: boolean;
}) {
  if (options.wasTailored) {
    return 'Generated from tracker prompt using Master CV and job description';
  }

  if (options.tailoringRequested) {
    return 'Generated from Master CV after tailored generation could not be completed';
  }

  return 'Generated as a non-tailored fallback from Master CV';
}

function getTrackerCoverLetterGenerationReason(options: {
  wasTailored: boolean;
  tailoringRequested: boolean;
}) {
  if (options.wasTailored) {
    return 'Generated with tracker cover letter prompt using verified CV and job data';
  }

  if (options.tailoringRequested) {
    return 'Created as a fallback draft after tailored cover letter generation could not be completed';
  }

  return 'Created as a non-tailored fallback draft with header only from Master CV context';
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
    let generationEntitlement = await getJourneyGenerationEntitlement(userId);
    const usesMeteredTailoring = generationEntitlement.isTailoredEligible && generationEntitlement.aiCreditsLimit !== -1;
    if (usesMeteredTailoring) {
      const aiCreditSpent = await creditService.spendCredit(userId, 'ai_generation');
      if (!aiCreditSpent) {
        generationEntitlement = await getJourneyGenerationEntitlement(userId);
      }
    }
    const shouldTailorDocuments = generationEntitlement.mode === 'tailored';
    currentJourney.generationState = createInProgressGenerationState(generationEntitlement);
    currentJourney.metadata.updatedAt = new Date();
    await currentJourney.save();

    // Get job details
    const job = await JobApplication.findById(currentJourney.jobId);

    if (!job) {
      currentJourney.status = 'creation_failed';
      currentJourney.generationState = createFailedGenerationState(
        generationEntitlement,
        'The job description for this journey could not be found.',
        { fallbackCreated: false }
      );
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
    let usedFallbackContent = !shouldTailorDocuments;
    let cvWasTailored = false;
    let coverLetterWasTailored = false;

    // EDGE CASE 1: Race Condition - Check if CV is already linked (atomic check)
    // Refresh journey from DB one more time to get latest state before checking
    const latestJourney = await ApplicationJourney.findById(currentJourney._id);
    if (latestJourney && latestJourney.cvId) {
      cvId = latestJourney.cvId.toString();
      console.log('✅ Journey Document Service - CV already linked to journey (race condition handled):', cvId);
    }

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

          // Deep copy cvData to preserve structure/content map.
          let duplicatedCvData = masterCV.cvData ? JSON.parse(JSON.stringify(masterCV.cvData)) : masterCV.cvData;

          if (shouldTailorDocuments) {
            try {
              console.log('🚀 Journey Document Service - Tailoring CV content for job...');
              const tailoredCvData = await tailorCVContent(duplicatedCvData, job);
              if (tailoredCvData) {
                duplicatedCvData = tailoredCvData;
                cvWasTailored = true;
                console.log('✅ Journey Document Service - CV content tailored successfully');
              }
            } catch (tailorError) {
              console.error('⚠️ Journey Document Service - Failed to tailor CV content, using master CV content:', tailorError);
              usedFallbackContent = true;
            }
          } else {
            console.log('ℹ️ Journey Document Service - Creating non-tailored CV fallback from master CV');
          }

          if (duplicatedCvData && !duplicatedCvData.structure) {
            console.log('⚠️ Journey Document Service - Master CV missing structure, will be initialized in studio');
          }

          const duplicatedCV = new CV({
            title: cvTitle,
            cvData: duplicatedCvData, // Tailored or Master content
            data: masterCV.data ? JSON.parse(JSON.stringify(masterCV.data)) : masterCV.data, // Deep copy legacy data
            status: 'draft',
            isMaster: false,
            journeyId: currentJourney._id.toString(),
            cvType: 'journey', // CVs created in journey context are journey-based
            templateId: templateId,
            templateName: templateName,
            templateData: templateData ? JSON.parse(JSON.stringify(templateData)) : templateData, // Deep copy template data
            styling: masterCV.styling ? JSON.parse(JSON.stringify(masterCV.styling)) : masterCV.styling, // Deep copy styling
            userId: new mongoose.Types.ObjectId(userId),
            metadata: {
              ...masterCV.metadata,
              isMaster: false,
              createdVia: 'journey',
              lastModified: new Date(),
              createdFrom: masterCV._id,
              viewCount: 0,
              downloadCount: 0,
              generationMode: cvWasTailored ? 'tailored' : 'fallback',
              generationReason: getTrackerCvGenerationReason({
                wasTailored: cvWasTailored,
                tailoringRequested: shouldTailorDocuments
              })
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
        // EDGE CASE 5: No Master CV - Fallback to standalone CV or create basic structure
        console.warn('⚠️ Journey Document Service - Master CV not found, checking for standalone CVs...');

        // Check for standalone CVs (most recently modified)
        const standaloneCVs = await CV.find({
          userId: new mongoose.Types.ObjectId(userId),
          cvType: 'standalone',
          journeyId: null
        }).sort({ updatedAt: -1 }).limit(1);

        if (standaloneCVs.length > 0) {
          // EDGE CASE 4: Multiple Standalone CVs - Use most recently modified
          const standaloneCV = standaloneCVs[0];
          console.log('✅ Journey Document Service - Using standalone CV as source:', standaloneCV._id);

          // Link standalone CV to journey instead of creating new one
          standaloneCV.cvType = 'journey';
          standaloneCV.journeyId = currentJourney._id.toString();
          await standaloneCV.save();

          cvId = standaloneCV._id.toString();
          currentJourney.cvId = cvId;
          await currentJourney.save();

          console.log('✅ Journey Document Service - Standalone CV linked to journey:', cvId);
          usedFallbackContent = true;
        } else {
          // EDGE CASE 5: No source CV exists - Create basic CV structure
          console.error('❌ Journey Document Service - No master CV or standalone CV found');
          console.error('❌ Journey Document Service - Creating basic CV structure as fallback');

          const cvTitle = `${currentJourney.company}_${currentJourney.jobTitle} | CV`;
          const basicCV = new CV({
            title: cvTitle,
            cvData: {
              personalInfo: {},
              workExperience: [],
              education: [],
              skills: [],
              projects: [],
              certifications: [],
              languages: [],
              summary: ''
            },
            status: 'draft',
            isMaster: false,
            journeyId: currentJourney._id.toString(),
            cvType: 'journey',
            templateId: 'executive-professional-layout-template',
            templateName: 'Executive Professional',
            userId: new mongoose.Types.ObjectId(userId),
            metadata: {
              isMaster: false,
              createdVia: 'journey',
              lastModified: new Date(),
              viewCount: 0,
              downloadCount: 0,
              fallbackCreation: true // Flag to indicate this was a fallback creation
            }
          });

          const savedCV = await basicCV.save();
          cvId = savedCV._id.toString();
          usedFallbackContent = true;
          console.log('⚠️ Journey Document Service - Basic CV structure created as fallback:', cvId);
        }
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
      // CRITICAL: Ensure CV exists and has data before generating cover letter
      if (!cvId) {
        console.error('❌ Journey Document Service - Cannot create cover letter: CV must be created first');
        throw new Error('CV must be created before cover letter');
      }

      // Fetch CV to get cvData and ensure it has content
      const cvDocument = await CV.findById(cvId);
      if (!cvDocument || !cvDocument.cvData) {
        console.error('❌ Journey Document Service - CV not found or has no data:', cvId);
        throw new Error('CV not found or has no data');
      }

      // Include metadata in cvData for cover letter generation
      const cvDataWithAnalysis = {
        ...cvDocument.cvData,
        metadata: cvDocument.metadata
      };

      // Generate header from CV and job data
      let header = '';
      let footer = '';
      let body = '';

      try {
        // Generate header
        header = formatCoverLetterHeader(cvDataWithAnalysis, {
          title: currentJourney.jobTitle,
          company: currentJourney.company,
          jobDescription: job.jobDescription || job.description || '',
          location: job.location || '',
          contactPerson: job.contactPerson || 'Hiring Manager',
          ...job.toObject()
        });

        // Generate footer
        footer = formatCoverLetterFooter(cvDataWithAnalysis);

        console.log('✅ Journey Document Service - Generated header and footer from CV/job data');
      } catch (headerFooterError) {
        console.error('⚠️ Journey Document Service - Failed to generate header/footer:', headerFooterError);
      }

      if (shouldTailorDocuments) {
        try {
          console.log('🚀 Journey Document Service - Generating tailored cover letter body with AI...');
          const promptOverride = fillTrackerPrompt('tailored_cover_letter', {
            position: currentJourney.jobTitle,
            company: currentJourney.company,
            experience: serializeExperienceForPrompt(cvDataWithAnalysis),
            'job description': job.jobDescription || job.description || ''
          });

          const generatedCoverLetter = await aiCoverLetterService.generateModularCoverLetter({
            cvData: cvDataWithAnalysis,
            jobData: {
              title: currentJourney.jobTitle,
              company: currentJourney.company,
              jobDescription: job.jobDescription || job.description || '',
              ...job.toObject()
            },
            recipientName: 'Hiring Manager',
            companyName: currentJourney.company,
            promptOverride
          });

          body = generatedCoverLetter.legacyBody;
          coverLetterWasTailored = true;
          console.log('✅ Journey Document Service - Tailored cover letter body generated successfully');
        } catch (generateError) {
          console.error('⚠️ Journey Document Service - Failed to generate tailored cover letter body, using fallback:', generateError);
          usedFallbackContent = true;
        }
      }

      if (!body) {
        if (!shouldTailorDocuments) {
          body = '';
          console.log('✅ Journey Document Service - Using header-only cover letter fallback for non-tailored generation');
        } else {
          usedFallbackContent = true;
          const recipientName = job?.contactPerson || currentJourney.contactPerson || 'Hiring Manager';
          body = `Dear ${recipientName},

I am writing to express my interest in the ${currentJourney.jobTitle} position at ${currentJourney.company}. This version is based on my existing Master CV and is intended as a solid starting point for this application.

My background includes relevant experience and strengths that I can bring to the role, and I would welcome the opportunity to explain how that experience could support your team.

Thank you for your time and consideration. I would welcome the opportunity to discuss my fit for the role.`;
          console.log('✅ Journey Document Service - Using default cover letter body fallback');
        }
      }

      // Merge header, body, footer into content for schema validation
      // The separate fields are still stored for editing purposes

      const coverLetterTitle = `${currentJourney.company}_${currentJourney.jobTitle} | Cover Letter`;

      // Double-check one more time before creating (race condition protection)
      const finalCheck = await CoverLetter.findOne({
        journeyId: currentJourney._id.toString(),
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (finalCheck) {
        coverLetterId = finalCheck._id.toString();
        console.log('✅ Journey Document Service - Cover letter found in final check (race condition prevented):', coverLetterId);
      } else {
        // Merge header, body, footer for the content field (required by schema)
        const mergedContent = mergeCoverLetterContent(header || '', body || '', footer || '');

        const duplicatedCoverLetter = new CoverLetter({
          title: coverLetterTitle,
          content: mergedContent || body || 'Cover letter content will be generated.', // Fallback for validation
          header: header || undefined,
          body: body || undefined,
          footer: footer || undefined,
          status: 'draft',
          userId: new mongoose.Types.ObjectId(userId),
          jobId: currentJourney.jobId,
          journeyId: currentJourney._id.toString(),
          metadata: {
            lastModified: new Date(),
            viewCount: 0,
            downloadCount: 0,
            generatedWithAI: coverLetterWasTailored,
            generationMode: coverLetterWasTailored ? 'tailored' : 'fallback',
            generationReason: getTrackerCoverLetterGenerationReason({
              wasTailored: coverLetterWasTailored,
              tailoringRequested: shouldTailorDocuments
            })
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
    currentJourney.generationState = shouldTailorDocuments && usedFallbackContent
      ? createFailedGenerationState(
        generationEntitlement,
        'We could not finish tailored generation, but fallback drafts were created instead.',
        {
          fallbackCreated: true,
          cvCreated: Boolean(cvId),
          coverLetterCreated: Boolean(coverLetterId)
        }
      )
      : createCompletedGenerationState(generationEntitlement, {
        fallbackCreated: usedFallbackContent,
        cvCreated: Boolean(cvId),
        coverLetterCreated: Boolean(coverLetterId)
      });
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

    // Send notification that documents are ready
    try {
      const notificationService = (await import('./notificationService')).default;
      const { JobApplication } = await import('@/models');

      // Get job details for notification
      const job = await JobApplication.findById(currentJourney.jobId);
      if (job) {
        const documentsReadyMessage = shouldTailorDocuments && !usedFallbackContent
          ? `Your tailored CV and tailored cover letter for ${job.jobTitle} at ${job.company} are ready. Review them in Studio before you apply.`
          : shouldTailorDocuments
            ? `We created fallback application drafts for ${job.jobTitle} at ${job.company} after tailored generation ran into a problem. Review them now or retry later.`
            : `Your non-tailored fallback CV and cover letter for ${job.jobTitle} at ${job.company} are ready to review.`;

        await notificationService.createNotification({
          userId: userId,
          type: 'documents_ready',
          title: shouldTailorDocuments && !usedFallbackContent ? 'Your Tailored Documents Are Ready' : 'Your Tracker Documents Are Ready',
          message: documentsReadyMessage,
          actionType: 'review_job',
          actionData: {
            jobId: job._id.toString(),
            journeyId: journeyId,
            url: `/studio?journeyId=${journeyId}`,
          },
          interactive: true,
          priority: 'high',
          channels: ['in-app'],
          persistent: false,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
          metadata: {
            jobId: job._id.toString(),
            journeyId: journeyId,
            jobTitle: job.jobTitle,
            company: job.company,
            generationMode: currentJourney.generationState?.mode,
            generationStatus: currentJourney.generationState?.status,
          },
        });
        console.log('✅ Journey Document Service - Notification sent for documents ready');
      }
    } catch (notificationError) {
      console.error('⚠️ Journey Document Service - Failed to send notification (non-critical):', notificationError);
      // Don't fail document creation if notification fails
    }

    return {
      success: true,
      cvId,
      coverLetterId,
      generationState: currentJourney.generationState
    };

  } catch (error) {
    console.error('❌ Journey Document Service - Error creating documents:', error);

    // Update journey status to failed
    try {
      const journey = await ApplicationJourney.findById(journeyId);
      if (journey) {
        journey.status = 'creation_failed';
        const failedEntitlement = await getJourneyGenerationEntitlement(userId);
        journey.generationState = createFailedGenerationState(
          failedEntitlement,
          error instanceof Error ? error.message : 'Unknown error',
          {
            fallbackCreated: Boolean(journey.cvId || journey.coverLetterId),
            cvCreated: Boolean(journey.cvId),
            coverLetterCreated: Boolean(journey.coverLetterId)
          }
        );
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

/**
 * Tailor CV content using AI based on job requirements
 */
async function tailorCVContent(cvData: UnifiedCVDataStructure, jobData: any): Promise<UnifiedCVDataStructure | null> {
  try {
    const jobDescription = jobData.jobDescription || jobData.description || '';
    const jobTitle = jobData.title || jobData.jobTitle || 'Target Role';
    const prompt = `${fillTrackerPrompt('tailored_resume', {
      'target position': jobTitle,
      'type of company': deriveCompanyType(jobData),
      'job description': jobDescription,
      'resume content': JSON.stringify(cvData)
    })}

Return ONLY valid JSON with the exact same structure as the input UnifiedCVDataStructure. Do not include markdown or explanation.`;

    const aiResponse = await callAIWithFallback({
      prompt,
      systemPrompt: 'You are a JSON-only API. You must return valid JSON matching the UnifiedCVDataStructure schema.',
      temperature: 0.4,
      maxTokens: 4000
    });

    // Parse the response
    const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return null;
  } catch (error) {
    console.error('Error tailoring CV content:', error);
    return null;
  }
}
