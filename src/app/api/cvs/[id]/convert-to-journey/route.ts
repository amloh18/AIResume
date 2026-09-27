// @ts-nocheck pre-existing type escape — removal tracked as R14 in docs/application-automation/fix-tasks.md
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import CV from '@/models/CV';
import { JobApplication, CoverLetter } from '@/models';
import ApplicationJourney from '@/models/ApplicationJourney';
import mongoose from 'mongoose';
import { mixedIdFilter } from '@/lib/utils/mixed-id';
import { callGeminiWithAllKeysFallback } from '@/lib/utils/gemini-api-fallback';
import { checkForDuplicate } from '@/lib/jobs/deduplicate';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/cvs/[id]/convert-to-journey
 * Converts a Standalone CV to a Journey CV
 * Also auto-generates a cover letter draft for the journey
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔄 Starting CV to Journey conversion...');

    await getConnection();
    const { id: cvId } = await params;

    // Authenticate user
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    console.log('✅ User authenticated:', authResult.userEmail);

    // Parse request body
    const body = await request.json();
    const { jobData, jobId } = body;

    // Validate CV exists and belongs to user
    const cv = await CV.findOne({
      _id: new mongoose.Types.ObjectId(cvId),
      userId: new mongoose.Types.ObjectId(userId)
    });

    if (!cv) {
      return NextResponse.json(
        { success: false, error: 'CV not found' },
        { status: 404 }
      );
    }

    // Get user to check plan and subscription
    const User = (await import('@/models/User')).default;
    const user = await User.findById(userId).select('currentPlanKey subscription');
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // EDGE CASE 5: Check if user already has a Journey CV before allowing conversion
    if (cv.cvType === 'standalone') {
      const { checkJourneyCVLimit } = await import('@/lib/utils/subscription-helpers');
      const journeyLimitCheck = await checkJourneyCVLimit(
        userId,
        user.currentPlanKey || 'free',
        user.subscription
      );
      
      if (!journeyLimitCheck.allowed && journeyLimitCheck.currentActiveCount > 0) {
        // EDGE CASE 1: Hard gate for 2nd Journey CV
        return NextResponse.json(
          {
            success: false,
            error: journeyLimitCheck.message || 'You already have an active Journey CV. Archive or delete it to create a new one.',
            requiresUpgrade: journeyLimitCheck.upgradeRequired,
            currentActiveCount: journeyLimitCheck.currentActiveCount,
            limit: journeyLimitCheck.limit,
            canDeleteToMakeSpace: journeyLimitCheck.canDeleteToMakeSpace,
            gateType: 'hard'
          },
          { status: 403 }
        );
      }
    }

    // EDGE CASE 2: Check if CV is already linked to a journey
    if (cv.cvType === 'journey' && cv.journeyId) {
      // Check if it's linked to the same journey (idempotent operation)
      if (jobId && cv.journeyId.toString() === jobId) {
        const existingJourney = await ApplicationJourney.findOne({
          jobId: finalJobId,
          userId: new mongoose.Types.ObjectId(userId)
        });
        
        if (existingJourney && existingJourney._id.toString() === cv.journeyId.toString()) {
          return NextResponse.json({
            success: true,
            message: 'CV is already linked to this journey',
            data: {
              cv: {
                id: cv._id.toString(),
                cvType: cv.cvType,
                journeyId: cv.journeyId?.toString()
              },
              journey: {
                id: existingJourney._id.toString(),
                jobId: existingJourney.jobId.toString(),
                cvId: existingJourney.cvId,
                status: existingJourney.status
              }
            }
          });
        }
      }
      
      return NextResponse.json(
        { success: false, error: 'CV is already linked to another journey. Please use a different CV or unlink it first.' },
        { status: 400 }
      );
    }

    let finalJobId = jobId;
    let job: any = null;

    // Create job if not provided
    if (!jobId && jobData) {
      console.log('📝 Creating new job application...');
      try {
        // Dedup check: prevent duplicate jobs per user
        const dedup = await checkForDuplicate(
          new mongoose.Types.ObjectId(userId),
          jobData.title || 'Unknown Role',
          jobData.company || 'Unknown Company'
        );
        if (dedup.isDuplicate && dedup.existingJob) {
          job = dedup.existingJob;
          finalJobId = job._id.toString();
          console.log('⚠️ Duplicate job found, reusing existing:', finalJobId);
        } else {
          job = await JobApplication.create({
            userId: new mongoose.Types.ObjectId(userId),
            jobTitle: jobData.title || 'Unknown Role',
            company: jobData.company || 'Unknown Company',
            jobDescription: jobData.description || jobData.jobDescription,
            status: 'created',
            source: 'cv-builder-pro',
            priority: 'medium',
            tags: [],
            contacts: [],
            interviews: [],
            followUps: [],
            attachments: [],
            isArchived: false
          });
          finalJobId = job._id.toString();
          console.log('✅ Job created:', finalJobId);
        }
      } catch (jobError) {
        // EDGE CASE 3: Job creation fails - don't proceed with CV conversion
        console.error('❌ Convert-to-Journey API - Job creation failed:', jobError);
        return NextResponse.json(
          { success: false, error: 'Job not found. Cannot convert CV to journey.' },
          { status: 400 }
        );
      }
    } else if (jobId) {
      // Verify job exists and belongs to user
      job = await JobApplication.findOne({
        _id: new mongoose.Types.ObjectId(jobId),
        userId: mixedIdFilter(userId)
      });

      if (!job) {
        // EDGE CASE 3: Job not found
        return NextResponse.json(
          { success: false, error: 'Job not found. Cannot convert CV to journey.' },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Job data or job ID required' },
        { status: 400 }
      );
    }

    // Check if journey already exists for this job
    const existingJourney = await ApplicationJourney.findOne({
      jobId: finalJobId,
      userId: new mongoose.Types.ObjectId(userId)
    });

    let journey: any;

    if (existingJourney) {
      // EDGE CASE 8: Check if journey already has auto-created CV
      if (existingJourney.cvId && existingJourney.cvId.toString() !== cvId) {
        console.log('⚠️ Convert-to-Journey API - Journey already has CV, deleting auto-created CV:', existingJourney.cvId);
        try {
          const autoCreatedCV = await CV.findById(existingJourney.cvId);
          if (autoCreatedCV) {
            await CV.deleteOne({ _id: autoCreatedCV._id });
            console.log('✅ Convert-to-Journey API - Auto-created CV deleted:', existingJourney.cvId);
          }
        } catch (deleteError) {
          console.error('⚠️ Convert-to-Journey API - Failed to delete auto-created CV (non-critical):', deleteError);
          // Continue with linking even if deletion fails
        }
      }

      // Update existing journey with CV
      journey = existingJourney;
      journey.cvId = cvId;
      journey.status = 'in-progress';
      journey.lastWorkedOn = new Date();
      await journey.save();
      console.log('✅ Updated existing journey:', journey._id.toString());
    } else {
      // Create new journey
      console.log('📝 Creating new application journey...');
      journey = await ApplicationJourney.create({
        journeyId: `journey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: new mongoose.Types.ObjectId(userId),
        jobId: finalJobId,
        cvId: cvId,
        status: 'in-progress',
        currentStep: 2, // CV tailoring step
        totalSteps: 5,
        jobTitle: job.jobTitle,
        company: job.company,
        journeyType: 'standard',
        steps: [
          {
            stepId: 1,
            name: 'Job Saved',
            status: 'completed',
            completedAt: new Date(),
            data: {}
          },
          {
            stepId: 2,
            name: 'CV Tailoring',
            status: 'active',
            data: {}
          },
          {
            stepId: 3,
            name: 'Cover Letter',
            status: 'pending',
            data: {}
          },
          {
            stepId: 4,
            name: 'ATS Check',
            status: 'pending',
            data: {}
          },
          {
            stepId: 5,
            name: 'Application Ready',
            status: 'pending',
            data: {}
          }
        ],
        lastWorkedOn: new Date(),
        atsScoreHistory: [],
        downloadHistory: [],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          lastAccessedAt: new Date()
        }
      });
      console.log('✅ Journey created:', journey._id.toString());
      
      // EDGE CASE 6: If journey creation fails, rollback would happen in catch block
      // But since we're using create(), if it fails, it will throw and be caught
    }

    // EDGE CASE 7: Retry mechanism for CV update with exponential backoff
    let cvUpdateSuccess = false;
    const maxRetries = 3;
    const retryDelays = [1000, 2000, 4000]; // 1s, 2s, 4s

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Update CV to journey type
        cv.cvType = 'journey';
        cv.journeyId = journey._id;
        await cv.save();
        
        cvUpdateSuccess = true;
        console.log('✅ CV converted to journey type');
        break;
      } catch (updateError) {
        console.error(`⚠️ Convert-to-Journey API - CV update attempt ${attempt + 1} failed:`, updateError);
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
        } else {
          console.error('❌ Convert-to-Journey API - CV update failed after all retries');
          throw new Error('Failed to update CV after multiple attempts. Please try again.');
        }
      }
    }

    if (!cvUpdateSuccess) {
      throw new Error('Failed to update CV');
    }

    // AUTO-GENERATE COVER LETTER (Phase 7)
    // Generate a draft cover letter immediately upon conversion
    let coverLetterId: string | undefined;
    let coverLetterDraft: string | undefined;
    
    try {
      console.log('📝 Auto-generating cover letter for journey...');
      
      // Check if cover letter already exists for this journey
      const existingCoverLetter = await CoverLetter.findOne({
        journeyId: mixedIdFilter(journey._id)
      });
      
      if (existingCoverLetter) {
        coverLetterId = existingCoverLetter._id.toString();
        coverLetterDraft = existingCoverLetter.body;
        console.log('✅ Using existing cover letter:', coverLetterId);
      } else {
        // Generate cover letter body using AI
        const cvData = cv.cvData;
        const jobDescription = job.jobDescription || jobData?.description || '';
        
        if (cvData && jobDescription) {
          const coverLetterBody = await generateCoverLetterBody(
            cvData,
            job.jobTitle,
            job.company,
            jobDescription
          );
          
          if (coverLetterBody) {
            // Create cover letter record
            const coverLetter = await CoverLetter.create({
              userId: new mongoose.Types.ObjectId(userId),
              journeyId: journey._id,
              jobId: finalJobId,
              cvId: cvId,
              status: 'draft',
              header: {
                senderName: cvData.basics?.name || '',
                senderEmail: cvData.basics?.email || '',
                senderPhone: cvData.basics?.phone || '',
                senderAddress: cvData.basics?.location || '',
                recipientName: '',
                recipientTitle: 'Hiring Manager',
                recipientCompany: job.company,
                recipientAddress: '',
                date: new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })
              },
              body: coverLetterBody,
              footer: {
                closing: 'Sincerely,',
                signature: cvData.basics?.name || ''
              },
              metadata: {
                targetRole: job.jobTitle,
                targetCompany: job.company,
                isAIGenerated: true,
                generatedAt: new Date()
              }
            });
            
            coverLetterId = coverLetter._id.toString();
            coverLetterDraft = coverLetterBody;
            
            // Update journey with cover letter
            journey.coverLetterId = coverLetter._id;
            await journey.save();
            
            console.log('✅ Cover letter auto-generated:', coverLetterId);
          }
        }
      }
    } catch (coverLetterError) {
      // Non-critical - log but don't fail the conversion
      console.error('⚠️ Failed to auto-generate cover letter (non-critical):', coverLetterError);
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'CV successfully converted to journey',
      data: {
        cv: {
          id: cv._id.toString(),
          cvType: cv.cvType,
          journeyId: cv.journeyId?.toString()
        },
        journey: {
          id: journey._id.toString(),
          jobId: journey.jobId.toString(),
          cvId: journey.cvId,
          coverLetterId,
          status: journey.status
        },
        job: {
          id: job._id.toString(),
          title: job.jobTitle,
          company: job.company
        },
        coverLetter: coverLetterDraft ? {
          id: coverLetterId,
          draft: coverLetterDraft
        } : undefined
      }
    });

  } catch (error) {
    console.error('❌ Convert to journey error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to convert CV to journey'
      },
      { status: 500 }
    );
  }
}

/**
 * Generate cover letter body using AI
 */
async function generateCoverLetterBody(
  cvData: any,
  jobTitle: string,
  company: string,
  jobDescription: string
): Promise<string | null> {
  try {
    const candidateName = cvData.basics?.name || 'Candidate';
    const candidateSummary = cvData.basics?.summary || '';
    
    // Extract key experiences
    const experiences = (cvData.work || []).slice(0, 3).map((job: any) => 
      `${job.position || 'Role'} at ${job.name || job.company || 'Company'}`
    ).join(', ');
    
    // Extract top skills
    const skills = (cvData.skills || []).slice(0, 8).map((s: any) => 
      s.name || s
    ).join(', ');

    const prompt = `Generate a professional cover letter body for a job application.

## CANDIDATE INFO
Name: ${candidateName}
Summary: ${candidateSummary}
Key Experience: ${experiences}
Top Skills: ${skills}

## JOB DETAILS
Position: ${jobTitle}
Company: ${company}
Job Description: ${jobDescription.substring(0, 1500)}

## INSTRUCTIONS
Write a compelling cover letter body (2-3 paragraphs) that:
1. Opens with enthusiasm for the role and company
2. Highlights relevant experience and skills that match the job requirements
3. Demonstrates understanding of the company/role
4. Closes with a call to action

IMPORTANT RULES:
- Do NOT include salutation (Dear...) or closing (Sincerely...) - just the body paragraphs
- Do NOT hallucinate or invent experiences not mentioned in the candidate info
- Keep it professional and concise (200-300 words)
- Use first person perspective
- Match the tone to the job level

Return ONLY the cover letter body text, no formatting or labels.`;

    const result = await callGeminiWithAllKeysFallback(prompt);
    
    if (result) {
      // Clean up the response
      let cleanedResult = result.trim();
      
      // Remove any accidental salutation/closing
      cleanedResult = cleanedResult
        .replace(/^(Dear|To Whom)[^,]+,?\s*/i, '')
        .replace(/\n?(Sincerely|Best regards|Regards|Yours truly)[,\n].*/is, '')
        .trim();
      
      return cleanedResult;
    }
    
    return null;
  } catch (error) {
    console.error('Cover letter generation failed:', error);
    return null;
  }
}

