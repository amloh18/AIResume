import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import { JobApplication } from '@/models';
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
      if (!session?.user?.email) {
        console.log('❌ No valid session for web request');
        return NextResponse.json(
          { success: false, error: 'No authorization token provided' },
          { status: 401 }
        );
      }
      
      // Get authenticated user
      const authResult = await getAuthenticatedUser(request);
      
      if (!authResult) {
        console.log('❌ No valid user found');
        return NextResponse.json(
          { success: false, error: 'User identification failed' },
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

    // Transform the job data to match the expected format
    const transformedJob = {
      id: job._id,
      _id: job._id, // Include both id and _id for compatibility
      title: job.jobTitle,
      jobTitle: job.jobTitle, // Include both title and jobTitle for compatibility
      company: job.company,
      location: job.location,
      description: job.jobDescription,
      jobDescription: job.jobDescription, // Include both description and jobDescription for compatibility
      requirements: job.requirements || [],
      responsibilities: job.responsibilities || [],
      salary: job.salary,
      type: job.type || 'full-time',
      remote: job.remote || false,
      postedDate: job.postedDate,
      applicationDeadline: job.applicationDeadline,
      status: job.status,
      // cvId removed - relationships now managed through CVJourney
      userId: job.userId,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
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
      if (!session?.user?.email) {
        console.log('❌ No valid session for web request');
        return NextResponse.json(
          { success: false, error: 'No authorization token provided' },
          { status: 401 }
        );
      }
      
      // Get authenticated user
      const authResult = await getAuthenticatedUser(request);
      
      if (!authResult) {
        console.log('❌ No valid user found');
        return NextResponse.json(
          { success: false, error: 'User identification failed' },
          { status: 401 }
        );
      }
      
      userId = authResult.userId;
      console.log('✅ Web session verified for user:', userId);
    }
    
    const resolvedParams = await params;

    const body = await request.json();

    // Get the current job to check for status changes
    const currentJob = await JobApplication.findById(resolvedParams.id);
    
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

    const job = await JobApplication.findOneAndUpdate(
      {
        _id: resolvedParams.id,
        userId: userId
      },
      {
        ...body,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!job) {
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

    return NextResponse.json({ job });
  } catch (error) {
    console.error('Error updating job:', error);
    return NextResponse.json(
      { error: 'Failed to update job' },
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
      if (!session?.user?.email) {
        console.log('❌ No valid session for web request');
        return NextResponse.json(
          { success: false, error: 'No authorization token provided' },
          { status: 401 }
        );
      }
      
      // Get authenticated user
      const authResult = await getAuthenticatedUser(request);
      
      if (!authResult) {
        console.log('❌ No valid user found');
        return NextResponse.json(
          { success: false, error: 'User identification failed' },
          { status: 401 }
        );
      }
      
      userId = authResult.userId;
      console.log('✅ Web session verified for user:', userId);
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
