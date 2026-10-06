import { NextRequest, NextResponse } from 'next/server';
import { CoverLetter } from '@/models';
import { toObjectId } from '@/lib/db-utils';
import { getConnection } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Cover Letter Duplicate API - Starting duplication request');
    
    // Ensure database connection
    await getConnection();
    console.log('✅ Cover Letter Duplicate API - Database connected');
    
    // Use new authentication system
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      console.log('❌ Cover Letter Duplicate API - No valid authentication found');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = authResult.userId;
    console.log('🔍 Cover Letter Duplicate API - Using authenticated user:', authResult.userEmail);
    
    const body = await request.json();
    const { sourceCoverLetterId, jobId, journeyId, customTitle } = body;

    console.log('🔍 Cover Letter Duplicate API - Request data:', {
      sourceCoverLetterId,
      userId,
      jobId,
      journeyId,
      customTitle
    });

    if (!sourceCoverLetterId) {
      console.error('❌ Cover Letter Duplicate API - Missing required fields:', {
        hasSourceCoverLetterId: !!sourceCoverLetterId,
        sourceCoverLetterId
      });
      return NextResponse.json(
        { error: 'Source Cover Letter ID is required' },
        { status: 400 }
      );
    }

    // Find the source cover letter
    console.log('🔍 Cover Letter Duplicate API - Looking for source cover letter:', sourceCoverLetterId);
    console.log('🔍 Cover Letter Duplicate API - Cover Letter model available:', !!CoverLetter);
    
    const sourceCoverLetter = await CoverLetter.findById(sourceCoverLetterId);
    console.log('🔍 Cover Letter Duplicate API - Cover Letter query result:', {
      found: !!sourceCoverLetter,
      id: sourceCoverLetter?._id,
      title: sourceCoverLetter?.title
    });
    
    if (!sourceCoverLetter) {
      console.error('❌ Cover Letter Duplicate API - Source cover letter not found:', sourceCoverLetterId);
      return NextResponse.json(
        { error: 'Source cover letter not found' },
        { status: 404 }
      );
    }

    // Verify the cover letter belongs to the user
    const userOwnsCoverLetter = sourceCoverLetter.userId?.toString() === userId;
    
    console.log('🔍 Cover Letter Duplicate API - User ownership check:', {
      userId,
      sourceCoverLetterUserId: sourceCoverLetter.userId?.toString(),
      userOwnsCoverLetter
    });

    if (!userOwnsCoverLetter) {
      console.error('❌ Cover Letter Duplicate API - User does not own cover letter:', {
        userId,
        coverLetterUserId: sourceCoverLetter.userId?.toString()
      });
      return NextResponse.json(
        { error: 'Unauthorized: You do not own this cover letter' },
        { status: 403 }
      );
    }

    // Generate unique title
    const baseTitle = customTitle || `${sourceCoverLetter.title} (Copy)`;
    let uniqueTitle = baseTitle;
    let counter = 1;
    
    // Check for existing cover letters with the same title
    while (true) {
      const query: Record<string, any> = { 
        userId: toObjectId(userId),
        title: uniqueTitle 
      };
      
      const existingCoverLetter = await CoverLetter.findOne(query);
      if (!existingCoverLetter) {
        break;
      }
      
      uniqueTitle = `${baseTitle} ${counter}`;
      counter++;
    }

    // Create duplicated cover letter
    const duplicatedCoverLetter = new CoverLetter({
      userId: toObjectId(userId),
      title: uniqueTitle,
      content: sourceCoverLetter.content,
      status: 'draft',
      jobId: jobId ? toObjectId(jobId) : null,
      cvId: sourceCoverLetter.cvId,
      journeyId: journeyId ? toObjectId(journeyId) : null,
      metadata: {
        ...sourceCoverLetter.metadata,
        lastModified: new Date(),
        createdFrom: sourceCoverLetter._id,
        version: 1
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Save the duplicated cover letter
    const savedCoverLetter = await duplicatedCoverLetter.save();
    
    // If journeyId is provided, update the journey to link to the new cover letter
    if (journeyId && jobId) {
      try {
        console.log('🔗 Cover Letter Duplicate API - Linking to journey:', journeyId);
        
        const { ApplicationJourney } = await import('@/models');
        
        // Build query
        const journeyQuery: any = { 
          _id: toObjectId(journeyId),
          jobId: toObjectId(jobId),
          userId: toObjectId(userId)
        };
        
        const updatedJourney = await ApplicationJourney.findOneAndUpdate(
          journeyQuery,
          { 
            coverLetterId: savedCoverLetter._id,
            currentStep: Math.max(4, await ApplicationJourney.findById(toObjectId(journeyId)).then(j => j?.currentStep || 4)),
            status: 'in-progress',
            'metadata.updatedAt': new Date()
          },
          { new: true }
        );
        
        if (updatedJourney) {
          console.log('✅ Cover Letter Duplicate API - Journey updated with new cover letter:', updatedJourney._id);
        } else {
          console.warn('⚠️ Cover Letter Duplicate API - Journey not found for update');
        }
      } catch (error) {
        console.warn('⚠️ Cover Letter Duplicate API - Error linking to journey:', error);
        // Don't fail the duplication if journey linking fails
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        coverLetter: {
          id: savedCoverLetter._id.toString(),
          title: savedCoverLetter.title,
          content: savedCoverLetter.content,
          status: savedCoverLetter.status,
          jobId: savedCoverLetter.jobId,
          cvId: savedCoverLetter.cvId,
          journeyId: savedCoverLetter.journeyId,
          userId: savedCoverLetter.userId,
          lastModified: savedCoverLetter.metadata?.lastModified,
          createdAt: savedCoverLetter.createdAt,
          updatedAt: savedCoverLetter.updatedAt,
          metadata: savedCoverLetter.metadata
        }
      }
    });

  } catch (error) {
    console.error('❌ Cover Letter Duplicate API - Error duplicating cover letter:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate cover letter' },
      { status: 500 }
    );
  }
}
