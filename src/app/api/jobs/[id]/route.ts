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
    console.log('🔍 Job Update API - User ID:', userId);

    // Normalize userId for query
    const normalizedUserId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;

    const body = await request.json();
    console.log('🔍 Job Update API - Request body keys:', Object.keys(body));

    // Get the current job to check for status changes - also verify it belongs to the user
    let currentJob = null;
    if (mongoose.Types.ObjectId.isValid(resolvedParams.id)) {
      currentJob = await JobApplication.findOne({
        _id: new mongoose.Types.ObjectId(resolvedParams.id),
        userId: normalizedUserId
      });
    } else {
      console.log('❌ Job Update API - Invalid job ID format:', resolvedParams.id);
      return NextResponse.json({ error: 'Invalid job ID format' }, { status: 400 });
    }
    
    console.log('🔍 Job Update API - Current job found:', !!currentJob);
    if (!currentJob) {
      console.log('❌ Job Update API - Job not found or does not belong to user');
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
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

    // Convert date strings to Date objects if provided
    if (body.deadline) {
      updateData.deadline = new Date(body.deadline);
    }
    if (body.applicationDate) {
      updateData.applicationDate = new Date(body.applicationDate);
    }

    console.log('🔍 Job Update API - Updating job with data:', Object.keys(updateData));
    
    // VALIDATION: Prevent invalid status transitions
    const validStatuses = ['draft', 'created', 'applied', 'screening', 'interview', 'offer', 'rejected', 'accepted', 'withdrawn'];
    const newStatus = body.status;
    if (newStatus && !validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { error: `Invalid status: ${newStatus}. Valid statuses are: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }
    
    // VALIDATION: Prevent status manipulation that could bypass credit checks
    // Don't allow changing from 'created' back to 'draft' (prevents credit refund exploit)
    const previousStatus = currentJob?.status;
    if (previousStatus === 'created' && newStatus === 'draft') {
      return NextResponse.json(
        { 
          error: 'Cannot change job status from "created" to "draft". Once a job is created, it cannot be reverted to draft status.',
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
    
    // Check if status changed from 'draft' to 'created' - handle this in transaction
    let job: any = null;
    
    if (previousStatus === 'draft' && newStatus === 'created') {
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
          // 1. CREDIT CHECK: Check credits WITHIN transaction (locks user record to prevent race conditions)
          const user = await User.findById(normalizedUserId).session(session);
          if (!user) {
            throw new Error('User not found');
          }
          
          // Fast credit check using already-fetched user (avoid redundant queries)
          const plan = await PricingPlan.findOne({ key: user.currentPlanKey }).session(session).lean();
          if (!plan) {
            throw new Error('Plan not found');
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
          
          // Quick credit availability check using user data
          const isUnlimitedPlan = ['pro_monthly', 'pro_quarterly', 'pro_yearly'].includes(user.currentPlanKey);
          const hasActiveSubscription = user.subscription?.status === 'active' && hasTimeAccess;
          
          let creditsRemaining = 0;
          let limit = 1;
          
          if (isUnlimitedPlan && hasActiveSubscription) {
            creditsRemaining = -1;
            limit = -1;
          } else {
            // Get plan credits
            const planCredits = await creditService.default.getPlanCredits(user.currentPlanKey || 'free');
            limit = planCredits.jobCredits;
            creditsRemaining = user.credits?.jobCredits ?? 0;
          }
          
          const allowed = limit === -1 || creditsRemaining > 0;
          const currentUsage = limit === -1 ? -1 : limit - creditsRemaining;

          console.log(`🔍 Job Update API - Credit check result (in transaction):`, {
            allowed,
            currentUsage,
            limit,
            creditsRemaining
          });

          if (!allowed) {
            const reason = `Plan limit exceeded. You have used ${currentUsage}/${limit === -1 ? 'unlimited' : limit} job creates`;
            console.log(`❌ Job Update API - Credit check failed (in transaction):`, reason);
            throw new Error(reason);
          }
          
          // 2. Update job status within transaction (only if credits are available)
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
            { session, new: true }
          );
          
          if (!updatedJob) {
            throw new Error('Job not found');
          }
          
          // Store updated job for later use
          job = updatedJob;
          
          // 3. Spend credit within same transaction (atomic with status update)
          const isUnlimited = limit === -1;
          
          // Build update operation for credit spending
          const creditUpdateData: any = {
            $inc: {
              'credits.totalCreated.jobs': 1
            }
          };
          
          if (!isUnlimited) {
            creditUpdateData.$inc['credits.jobCredits'] = -1;
          }
          
          // Ensure nested structure exists
          if (!user.credits?.totalCreated || user.credits.totalCreated.jobs === undefined) {
            const currentJobs = user.credits?.totalCreated?.jobs ?? 0;
            creditUpdateData.$set = {
              'credits.totalCreated.jobs': currentJobs + 1,
              'credits.totalCreated.cvs': user.credits?.totalCreated?.cvs ?? 0,
              'credits.totalCreated.exports': user.credits?.totalCreated?.exports ?? 0,
              'credits.totalCreated.atsChecks': user.credits?.totalCreated?.atsChecks ?? 0
            };
            if (creditUpdateData.$inc && 'credits.totalCreated.jobs' in creditUpdateData.$inc) {
              delete creditUpdateData.$inc['credits.totalCreated.jobs'];
              if (Object.keys(creditUpdateData.$inc).length === 0) {
                delete creditUpdateData.$inc;
              }
            }
          }
          
          // Update user credits within transaction
          await User.findByIdAndUpdate(
            normalizedUserId,
            creditUpdateData,
            { session, new: true, runValidators: true }
          );
          
          console.log(`✅ Job Update API - Credit spent in transaction for user: ${normalizedUserId.toString()}`);
        });
        
        // Log job status change and credit usage OUTSIDE transaction for better performance
        try {
          const updatedJobForLog = await JobApplication.findById(resolvedParams.id).lean();
          const userForLog = await User.findById(normalizedUserId).lean();
          
          if (updatedJobForLog && userForLog) {
            const { ActivityLogService } = await import('@/lib/services/activityLogService');
            const isUnlimited = ['pro_monthly', 'pro_quarterly', 'pro_yearly'].includes(userForLog.currentPlanKey || 'free');
            
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
                  oldStatus: 'draft',
                  newStatus: 'created',
                  isUnlimited: isUnlimited
                }
              }),
              !isUnlimited && ActivityLogService.logUserAction({
                userId: normalizedUserId.toString(),
                userEmail: userForLog.email || '',
                action: 'credit_used',
                status: 'success',
                ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 
                          request.headers.get('x-real-ip') || 
                          undefined,
                metadata: {
                  creditType: 'job_credit',
                  creditsUsed: 1,
                  creditsRemaining: (userForLog.credits?.jobCredits ?? 0),
                  planKey: userForLog.currentPlanKey || 'free',
                  resourceType: 'job',
                  resourceId: resolvedParams.id
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
        
        // Transaction automatically rolled back - status remains 'draft', credits not spent
        
        // Check if error is due to insufficient credits
        const isCreditError = creditError.message?.includes('limit exceeded') || 
                             creditError.message?.includes('insufficient credits') ||
                             creditError.message?.includes('Insufficient credits') ||
                             creditError.message?.includes('Job creation limit exceeded');
        
        if (isCreditError) {
          // Extract credit info from error if available
          const usageLimitsService = await import('@/lib/services/usageLimitsService');
          let creditInfo: any = {};
          try {
            const creditCheck = await usageLimitsService.default.checkUsageLimit({
              userId,
              action: 'job_create'
            });
            creditInfo = {
              currentUsage: creditCheck.currentUsage,
              limit: creditCheck.limit,
              reason: creditCheck.reason
            };
          } catch (e) {
            // Fallback if credit check fails - use defaults
            console.error('⚠️ Job Update API - Failed to get credit info:', e);
            creditInfo = {
              currentUsage: 1,
              limit: 1,
              reason: creditError.message
            };
          }
          
          const errorResponse = {
            success: false,
            error: creditError.message || 'Insufficient credits to create job application',
            requiresUpgrade: true,
            currentUsage: creditInfo.currentUsage ?? 1,
            limit: creditInfo.limit ?? 1,
            message: 'Buy premium plans to create automatic CV and CL with ATS for multiple jobs'
          };
          
          console.log('🔍 Job Update API - Returning credit error response:', errorResponse);
          
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
      // For non-draft-to-created updates, update job normally
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
        console.log('❌ Job Update API - Tried to update with:', {
          jobId: resolvedParams.id,
          userId: normalizedUserId.toString()
        });
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
    }

    // Create ApplicationJourney after credit is spent (only if moved to created)
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
          
          // If existing journey doesn't have documents yet, trigger document creation
          if (!existingJourney.cvId && !existingJourney.coverLetterId && existingJourney.status !== 'processing_documents') {
            console.log(`🚀 Job Update API - Existing journey found without documents, triggering document creation for journey: ${existingJourney._id}`);
            
            // Update journey status to processing_documents
            await ApplicationJourney.updateOne(
              { _id: existingJourney._id },
              { $set: { status: 'processing_documents' } }
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
          channels: ['in-app'],
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
      isArchived: Boolean(job.isArchived),
      createdAt: job.createdAt instanceof Date ? job.createdAt.toISOString() : job.createdAt,
      updatedAt: job.updatedAt instanceof Date ? job.updatedAt.toISOString() : job.updatedAt
    };
    
    // Return response in format expected by extension
    // Extension expects response.data to be the job object directly, not nested
    return NextResponse.json({ 
      success: true,
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

    // Convert jobId and userId to ObjectId for proper querying
    const normalizedJobId = mongoose.Types.ObjectId.isValid(jobId) 
      ? new mongoose.Types.ObjectId(jobId) 
      : jobId;
    const normalizedUserId = mongoose.Types.ObjectId.isValid(userId) 
      ? new mongoose.Types.ObjectId(userId) 
      : userId;

    console.log('🔍 Job DELETE API - Normalized Job ID:', normalizedJobId.toString());
    console.log('🔍 Job DELETE API - Normalized User ID:', normalizedUserId.toString());

    // First, find the job to ensure it exists and user owns it
    const job = await JobApplication.findOne({
      _id: normalizedJobId,
      userId: normalizedUserId
    });

    if (!job) {
      console.log('❌ Job DELETE API - Job not found');
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Import models for cascade deletion
    const { ApplicationJourney, CV, CoverLetter, Notification, TemporaryCVDraft } = await import('@/models');

    // Step 1: Find all journeys associated with this job
    console.log('🔍 Job DELETE API - Finding associated journeys for job:', jobId);
    // Try both string and ObjectId formats for jobId matching
    const journeys = await ApplicationJourney.find({ 
      $or: [
        { jobId: jobId.toString() },
        { jobId: normalizedJobId },
        { jobId: normalizedJobId.toString() }
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
            const normalizedUserIdStr = normalizedUserId.toString();
            if (cvUserId === userId || cvUserId === normalizedUserIdStr) {
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

    // Step 3: Delete notifications that reference this job
    let deletedNotificationsCount = 0;
    try {
      console.log('🔍 Job DELETE API - Finding notifications for job:', jobId);
      const notificationsResult = await Notification.deleteMany({
        userId: new mongoose.Types.ObjectId(userId),
        $or: [
          { 'actionData.jobId': jobId.toString() },
          { 'metadata.jobId': jobId.toString() }
        ]
      });
      deletedNotificationsCount = notificationsResult.deletedCount;
      console.log(`✅ Job DELETE API - Deleted ${deletedNotificationsCount} notification(s)`);
    } catch (error) {
      console.error('❌ Job DELETE API - Error deleting notifications:', error);
      // Continue with deletion even if notification deletion fails
    }

    // Step 4: Delete temporary CV drafts that reference this job
    let deletedDraftsCount = 0;
    try {
      console.log('🔍 Job DELETE API - Finding temporary CV drafts for job:', jobId);
      const draftsResult = await TemporaryCVDraft.deleteMany({
        jobId: new mongoose.Types.ObjectId(jobId),
        userId: new mongoose.Types.ObjectId(userId)
      });
      deletedDraftsCount = draftsResult.deletedCount;
      console.log(`✅ Job DELETE API - Deleted ${deletedDraftsCount} temporary CV draft(s)`);
    } catch (error) {
      console.error('❌ Job DELETE API - Error deleting temporary CV drafts:', error);
      // Continue with deletion even if draft deletion fails
    }

    // Step 5: Finally, delete the job itself
    console.log('🔍 Job DELETE API - Deleting job:', jobId);
    const deletedJob = await JobApplication.findOneAndDelete({
      _id: normalizedJobId,
      userId: normalizedUserId
    });

    if (!deletedJob) {
      console.log('❌ Job DELETE API - Job deletion failed (may have been deleted already)');
      return NextResponse.json({ error: 'Job deletion failed' }, { status: 500 });
    }

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
