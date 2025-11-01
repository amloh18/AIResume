import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import { ApplicationJourney } from '@/models';
import type { IApplicationJourney } from '@/models/ApplicationJourney';
import { createErrorResponse } from '@/lib/db-utils';
import { extractUserIdentifier, findManyByFirebaseUid, createWithFirebaseUid } from '@/lib/firebase-uid-utils';
import mongoose from 'mongoose';

// Type for lean user object returned from Mongoose queries
interface LeanUser {
  _id: mongoose.Types.ObjectId;
  firebaseUid?: string;
  email?: string;
  [key: string]: any; // Allow for other properties
}

// Type for journey object returned from Mongoose create operations
interface LeanJourney {
  _id: mongoose.Types.ObjectId;
  journeyId?: string;
  userId: string;
  firebaseUid?: string;
  jobId: string;
  cvId?: string;
  coverLetterId?: string;
  status: string;
  currentStep: number;
  totalSteps: number;
  jobTitle: string;
  company: string;
  createdAt: Date;
  updatedAt?: Date;
  [key: string]: any; // Allow for other properties
}

// Utility function to update job data in CV journeys
async function updateJobDataInJourneys(jobId: string) {
  try {
    const { JobApplication } = await import('@/models');
    const job = await JobApplication.findById(jobId);
    
    if (!job) {
      console.warn(`Job ${jobId} not found for journey update`);
      return;
    }

    // Update all journeys for this job
    const result = await ApplicationJourney.updateMany(
      { jobId },
      { 
        $set: { 
          jobTitle: job.jobTitle,
          company: job.company,
          'metadata.updatedAt': new Date()
        }
      }
    );

    console.log(`Updated ${result.modifiedCount} journeys with job data for job ${jobId}`);
  } catch (error) {
    console.error('Error updating job data in journeys:', error);
  }
}

