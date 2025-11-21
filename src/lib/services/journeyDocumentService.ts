import mongoose from 'mongoose';
import { ApplicationJourney, CV, CoverLetter, JobApplication } from '@/models';
import { callAIWithFallback } from '@/lib/utils/ai-api-helper';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

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
          let duplicatedCvData = masterCV.cvData ? JSON.parse(JSON.stringify(masterCV.cvData)) : masterCV.cvData;

          // TAILOR CV CONTENT
          try {
            console.log('🚀 Journey Document Service - Tailoring CV content for job...');
            const tailoredCvData = await tailorCVContent(duplicatedCvData, job);
            if (tailoredCvData) {
              duplicatedCvData = tailoredCvData;
              console.log('✅ Journey Document Service - CV content tailored successfully');
            }
          } catch (tailorError) {
            console.error('⚠️ Journey Document Service - Failed to tailor CV content, using master CV content:', tailorError);
            // Fallback to master CV content is already set in duplicatedCvData
          }

          // Ensure structure and content are preserved
          if (duplicatedCvData && !duplicatedCvData.structure) {
            // If master CV doesn't have structure, it will be initialized in studio
            // But we preserve all existing data
            console.log('⚠️ Journey Document Service - Master CV missing structure, will be initialized in studio');
          }

          const duplicatedCV = new CV({
            title: cvTitle,
            cvData: duplicatedCvData, // Tailored or Master content
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
              createdVia: 'journey', // CVs created from master CV in journey should have createdVia: 'journey'
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

      // Ensure CV has AI analysis - generate if missing
      let cvDataWithAnalysis = cvDocument.cvData;
      if (!cvDocument.metadata?.aiAnalysis) {
        console.log('⚠️ Journey Document Service - CV missing AI analysis, generating...');
        try {
          // Call career analysis API directly using internal server-side approach
          // Use the analysis functions directly if possible, otherwise use fetch with proper URL
          const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const analysisResponse = await fetch(`${baseUrl}/api/ai/career-analysis`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cvData: cvDocument.cvData,
              jobData: job,
              userId: userId
            })
          });

          if (analysisResponse.ok) {
            const analysisResult = await analysisResponse.json();
            if (analysisResult.success && analysisResult.analysis) {
              // Update CV with AI analysis
              cvDocument.metadata = cvDocument.metadata || {};
              cvDocument.metadata.aiAnalysis = analysisResult.analysis;
              await cvDocument.save();
              cvDataWithAnalysis = {
                ...cvDocument.cvData,
                metadata: {
                  ...cvDocument.metadata,
                  aiAnalysis: analysisResult.analysis
                }
              };
              console.log('✅ Journey Document Service - AI analysis generated and saved to CV');
            }
          }
        } catch (analysisError) {
          console.error('⚠️ Journey Document Service - Failed to generate AI analysis, continuing without it:', analysisError);
          // Continue without AI analysis - cover letter will still be generated
        }
      } else {
        // Include metadata in cvData for cover letter generation
        cvDataWithAnalysis = {
          ...cvDocument.cvData,
          metadata: cvDocument.metadata
        };
      }

      // Generate cover letter content using AI with the new 3-paragraph, experience-level-based logic
      let generatedContent = '';
      try {
        console.log('🚀 Journey Document Service - Generating cover letter content with AI (3-paragraph, experience-level-based)...');

        // Call cover letter generation API with cvData including metadata
        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const generateResponse = await fetch(`${baseUrl}/api/ai/cover-letter-generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cvData: cvDataWithAnalysis,
            jobData: {
              title: currentJourney.jobTitle,
              company: currentJourney.company,
              jobDescription: job.jobDescription || job.description || '',
              ...job.toObject()
            },
            recipientName: 'Hiring Manager',
            companyName: currentJourney.company
          })
        });

        if (generateResponse.ok) {
          const generateResult = await generateResponse.json();
          if (generateResult.success && generateResult.content) {
            generatedContent = generateResult.content;
            console.log('✅ Journey Document Service - Cover letter content generated successfully with new logic');
          }
        }
      } catch (generateError) {
        console.error('⚠️ Journey Document Service - Failed to generate cover letter content, using template:', generateError);
      }

      // Fallback to template if AI generation failed
      if (!generatedContent) {
        // Check if user has any existing cover letters (to use as template)
        const existingCoverLetter = await CoverLetter.findOne({
          userId: new mongoose.Types.ObjectId(userId)
        }).sort({ createdAt: -1 });

        if (existingCoverLetter) {
          generatedContent = existingCoverLetter.content || '';
          console.log('✅ Journey Document Service - Using existing cover letter as template:', existingCoverLetter._id);
        } else {
          // Create default template content
          generatedContent = `Dear Hiring Manager,

I am writing to express my strong interest in the ${currentJourney.jobTitle} position at ${currentJourney.company}. With my background and experience, I am excited about the opportunity to contribute to your team.

I am particularly drawn to ${currentJourney.company} and am confident that my skills and experience make me a strong candidate for this position.

I would welcome the opportunity to discuss how my qualifications align with your needs. Thank you for considering my application. I look forward to hearing from you.

Sincerely,
[Your Name]`;
          console.log('✅ Journey Document Service - Using default cover letter template');
        }
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
          content: generatedContent || '',
          status: 'draft',
          userId: new mongoose.Types.ObjectId(userId),
          jobId: currentJourney.jobId,
          journeyId: currentJourney._id.toString(),
          metadata: {
            lastModified: new Date(),
            viewCount: 0,
            downloadCount: 0,
            generatedWithAI: !!generatedContent && generatedContent !== ''
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

    // Send notification that documents are ready
    try {
      const notificationService = (await import('./notificationService')).default;
      const { JobApplication } = await import('@/models');

      // Get job details for notification
      const job = await JobApplication.findById(currentJourney.jobId);
      if (job) {
        await notificationService.createNotification({
          userId: userId,
          type: 'documents_ready',
          title: '✨ Your Documents Are Ready!',
          message: `Your tailored CV and cover letter for ${job.jobTitle} at ${job.company} are ready. Edit them in Studio or apply to the job now!`,
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

/**
 * Tailor CV content using AI based on job requirements
 */
async function tailorCVContent(cvData: UnifiedCVDataStructure, jobData: any): Promise<UnifiedCVDataStructure | null> {
  try {
    const jobDescription = jobData.jobDescription || jobData.description || '';
    const jobTitle = jobData.title || jobData.jobTitle || 'Target Role';
    const company = jobData.company || jobData.companyName || 'Target Company';

    const prompt = `
    You are an expert Senior HR Recruiter and CV Writer.
    Your task is to TAILOR the candidate's CV specifically for the target job.

    TARGET JOB:
    Title: ${jobTitle}
    Company: ${company}
    Description: ${jobDescription}

    CANDIDATE CV DATA (JSON):
    ${JSON.stringify(cvData)}

    INSTRUCTIONS:
    1. **Filter Experience**: Remove work experiences that are completely irrelevant to the target role, or very old (>15 years) unless they show critical leadership or foundational skills relevant to the job. Keep the most recent and relevant roles.
    2. **Enhance Bullet Points**: Rewrite bullet points for the remaining roles.
       - Use the Challenge-Action-Result (CAR) framework.
       - Incorporate keywords from the Job Description naturally.
       - Focus on achievements and impact (quantifiable metrics).
       - Remove generic responsibilities.
    3. **Skill Gap Analysis**: Identify skills in the JD that the candidate likely possesses based on their experience but hasn't explicitly listed. Add these to the "skills" section if appropriate.
    4. **Professional Summary**: Rewrite the summary to pitch the candidate specifically for this role, highlighting the match between their experience and the JD requirements.
    5. **HR Perspective**: Ensure the tone is professional, confident, and optimized for how an HR manager scans a CV (clear headings, impact-first).

    OUTPUT FORMAT:
    Return ONLY the valid JSON of the tailored CV data. The structure must match the input JSON structure exactly (UnifiedCVDataStructure).
    Do not include any markdown formatting or explanation. Just the JSON.
    `;

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
