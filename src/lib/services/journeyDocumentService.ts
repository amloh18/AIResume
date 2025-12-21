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
            cvType: 'journey', // CVs created in journey context are journey-based
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

      // Generate cover letter using new format: header, body, footer
      const { formatCoverLetterHeader, formatCoverLetterFooter, mergeCoverLetterContent } = require('@/lib/utils/coverLetterUtils');
      
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

      // Generate body content using AI
      try {
        console.log('🚀 Journey Document Service - Generating cover letter body with AI...');

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
          if (generateResult.success && (generateResult.body || generateResult.content)) {
            body = generateResult.body || generateResult.content;
            console.log('✅ Journey Document Service - Cover letter body generated successfully');
          }
        }
      } catch (generateError) {
        console.error('⚠️ Journey Document Service - Failed to generate cover letter body, using template:', generateError);
      }

      // Fallback to template if AI generation failed
      if (!body) {
        // Check if user has any existing cover letters (to use as template)
        const existingCoverLetter = await CoverLetter.findOne({
          userId: new mongoose.Types.ObjectId(userId)
        }).sort({ createdAt: -1 });

        if (existingCoverLetter && existingCoverLetter.body) {
          body = existingCoverLetter.body;
          console.log('✅ Journey Document Service - Using existing cover letter body as template:', existingCoverLetter._id);
        } else {
          // Create default template body content (ONLY body with salutation, no header/footer)
          const recipientName = job?.contactPerson || currentJourney.contactPerson || 'Hiring Manager';
          body = `Dear ${recipientName},

I am writing to express my strong interest in the ${currentJourney.jobTitle} position at ${currentJourney.company}. With my background and experience, I am excited about the opportunity to contribute to your team.

I am particularly drawn to ${currentJourney.company} and am confident that my skills and experience make me a strong candidate for this position.

I would welcome the opportunity to discuss how my qualifications align with your needs.`;
          console.log('✅ Journey Document Service - Using default cover letter body template');
        }
      }

      // DO NOT merge content - store header, body, footer separately
      // Content will be generated on-the-fly in preview only

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
          content: '', // Leave empty - will be generated in preview only
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
**Role**: Senior Executive Career Architect & ATS Algorithm Expert.
**Goal**: Transform a multi-section Master CV JSON into a Tailored CV JSON that positions the candidate as the "Ideal Hire" (Top 1% match) regardless of domain pivots, seniority gaps, or skill-set outliers.

### 1. LOGICAL GATES (PRIORITY EXECUTION)
- **Tenure Protection**: Calculate (Current Year - Earliest Start Date). If total years < JD Requirement, you MUST include all roles (even outliers/internships). Never omit a role that contributes to the minimum duration threshold.
- **Evidence Verification**: You are FORBIDDEN from adding technical tools (e.g., Python, SQL) not present in the Master CV. You may only use functional synonyms (e.g., "Data Cleaning" for "Data Governance").
- **Reverse Chronology**: Maintain strict newest-to-oldest order for Experience, Projects, and Education.

### 2. SECTION-SPECIFIC TAILORING
- **Summary**: Write a 3-sentence "Hook." Sentence 1: Total years + target role title. Sentence 2: The "Bridge" between user skills and the JD's specific problem. Sentence 3: Alignment with company culture (e.g., "Simpler, Better, Faster").
- **Work Experience**: Transform every bullet into: [Power Verb] + [JD Context] + [Quantifiable Result]. 
    - *If Overskilled*: Focus on "Execution" and "Efficiency." 
    - *If Underskilled*: Focus on "Learning Agility" and "Technical Logic Foundations."
- **Projects**: Rewrite project descriptions to sound like professional business solutions. Prioritize projects that utilize tools mentioned in the JD.
- **Education**: If the degree field is unrelated to the JD, highlight relevant modules, thesis topics, or honors that prove analytical or logical rigor.

### 3. DOMAIN & SENIORITY "SPIN" (OUTLIER HANDLING)
- **Functional Translation**: For career pivoters, translate domain-specific tasks into universal business value. 
    - (Example: Web Dev "API Integration" -> "Streamlined cross-platform data connectivity and integrity").
- **Level Calibration**: Match the "Seniority Vibe." For Junior roles, emphasize "Hands-on tools" and "supporting teams." For Senior roles, emphasize "ROI," "Scalability," and "Stakeholder influence."

### 4. OUTPUT CONSTRAINTS (API STABILITY)
- **Zero Prose**: Return ONLY valid JSON. No conversational text.
- **Schema Lock**: Maintain exact 1:1 key-value mapping from the Input JSON.
- **Title Optimization**: Adjust titles slightly to match JD nomenclature ONLY if truthful (e.g., "Analyst" to "Sales Data Analyst").
- **Metric Retention**: 100% of numerical data from the Master CV must be carried over.

TARGET JOB:
Title: ${jobTitle}
Company: ${company}
Description: ${jobDescription}

CANDIDATE CV DATA (JSON):
${JSON.stringify(cvData)}

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
