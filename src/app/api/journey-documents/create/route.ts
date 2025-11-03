import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { ApplicationJourney } from '@/models';
import { extractUserIdentifier } from '@/lib/firebase-uid-utils';
import mongoose from 'mongoose';

/**
 * Background job endpoint to create CV and cover letter for a journey
 * This is called asynchronously after journey creation
 */
export async function POST(request: NextRequest) {
  try {
    await getConnection();
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Extract user identifier
    const userIdentifier = extractUserIdentifier(request, session);
    
    if (!userIdentifier.id || !userIdentifier.type) {
      return NextResponse.json(
        { success: false, error: 'User identification failed' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { journeyId } = body;

    if (!journeyId) {
      return NextResponse.json(
        { success: false, error: 'Journey ID is required' },
        { status: 400 }
      );
    }

    // Find the journey - simplified for Next Auth only (no Firebase)
    let journey: any = null;
    
    try {
      // First, try with ObjectId
      journey = await ApplicationJourney.findById(journeyId);
      
      // Verify ownership - check userId only (no Firebase)
      if (journey) {
        const journeyUserId = journey.userId?.toString();
        const requestUserId = userIdentifier.type === 'objectid' ? userIdentifier.id : null;
        
        // If we don't have a request userId, try to get it from User collection
        if (!requestUserId && userIdentifier.id) {
          const { User } = await import('@/models');
          const user = await User.findOne({ 
            $or: [
              { _id: userIdentifier.id },
              { email: session?.user?.email }
            ]
          }).lean();
          if (user && journeyUserId !== (user as any)._id.toString()) {
            journey = null; // Ownership doesn't match
          }
        } else if (requestUserId && journeyUserId !== requestUserId) {
          journey = null; // Ownership doesn't match
        }
      }
    } catch (error) {
      console.error('❌ Journey Documents API - Error finding journey by ID:', error);
    }
    
    // If not found, try query approach with userId only
    if (!journey) {
      const { User } = await import('@/models');
      let mongoUserId = userIdentifier.id;
      
      // If userIdentifier is not a valid ObjectId, find user by email
      if (userIdentifier.type !== 'objectid' || !mongoose.Types.ObjectId.isValid(userIdentifier.id)) {
        if (session?.user?.email) {
          const user = await User.findOne({ email: session.user.email }).lean();
          if (user) {
            mongoUserId = (user as any)._id.toString();
          }
        }
      }
      
      journey = await ApplicationJourney.findOne({ 
        _id: journeyId,
        userId: mongoUserId
      });
    }
    
    if (!journey) {
      console.error('❌ Journey Documents API - Journey not found:', { journeyId, userIdentifier });
      return NextResponse.json(
        { success: false, error: 'Journey not found' },
        { status: 404 }
      );
    }

    // Check if documents already exist
    if (journey.cvId && journey.coverLetterId) {
      // Documents already created, update status to ready
      journey.status = 'ready';
      journey.metadata.updatedAt = new Date();
      await journey.save();
      
      return NextResponse.json({
        success: true,
        message: 'Documents already exist',
        data: {
          cvId: journey.cvId,
          coverLetterId: journey.coverLetterId
        }
      });
    }

    // Get job details
    const { JobApplication } = await import('@/models');
    const job = await JobApplication.findById(journey.jobId);
    
    if (!job) {
      journey.status = 'creation_failed';
      journey.metadata.updatedAt = new Date();
      await journey.save();
      
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    // Get MongoDB userId from journey or resolve from userIdentifier (Next Auth only)
    let userId: string;
    if (journey.userId) {
      userId = journey.userId.toString();
    } else {
      // Resolve userId from User collection by email (Next Auth)
      const { User } = await import('@/models');
      let user = null;
      
      if (userIdentifier.type === 'objectid' && mongoose.Types.ObjectId.isValid(userIdentifier.id)) {
        user = await User.findById(userIdentifier.id).lean();
      }
      
      if (!user && session?.user?.email) {
        user = await User.findOne({ email: session.user.email }).lean();
      }
      
      if (!user) {
        console.error('❌ Journey Documents API - User not found:', { userIdentifier, email: session?.user?.email });
        journey.status = 'creation_failed';
        journey.metadata.updatedAt = new Date();
        await journey.save();
        
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }
      userId = (user as any)._id.toString();
    }

    let cvId: string | null = journey.cvId;
    let coverLetterId: string | null = journey.coverLetterId;

    try {
      // Create CV if not exists
      if (!cvId) {
        const { CV } = await import('@/models');
        
        // Check if job has job description - for now, always duplicate master CV
        // In the future, this can be enhanced to create tailored CV if job has description
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
          // Duplicate master CV
          const cvTitle = `${journey.jobTitle}-${journey.company}-CV`;
          
          const duplicatedCV = new CV({
            title: cvTitle,
            cvData: masterCV.cvData,
            data: masterCV.data,
            status: 'draft',
            isMaster: false,
            journeyId: journey._id.toString(),
            templateId: masterCV.templateId,
            templateName: masterCV.templateName,
            templateData: masterCV.templateData,
            styling: masterCV.styling,
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
          
          console.log('✅ Journey Documents API - CV created:', cvId);
        } else {
          console.error('❌ Journey Documents API - Master CV not found');
          throw new Error('Master CV not found');
        }
      }

      // Create Cover Letter if not exists
      if (!coverLetterId) {
        const { CoverLetter } = await import('@/models');
        
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
          console.log('✅ Journey Documents API - Using existing cover letter as template:', existingCoverLetter._id);
        } else {
          // Create default template content
          sourceContent = `Dear Hiring Manager,

I am writing to express my strong interest in the ${journey.jobTitle} position at ${journey.company}. With my background and experience, I am excited about the opportunity to contribute to your team.

I am particularly drawn to ${journey.company} and am confident that my skills and experience make me a strong candidate for this position.

I would welcome the opportunity to discuss how my qualifications align with your needs. Thank you for considering my application. I look forward to hearing from you.

Sincerely,
[Your Name]`;
          console.log('✅ Journey Documents API - Using default cover letter template');
        }
        
        const coverLetterTitle = `${journey.company}_${journey.jobTitle} | Cover_Letter`;
        
        try {
          const duplicatedCoverLetter = new CoverLetter({
            title: coverLetterTitle,
            content: sourceContent || '',
            status: 'draft',
            userId: new mongoose.Types.ObjectId(userId),
            jobId: journey.jobId,
            journeyId: journey._id.toString(),
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
          
          console.log('✅ Journey Documents API - Cover letter created:', coverLetterId);
        } catch (coverLetterError: any) {
          console.error('❌ Journey Documents API - Error creating cover letter:', coverLetterError);
          console.error('❌ Journey Documents API - Cover letter error details:', {
            message: coverLetterError.message,
            stack: coverLetterError.stack,
            errors: coverLetterError.errors
          });
          throw new Error(`Failed to create cover letter: ${coverLetterError.message}`);
        }
      }

      // Update journey with created documents - ensure proper linking
      journey.cvId = cvId;
      journey.coverLetterId = coverLetterId;
      journey.status = 'ready';
      journey.currentStep = Math.max(journey.currentStep, 4); // At least step 4 (CV and Cover Letter created)
      
      // Update step statuses (mapping: Step 2 = CV, Step 3 = ATS, Step 4 = Cover Letter)
      if (journey.steps && Array.isArray(journey.steps)) {
        // Mark step 2 (CV) as completed
        const step2 = journey.steps.find((s: any) => s.stepId === 2);
        if (step2) {
          step2.status = 'completed';
          step2.completedAt = new Date();
        }
        
        // Mark step 4 (Cover Letter) as completed
        const step4 = journey.steps.find((s: any) => s.stepId === 4);
        if (step4) {
          step4.status = 'completed';
          step4.completedAt = new Date();
        }
        
        // Mark step 3 (ATS Check) as active (user needs to calculate manually)
        const step3 = journey.steps.find((s: any) => s.stepId === 3);
        if (step3) {
          step3.status = 'active';
        }
      }
      
      journey.metadata.updatedAt = new Date();
      
      // Save journey and verify it was saved correctly
      const savedJourney = await journey.save();
      console.log('✅ Journey Documents API - Journey updated:', {
        journeyId: savedJourney._id,
        cvId: savedJourney.cvId,
        coverLetterId: savedJourney.coverLetterId,
        status: savedJourney.status
      });
      
      // Verify the save
      if (!savedJourney.cvId || !savedJourney.coverLetterId) {
        console.error('❌ Journey Documents API - Journey not properly updated:', {
          cvId: savedJourney.cvId,
          coverLetterId: savedJourney.coverLetterId
        });
        throw new Error('Journey documents were created but not properly linked');
      }

      console.log('✅ Journey Documents API - Documents created successfully for journey:', journeyId);

      return NextResponse.json({
        success: true,
        message: 'Documents created successfully',
        data: {
          cvId,
          coverLetterId
        }
      });

    } catch (error) {
      console.error('❌ Journey Documents API - Error creating documents:', error);
      
      // Update journey status to failed
      journey.status = 'creation_failed';
      journey.metadata.updatedAt = new Date();
      await journey.save();
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to create documents',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('❌ Journey Documents API - Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