// Utility function to cleanup orphaned journey references
async function cleanupOrphanedJourneyReferences(userIdentifier: { type: string; id: string }) {
  try {
    await connectDB();
    
    console.log('🔍 Cleaning up orphaned journey references for user:', userIdentifier);
    
    // Get all journeys for the user based on identifier type
    let journeys;
    if (userIdentifier.type === 'firebase') {
      journeys = await ApplicationJourney.find({ firebaseUid: userIdentifier.id }).lean();
    } else {
      journeys = await ApplicationJourney.find({ userId: userIdentifier.id }).lean();
    }
    
    console.log('🔍 Found journeys:', journeys.length);
    
    const { CV, CoverLetter } = await import('@/models');
    let cleanedCount = 0;
    
    for (const journey of journeys) {
      let needsUpdate = false;
      const updates: any = {};
      
      // Check if CV exists
      if (journey.cvId) {
        const cv = await CV.findById(journey.cvId);
        if (!cv) {
          console.log('❌ CV not found for journey:', journey._id, 'CV ID:', journey.cvId);
          updates.cvId = null;
          needsUpdate = true;
        }
      }
      
      // Check if Cover Letter exists
      if (journey.coverLetterId) {
        const coverLetter = await CoverLetter.findById(journey.coverLetterId);
        if (!coverLetter) {
          console.log('❌ Cover Letter not found for journey:', journey._id, 'Cover Letter ID:', journey.coverLetterId);
          updates.coverLetterId = null;
          needsUpdate = true;
        }
      }
      
      // Update journey if needed
      if (needsUpdate) {
        await ApplicationJourney.updateOne(
          { _id: journey._id },
          { $set: updates }
        );
        cleanedCount++;
        console.log('✅ Cleaned up journey:', journey._id);
      }
    }
    
    console.log('✅ Cleanup completed. Updated journeys:', cleanedCount);
    return { success: true, cleanedCount };
  } catch (error) {
    console.error('❌ Error cleaning up orphaned references:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// GET - Get CV journeys for a user
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Extract user identifier from request and session
    const userIdentifier = extractUserIdentifier(request, session);
    
    if (!userIdentifier.id || !userIdentifier.type) {
      console.log('❌ CV Journey API - No valid user identifier found');
      return NextResponse.json(
        { success: false, error: 'User identification failed' },
        { status: 401 }
      );
    }
    
    console.log('🔍 CV Journey API - User identifier:', userIdentifier);
    
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const cvId = searchParams.get('cvId');
    const status = searchParams.get('status');
    const limit = searchParams.get('limit');
    const sort = searchParams.get('sort') || 'createdAt';
    const cleanup = searchParams.get('cleanup') === 'true';

    // Perform cleanup if requested
    if (cleanup && userIdentifier.id && userIdentifier.type) {
      const cleanupResult = await cleanupOrphanedJourneyReferences({
        type: userIdentifier.type,
        id: userIdentifier.id
      });
      console.log('🧹 Cleanup result:', cleanupResult);
    }

    // Build query conditions based on user identifier type
    let baseQuery: Record<string, any> = {};
    
    if (userIdentifier.type === 'firebase' && userIdentifier.id) {
      baseQuery.firebaseUid = userIdentifier.id;
    } else if (userIdentifier.type === 'objectid' && userIdentifier.id) {
      baseQuery.userId = userIdentifier.id;
    }

    console.log('🔍 CV Journey API - Base query:', baseQuery);

    // Add additional query conditions
    if (jobId) {
      baseQuery.jobId = jobId;
    }
    
    if (cvId) {
      baseQuery.cvId = cvId;
    }
    
    if (status) {
      baseQuery.status = status;
    }

    // Create the actual query
    let query = ApplicationJourney.find(baseQuery);

    // Apply sorting
    const sortOrder = sort === 'createdAt' ? -1 : 1;
    query = query.sort({ [sort]: sortOrder });

    // Apply limit if specified
    if (limit) {
      query = query.limit(parseInt(limit));
    }

    // Execute query
    console.log('🔍 CV Journey API - Executing database query');
    const journeys = await query.lean();
    console.log('🔍 CV Journey API - Query executed, found journeys:', journeys.length);

    // Transform data for response
    const transformedJourneys = journeys.map(journey => ({
      id: journey._id,
      journeyId: journey.journeyId,
      userId: journey.userId,
      firebaseUid: journey.firebaseUid,
      jobId: journey.jobId,
      cvId: journey.cvId,
      coverLetterId: journey.coverLetterId,
      status: journey.status,
      currentStep: journey.currentStep,
      totalSteps: journey.totalSteps,
      atsScore: journey.atsScore,
      jobTitle: journey.jobTitle,
      company: journey.company,
      journeyType: journey.journeyType,
      steps: journey.steps,
      metadata: journey.metadata,
      createdAt: journey.createdAt,
      updatedAt: journey.updatedAt
    }));

    // Calculate total count for pagination
    const totalCount = await ApplicationJourney.countDocuments(baseQuery);

    return NextResponse.json({
      success: true,
      message: 'CV journeys retrieved successfully',
      data: {
        journeys: transformedJourneys,
        total: totalCount
      }
    });

  } catch (error: any) {
    console.error('Get CV journeys error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}

// POST - Create a new CV journey
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Extract user identifier from request and session
    const userIdentifier = extractUserIdentifier(request, session);
    
    if (!userIdentifier.id || !userIdentifier.type) {
      console.log('❌ CV Journey POST API - No valid user identifier found');
      return NextResponse.json(
        { success: false, error: 'User identification failed' },
        { status: 401 }
      );
    }
    
    console.log('🔍 CV Journey POST API - User identifier:', userIdentifier);

    const body = await request.json();
    const {
      jobId,
      cvId,
      coverLetterId,
      jobTitle,
      company,
      journeyType = 'standard',
      steps = []
    } = body;

    // Validate required fields for journey identification
    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Check if journey already exists for this job
    let existingJourneyQuery: Record<string, any> = { jobId };
    
    if (userIdentifier.type === 'firebase' && userIdentifier.id) {
      existingJourneyQuery.firebaseUid = userIdentifier.id;
    } else if (userIdentifier.type === 'objectid' && userIdentifier.id) {
      existingJourneyQuery.userId = userIdentifier.id;
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid user identifier' },
        { status: 400 }
      );
    }

    const existingJourney = await ApplicationJourney.findOne(existingJourneyQuery);
    
    if (existingJourney) {
      // Update existing journey with new CV/coverLetter data
      console.log('🔄 CV Journey POST API - Updating existing journey:', existingJourney._id);
      
      let updated = false;
      
      if (cvId && existingJourney.cvId !== cvId) {
        existingJourney.cvId = cvId;
        existingJourney.currentStep = Math.max(existingJourney.currentStep, 2);
        updated = true;
      }
      
      if (coverLetterId && existingJourney.coverLetterId !== coverLetterId) {
        existingJourney.coverLetterId = coverLetterId;
        existingJourney.currentStep = Math.max(existingJourney.currentStep, 3);
        updated = true;
      }
      
      if (steps && steps.length > 0) {
        existingJourney.steps = steps;
        updated = true;
      }
      
      if (updated) {
        existingJourney.metadata.updatedAt = new Date();
        existingJourney.metadata.lastAccessedAt = new Date();
        await existingJourney.save();
        
        console.log('✅ CV Journey POST API - Existing journey updated successfully');
        
        return NextResponse.json({
          success: true,
          message: 'Journey updated successfully',
          data: {
            journey: {
              id: existingJourney._id,
              journeyId: existingJourney.journeyId,
              jobId: existingJourney.jobId,
              jobTitle: existingJourney.jobTitle,
              company: existingJourney.company,
              status: existingJourney.status,
              currentStep: existingJourney.currentStep,
              totalSteps: existingJourney.totalSteps,
              cvId: existingJourney.cvId,
              coverLetterId: existingJourney.coverLetterId,
              createdAt: existingJourney.createdAt,
              updatedAt: existingJourney.metadata.updatedAt
            }
          }
        }, { status: 200 });
      } else {
        // No updates needed, return existing journey
        return NextResponse.json({
          success: true,
          message: 'Journey already exists with current data',
          data: {
            journey: {
              id: existingJourney._id,
              journeyId: existingJourney.journeyId,
              jobId: existingJourney.jobId,
              jobTitle: existingJourney.jobTitle,
              company: existingJourney.company,
              status: existingJourney.status,
              currentStep: existingJourney.currentStep,
              totalSteps: existingJourney.totalSteps,
              cvId: existingJourney.cvId,
              coverLetterId: existingJourney.coverLetterId,
              createdAt: existingJourney.createdAt,
              updatedAt: existingJourney.metadata.updatedAt
            }
          }
        }, { status: 200 });
      }
    }

    // Validate required fields for creating new journey
    if (!jobTitle || !company) {
      return NextResponse.json(
        { success: false, error: 'Job title and company are required for creating new journey' },
        { status: 400 }
      );
    }

    // Determine if documents need to be created
    const needsDocuments = !cvId && !coverLetterId;
    const initialStatus = needsDocuments ? 'processing_documents' : 'in-progress';

    // Prepare journey data for creation
    const journeyData = {
      journeyId: `journey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: userIdentifier.type === 'objectid' && userIdentifier.id ? userIdentifier.id : '',
      jobId,
      cvId: cvId || null,
      coverLetterId: coverLetterId || null,
      status: initialStatus,
      currentStep: 1,
      totalSteps: steps.length || 5,
      jobTitle,
      company,
      journeyType,
      steps: steps.length > 0 ? steps : [
        {
          stepId: 1,
          name: 'Job Analysis',
          status: 'active',
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
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        tags: [],
        notes: ''
      }
    };

    console.log('🚀 CV Journey POST API - Journey data prepared:', {
      jobId,
      jobTitle,
      company,
      userIdentifier
    });

    // Create new journey with proper user identification
    let newJourney: LeanJourney;
    
    if (userIdentifier.type === 'firebase' && userIdentifier.id) {
      // For Firebase users, we need to get the MongoDB ObjectId from the User collection
      const { User } = await import('@/models');
      const user = await User.findOne({ firebaseUid: userIdentifier.id }).lean() as LeanUser | null;
      
      if (!user || !user._id) {
        console.log('❌ CV Journey POST API - Firebase user not found:', userIdentifier.id);
        console.log('🔍 Attempting to create user from session data...');
        
        // Try to create user from session data as fallback
        const session = await getServerSession(authOptions);
        console.log('🔍 CV Journey POST API - Session data:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          userEmail: session?.user?.email,
          userName: session?.user?.name,
          userFirstName: session?.user?.firstName,
          userLastName: session?.user?.lastName
        });
        
        if (session?.user?.email) {
          try {
            // Extract name from session data
            let firstName = 'User';
            let lastName = '';
            
            if (session.user.firstName && session.user.lastName) {
              firstName = session.user.firstName;
              lastName = session.user.lastName;
            } else if (session.user.name) {
              const nameParts = session.user.name.split(' ');
              firstName = nameParts[0] || 'User';
              lastName = nameParts.slice(1).join(' ') || '';
            }
            
            console.log('🔍 CV Journey POST API - Creating user with:', {
              email: session.user.email,
              firstName,
              lastName,
              firebaseUid: userIdentifier.id
            });
            
            const newUser = new User({
              email: session.user.email,
              firstName,
              lastName,
              firebaseUid: userIdentifier.id || '',
              authProviderId: userIdentifier.id || '', // Add authProviderId for Firebase users
              isEmailVerified: true,
              role: 'user',
              currentPlanKey: 'free',
              authProvider: 'nextauth', // Use 'nextauth' instead of 'firebase'
              monthlyGoal: 20,
              usage: {
                cvJourneyCount: 0,
                cvCreatedCount: 0,
                journeysCreated: 0,
                exportCount: 0,
                atsCheckCount: 0,
                lastResetDate: new Date(),
              },
              subscription: {
                planKey: 'free',
                status: 'inactive',
                startDate: new Date(),
                provider: 'stripe',
                interval: 'monthly',
                seats: 3,
                storageUsed: 0,
              },
              settings: {
                theme: 'auto',
                notifications: {
                  email: true,
                  push: true,
                },
                timezone: 'UTC +07:00 - Asia / Jakarta',
                languagePreference: 'English',
              },
              lastLogin: new Date(),
            });
            
            await newUser.save();
            console.log('✅ Created missing Firebase user:', newUser._id);
            
            if (!newUser._id || !userIdentifier.id) {
              throw new Error('Failed to create user or invalid Firebase UID');
            }
            
            const userId = newUser._id.toString();
            const firebaseUid = userIdentifier.id;
            
            // Use createWithFirebaseUid for Firebase users
            newJourney = await createWithFirebaseUid(
              ApplicationJourney,
              journeyData,
              userId,
              firebaseUid
            ) as LeanJourney;
            
            console.log('✅ CV Journey POST API - Journey saved successfully:', {
              id: newJourney._id,
              journeyId: newJourney.journeyId,
              userId: newJourney.userId,
              firebaseUid: newJourney.firebaseUid,
              jobTitle: newJourney.jobTitle,
              status: newJourney.status
            });

            // If documents need to be created, trigger async creation
            if (needsDocuments && newJourney.status === 'processing_documents') {
              const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
              const createUrl = `${baseUrl}/api/journey-documents/create`;
              
              fetch(createUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(request.headers.get('cookie') && { Cookie: request.headers.get('cookie')! })
                },
                body: JSON.stringify({ journeyId: newJourney._id.toString() })
              }).catch(error => {
                console.error('❌ CV Journey POST API - Error triggering document creation:', error);
              });
              
              console.log('🚀 CV Journey POST API - Triggered async document creation for journey:', newJourney._id);
            }

            return NextResponse.json({
              success: true,
              message: 'CV journey created successfully',
              data: {
                journey: {
                  id: newJourney._id,
                  journeyId: newJourney.journeyId,
                  jobId: newJourney.jobId,
                  jobTitle: newJourney.jobTitle,
                  company: newJourney.company,
                  status: newJourney.status,
                  currentStep: newJourney.currentStep,
                  totalSteps: newJourney.totalSteps,
                  createdAt: newJourney.createdAt
                }
              }
            }, { status: 201 });
            
          } catch (createError) {
            console.error('❌ Failed to create user from session:', createError);
            
            // Log specific validation errors
            if (createError instanceof mongoose.Error.ValidationError) {
              console.error('❌ User validation errors:', createError.errors);
              console.error('❌ Validation error details:', JSON.stringify(createError.errors, null, 2));
            } else if (createError instanceof Error && createError.name === 'ValidationError') {
              // Type guard for validation errors with errors property
              interface ValidationErrorWithDetails extends Error {
                errors?: Record<string, { message: string; kind?: string; path?: string }>;
              }
              const errorWithErrors = createError as ValidationErrorWithDetails;
              if (errorWithErrors.errors) {
                console.error('❌ User validation errors:', errorWithErrors.errors);
                console.error('❌ Validation error details:', JSON.stringify(errorWithErrors.errors, null, 2));
              }
            }
            
            // Try one more fallback - create user with minimal data
            try {
              console.log('🔍 CV Journey POST API - Attempting minimal user creation...');
              
              // Check if user already exists with this Firebase UID
              if (!userIdentifier.id) {
                throw new Error('Firebase UID is required');
              }
              const existingUserByFirebase = await User.findOne({ firebaseUid: userIdentifier.id });
              if (existingUserByFirebase && existingUserByFirebase._id) {
                console.log('✅ Found existing user by Firebase UID:', existingUserByFirebase._id);
                
                // userIdentifier.id is guaranteed to be non-null here due to check above
                const userId = existingUserByFirebase._id.toString();
                const firebaseUid = userIdentifier.id;
                
                // Use createWithFirebaseUid for Firebase users
                newJourney = await createWithFirebaseUid(
                  ApplicationJourney,
                  journeyData,
                  userId,
                  firebaseUid
                ) as LeanJourney;
                
                console.log('✅ CV Journey POST API - Journey saved successfully with existing user:', {
                  id: newJourney._id,
                  journeyId: newJourney.journeyId,
                  userId: newJourney.userId,
                  firebaseUid: newJourney.firebaseUid,
                  jobTitle: newJourney.jobTitle
                });

                return NextResponse.json({
                  success: true,
                  message: 'CV journey created successfully',
                  data: {
                    journey: {
                      id: newJourney._id,
                      journeyId: newJourney.journeyId,
                      jobId: newJourney.jobId,
                      jobTitle: newJourney.jobTitle,
                      company: newJourney.company,
                      status: newJourney.status,
                      currentStep: newJourney.currentStep,
                      totalSteps: newJourney.totalSteps,
                      createdAt: newJourney.createdAt
                    }
                  }
                }, { status: 201 });
              }
              
              // Generate unique email to avoid conflicts
              if (!userIdentifier.id) {
                throw new Error('Firebase UID is required for minimal user creation');
              }
              
              const uniqueEmail = `user-${userIdentifier.id}-${Date.now()}@temp.com`;
              
              const minimalUser = new User({
                email: uniqueEmail,
                firstName: 'User',
                lastName: 'User', // Required field, can't be empty
                firebaseUid: userIdentifier.id,
                authProviderId: userIdentifier.id, // Add authProviderId for Firebase users
                isEmailVerified: false,
                role: 'user',
                currentPlanKey: 'free',
                authProvider: 'nextauth', // Use 'nextauth' instead of 'firebase'
                monthlyGoal: 20,
                usage: {
                  cvJourneyCount: 0,
                  cvCreatedCount: 0,
                  journeysCreated: 0,
                  exportCount: 0,
                  atsCheckCount: 0,
                  lastResetDate: new Date(),
                },
                subscription: {
                  planKey: 'free',
                  status: 'inactive',
                  startDate: new Date(),
                  provider: 'stripe',
                  interval: 'monthly',
                  seats: 3,
                  storageUsed: 0,
                },
                settings: {
                  theme: 'auto',
                  notifications: {
                    email: true,
                    push: true,
                  },
                  timezone: 'UTC +07:00 - Asia / Jakarta',
                  languagePreference: 'English',
                },
                lastLogin: new Date(),
              });
              
              await minimalUser.save();
              console.log('✅ Created minimal Firebase user:', minimalUser._id);
              
              if (!minimalUser._id || !userIdentifier.id) {
                throw new Error('Failed to create user or invalid Firebase UID');
              }
              
              const userId = minimalUser._id.toString();
              const firebaseUid = userIdentifier.id;
              
              // Use createWithFirebaseUid for Firebase users
              newJourney = await createWithFirebaseUid(
                ApplicationJourney,
                journeyData,
                userId,
                firebaseUid
              ) as LeanJourney;
              
              console.log('✅ CV Journey POST API - Journey saved successfully with minimal user:', {
                id: newJourney._id,
                journeyId: newJourney.journeyId,
                userId: newJourney.userId,
                firebaseUid: newJourney.firebaseUid,
                jobTitle: newJourney.jobTitle
              });

              return NextResponse.json({
                success: true,
                message: 'CV journey created successfully (user created with minimal data)',
                data: {
                  journey: {
                    id: newJourney._id,
                    journeyId: newJourney.journeyId,
                    jobId: newJourney.jobId,
                    jobTitle: newJourney.jobTitle,
                    company: newJourney.company,
                    status: newJourney.status,
                    currentStep: newJourney.currentStep,
                    totalSteps: newJourney.totalSteps,
                    createdAt: newJourney.createdAt
                  }
                }
              }, { status: 201 });
              
            } catch (minimalCreateError) {
              console.error('❌ Failed to create minimal user:', minimalCreateError);
              
              // Log specific validation errors
              if (minimalCreateError instanceof mongoose.Error.ValidationError) {
                console.error('❌ User validation errors:', minimalCreateError.errors);
                console.error('❌ Validation error details:', JSON.stringify(minimalCreateError.errors, null, 2));
                return NextResponse.json(
                  { 
                    success: false, 
                    error: 'User validation failed. Please complete your profile setup first.',
                    details: Object.keys(minimalCreateError.errors).map(key => ({
                      field: key,
                      message: minimalCreateError.errors[key].message
                    }))
                  },
                  { status: 400 }
                );
              } else if (minimalCreateError instanceof Error && minimalCreateError.name === 'ValidationError') {
                // Type guard for validation errors with errors property
                interface ValidationErrorWithDetails extends Error {
                  errors?: Record<string, { message: string }>;
                }
                const errorWithErrors = minimalCreateError as ValidationErrorWithDetails;
                if (errorWithErrors.errors) {
                  console.error('❌ User validation errors:', errorWithErrors.errors);
                  console.error('❌ Validation error details:', JSON.stringify(errorWithErrors.errors, null, 2));
                  return NextResponse.json(
                    { 
                      success: false, 
                      error: 'User validation failed. Please complete your profile setup first.',
                      details: Object.keys(errorWithErrors.errors).map(key => ({
                        field: key,
                        message: errorWithErrors.errors![key].message
                      }))
                    },
                    { status: 400 }
                  );
                }
              }
              
              return NextResponse.json(
                { success: false, error: 'User not found in database and could not be created. Please complete your profile setup first.' },
                { status: 404 }
              );
            }
          }
        } else {
          return NextResponse.json(
            { success: false, error: 'User not found in database. Please complete your profile setup first.' },
            { status: 404 }
          );
        }
      }
      
      // Type guard: ensure user exists and has _id before using it
      if (!user || !user._id || !userIdentifier.id) {
        return NextResponse.json(
          { success: false, error: 'User not found in database. Please complete your profile setup first.' },
          { status: 404 }
        );
      }
      
      const userId = user._id.toString();
      const firebaseUid = userIdentifier.id;
      
      
      // Use createWithFirebaseUid for Firebase users
      newJourney = await createWithFirebaseUid(
        ApplicationJourney,
        journeyData,
        userId,
        firebaseUid
      ) as LeanJourney;
    } else if (userIdentifier.type === 'objectid' && userIdentifier.id) {
      // For regular Next.js users, create directly without Firebase UID
      
      const documentData = {
        ...journeyData,
        userId: userIdentifier.id,
        firebaseUid: '' // Empty string for non-Firebase users
      };
      
      newJourney = await ApplicationJourney.create(documentData) as LeanJourney;
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid user identifier type' },
        { status: 400 }
      );
    }

    console.log('✅ CV Journey POST API - Journey saved successfully:', {
      id: newJourney._id,
      journeyId: newJourney.journeyId,
      userId: newJourney.userId,
      firebaseUid: newJourney.firebaseUid,
      jobTitle: newJourney.jobTitle,
      status: newJourney.status
    });

    // If documents need to be created, trigger async creation with better error handling
    if (needsDocuments && newJourney.status === 'processing_documents') {
      const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
      const createUrl = `${baseUrl}/api/journey-documents/create`;
      
      // Trigger async document creation with proper error handling
      fetch(createUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(request.headers.get('cookie') && { Cookie: request.headers.get('cookie')! }),
          // Pass authorization headers if available
          ...(request.headers.get('authorization') && { Authorization: request.headers.get('authorization')! })
        },
        body: JSON.stringify({ journeyId: newJourney._id.toString() })
      })
      .then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ CV Journey POST API - Document creation failed:', response.status, errorText);
        } else {
          console.log('✅ CV Journey POST API - Document creation triggered successfully');
        }
      })
      .catch(error => {
        console.error('❌ CV Journey POST API - Error triggering document creation:', error);
        // Update journey status to failed if the request itself fails
        ApplicationJourney.findByIdAndUpdate(newJourney._id, {
          status: 'creation_failed',
          'metadata.updatedAt': new Date()
        }).catch(updateError => {
          console.error('❌ CV Journey POST API - Failed to update journey status:', updateError);
        });
      });
      
      console.log('🚀 CV Journey POST API - Triggered async document creation for journey:', newJourney._id);
    }

    return NextResponse.json({
      success: true,
      message: 'CV journey created successfully',
      data: {
        journey: {
          id: newJourney._id,
          journeyId: newJourney.journeyId,
          jobId: newJourney.jobId,
          jobTitle: newJourney.jobTitle,
          company: newJourney.company,
          status: newJourney.status,
          currentStep: newJourney.currentStep,
          totalSteps: newJourney.totalSteps,
          createdAt: newJourney.createdAt
        }
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ CV Journey POST API - Error creating journey:', error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: 'A journey with this ID already exists' },
        { status: 409 }
      );
    }
    
    // Return a proper error message
    const errorMessage = error.message || 'Failed to create CV journey';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('🔍 CV Journey DELETE API - Starting deletion request');
    console.log('🔍 CV Journey DELETE API - Request URL:', request.url);
    console.log('🔍 CV Journey DELETE API - Request method:', request.method);
    await connectDB();
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Extract user identifier from request and session
    const userIdentifier = extractUserIdentifier(request, session);
    
    if (!userIdentifier.id || !userIdentifier.type) {
      console.log('❌ CV Journey DELETE API - No valid user identifier found');
      return NextResponse.json(
        { success: false, error: 'User identification failed' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('🔍 CV Journey DELETE API - Request body:', body);
    const { journeyId } = body;

    if (!journeyId) {
      console.log('❌ CV Journey DELETE API - No journeyId provided');
      return NextResponse.json(
        { success: false, error: 'Journey ID is required' },
        { status: 400 }
      );
    }

    console.log('🔍 CV Journey DELETE API - Deleting journey:', journeyId);

    // Find the journey first to get linked documents
    let journeyQuery: Record<string, any> = { _id: journeyId };
    
    if (userIdentifier.type === 'firebase' && userIdentifier.id) {
      journeyQuery.firebaseUid = userIdentifier.id;
    } else if (userIdentifier.type === 'objectid' && userIdentifier.id) {
      journeyQuery.userId = new mongoose.Types.ObjectId(userIdentifier.id);
    }

    const journey = await ApplicationJourney.findOne(journeyQuery);
    
    if (!journey) {
      return NextResponse.json(
        { success: false, error: 'Journey not found' },
        { status: 404 }
      );
    }

    console.log('🔍 CV Journey DELETE API - Found journey:', {
      id: journey._id,
      cvId: journey.cvId,
      coverLetterId: journey.coverLetterId,
      jobId: journey.jobId
    });

    // Import models
    const { CV, CoverLetter } = await import('@/models');

    // Step 1: Delete cover letter if it exists
    if (journey.coverLetterId) {
      try {
        console.log('🔍 CV Journey DELETE API - Deleting cover letter:', journey.coverLetterId);
        const coverLetterResult = await CoverLetter.findByIdAndDelete(journey.coverLetterId);
        if (coverLetterResult) {
          console.log('✅ CV Journey DELETE API - Cover letter deleted successfully');
        } else {
          console.log('⚠️ CV Journey DELETE API - Cover letter not found (already deleted)');
        }
      } catch (error) {
        console.error('❌ CV Journey DELETE API - Error deleting cover letter:', error);
        // Continue with deletion even if cover letter deletion fails
      }
    }

    // Step 2: Delete CV if it exists (but not if it's a Master CV)
    if (journey.cvId) {
      try {
        console.log('🔍 CV Journey DELETE API - Checking CV for deletion:', journey.cvId);
        const cv = await CV.findById(journey.cvId);
        
        if (cv) {
          // Hard stop for Master CV protection
          if (cv.isMaster || cv.metadata?.isMaster) {
            console.error(`❌ CRITICAL: Attempt to delete Master CV ${cv._id} from journey ${journeyId}. Aborting CV deletion.`);
            // Do NOT proceed with CV deletion - skip this step
            console.log('⚠️ CV Journey DELETE API - Skipping Master CV deletion (protected)');
          } else {
            console.log('🔍 CV Journey DELETE API - Deleting CV:', journey.cvId);
            const cvResult = await CV.findByIdAndDelete(journey.cvId);
            if (cvResult) {
              console.log('✅ CV Journey DELETE API - CV deleted successfully');
            }
          }
        } else {
          console.log('⚠️ CV Journey DELETE API - CV not found (already deleted)');
        }
      } catch (error) {
        console.error('❌ CV Journey DELETE API - Error deleting CV:', error);
        // Continue with deletion even if CV deletion fails
      }
    }

    // Step 3: Delete the journey itself (but NOT the job)
    console.log('🔍 CV Journey DELETE API - Deleting journey record');
    const journeyResult = await ApplicationJourney.findByIdAndDelete(journey._id);
    
    if (!journeyResult) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete journey' },
        { status: 500 }
      );
    }

    console.log('✅ CV Journey DELETE API - Journey deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'CV journey and associated documents deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ CV Journey DELETE API - Error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}
