import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { JobApplication } from '@/models';
import jwt from 'jsonwebtoken';
import type { MyJwtPayload } from '@/types/jwt-payload';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getConnection();
    
    let userId: string;
    
    // Check if this is an extension request (with JWT token)
    const authHeader = request.headers.get('authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Extension request with JWT token
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as MyJwtPayload;
        
        if (decoded.type !== 'extension') {
          console.log('❌ Invalid token type');
          return NextResponse.json(
            { success: false, error: 'Invalid token type' },
            { status: 401 }
          );
        }
        
        userId = decoded.userId || '';
        console.log('✅ Extension token verified for user:', userId);
      } catch (error) {
        console.log('❌ Invalid extension token:', error);
        return NextResponse.json(
          { success: false, error: 'Invalid token' },
          { status: 401 }
        );
      }
    } else {
      // Web interface request with session
      const authResult = await getAuthenticatedUser();
      
      if (!authResult) {
        console.log('❌ No valid authentication found for web request');
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      userId = authResult.userId;
      console.log('✅ Web session verified for user:', userId);
    }
    
    const resolvedParams = await params;

    const job = await JobApplication.findOne({
      _id: resolvedParams.id,
      userId: userId
    });

    if (!job) {
      return NextResponse.json({ 
        success: false,
        message: 'Job not found',
        error: 'Job not found' 
      }, { status: 404 });
    }

    // Helper to convert Date to ISO string for frontend
    const dateToISO = (date: Date | undefined | null): string | undefined => {
      if (!date) return undefined;
      if (date instanceof Date) {
        return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
      }
      return undefined;
    };

    // Transform the job data to match the expected format - include ALL fields from database
    const transformedJob = {
      id: job._id,
      _id: job._id, // Include both id and _id for compatibility
      title: job.jobTitle,
      jobTitle: job.jobTitle, // Include both title and jobTitle for compatibility
      company: job.company,
      location: job.location,
      jobUrl: job.jobUrl,
      jobDescription: job.jobDescription,
      description: job.jobDescription, // For compatibility
      requirements: job.requirements || [],
      responsibilities: job.responsibilities || [],
      salary: job.salary,
      type: job.type || 'full-time',
      remote: job.remote || false,
      postedDate: dateToISO(job.postedDate),
      applicationDeadline: dateToISO(job.applicationDeadline),
      deadline: dateToISO(job.deadline),
      applicationDate: dateToISO(job.applicationDate),
      status: job.status,
      priority: job.priority,
      notes: job.notes,
      sponsorship: job.sponsorship,
      tags: job.tags || [],
      contactDetails: job.contactDetails ? {
        name: job.contactDetails.name || '',
        email: job.contactDetails.email || '',
        phone: job.contactDetails.phone || '',
        role: job.contactDetails.role || ''
      } : { name: '', email: '', phone: '', role: '' },
      interviews: (job.interviews || []).map((iv: any) => ({
        ...iv,
        date: iv.date instanceof Date ? iv.date.toISOString().split('T')[0] : iv.date
      })),
      followUps: (job.followUps || []).map((fu: any) => ({
        ...fu,
        date: fu.date instanceof Date ? fu.date.toISOString().split('T')[0] : fu.date
      })),
      attachments: job.attachments || [],
      source: job.source,
      sourceUrl: job.sourceUrl,
      atsScore: job.atsScore,
      atsAnalysis: job.atsAnalysis,
      statusHistory: (job.statusHistory || []).map((sh: any) => ({
        ...sh,
        changedAt: sh.changedAt instanceof Date ? sh.changedAt.toISOString() : sh.changedAt
      })),
      isArchived: job.isArchived || false,
      // cvId removed - relationships now managed through CVJourney
      userId: job.userId,
      createdAt: job.createdAt instanceof Date ? job.createdAt.toISOString() : job.createdAt,
      updatedAt: job.updatedAt instanceof Date ? job.updatedAt.toISOString() : job.updatedAt
    };

    return NextResponse.json({ 
      success: true,
      data: { job: transformedJob },
      job: transformedJob // Keep for backwards compatibility
    });
  } catch (error) {
    console.error('Error fetching job:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔍 Job Update API - Starting PUT request');
    await getConnection();
    
    let userId: string;
    
    // Check if this is an extension request (with JWT token)
    const authHeader = request.headers.get('authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Extension request with JWT token
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as MyJwtPayload;
        
        if (decoded.type !== 'extension') {
          console.log('❌ Invalid token type');
          return NextResponse.json(
            { success: false, error: 'Invalid token type' },
            { status: 401 }
          );
        }
        
        userId = decoded.userId || '';
        console.log('✅ Extension token verified for user:', userId);
      } catch (error) {
        console.log('❌ Invalid extension token:', error);
        return NextResponse.json(
          { success: false, error: 'Invalid token' },
          { status: 401 }
        );
      }
    } else {
      // Web interface request with session
      const authResult = await getAuthenticatedUser();
      
      if (!authResult) {
        console.log('❌ No valid authentication found for web request');
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      userId = authResult.userId;
      console.log('✅ Web session verified for user:', userId);
    }
    
    const resolvedParams = await params;
    console.log('🔍 Job Update API - Job ID:', resolvedParams.id);

    const body = await request.json();
    console.log('🔍 Job Update API - Request body keys:', Object.keys(body));

    // Get the current job to check for status changes
    const currentJob = await JobApplication.findById(resolvedParams.id);
    console.log('🔍 Job Update API - Current job found:', !!currentJob);
    
    // Track status changes
    if (body.status && body.status !== currentJob?.status) {
      if (!currentJob.statusHistory) {
        currentJob.statusHistory = [];
      }
      currentJob.statusHistory.push({
        status: body.status,
        changedAt: new Date(),
        previousStatus: currentJob.status
      });
    }

    // Prepare update data with proper date conversion
    const updateData = {
      ...body,
      updatedAt: new Date()
    };

    // Convert date strings to Date objects if provided
    if (body.deadline) {
      updateData.deadline = new Date(body.deadline);
    }
    if (body.applicationDate) {
      updateData.applicationDate = new Date(body.applicationDate);
    }

    console.log('🔍 Job Update API - Updating job with data:', Object.keys(updateData));
    
    const job = await JobApplication.findOneAndUpdate(
      {
        _id: resolvedParams.id,
        userId: userId
      },
      updateData,
      { new: true }
    );

    console.log('🔍 Job Update API - Job update result:', !!job);
    
    if (!job) {
      console.log('❌ Job Update API - Job not found for user:', userId);
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check if status changed from 'draft' to 'created' and create journey if needed
    const previousStatus = currentJob?.status;
    const newStatus = body.status || job.status;
    
    if (previousStatus === 'draft' && newStatus === 'created') {
      try {
        const { ApplicationJourney } = await import('@/models');
        const { createJourneyDocuments } = await import('@/lib/services/journeyDocumentService');
        
        // Check if journey already exists for this job
        const existingJourney = await ApplicationJourney.findOne({
          jobId: resolvedParams.id,
          userId: userId
        });
        
        if (!existingJourney) {
          console.log(`🚀 Job Update API - Creating ApplicationJourney for job moved from draft to created: ${resolvedParams.id}`);
          
          // Determine if documents need to be created
          const needsDocuments = true; // Always create documents when moving to created
          const initialStatus = needsDocuments ? 'processing_documents' : 'in-progress';
          
          const journeyData = {
            journeyId: `journey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: new mongoose.Types.ObjectId(userId),
            jobId: resolvedParams.id,
            cvId: null,
            coverLetterId: null,
            status: initialStatus,
            currentStep: 1,
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
                status: 'pending',
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
              lastAccessedAt: new Date(),
              tags: job.source === 'extension' ? ['extension-saved'] : [],
              notes: ''
            }
          };
          
          const newJourney = await ApplicationJourney.create(journeyData);
          console.log('✅ Job Update API - ApplicationJourney created successfully:', newJourney._id);
          
          // Send notification that documents are being generated
          try {
            const notificationService = (await import('@/lib/services/notificationService')).default;
            await notificationService.createNotification({
              userId: userId,
              type: 'documents_ready',
              title: 'Generating Your Documents',
              message: `We're creating your tailored CV and cover letter for ${job.jobTitle} at ${job.company}. You'll be notified when they're ready!`,
              actionType: 'review_job',
              actionData: {
                jobId: job._id.toString(),
                journeyId: newJourney._id.toString(),
                url: `/dashboard?jobId=${job._id}`,
              },
              interactive: false,
              priority: 'medium',
              channels: ['in-app'],
              persistent: false,
              expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000), // Expires in 1 hour (will be replaced by documents ready notification)
              metadata: {
                jobId: job._id.toString(),
                journeyId: newJourney._id.toString(),
                jobTitle: job.jobTitle,
                company: job.company,
                status: 'generating',
              },
            });
            console.log('✅ Job Update API - Notification sent for document generation started');
          } catch (notificationError) {
            console.error('⚠️ Job Update API - Failed to send notification (non-critical):', notificationError);
          }
          
          // If documents need to be created, trigger async creation
          if (needsDocuments && newJourney.status === 'processing_documents') {
            // Call document creation service directly (no HTTP request needed)
            // Run in background to avoid blocking the response
            setImmediate(async () => {
              try {
                console.log('🚀 Job Update API - Starting document creation for journey:', newJourney._id);
                const result = await createJourneyDocuments(newJourney._id.toString(), userId);
                
                if (result.success) {
                  console.log('✅ Job Update API - Document creation completed successfully:', {
                    journeyId: newJourney._id,
                    cvId: result.cvId,
                    coverLetterId: result.coverLetterId
                  });
                } else {
                  console.error('❌ Job Update API - Document creation failed:', result.error);
                }
              } catch (error) {
                console.error('❌ Job Update API - Error in document creation:', error);
                // Journey status will be updated by the service on error
              }
            });
            
            console.log('🚀 Job Update API - Triggered async document creation for journey:', newJourney._id);
          }
        } else {
          console.log(`ℹ️ Job Update API - Journey already exists for job ${resolvedParams.id}, skipping creation`);
        }
      } catch (journeyError) {
        console.error('⚠️ Job Update API - Failed to create ApplicationJourney (non-critical):', journeyError);
        // Don't fail the job update if journey creation fails
      }
    }

    // Update CV journeys with new job data if job title or company changed
    if (body.jobTitle || body.company) {
      try {
        const { ApplicationJourney } = await import('@/models');
        await ApplicationJourney.updateMany(
          { jobId: resolvedParams.id },
          { 
            $set: { 
              jobTitle: job.jobTitle,
              company: job.company,
              'metadata.updatedAt': new Date()
            }
          }
        );
        console.log(`Updated CV journeys with new job data for job ${resolvedParams.id}`);
      } catch (error) {
        console.error('Error updating CV journeys with job data:', error);
        // Don't fail the job update if journey update fails
      }
    }

    // Bidirectional sync: If job status changed to 'applied', mark associated journeys as completed
    if (body.status === 'applied' && job.status === 'applied') {
      try {
        const { ApplicationJourney } = await import('@/models');
        const now = new Date();
        
        // Find and update associated journeys
        const updatedJourneys = await ApplicationJourney.updateMany(
          { 
            jobId: resolvedParams.id,
            userId: userId,
            status: { $ne: 'completed' } // Only update non-completed journeys
          },
          {
            $set: {
              status: 'completed',
              completedAt: now,
              applicationDate: now,
              currentStep: 5,
              'steps.4.status': 'completed',
              'steps.4.completedAt': now
            }
          }
        );

        if (updatedJourneys.modifiedCount > 0) {
          console.log(`✅ Bidirectional sync: Marked ${updatedJourneys.modifiedCount} journeys as completed for job ${resolvedParams.id}`);
        }

        // Send notification when job is applied
        try {
          const notificationService = (await import('@/lib/services/notificationService')).default;
          await notificationService.createNotification({
            userId: userId,
            type: 'job_applied',
            title: 'Application Submitted!',
            message: `Great! You've applied to ${job.jobTitle} at ${job.company}. Good luck!`,
            actionType: 'review_job',
            actionData: {
              jobId: job._id.toString(),
              url: `/dashboard?jobId=${job._id}`,
            },
            interactive: true,
            priority: 'medium',
            channels: ['in-app'],
            persistent: false,
            expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Expires in 3 days
            metadata: {
              jobId: job._id.toString(),
              jobTitle: job.jobTitle,
              company: job.company,
            },
          });
          console.log('✅ Job Update API - Notification sent for job applied');
        } catch (notificationError) {
          console.error('⚠️ Job Update API - Failed to send notification (non-critical):', notificationError);
        }
      } catch (error) {
        console.error('Error in bidirectional sync:', error);
        // Don't fail the job update if journey sync fails
      }
    }

    // Send notification when job moves to interview stage
    if (body.status === 'interview' && previousStatus !== 'interview') {
      try {
        const notificationService = (await import('@/lib/services/notificationService')).default;
        await notificationService.createNotification({
          userId: userId,
          type: 'interview_follow_up',
          title: '🎉 Interview Scheduled!',
          message: `Congratulations! You have an interview for ${job.jobTitle} at ${job.company}. Don't forget to send a follow-up email after the interview to show your continued interest.`,
          actionType: 'review_job',
          actionData: {
            jobId: job._id.toString(),
            url: `/dashboard?jobId=${job._id}`,
          },
          interactive: true,
          priority: 'high',
          channels: ['in-app', 'email'],
          persistent: false,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
          metadata: {
            jobId: job._id.toString(),
            jobTitle: job.jobTitle,
            company: job.company,
            reminderType: 'follow_up_email',
          },
        });
        console.log('✅ Job Update API - Notification sent for interview stage');
      } catch (notificationError) {
        console.error('⚠️ Job Update API - Failed to send interview notification (non-critical):', notificationError);
      }
    }

    // Send notification when job receives an offer
    if (body.status === 'offer' && previousStatus !== 'offer') {
      try {
        const notificationService = (await import('@/lib/services/notificationService')).default;
        await notificationService.createNotification({
          userId: userId,
          type: 'achievement',
          title: '🎊 Job Offer Received!',
          message: `Amazing news! You received an offer for ${job.jobTitle} at ${job.company}. Review the details and make your decision.`,
          actionType: 'review_job',
          actionData: {
            jobId: job._id.toString(),
            url: `/dashboard?jobId=${job._id}`,
          },
          interactive: true,
          priority: 'urgent',
          channels: ['in-app', 'email'],
          persistent: true,
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Expires in 14 days
          metadata: {
            jobId: job._id.toString(),
            jobTitle: job.jobTitle,
            company: job.company,
          },
        });
        console.log('✅ Job Update API - Notification sent for job offer');
      } catch (notificationError) {
        console.error('⚠️ Job Update API - Failed to send offer notification (non-critical):', notificationError);
      }
    }

    // Send notification when job is accepted
    if (body.status === 'accepted' && previousStatus !== 'accepted') {
      try {
        const notificationService = (await import('@/lib/services/notificationService')).default;
        await notificationService.createNotification({
          userId: userId,
          type: 'achievement',
          title: '🎉 Congratulations!',
          message: `You've accepted the offer for ${job.jobTitle} at ${job.company}! Best of luck in your new role!`,
          actionType: 'review_job',
          actionData: {
            jobId: job._id.toString(),
            url: `/dashboard?jobId=${job._id}`,
          },
          interactive: false,
          priority: 'high',
          channels: ['in-app', 'email'],
          persistent: false,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Expires in 30 days
          metadata: {
            jobId: job._id.toString(),
            jobTitle: job.jobTitle,
            company: job.company,
          },
        });
        console.log('✅ Job Update API - Notification sent for job accepted');
      } catch (notificationError) {
        console.error('⚠️ Job Update API - Failed to send accepted notification (non-critical):', notificationError);
      }
    }

    console.log('✅ Job Update API - Job updated successfully:', job._id);
    return NextResponse.json({ job });
  } catch (error) {
    console.error('❌ Job Update API - Error updating job:', error);
    console.error('❌ Job Update API - Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('❌ Job Update API - Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: 'Failed to update job',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getConnection();
    
    let userId: string;
    
    // Check if this is an extension request (with JWT token)
    const authHeader = request.headers.get('authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Extension request with JWT token
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as MyJwtPayload;
        
        if (decoded.type !== 'extension') {
          console.log('❌ Invalid token type');
          return NextResponse.json(
            { success: false, error: 'Invalid token type' },
            { status: 401 }
          );
        }
        
        userId = decoded.userId || '';
        console.log('✅ Extension token verified for user:', userId);
      } catch (error) {
        console.log('❌ Invalid extension token:', error);
        return NextResponse.json(
          { success: false, error: 'Invalid token' },
          { status: 401 }
        );
      }
    } else {
      // Web interface request with session
      const authResult = await getAuthenticatedUser();
      
      if (!authResult) {
        console.log('❌ No valid authentication found for web request');
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      userId = authResult.userId;
      console.log('✅ Web session verified for user:', userId);
    }
    
    const resolvedParams = await params;
    const jobId = resolvedParams.id;

    console.log('🔍 Job DELETE API - Starting cascade deletion for job:', jobId);

    // First, find the job to ensure it exists and user owns it
    const job = await JobApplication.findOne({
      _id: jobId,
      userId: userId
    });

    if (!job) {
      console.log('❌ Job DELETE API - Job not found');
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Import models for cascade deletion
    const { ApplicationJourney, CV, CoverLetter } = await import('@/models');

    // Step 1: Find all journeys associated with this job
    console.log('🔍 Job DELETE API - Finding associated journeys for job:', jobId);
    const journeys = await ApplicationJourney.find({ 
      jobId: jobId.toString() 
    });

    console.log(`🔍 Job DELETE API - Found ${journeys.length} journey(s) associated with job`);

    // Step 2: For each journey, delete associated CV and cover letter
    for (const journey of journeys) {
      console.log('🔍 Job DELETE API - Processing journey:', journey._id);

      // Delete cover letter if it exists
      if (journey.coverLetterId) {
        try {
          console.log('🔍 Job DELETE API - Deleting cover letter:', journey.coverLetterId);
          const coverLetterResult = await CoverLetter.findByIdAndDelete(journey.coverLetterId);
          if (coverLetterResult) {
            console.log('✅ Job DELETE API - Cover letter deleted successfully');
          } else {
            console.log('⚠️ Job DELETE API - Cover letter not found (already deleted)');
          }
        } catch (error) {
          console.error('❌ Job DELETE API - Error deleting cover letter:', error);
          // Continue with deletion even if cover letter deletion fails
        }
      }

      // Delete CV if it exists (check CV object reference only)
      if (journey.cvId) {
        try {
          console.log('🔍 Job DELETE API - Checking CV for deletion:', journey.cvId);
          const cv = await CV.findById(journey.cvId);
          
          if (cv) {
            // Verify CV belongs to the user before deletion (check CV object reference only)
            const cvUserId = cv.userId.toString();
            if (cvUserId === userId) {
              console.log('🔍 Job DELETE API - Deleting CV:', journey.cvId);
              const cvResult = await CV.findByIdAndDelete(journey.cvId);
              if (cvResult) {
                console.log('✅ Job DELETE API - CV deleted successfully');
              }
            } else {
              console.warn('⚠️ Job DELETE API - CV does not belong to user, skipping deletion');
            }
          } else {
            console.log('⚠️ Job DELETE API - CV not found (already deleted)');
          }
        } catch (error) {
          console.error('❌ Job DELETE API - Error deleting CV:', error);
          // Continue with deletion even if CV deletion fails
        }
      }

      // Delete the journey itself
      try {
        console.log('🔍 Job DELETE API - Deleting journey:', journey._id);
        await ApplicationJourney.findByIdAndDelete(journey._id);
        console.log('✅ Job DELETE API - Journey deleted successfully');
      } catch (error) {
        console.error('❌ Job DELETE API - Error deleting journey:', error);
        // Continue with job deletion even if journey deletion fails
      }
    }

    // Step 3: Finally, delete the job itself
    console.log('🔍 Job DELETE API - Deleting job:', jobId);
    const deletedJob = await JobApplication.findOneAndDelete({
      _id: jobId,
      userId: userId
    });

    if (!deletedJob) {
      console.log('❌ Job DELETE API - Job deletion failed (may have been deleted already)');
      return NextResponse.json({ error: 'Job deletion failed' }, { status: 500 });
    }

    console.log('✅ Job DELETE API - Job and all associated data deleted successfully');
    return NextResponse.json({ 
      message: 'Job deleted successfully',
      deletedJourneys: journeys.length,
      deletedCVs: journeys.filter(j => j.cvId).length,
      deletedCoverLetters: journeys.filter(j => j.coverLetterId).length
    });
  } catch (error) {
    console.error('Error deleting job:', error);
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    );
  }
}
