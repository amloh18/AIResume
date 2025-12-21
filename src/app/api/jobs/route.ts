import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { JobApplication, ApplicationJourney } from '@/models';
import mongoose from 'mongoose';
import { createJourneyDocuments } from '@/lib/services/journeyDocumentService';
import { withTransaction } from '@/lib/utils/db-transaction';
import User from '@/models/User';
import { formatExtensionError, formatExtensionSuccess, ExtensionErrorCode } from '@/lib/utils/extension-errors';
import { ErrorCode, createErrorNextResponse } from '@/lib/utils/error-codes';
import { setCorsHeaders, handleCorsPreflight } from '@/lib/utils/cors-helpers';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';

const formatDateForResponse = (value: Date | string | null | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString().split('T')[0];
};

const toContactDetails = (details: any) => ({
  name: details?.name || '',
  email: details?.email || '',
  phone: details?.phone || '',
  role: details?.role || ''
});

const serializeJob = (job: any) => {
  const jobId = job?._id ? job._id.toString() : job?.id;
  return {
    id: jobId,
    _id: jobId, // Extension expects _id field
    userId: typeof job?.userId === 'string' ? job.userId : job?.userId?.toString?.(),
    jobTitle: job?.jobTitle,
    company: job?.company,
    location: job?.location,
    jobUrl: job?.jobUrl,
    jobDescription: job?.jobDescription,
    source: job?.source,
    status: job?.status,
    priority: job?.priority,
    notes: job?.notes,
    sponsorship: job?.sponsorship,
    tags: job?.tags || [],
    contactDetails: toContactDetails(job?.contactDetails),
    salary: job?.salary,
    deadline: formatDateForResponse(job?.deadline),
    applicationDate: formatDateForResponse(job?.applicationDate),
    interviews: (job?.interviews || []).map((interview: any) => ({
      ...interview,
      date: formatDateForResponse(interview?.date)
    })),
    followUps: (job?.followUps || []).map((followUp: any) => ({
      ...followUp,
      date: formatDateForResponse(followUp?.date)
    })),
    attachments: (job?.attachments || []),
    sourceUrl: job?.sourceUrl,
    atsScore: job?.atsScore,
    matchScore: job?.matchScore,
    trustScore: job?.trustScore,
    trustSnapshot: job?.trustSnapshot,
    transparencySnapshot: job?.transparencySnapshot,
    isArchived: Boolean(job?.isArchived),
    createdAt: job?.createdAt,
    updatedAt: job?.updatedAt
  };
};

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Job creation request received');

    // Authenticate request first (needed for rate limiting by user ID)
    const auth = await authenticateRequest(request);

    // RATE LIMITING: Prevent rapid-fire requests that could exploit race conditions
    // Rate limit by user ID if authenticated, otherwise by IP
    try {
      const { rateLimiter } = await import('@/lib/rate-limiter');

      // Create custom key generator based on user ID or IP
      const keyGenerator = (req: any) => {
        if (auth?.userId) {
          return `job_create:user:${auth.userId}`;
        }
        const clientIP = req.headers?.get('x-forwarded-for')?.split(',')[0] ||
          req.headers?.get('x-real-ip') ||
          'unknown';
        return `job_create:ip:${clientIP}`;
      };

      const rateLimitResult = await rateLimiter.checkLimit(request, {
        windowMs: 60 * 1000, // 1 minute window
        maxRequests: 10, // Max 10 job creation requests per minute per user/IP
        keyGenerator
      });

      if (!rateLimitResult.allowed) {
        const identifier = auth?.userId ? `user:${auth.userId}` : 'IP';
        console.log(`⚠️ Rate limit exceeded for ${identifier}`);
        return NextResponse.json(
          {
            success: false,
            error: 'Too many requests. Please wait a moment before creating another job.',
            retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
          },
          {
            status: 429,
            headers: {
              'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
              'X-RateLimit-Limit': '10',
              'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
              'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
            }
          }
        );
      }
    } catch (rateLimitError) {
      // Fail open - if rate limiting fails, allow the request (don't block users)
      console.warn('⚠️ Rate limiting check failed, allowing request:', rateLimitError);
    }

    // Continue with authentication check (already done above)
    if (!auth) {
      // Check if this was an extension request to return proper error format
      const authHeader = request.headers.get('authorization');
      const isExtension = authHeader && authHeader.startsWith('Bearer ');

      if (isExtension) {
        return setCorsHeaders(
          NextResponse.json(
            formatExtensionError(
              ExtensionErrorCode.AUTH_INVALID,
              'Authentication required. Please sign in again.'
            ),
            { status: 401 }
          ),
          request
        );
      }

      return setCorsHeaders(
        NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        ),
        request
      );
    }

    const userId = auth.userId;
    // Use source from auth, but fallback to body.source if provided (for compatibility)
    // NOTE: auth.source is narrower (e.g. 'extension' | 'web'); we normalize to a string here.
    let source: string | undefined = auth.source;

    // Parse the request body
    const body = await request.json();
    const {
      jobTitle,
      company,
      jobUrl,
      jobDescription,
      location,
      status,
      priority = 'medium',
      salary,
      notes,
      deadline,
      applicationDate,
      sponsorship,
      tags,
      contactDetails,
      matchScore,
      trustScore,
      trustSnapshot,
      transparencySnapshot,
      source: bodySource, // Allow source to be passed in body as fallback
      cvId // Optional CV ID to link to journey
    } = body;

    // If source is not set from auth, use body source or default based on auth method
    if (!source && bodySource) {
      source = bodySource;
    } else if (!source) {
      // Fallback: if auth method is token, assume extension; otherwise manual (web -> manual)
      source = auth.method === 'token' ? 'extension' : 'manual';
    }

    // Map 'web' to 'manual' for compatibility (web is not a valid enum value)
    if (source === 'web') {
      source = 'manual';
    }

    console.log(`🔍 Jobs API - Source determined: ${source} (from auth: ${auth.source}, method: ${auth.method}, body: ${bodySource})`);

    // Set default status: 'draft' for extension, 'created' for web
    const defaultStatus = source === 'extension' ? 'draft' : 'created';
    const jobStatus = status || defaultStatus;

    // Validate required fields
    if (!jobTitle || !company) {
      console.log('❌ Missing required fields');
      return createErrorNextResponse(
        ErrorCode.MISSING_REQUIRED_FIELD,
        'Job title and company are required fields.',
        { missingFields: [!jobTitle && 'jobTitle', !company && 'company'].filter(Boolean) }
      );
    }

    await getConnection();

    // Normalize userId to ObjectId to ensure consistent storage and querying
    const normalizedUserId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;

    // ATOMIC OPERATION: Wrap job creation + credit check + credit spending in transaction (only for 'created' status)
    // Draft jobs don't spend credits, so we can create them without transaction
    let jobApplication: any;
    try {
      if (jobStatus === 'created') {
        // For 'created' status: use transaction to ensure credit check + job creation + credit spending are atomic
        // This prevents race conditions where multiple requests could bypass credit limits
        jobApplication = await withTransaction(async (session) => {
          // 1. CREDIT CHECK: Check credits WITHIN transaction (locks user record to prevent race conditions)
          const user = await User.findById(normalizedUserId).session(session);
          if (!user) {
            throw new Error('User not found');
          }

          const usageLimitsService = await import('@/lib/services/usageLimitsService');
          const creditCheck = await usageLimitsService.default.checkUsageLimit({
            userId: normalizedUserId.toString(),
            action: 'job_create'
          });

          console.log(`🔍 [${source.toUpperCase()}] Job POST API - Credit check result (in transaction):`, {
            allowed: creditCheck.allowed,
            reason: creditCheck.reason,
            currentUsage: creditCheck.currentUsage,
            limit: creditCheck.limit
          });

          if (!creditCheck.allowed) {
            console.log(`❌ [${source.toUpperCase()}] Job POST API - Credit check failed (in transaction):`, creditCheck.reason);
            throw new Error(creditCheck.reason || 'Job creation limit exceeded');
          }

          // 2. Create the job application within transaction (only if credits are available)
          // Validate and clean jobUrl - must be valid URL or undefined (not empty string)
          let cleanedJobUrl: string | undefined = undefined;
          if (jobUrl && jobUrl.trim()) {
            // Basic URL validation
            try {
              new URL(jobUrl);
              cleanedJobUrl = jobUrl.trim();
            } catch {
              // Invalid URL - set to undefined to let model validation handle it
              cleanedJobUrl = undefined;
            }
          }

          const jobData = {
            userId: normalizedUserId,
            jobTitle,
            company,
            jobUrl: cleanedJobUrl,
            jobDescription: jobDescription || '',
            location: location || '',
            source,
            status: jobStatus,
            priority,
            salary: salary || undefined,
            notes: notes || '',
            deadline: deadline ? new Date(deadline) : undefined,
            applicationDate: applicationDate ? new Date(applicationDate) : undefined,
            sponsorship: sponsorship || 'unknown',
            contactDetails: contactDetails || undefined,
            matchScore: typeof matchScore === 'number' ? matchScore : undefined,
            trustScore: typeof trustScore === 'number' ? trustScore : undefined,
            trustSnapshot: trustSnapshot && typeof trustSnapshot === 'object' ? trustSnapshot : undefined,
            transparencySnapshot: transparencySnapshot && typeof transparencySnapshot === 'object' ? transparencySnapshot : undefined,
            contacts: [],
            interviews: [],
            followUps: [],
            attachments: [],
            tags: source === 'extension' ? ['extension-saved'] : (tags || [])
          };

          const [createdJob] = await JobApplication.create([jobData], { session });
          console.log(`✅ [${source.toUpperCase()}] Job application created in transaction:`, createdJob._id);

          // 3. Spend credit within same transaction (atomic with job creation)
          const creditService = await import('@/lib/services/creditService');
          const planCredits = await creditService.default.getPlanCredits(user.currentPlanKey || 'free');
          const isUnlimited = planCredits.jobCredits === -1;

          // Build update operation for credit spending
          const updateData: any = {
            $inc: {
              'credits.totalCreated.jobs': 1
            }
          };

          if (!isUnlimited) {
            updateData.$inc['credits.jobCredits'] = -1;
          }

          // Ensure nested structure exists
          if (!user.credits?.totalCreated || user.credits.totalCreated.jobs === undefined) {
            const currentJobs = user.credits?.totalCreated?.jobs ?? 0;
            updateData.$set = {
              'credits.totalCreated.jobs': currentJobs + 1,
              'credits.totalCreated.cvs': user.credits?.totalCreated?.cvs ?? 0,
              'credits.totalCreated.exports': user.credits?.totalCreated?.exports ?? 0,
              'credits.totalCreated.atsChecks': user.credits?.totalCreated?.atsChecks ?? 0
            };
            if (updateData.$inc && 'credits.totalCreated.jobs' in updateData.$inc) {
              delete updateData.$inc['credits.totalCreated.jobs'];
              if (Object.keys(updateData.$inc).length === 0) {
                delete updateData.$inc;
              }
            }
          }

          // Update user credits within transaction
          await User.findByIdAndUpdate(
            normalizedUserId,
            updateData,
            { session, new: true, runValidators: true }
          );

          console.log(`✅ [${source.toUpperCase()}] Credit spent in transaction for user: ${normalizedUserId.toString()}`);

          // Log job creation activity
          try {
            const { ActivityLogService } = await import('@/lib/services/activityLogService');
            await ActivityLogService.logUserAction({
              userId: normalizedUserId.toString(),
              userEmail: user.email,
              action: 'job_created',
              resourceType: 'job',
              resourceId: createdJob._id.toString(),
              resourceName: `${createdJob.jobTitle} at ${createdJob.company}`,
              status: 'success',
              ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] ||
                request.headers.get('x-real-ip') ||
                undefined,
              metadata: {
                source: source,
                status: jobStatus,
                priority: priority,
                hasUrl: !!cleanedJobUrl,
                isUnlimited: isUnlimited,
                creditsRemaining: isUnlimited ? -1 : (user.credits?.jobCredits ?? 0) - 1
              }
            });

            // Log credit usage if credit was spent
            if (jobStatus === 'created' && !isUnlimited) {
              await ActivityLogService.logUserAction({
                userId: normalizedUserId.toString(),
                userEmail: user.email,
                action: 'credit_used',
                status: 'success',
                ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] ||
                  request.headers.get('x-real-ip') ||
                  undefined,
                metadata: {
                  creditType: 'job_credit',
                  creditsUsed: 1,
                  creditsRemaining: (user.credits?.jobCredits ?? 0) - 1,
                  planKey: user.currentPlanKey || 'free',
                  resourceType: 'job',
                  resourceId: createdJob._id.toString()
                }
              });
            }
          } catch (logError) {
            console.error('Failed to log job creation activity:', logError);
            // Don't fail the request if logging fails
          }

          return createdJob;
        });
      } else {
        // For 'draft' status: create job without spending credits (no transaction needed)
        // Validate and clean jobUrl - must be valid URL or undefined (not empty string)
        let cleanedJobUrl: string | undefined = undefined;
        if (jobUrl && jobUrl.trim()) {
          // Basic URL validation
          try {
            new URL(jobUrl);
            cleanedJobUrl = jobUrl.trim();
          } catch {
            // Invalid URL - set to undefined to let model validation handle it
            cleanedJobUrl = undefined;
          }
        }

        const jobData = {
          userId: normalizedUserId,
          jobTitle,
          company,
          jobUrl: cleanedJobUrl,
          jobDescription: jobDescription || '',
          location: location || '',
          source,
          status: jobStatus,
          priority,
          salary: salary || undefined,
          notes: notes || '',
          deadline: deadline ? new Date(deadline) : undefined,
          applicationDate: applicationDate ? new Date(applicationDate) : undefined,
          sponsorship: sponsorship || 'unknown',
          contactDetails: contactDetails || undefined,
          matchScore: typeof matchScore === 'number' ? matchScore : undefined,
          trustScore: typeof trustScore === 'number' ? trustScore : undefined,
          trustSnapshot: trustSnapshot && typeof trustSnapshot === 'object' ? trustSnapshot : undefined,
          transparencySnapshot: transparencySnapshot && typeof transparencySnapshot === 'object' ? transparencySnapshot : undefined,
          contacts: [],
          interviews: [],
          followUps: [],
          attachments: [],
          tags: source === 'extension' ? ['extension-saved'] : (tags || [])
        };

        jobApplication = await JobApplication.create(jobData);
        console.log(`✅ [${source.toUpperCase()}] Draft job created (no credits spent):`, {
          id: jobApplication._id,
          status: jobApplication.status,
          title: jobApplication.jobTitle,
          company: jobApplication.company,
          userId: jobApplication.userId
        });

        // Log draft job creation activity
        try {
          const { ActivityLogService } = await import('@/lib/services/activityLogService');
          // Fetch user for email (draft jobs don't have user in scope)
          const userForLogging = await User.findById(normalizedUserId).select('email').lean();
          await ActivityLogService.logUserAction({
            userId: normalizedUserId.toString(),
            userEmail: userForLogging?.email || undefined,
            action: 'job_created_draft',
            resourceType: 'job',
            resourceId: jobApplication._id.toString(),
            resourceName: `${jobApplication.jobTitle} at ${jobApplication.company}`,
            status: 'success',
            ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] ||
              request.headers.get('x-real-ip') ||
              undefined,
            metadata: {
              source: source,
              status: jobStatus,
              priority: priority,
              hasUrl: !!cleanedJobUrl,
              isDraft: true
            }
          });

          // Send notification for draft creation
          const notificationService = (await import('@/lib/services/notificationService')).default;
          await notificationService.notifyJobDraftCreated(
            normalizedUserId.toString(),
            jobApplication.jobTitle,
            jobApplication._id.toString()
          );

        } catch (logError) {
          console.error('Failed to log draft job creation activity:', logError);
          // Don't fail the request if logging fails
        }
      }

      if (jobStatus === 'created') {
        console.log(`✅ [${source.toUpperCase()}] Job application and credit spending completed atomically:`, jobApplication._id);

        // Check if credits are low and send notification (non-blocking) - only for 'created' jobs
        try {
          const creditService = await import('@/lib/services/creditService');
          const updatedUser = await User.findById(normalizedUserId).select('credits currentPlanKey');
          if (updatedUser && updatedUser.credits?.jobCredits !== undefined && updatedUser.credits.jobCredits >= 0) {
            const remainingCredits = updatedUser.credits.jobCredits;
            const planCredits = await creditService.default.getPlanCredits(updatedUser.currentPlanKey || 'free');
            const limit = planCredits.jobCredits;

            // Send notification if credits are low (1 or 2 remaining) and not unlimited
            if (limit !== -1 && remainingCredits <= 2 && remainingCredits > 0) {
              const notificationService = (await import('@/lib/services/notificationService')).default;
              await notificationService.createNotification({
                userId: normalizedUserId.toString(),
                type: 'system_update',
                title: remainingCredits === 1 ? '⚠️ Last Credit Remaining!' : '💡 Credits Running Low',
                message: remainingCredits === 1
                  ? `You have 1 job credit remaining. Upgrade to Pro for unlimited job applications!`
                  : `You have ${remainingCredits} job credits remaining. Consider upgrading to Pro for unlimited access!`,
                actionType: 'upgrade_plan',
                actionData: {
                  url: '/dashboard?tab=pricing',
                },
                interactive: true,
                priority: 'medium',
                channels: ['in-app'],
                persistent: false,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
                metadata: {
                  remainingCredits,
                  limit,
                  planKey: updatedUser.currentPlanKey || 'free',
                },
              });
              console.log(`✅ Jobs API - Low credits notification sent (${remainingCredits} remaining)`);
            }
          }
        } catch (notificationError) {
          console.error('⚠️ Jobs API - Failed to send low credits notification (non-critical):', notificationError);
          // Don't fail job creation if notification fails
        }
      } else {
        console.log(`✅ [${source.toUpperCase()}] Draft job created successfully (no credits spent):`, jobApplication._id);
      }
    } catch (transactionError: any) {
      console.error(`❌ [${source.toUpperCase()}] Transaction failed:`, transactionError);
      console.error(`❌ [${source.toUpperCase()}] Error details:`, {
        message: transactionError.message,
        stack: transactionError.stack,
        name: transactionError.name
      });
      // Transaction automatically rolled back - no data inconsistency

      // Check if error is due to insufficient credits
      const isCreditError = transactionError.message?.includes('limit exceeded') ||
        transactionError.message?.includes('insufficient credits') ||
        transactionError.message?.includes('Job creation limit exceeded') ||
        transactionError.message?.includes('Insufficient credits');

      if (isCreditError) {
        // Extract credit info from error if available
        const usageLimitsService = await import('@/lib/services/usageLimitsService');
        let creditInfo: any = {};
        try {
          const creditCheck = await usageLimitsService.default.checkUsageLimit({
            userId: normalizedUserId.toString(),
            action: 'job_create'
          });
          creditInfo = {
            currentUsage: creditCheck.currentUsage,
            limit: creditCheck.limit,
            reason: creditCheck.reason
          };
        } catch (e) {
          // Fallback if credit check fails
          console.error(`⚠️ [${source.toUpperCase()}] Failed to get credit info:`, e);
        }

        // Use extension error format for extension requests
        if (source === 'extension') {
          return setCorsHeaders(
            NextResponse.json(
              formatExtensionError(
                ExtensionErrorCode.INSUFFICIENT_CREDITS,
                transactionError.message || 'Job creation limit exceeded. Please upgrade your plan.',
                {
                  currentUsage: creditInfo.currentUsage,
                  limit: creditInfo.limit,
                  requiresUpgrade: true
                }
              ),
              { status: 403 }
            ),
            request
          );
        }

        return NextResponse.json(
          {
            success: false,
            error: transactionError.message || 'Job creation limit exceeded',
            requiresUpgrade: true,
            currentUsage: creditInfo.currentUsage,
            limit: creditInfo.limit
          },
          { status: 403 }
        );
      }

      // Use extension error format for extension requests
      if (source === 'extension') {
        return setCorsHeaders(
          NextResponse.json(
            formatExtensionError(
              ExtensionErrorCode.JOB_CREATION_FAILED,
              'Failed to create job. Please try again.',
              { details: transactionError.message },
              true // Retryable
            ),
            { status: 500 }
          ),
          request
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create job. Please try again.',
          details: transactionError.message
        },
        { status: 500 }
      );
    }

    // Create ApplicationJourney only if status is 'created' (not 'draft')
    // Draft jobs will have their journey created when moved to 'created' status
    if (jobStatus === 'created') {
      let newJourney: any = null;
      try {
        // Determine if documents need to be created
        const needsDocuments = true; // Always create documents when job is added
        const initialStatus = needsDocuments ? 'processing_documents' : 'in-progress';

        const journeyData = {
          journeyId: `journey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: normalizedUserId,
          jobId: jobApplication._id.toString(),
          cvId: null,
          coverLetterId: null,
          status: initialStatus,
          currentStep: 1,
          totalSteps: 5,
          jobTitle: jobApplication.jobTitle,
          company: jobApplication.company,
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
            tags: source === 'extension' ? ['extension-saved'] : [],
            notes: ''
          }
        };

        newJourney = await ApplicationJourney.create(journeyData);
        console.log('✅ ApplicationJourney created successfully:', newJourney._id);

        // EDGE CASE 6: Only link CV after journey is successfully created
        // If cvId is provided, link CV to journey BEFORE document creation runs
        if (cvId && jobStatus === 'created') {
          try {
            console.log('🔗 Jobs API - Linking CV to journey:', cvId);
            
            // EDGE CASE 2: Verify CV exists and is standalone (not already linked)
            const CV = (await import('@/models/CV')).default;
            const cv = await CV.findOne({
              _id: new mongoose.Types.ObjectId(cvId),
              userId: normalizedUserId
            });

            if (!cv) {
              console.error('❌ Jobs API - CV not found or does not belong to user:', cvId);
              // Don't fail the request, just log error and continue without linking
            } else if (cv.journeyId && cv.journeyId.toString() !== newJourney._id.toString()) {
              // EDGE CASE 2: CV already linked to another journey
              console.error('❌ Jobs API - CV is already linked to another journey:', cv.journeyId);
              // Don't fail the request, just log error and continue without linking
            } else {
              // EDGE CASE 8: Check if journey already has auto-created CV
              if (newJourney.cvId && newJourney.cvId.toString() !== cvId) {
                console.log('⚠️ Jobs API - Journey already has CV, deleting auto-created CV:', newJourney.cvId);
                try {
                  const existingCV = await CV.findById(newJourney.cvId);
                  if (existingCV) {
                    await CV.deleteOne({ _id: existingCV._id });
                    console.log('✅ Jobs API - Auto-created CV deleted:', newJourney.cvId);
                  }
                } catch (deleteError) {
                  console.error('⚠️ Jobs API - Failed to delete auto-created CV (non-critical):', deleteError);
                  // Continue with linking even if deletion fails
                }
              }

              // EDGE CASE 7: Retry mechanism for CV update with exponential backoff
              let cvUpdateSuccess = false;
              const maxRetries = 3;
              const retryDelays = [1000, 2000, 4000]; // 1s, 2s, 4s

              for (let attempt = 0; attempt < maxRetries; attempt++) {
                try {
                  // Update CV to link to journey
                  cv.cvType = 'journey';
                  cv.journeyId = newJourney._id;
                  await cv.save();

                  // Update journey with CV ID
                  newJourney.cvId = cvId;
                  await newJourney.save();

                  cvUpdateSuccess = true;
                  console.log('✅ Jobs API - CV linked to journey successfully:', cvId);
                  break;
                } catch (updateError) {
                  console.error(`⚠️ Jobs API - CV update attempt ${attempt + 1} failed:`, updateError);
                  if (attempt < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
                  } else {
                    console.error('❌ Jobs API - CV update failed after all retries');
                    // Log error but continue - journey will have CV linked on next check
                  }
                }
              }

              if (!cvUpdateSuccess) {
                console.error('⚠️ Jobs API - CV linking failed, but continuing. Journey will be updated on next check.');
              }
            }
          } catch (cvLinkError) {
            console.error('❌ Jobs API - Error linking CV to journey (non-critical):', cvLinkError);
            // Don't fail the request if CV linking fails - document creation will handle it
          }
        }

        // If documents need to be created, trigger async creation
        if (needsDocuments && newJourney.status === 'processing_documents') {
          // Call document creation service directly (no HTTP request needed)
          // Run in background to avoid blocking the response
          setImmediate(async () => {
            try {
              console.log('🚀 Jobs API - Starting document creation for journey:', newJourney._id);
              const result = await createJourneyDocuments(newJourney._id.toString(), normalizedUserId.toString());

              if (result.success) {
                console.log('✅ Jobs API - Document creation completed successfully:', {
                  journeyId: newJourney._id,
                  cvId: result.cvId,
                  coverLetterId: result.coverLetterId
                });
              } else {
                console.error('❌ Jobs API - Document creation failed:', result.error);
              }
            } catch (error) {
              console.error('❌ Jobs API - Error in document creation:', error);
              // Journey status will be updated by the service on error
            }
          });

          console.log('🚀 Jobs API - Triggered async document creation for journey:', newJourney._id);
        }
      } catch (journeyError) {
        console.error('⚠️ Failed to create ApplicationJourney (non-critical):', journeyError);
        // Don't fail the request if journey creation fails
      }
    } else {
      console.log(`📝 Jobs API - Job created with status '${jobStatus}', journey will be created when moved to 'created' status`);
    }

    // Format response based on source
    if (source === 'extension') {
      // Return full serialized job object for extension (includes _id field)
      return setCorsHeaders(
        NextResponse.json(
          formatExtensionSuccess(
            serializeJob(jobApplication),
            'Job saved to application tracker successfully'
          )
        ),
        request
      );
    }

    // Build response data
    const responseData: any = {
      id: jobApplication._id.toString(),
      jobTitle: jobApplication.jobTitle,
      company: jobApplication.company,
      location: jobApplication.location,
      source: jobApplication.source,
      status: jobApplication.status,
      priority: jobApplication.priority,
      createdAt: jobApplication.createdAt
    };

    // Include journey data if it was created
    if (jobStatus === 'created') {
      const journey = await ApplicationJourney.findOne({
        jobId: jobApplication._id.toString(),
        userId: normalizedUserId
      });

      if (journey) {
        responseData.jobApplication = {
          _id: jobApplication._id.toString(),
          jobTitle: jobApplication.jobTitle,
          company: jobApplication.company
        };
        responseData.journey = {
          _id: journey._id.toString(),
          journeyId: journey.journeyId,
          cvId: journey.cvId,
          status: journey.status
        };
      }
    }

    return setCorsHeaders(
      NextResponse.json({
        success: true,
        message: 'Job saved to application tracker successfully',
        data: responseData
      }),
      request
    );

  } catch (error: any) {
    console.error('❌ Job creation error:', error);

    // Check if this was an extension request by checking if source variable exists
    // If we're in the catch block, we need to check the request headers
    const authHeader = request.headers.get('authorization');
    const isExtension = authHeader && authHeader.startsWith('Bearer ');

    if (isExtension) {
      return setCorsHeaders(
        NextResponse.json(
          formatExtensionError(
            ExtensionErrorCode.JOB_CREATION_FAILED,
            error.message || 'Failed to create job in application tracker',
            { details: error.stack },
            true // Retryable
          ),
          { status: 500 }
        ),
        request
      );
    }

    // Check for specific error types
    if (error?.name === 'MongoNetworkError' || error?.name === 'MongoServerSelectionError') {
      const errorResponse = createErrorNextResponse(
        ErrorCode.DB_CONNECTION_FAILED,
        'Database connection failed. Please try again later.',
        { error: error.message },
        true, // Retryable
        60 // Retry after 60 seconds
      );
      return setCorsHeaders(errorResponse, request);
    }

    if (error?.name === 'ValidationError') {
      const errorResponse = createErrorNextResponse(
        ErrorCode.VALIDATION_FAILED,
        'Job validation failed. Please check your input.',
        { error: error.message }
      );
      return setCorsHeaders(errorResponse, request);
    }

    const errorResponse = createErrorNextResponse(
      ErrorCode.JOB_CREATION_FAILED,
      'Failed to create job in application tracker. Please try again.',
      { error: error.message },
      true // Retryable
    );
    return setCorsHeaders(errorResponse, request);
  }
}

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Jobs list request received');

    // Authenticate request (supports both session and JWT token)
    const auth = await authenticateRequest(request);
    if (!auth) {
      // Check if this was an extension request to return proper error format
      const authHeader = request.headers.get('authorization');
      const isExtension = authHeader && authHeader.startsWith('Bearer ');

      if (isExtension) {
        return setCorsHeaders(
          NextResponse.json(
            { success: false, error: 'Unauthorized' },
            { status: 401 }
          ),
          request
        );
      }

      return setCorsHeaders(
        NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        ),
        request
      );
    }

    const userId = auth.userId;
    const isExtensionRequest = auth.source === 'extension';

    // Ensure connection is established
    await getConnection();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('id');

    const normalizedUserId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;

    // If jobId is provided, return single job
    if (jobId) {
      try {
        if (!mongoose.Types.ObjectId.isValid(jobId)) {
          return setCorsHeaders(
            NextResponse.json(
              { success: false, error: 'Invalid job ID' },
              { status: 400 }
            ),
            request
          );
        }

        const job = await JobApplication.findOne({
          _id: new mongoose.Types.ObjectId(jobId),
          userId: normalizedUserId
        }).lean();

        if (!job) {
          return setCorsHeaders(
            NextResponse.json(
              { success: false, error: 'Job not found' },
              { status: 404 }
            ),
            request
          );
        }

        // Return job in format expected by extension
        // Extension expects response.data to be the job object directly
        const serialized = serializeJob(job);
        return setCorsHeaders(
          NextResponse.json({
            success: true,
            data: serialized, // Extension expects data to be the job directly
            job: serialized // Keep for backwards compatibility
          }),
          request
        );
      } catch (error: any) {
        console.error('Error fetching single job:', error);
        return setCorsHeaders(
          NextResponse.json(
            { success: false, error: 'Failed to fetch job' },
            { status: 500 }
          ),
          request
        );
      }
    }

    const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1);
    const limitParam = searchParams.get('limit');
    const explicitLimit = limitParam && limitParam !== 'all';
    const baseLimit = explicitLimit ? (parseInt(limitParam || '10', 10) || 10) : 10;
    const limit = Math.max(1, Math.min(100, baseLimit));
    const statusParams = searchParams.getAll('status').filter(Boolean);
    const sourceFilter = searchParams.get('source');
    const includeArchived = searchParams.get('includeArchived') === 'true';

    // Build query
    const query: any = { userId: normalizedUserId };

    if (statusParams.length === 1) {
      query.status = statusParams[0];
      console.log(`🔍 Jobs API - Filtering by status: ${statusParams[0]}`);
    } else if (statusParams.length > 1) {
      query.status = { $in: statusParams };
      console.log(`🔍 Jobs API - Filtering by multiple statuses: ${statusParams.join(', ')}`);
    } else {
      console.log('🔍 Jobs API - No status filter, returning all jobs');
    }

    if (sourceFilter) {
      query.source = sourceFilter;
      console.log(`🔍 Jobs API - Filtering by source: ${sourceFilter}`);
    }

    if (!includeArchived) {
      query.isArchived = { $ne: true };
    }

    console.log('🔍 Jobs API - Query:', JSON.stringify(query, null, 2));

    const paginateResults = (!isExtensionRequest || explicitLimit) && limitParam !== 'all';
    let jobQuery = JobApplication.find(query).sort({ createdAt: -1 });

    if (paginateResults) {
      jobQuery = jobQuery.skip((page - 1) * limit).limit(limit);
    }

    const [jobApplications, total] = await Promise.all([
      jobQuery.lean(),
      JobApplication.countDocuments(query)
    ]);

    console.log(`✅ Jobs API - Retrieved ${jobApplications.length} job(s) (total matching: ${total}) for user ${userId}`);
    if (jobApplications.length > 0) {
      console.log(`🔍 Jobs API - Sample job statuses:`, jobApplications.slice(0, 3).map((j: any) => ({ id: j._id, status: j.status, title: j.jobTitle })));
    }

    const jobs = jobApplications.map(serializeJob);
    const responsePayload: any = {
      success: true,
      data: {
        jobs,
        total
      }
    };

    if (paginateResults) {
      responsePayload.data.pagination = {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1
      };
    }

    return setCorsHeaders(
      NextResponse.json(responsePayload),
      request
    );

  } catch (error: any) {
    console.error('❌ Jobs list error:', error);
    return setCorsHeaders(
      NextResponse.json(
        { success: false, error: 'Failed to retrieve jobs from application tracker' },
        { status: 500 }
      ),
      request
    );
  }
}