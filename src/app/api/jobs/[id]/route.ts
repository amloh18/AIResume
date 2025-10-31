import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import { JobApplication, User } from '@/models';
import jwt from 'jsonwebtoken';
import { getAuthenticatedUser } from '@/lib/auth-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    let userId: string;
    
    // Check if this is an extension request (with JWT token)
    const authHeader = request.headers.get('authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Extension request with JWT token
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as any;
        
        if (decoded.type !== 'extension') {
          console.log('❌ Invalid token type');
          return NextResponse.json(
            { success: false, error: 'Invalid token type' },
            { status: 401 }
          );
        }
        
        userId = decoded.userId;
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
      const session = await getServerSession(authOptions);
      
      // Check if userId is provided as query parameter (from authenticatedFetchWithUserId)
      const { searchParams } = new URL(request.url);
      const queryUserId = searchParams.get('userId');
      
      if (queryUserId) {
        // Use the userId from query parameter
        userId = queryUserId;
        console.log('✅ Web request with userId parameter:', userId);
      } else if (session?.user?.email) {
        // Fallback to session-based authentication
        await connectDB();
        const user = await User.findOne({ email: session.user.email });
        
        if (!user) {
          console.log('❌ User not found in database');
          return NextResponse.json(
            { success: false, error: 'User not found' },
            { status: 404 }
          );
        }
        
        userId = user._id.toString();
        console.log('✅ Web session verified for user:', userId);
      } else {
        console.log('❌ No valid session or userId parameter for web request');
        return NextResponse.json(
          { success: false, error: 'No authorization token provided' },
          { status: 401 }
        );
      }
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
    await connectDB();
    
    let userId: string;
    
    // Check if this is an extension request (with JWT token)
    const authHeader = request.headers.get('authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Extension request with JWT token
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as any;
        
        if (decoded.type !== 'extension') {
          console.log('❌ Invalid token type');
          return NextResponse.json(
            { success: false, error: 'Invalid token type' },
            { status: 401 }
          );
        }
        
        userId = decoded.userId;
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
      const session = await getServerSession(authOptions);
      
      // Check if userId is provided as query parameter (from authenticatedFetchWithUserId)
      const { searchParams } = new URL(request.url);
      const queryUserId = searchParams.get('userId');
      
      if (queryUserId) {
        // Use the userId from query parameter
        userId = queryUserId;
        console.log('✅ Web request with userId parameter:', userId);
      } else if (session?.user?.email) {
        // Fallback to session-based authentication
        await connectDB();
        const user = await User.findOne({ email: session.user.email });
        
        if (!user) {
          console.log('❌ User not found in database');
          return NextResponse.json(
            { success: false, error: 'User not found' },
            { status: 404 }
          );
        }
        
        userId = user._id.toString();
        console.log('✅ Web session verified for user:', userId);
      } else {
        console.log('❌ No valid session or userId parameter for web request');
        return NextResponse.json(
          { success: false, error: 'No authorization token provided' },
          { status: 401 }
        );
      }
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

    // Update CV journeys with new job data if job title or company changed
    if (body.jobTitle || body.company) {
      try {
        const { CVJourney } = await import('@/models');
        await CVJourney.updateMany(
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
      } catch (error) {
        console.error('Error in bidirectional sync:', error);
        // Don't fail the job update if journey sync fails
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
    await connectDB();
    
    let userId: string;
    
    // Check if this is an extension request (with JWT token)
    const authHeader = request.headers.get('authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Extension request with JWT token
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as any;
        
        if (decoded.type !== 'extension') {
          console.log('❌ Invalid token type');
          return NextResponse.json(
            { success: false, error: 'Invalid token type' },
            { status: 401 }
          );
        }
        
        userId = decoded.userId;
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
      const session = await getServerSession(authOptions);
      
      // Check if userId is provided as query parameter (from authenticatedFetchWithUserId)
      const { searchParams } = new URL(request.url);
      const queryUserId = searchParams.get('userId');
      
      if (queryUserId) {
        // Use the userId from query parameter
        userId = queryUserId;
        console.log('✅ Web request with userId parameter:', userId);
      } else if (session?.user?.email) {
        // Fallback to session-based authentication
        await connectDB();
        const user = await User.findOne({ email: session.user.email });
        
        if (!user) {
          console.log('❌ User not found in database');
          return NextResponse.json(
            { success: false, error: 'User not found' },
            { status: 404 }
          );
        }
        
        userId = user._id.toString();
        console.log('✅ Web session verified for user:', userId);
      } else {
        console.log('❌ No valid session or userId parameter for web request');
        return NextResponse.json(
          { success: false, error: 'No authorization token provided' },
          { status: 401 }
        );
      }
    }
    
    const resolvedParams = await params;

    const job = await JobApplication.findOneAndDelete({
      _id: resolvedParams.id,
      userId: userId
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error);
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    );
  }
}
