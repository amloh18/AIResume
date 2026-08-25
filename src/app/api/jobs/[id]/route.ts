
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { JobApplication } from '@/models';
import jwt from 'jsonwebtoken';
import type { MyJwtPayload } from '@/types/jwt-payload';
import mongoose from 'mongoose';
import {
  createQueuedGenerationState,
  getJourneyGenerationEntitlement
} from '@/lib/utils/journey-generation';

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

    const jobAny = job as any;
    // Transform the job data to match the expected format - include ALL fields from database
    const transformedJob = {
      _id: job._id.toString(),
      id: job._id.toString(),
      title: job.jobTitle, // Ensure title is always present for frontend compatibility
      jobTitle: job.jobTitle, // Include both title and jobTitle for compatibility
      company: job.company,
      companyLogo: jobAny.companyLogo,
      location: job.location,
      jobUrl: job.jobUrl,
      jobDescription: job.jobDescription,
      description: job.jobDescription, // For compatibility
      requirements: jobAny.requirements || [],
      responsibilities: jobAny.responsibilities || [],
      salary: job.salary,
      type: jobAny.type || 'full-time',
      remote: jobAny.remote || false,
      postedDate: dateToISO(jobAny.postedDate),
      applicationDeadline: dateToISO(jobAny.applicationDeadline || job.deadline),
      deadline: dateToISO(job.deadline),
      applicationDate: dateToISO(job.applicationDate),
      appliedAt: job.appliedAt instanceof Date ? job.appliedAt.toISOString() : (job.appliedAt || undefined),
      status: job.status,
      priority: job.priority,
      notes: job.notes,
      sponsorship: jobAny.sponsorship,
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
      sourceUrl: jobAny.sourceUrl,
      atsScore: jobAny.atsScore,
      matchScore: jobAny.matchScore,
      trustScore: jobAny.trustScore,
      trustSnapshot: jobAny.trustSnapshot,
      transparencySnapshot: jobAny.transparencySnapshot,
      interviewCoach: jobAny.interviewCoach,
      extractedJd: jobAny.extractedJd,
      atsAnalysis: jobAny.atsAnalysis,
      statusHistory: (jobAny.statusHistory || []).map((sh: any) => ({
        ...sh,
        changedAt: sh.changedAt instanceof Date ? sh.changedAt.toISOString() : sh.changedAt
      })),
      isArchived: jobAny.isArchived || false,
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
    console.log('🔍 Job Update API - User ID:', userId);

    // Normalize userId for query
    const normalizedUserId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;

    const body = await request.json();
    console.log('🔍 Job Update API - Request body keys:', Object.keys(body));

    // Get the current job to check for status changes - also verify it belongs to the user
    // Find by ID first, then verify user ownership manually
    let currentJob: any = null;
    if (mongoose.Types.ObjectId.isValid(resolvedParams.id)) {
      const jobId = new mongoose.Types.ObjectId(resolvedParams.id);
      currentJob = await JobApplication.findOne({ _id: jobId });
    }
    if (!currentJob) {
      currentJob = await JobApplication.findOne({
        $or: [
          { _id: resolvedParams.id },
          { id: resolvedParams.id },
          { jobId: resolvedParams.id }
        ]
      });
    }

    if (!currentJob) {
      console.log('❌ Job Update API - Job not found (checked ID: ' + resolvedParams.id + ')');
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }

    // Ownership check
    if (currentJob.userId && userId) {
      const jobUserIdStr = currentJob.userId.toString();
      const requestUserIdStr = userId.toString();

      if (jobUserIdStr !== requestUserIdStr) {
        console.log(`❌ Job Update API - Ownership mismatch. Job: ${jobUserIdStr}, Request: ${requestUserIdStr}`);
        return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
      } else {
        console.log(`✅ Job Update API - Ownership verified via string comparison`);
      }
    }

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

    // Remove immutable/system fields to prevent MongoServerError or schema violations
    delete updateData.id;
    delete updateData._id;
    delete updateData.userId;
    delete updateData.createdAt;
    delete updateData.__v;

    // Record the moment an application is actually submitted: the first time a
    // job reaches an applied-like status. Used by the streak/dashboard metrics
    // to count real applications this week (not jobs merely created this week).
    const appliedLikeStatuses = ['applied', 'screening', 'interview', 'offer', 'accepted'];
    if (body.status && appliedLikeStatuses.includes(body.status) && !currentJob?.appliedAt) {
      updateData.appliedAt = new Date();
    }

    // Convert date strings to Date objects if provided
    if (body.deadline) {
      updateData.deadline = new Date(body.deadline);
    }
    if (body.applicationDate) {
      updateData.applicationDate = new Date(body.applicationDate);
    }

    console.log('🔍 Job Update API - Updating job with data:', Object.keys(updateData));
    if (updateData.matchScore !== undefined) {
      console.log('🔍 Job Update API - Updating matchScore:', updateData.matchScore);
    }

    // Check if we are updating a saved job
    if (currentJob.status === 'saved') {
      console.log('🔍 Job Update API - Updating SAVED job. ID:', resolvedParams.id);
    }

    // VALIDATION: Prevent invalid status transitions
    const validStatuses = ['saved', 'created', 'applied', 'screening', 'interview', 'offer', 'rejected', 'accepted', 'withdrawn'];
    const newStatus = body.status;
    if (newStatus && !validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { error: `Invalid status: ${newStatus}. Valid statuses are: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // VALIDATION: Prevent status manipulation that could bypass credit checks
    // Don't allow changing from 'created' back to 'saved' (prevents credit refund exploit)
    const previousStatus = currentJob?.status;
    if (previousStatus === 'created' && newStatus === 'saved') {
      return NextResponse.json(
        {
          error: 'Cannot change job status from "created" to "saved". Once a job is created, it cannot be reverted to saved status.',
          code: 'INVALID_STATUS_TRANSITION'
        },
        { status: 400 }
      );
    }

    // RATE LIMITING: Prevent rapid-fire status change requests
    if (newStatus && previousStatus !== newStatus) {
      try {
        const { rateLimiter } = await import('@/lib/rate-limiter');

        const keyGenerator = (req: any) => {
          return `job_status_change:user:${userId}`;
        };

        const rateLimitResult = await rateLimiter.checkLimit(request, {
          windowMs: 60 * 1000, // 1 minute window
          maxRequests: 20, // Max 20 status changes per minute per user
          keyGenerator
        });

        if (!rateLimitResult.allowed) {
          console.log(`⚠️ Rate limit exceeded for status change by user: ${userId}`);
          return NextResponse.json(
            {
              error: 'Too many status change requests. Please wait a moment.',
              retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
            },
            {
              status: 429,
              headers: {
                'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
                'X-RateLimit-Limit': '20',
                'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
                'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
              }
            }
          );
        }
      } catch (rateLimitError) {
        // Fail open - if rate limiting fails, allow the request
        console.warn('⚠️ Rate limiting check failed for status change, allowing request:', rateLimitError);
      }
    }

    // Check if status changed from 'saved' to 'created' - handle this in transaction
    let job: any = null;
    let jobLimitInfo: any = null;

    if (previousStatus === 'saved' && newStatus === 'created') {
      // ATOMIC OPERATION: Use transaction to ensure credit check + status update + credit spending are atomic
      // This prevents race conditions where multiple requests could bypass credit limits
      try {
        const { withTransaction } = await import('@/lib/utils/db-transaction');
        const User = (await import('@/models/User')).default;
        const creditService = await import('@/lib/services/creditService');
        const { getAdminPricingPlan } = await import('@/models/admin-models');

        // Pre-load pricing plan data outside transaction for better performance
        const PricingPlan = await getAdminPricingPlan();

        await withTransaction(async (session) => {
          // 1. JOB LIMIT CHECK: Check count-based limit WITHIN transaction (locks user record to prevent race conditions)
          const user = session
            ? await User.findById(normalizedUserId).session(session)
            : await User.findById(normalizedUserId);
          if (!user) {
            throw new Error('User not found');
          }

          // Check time-based access quickly
          const now = new Date();
          let hasTimeAccess = true;
          if (user.subscription?.accessExpiresAt) {
            hasTimeAccess = new Date(user.subscription.accessExpiresAt) > now;
          } else if (user.subscription?.currentPeriodEnd) {
            hasTimeAccess = new Date(user.subscription.currentPeriodEnd) > now;
          }

          if (!hasTimeAccess && user.currentPlanKey !== 'free') {
            throw new Error('Subscription access expired');
          }

          // Check job limit (count-based, not credit-based)
          const { checkJobLimit } = await import('@/lib/utils/subscription-helpers');
          const jobLimitCheck = await checkJobLimit(
            normalizedUserId.toString(),
            user.currentPlanKey || 'free',
            user.subscription
          );
          jobLimitInfo = jobLimitCheck;

          console.log(`🔍 Job Update API - Job limit check result (in transaction):`, {
            allowed: jobLimitCheck.allowed,
            currentCount: jobLimitCheck.currentCount,
            limit: jobLimitCheck.limit,
            message: jobLimitCheck.message
          });

          if (!jobLimitCheck.allowed) {
            const reason = jobLimitCheck.message || `Job limit exceeded. You have ${jobLimitCheck.currentCount}/${jobLimitCheck.limit} jobs`;
            console.log(`❌ Job Update API - Job limit check failed (in transaction):`, reason);
            throw new Error(reason);
          }

          // 2. Update job status within transaction (only if limit allows)
          // Merge with other update data if provided
          const statusUpdateData = {
            ...updateData,
            status: 'created',
            updatedAt: new Date()
          };

          const updatedJob = await JobApplication.findOneAndUpdate(
            {
              _id: new mongoose.Types.ObjectId(resolvedParams.id),
              userId: normalizedUserId
            },
            statusUpdateData,
            { new: true, ...(session && { session }) }
          );

          if (!updatedJob) {
            throw new Error('Job not found');
          }

          // Store updated job for later use
          job = updatedJob;

          // 3. Track job creation (no credit spending - jobs are count-based now)
          // Still track total created for analytics
          const userUpdateData: any = {
            $inc: {
              'credits.totalCreated.jobs': 1
            }
          };

          // Ensure nested structure exists
          if (!user.credits?.totalCreated || user.credits.totalCreated.jobs === undefined) {
            const currentJobs = user.credits?.totalCreated?.jobs ?? 0;
            userUpdateData.$set = {
              'credits.totalCreated.jobs': currentJobs + 1,
              'credits.totalCreated.cvs': user.credits?.totalCreated?.cvs ?? 0,
              'credits.totalCreated.exports': user.credits?.totalCreated?.exports ?? 0,
              'credits.totalCreated.atsChecks': user.credits?.totalCreated?.atsChecks ?? 0
            };
            if (userUpdateData.$inc && 'credits.totalCreated.jobs' in userUpdateData.$inc) {
              delete userUpdateData.$inc['credits.totalCreated.jobs'];
              if (Object.keys(userUpdateData.$inc).length === 0) {
                delete userUpdateData.$inc;
              }
            }
          }

          // Update user job count tracking within transaction
          await User.findByIdAndUpdate(
            normalizedUserId,
            userUpdateData,
            { new: true, runValidators: true, ...(session && { session }) }
          );

          console.log(`✅ Job Update API - Job status updated in transaction for user: ${normalizedUserId.toString()}`);
        });

        // Log job status change OUTSIDE transaction for better performance
        try {
          const updatedJobForLog = await JobApplication.findById(resolvedParams.id).lean() as any;
          const userForLog = await User.findById(normalizedUserId).lean() as { currentPlanKey?: string; email?: string; jobTitle?: string; company?: string } | null;

          if (updatedJobForLog && userForLog) {
            const { ActivityLogService } = await import('@/lib/services/activityLogService');
            const isUnlimited = ['focused_monthly', 'focused_quarterly', 'focused_yearly'].includes(userForLog.currentPlanKey || 'free');

            // Log asynchronously - don't wait for it
            Promise.all([
              ActivityLogService.logUserAction({
                userId: normalizedUserId.toString(),
                userEmail: userForLog.email || '',
                action: 'job_status_changed',
                resourceType: 'job',
                resourceId: resolvedParams.id,
                resourceName: `${updatedJobForLog.jobTitle} at ${updatedJobForLog.company}`,
                status: 'success',
                ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] ||
                  request.headers.get('x-real-ip') ||
                  undefined,
                metadata: {
                  oldStatus: previousStatus || 'saved',
                  newStatus: newStatus || 'created',
                  isUnlimited: !jobLimitInfo || jobLimitInfo.limit === -1,
                  jobsRemaining: (!jobLimitInfo || jobLimitInfo.limit === -1) ? -1 : Math.max(0, jobLimitInfo.limit - jobLimitInfo.currentCount - 1)
                }
              })
            ]).catch(logError => {
              console.error('Failed to log job status change activity:', logError);
              // Don't fail the request if logging fails
            });
          }
        } catch (logError) {
          console.error('Failed to set up activity logging:', logError);
          // Don't fail the request if logging fails
        }
      } catch (creditError: any) {
        console.error('❌ Job Update API - Transaction failed:', creditError);
        console.error('❌ Job Update API - Error details:', {
          message: creditError.message,
          stack: creditError.stack,
          name: creditError.name
        });

        // Transaction automatically rolled back - status remains 'saved', limit check prevents status change

        // Check if error is due to job limit exceeded
        const isLimitError = creditError.message?.includes('limit exceeded') ||
          creditError.message?.includes('Job limit exceeded') ||
          creditError.message?.includes('Tracker full');

        if (isLimitError) {
          // Extract job limit info from error if available
          const { checkJobLimit } = await import('@/lib/utils/subscription-helpers');
          let limitInfo: any = {};
          try {
            const User = (await import('@/models/User')).default;
            const user = await User.findById(normalizedUserId).select('currentPlanKey subscription');
            if (user) {
              const jobLimitCheck = await checkJobLimit(
                normalizedUserId.toString(),
                user.currentPlanKey || 'free',
                user.subscription
              );
              limitInfo = {
                currentCount: jobLimitCheck.currentCount,
                limit: jobLimitCheck.limit,
                message: jobLimitCheck.message,
                requiresUpgrade: jobLimitCheck.upgradeRequired
              };
            }
          } catch (e) {
            // Fallback if limit check fails - use defaults
            console.error('⚠️ Job Update API - Failed to get job limit info:', e);
            limitInfo = {
              currentCount: 3,
              limit: 3,
              message: creditError.message || 'Job limit exceeded',
              requiresUpgrade: true
            };
          }

          const errorResponse = {
            success: false,
            error: creditError.message || limitInfo.message || 'Job limit exceeded',
            requiresUpgrade: limitInfo.requiresUpgrade ?? true,
            currentCount: limitInfo.currentCount ?? 3,
            limit: limitInfo.limit ?? 3,
            gateType: 'hard',
            message: 'Upgrade to Pro for unlimited job applications'
          };

          console.log('🔍 Job Update API - Returning job limit error response:', errorResponse);

          return NextResponse.json(
            errorResponse,
            { status: 403 }
          );
        }

        // For other transaction errors, check if they might be credit-related
        const mightBeCreditError = creditError.message?.includes('limit') ||
          creditError.message?.includes('credit') ||
          creditError.message?.includes('Plan limit');

        if (mightBeCreditError) {
          // Try to get credit info even if transaction failed
          const usageLimitsService = await import('@/lib/services/usageLimitsService');
          let creditInfo: any = { currentUsage: 1, limit: 1 };
          try {
            const creditCheck = await usageLimitsService.default.checkUsageLimit({
              userId,
              action: 'job_create'
            });
            creditInfo = {
              currentUsage: creditCheck.currentUsage,
              limit: creditCheck.limit
            };
          } catch (e) {
            console.error('⚠️ Job Update API - Failed to get credit info after transaction error:', e);
          }

          return NextResponse.json(
            {
              success: false,
              error: creditError.message || 'Insufficient credits to create job application',
              requiresUpgrade: true,
              currentUsage: creditInfo.currentUsage ?? 1,
              limit: creditInfo.limit ?? 1,
              message: 'Buy premium plans to create automatic CV and CL with ATS for multiple jobs'
            },
            { status: 403 } // Return 403 instead of 500 for credit errors
          );
        }

        // For other errors, return detailed error message
        return NextResponse.json(
          {
            success: false,
            error: creditError.message || 'Failed to process credit transaction. Please try again.',
            details: process.env.NODE_ENV === 'development' ? creditError.message : undefined
          },
          { status: 500 }
        );
      }
    } else {
      // For non-saved-to-created updates, update job normally
      // Use normalizedUserId to match the initial findOne query
      job = await JobApplication.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(resolvedParams.id),
          userId: normalizedUserId
        },
        updateData,
        { new: true }
      );

      console.log('🔍 Job Update API - Job update result:', !!job);
      console.log('🔍 Job Update API - Query used:', {
        _id: resolvedParams.id,
        userId: normalizedUserId.toString(),
        userIdType: typeof normalizedUserId
      });

      if (!job) {
        console.log('❌ Job Update API - Job not found for user:', userId);
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
    }

    let trackerGenerationPreview: any = null;

    // Create ApplicationJourney after credit is spent (only if moved to created)
    if (previousStatus === 'saved' && newStatus === 'created') {
      try {
        const { ApplicationJourney } = await import('@/models');
        const { createJourneyDocuments } = await import('@/lib/services/journeyDocumentService');
        const generationEntitlement = await getJourneyGenerationEntitlement(userId);
        trackerGenerationPreview = createQueuedGenerationState(generationEntitlement);

        // Check if journey already exists for this job
        const existingJourney = await ApplicationJourney.findOne({
          jobId: resolvedParams.id,
          userId: userId
        });

        if (!existingJourney) {
          console.log(`🚀 Job Update API - Creating ApplicationJourney for job moved from saved to created: ${resolvedParams.id}`);

          // Determine if documents need to be created
          const needsDocuments = true; // Always create documents when moving to created
          const initialStatus = needsDocuments ? 'processing_documents' : 'in-progress';

          // Check for stage change and send notification
          if (body.status && currentJob.status !== body.status && job) {
            try {
              const notificationService = (await import('@/lib/services/notificationService')).default;
              await notificationService.notifyJobStageMoved(
                userId,
                job.jobTitle,
                job._id.toString(),
                body.status,
                currentJob.status
              );
            } catch (notifError) {
              console.error('Failed to send stage move notification:', notifError);
            }
          }

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
            generationState: trackerGenerationPreview,
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
              message: generationEntitlement.mode === 'tailored'
                ? `We're generating a tailored CV and cover letter for ${job.jobTitle} at ${job.company} using your Master CV and this job description.`
                : `We're generating a non-tailored CV and cover letter for ${job.jobTitle} at ${job.company} based on your Master CV because tailored generation is unavailable right now.`,
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
                generationMode: generationEntitlement.mode,
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

          // If existing journey doesn't have documents yet, trigger document creation
          if (!existingJourney.cvId && !existingJourney.coverLetterId && (existingJourney.status !== 'processing_documents' || !existingJourney.generationState)) {
            console.log(`🚀 Job Update API - Existing journey found without documents, triggering document creation for journey: ${existingJourney._id}`);

            // Refresh queue state so retry/recovery messaging stays accurate
            await ApplicationJourney.updateOne(
              { _id: existingJourney._id },
              {
                $set: {
                  status: 'processing_documents',
                  generationState: createQueuedGenerationState(generationEntitlement),
                  'metadata.updatedAt': new Date()
                }
              }
            );

            // Trigger document creation in background
            setImmediate(async () => {
              try {
                console.log('🚀 Job Update API - Starting document creation for existing journey:', existingJourney._id);
                const result = await createJourneyDocuments(existingJourney._id.toString(), userId);

                if (result.success) {
                  console.log('✅ Job Update API - Document creation completed successfully for existing journey:', {
                    journeyId: existingJourney._id,
                    cvId: result.cvId,
                    coverLetterId: result.coverLetterId
                  });
                } else {
                  console.error('❌ Job Update API - Document creation failed for existing journey:', result.error);
                }
              } catch (error) {
                console.error('❌ Job Update API - Error in document creation for existing journey:', error);
              }
            });
          }
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

    // Trigger NotificationService for specific stage changes
    if (body.status && previousStatus !== body.status && ['interview', 'offer', 'rejected'].includes(body.status)) {
      try {
        const notificationService = (await import('@/lib/services/notificationService')).default;
        const capitalizedStatus = body.status.charAt(0).toUpperCase() + body.status.slice(1);
        const capitalizedPrevStatus = previousStatus ? previousStatus.charAt(0).toUpperCase() + previousStatus.slice(1) : 'Unknown';
        await notificationService.notifyJobStageMoved(
          userId,
          job.jobTitle,
          job._id.toString(),
          capitalizedStatus,
          capitalizedPrevStatus
        );
      } catch (notifError) {
        console.error('Failed to send stage move notification:', notifError);
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

    // Serialize job to include _id field for extension compatibility
    const jobId = job._id ? job._id.toString() : job.id;
    const serializedJob = {
      id: jobId,
      _id: jobId, // Extension expects _id field
      userId: typeof job.userId === 'string' ? job.userId : job.userId?.toString?.(),
      jobTitle: job.jobTitle,
      company: job.company,
      location: job.location,
      jobUrl: job.jobUrl,
      jobDescription: job.jobDescription,
      source: job.source,
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
      salary: job.salary,
      deadline: job.deadline ? (job.deadline instanceof Date ? job.deadline.toISOString().split('T')[0] : job.deadline) : undefined,
      applicationDate: job.applicationDate ? (job.applicationDate instanceof Date ? job.applicationDate.toISOString().split('T')[0] : job.applicationDate) : undefined,
      interviews: (job.interviews || []).map((iv: any) => ({
        ...iv,
        date: iv.date instanceof Date ? iv.date.toISOString().split('T')[0] : iv.date
      })),
      followUps: (job.followUps || []).map((fu: any) => ({
        ...fu,
        date: fu.date instanceof Date ? fu.date.toISOString().split('T')[0] : fu.date
      })),
      attachments: job.attachments || [],
      sourceUrl: job.sourceUrl,
      atsScore: job.atsScore,
      matchScore: (job as any).matchScore,
      trustScore: (job as any).trustScore,
      trustSnapshot: (job as any).trustSnapshot,
      transparencySnapshot: (job as any).transparencySnapshot,
      extractedJd: job.extractedJd,
      isArchived: Boolean(job.isArchived),
      createdAt: job.createdAt instanceof Date ? job.createdAt.toISOString() : job.createdAt,
      updatedAt: job.updatedAt instanceof Date ? job.updatedAt.toISOString() : job.updatedAt
    };

    // Return response in format expected by extension
    // Extension expects response.data to be the job object directly, not nested
    return NextResponse.json({
      success: true,
      trackerGeneration: trackerGenerationPreview,
      data: serializedJob, // Extension expects data to be the job directly
      job: serializedJob // Keep for backwards compatibility
    });
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
    console.log('🔍 Job DELETE API - User ID:', userId);
    console.log('🔍 Job DELETE API - Job ID type:', typeof jobId);
    console.log('🔍 Job DELETE API - User ID type:', typeof userId);

    // Find the job first with flexible ID support
    let job: any = null;
    if (mongoose.Types.ObjectId.isValid(jobId)) {
      job = await JobApplication.findOne({ _id: new mongoose.Types.ObjectId(jobId) });
    }
    if (!job) {
      job = await JobApplication.findOne({
        $or: [
          { _id: jobId },
          { id: jobId },
          { jobId: jobId }
        ]
      });
    }

    if (!job) {
      console.log('❌ Job DELETE API - Job not found:', jobId);
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }

    // Ownership check (tolerant to ObjectId and String formats)
    if (job.userId && userId) {
      const jobUserIdStr = job.userId.toString();
      const requestUserIdStr = userId.toString();

      if (jobUserIdStr !== requestUserIdStr) {
        console.log(`❌ Job DELETE API - Ownership mismatch. Job: ${jobUserIdStr}, Request: ${requestUserIdStr}`);
        return NextResponse.json({ success: false, error: 'Unauthorized to delete this job' }, { status: 403 });
      }
    }

    // Import models for cascade deletion
    const { ApplicationJourney, CV, CoverLetter, Notification, TemporaryCVDraft } = await import('@/models');

    // Step 1: Find all journeys associated with this job
    console.log('🔍 Job DELETE API - Finding associated journeys for job:', jobId);
    const journeys = await ApplicationJourney.find({
      $or: [
        { jobId: jobId.toString() },
        { jobId: job._id },
        { jobId: job._id.toString() }
      ]
    });

    console.log(`🔍 Job DELETE API - Found ${journeys.length} journey(s) associated with job`);

    // Step 2: For each journey, delete associated CV and cover letter
    for (const journey of journeys) {
      console.log('🔍 Job DELETE API - Processing journey:', journey._id);

      // Delete cover letter if it exists
      if (journey.coverLetterId) {
        try {
          console.log('🔍 Job DELETE API - Deleting cover letter:', journey.coverLetterId);
          await CoverLetter.findByIdAndDelete(journey.coverLetterId);
          console.log('✅ Job DELETE API - Cover letter deleted successfully');
        } catch (error) {
          console.error('❌ Job DELETE API - Error deleting cover letter:', error);
        }
      }

      // Delete CV if it exists
      if (journey.cvId) {
        try {
          console.log('🔍 Job DELETE API - Checking CV for deletion:', journey.cvId);
          const cv = await CV.findById(journey.cvId);

          if (cv) {
            const cvUserId = cv.userId ? cv.userId.toString() : '';
            const requestUserIdStr = userId ? userId.toString() : '';
            if (cvUserId === requestUserIdStr) {
              console.log('🔍 Job DELETE API - Deleting CV:', journey.cvId);
              await CV.findByIdAndDelete(journey.cvId);
              console.log('✅ Job DELETE API - CV deleted successfully');
            }
          }
        } catch (error) {
          console.error('❌ Job DELETE API - Error deleting CV:', error);
        }
      }

      // Delete the journey itself
      try {
        console.log('🔍 Job DELETE API - Deleting journey:', journey._id);
        await ApplicationJourney.findByIdAndDelete(journey._id);
        console.log('✅ Job DELETE API - Journey deleted successfully');
      } catch (error) {
        console.error('❌ Job DELETE API - Error deleting journey:', error);
      }
    }

    // Step 3: Delete notifications that reference this job
    let deletedNotificationsCount = 0;
    try {
      console.log('🔍 Job DELETE API - Finding notifications for job:', jobId);
      const notificationsResult = await Notification.deleteMany({
        $or: [
          { 'actionData.jobId': jobId.toString() },
          { 'metadata.jobId': jobId.toString() },
          { 'actionData.jobId': job._id.toString() },
          { 'metadata.jobId': job._id.toString() }
        ]
      });
      deletedNotificationsCount = notificationsResult.deletedCount;
      console.log(`✅ Job DELETE API - Deleted ${deletedNotificationsCount} notification(s)`);
    } catch (error) {
      console.error('❌ Job DELETE API - Error deleting notifications:', error);
    }

    // Step 4: Delete temporary CV drafts that reference this job
    let deletedDraftsCount = 0;
    try {
      console.log('🔍 Job DELETE API - Finding temporary CV drafts for job:', jobId);
      const draftsResult = await TemporaryCVDraft.deleteMany({
        $or: [
          { jobId: jobId.toString() },
          { jobId: job._id.toString() }
        ]
      });
      deletedDraftsCount = draftsResult.deletedCount;
      console.log(`✅ Job DELETE API - Deleted ${deletedDraftsCount} temporary CV draft(s)`);
    } catch (error) {
      console.error('❌ Job DELETE API - Error deleting temporary CV drafts:', error);
    }

    // Step 5: Finally, delete the job itself
    console.log('🔍 Job DELETE API - Deleting job:', job._id);
    await JobApplication.findByIdAndDelete(job._id);

    console.log('✅ Job DELETE API - Job and all associated data deleted successfully');

    // Get counts for response
    const deletedCVsCount = journeys.filter(j => j.cvId).length;
    const deletedCoverLettersCount = journeys.filter(j => j.coverLetterId).length;

    return NextResponse.json({
      message: 'Job deleted successfully',
      deletedJourneys: journeys.length,
      deletedCVs: deletedCVsCount,
      deletedCoverLetters: deletedCoverLettersCount,
      deletedNotifications: deletedNotificationsCount,
      deletedTemporaryDrafts: deletedDraftsCount
    });
  } catch (error) {
    console.error('Error deleting job:', error);
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    );
  }
}

export const PATCH = PUT;

