import { NextRequest, NextResponse } from 'next/server';
import { CalendarService } from '@/lib/services/calendarService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Job from '@/models/Job';
import ApplicationJourney from '@/models/ApplicationJourney';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { accessToken, refreshToken } = await request.json();
    
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Access token is required' },
        { status: 400 }
      );
    }

    await connectDB();
    
    // Get user identifier
    const userIdentifier = session.user.firebaseUid 
      ? { type: 'firebase', id: session.user.firebaseUid }
      : { type: 'userId', id: session.user.id };

    // Fetch job applications (excluding 'created' status)
    let jobs;
    if (userIdentifier.type === 'firebase') {
      jobs = await Job.find({ 
        firebaseUid: userIdentifier.id,
        status: { $ne: 'created' }
      }).sort({ updatedAt: -1 });
    } else {
      jobs = await Job.find({ 
        userId: userIdentifier.id,
        status: { $ne: 'created' }
      }).sort({ updatedAt: -1 });
    }

    // Convert jobs to calendar events format
    const jobApplications = jobs.map(job => ({
      jobId: job._id.toString(),
      jobTitle: job.jobTitle,
      company: job.company,
      status: job.status,
      applicationDate: job.applicationDate,
      deadline: job.deadline,
      interviews: job.interviews || [],
      followUps: job.followUps || [],
    }));

    // Initialize calendar service
    const calendarService = new CalendarService(accessToken, refreshToken);
    
    // Sync to calendar
    await calendarService.syncJobApplicationsToCalendar(jobApplications);

    return NextResponse.json({
      success: true,
      message: 'Job applications synced to calendar successfully',
      syncedCount: jobApplications.length,
    });
  } catch (error) {
    console.error('Error syncing to calendar:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync to calendar' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const accessToken = searchParams.get('accessToken');
    
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Access token is required' },
        { status: 400 }
      );
    }

    // Initialize calendar service
    const calendarService = new CalendarService(accessToken);
    
    // Get existing calendar events
    const events = await calendarService.getJobApplicationEvents();

    return NextResponse.json({
      success: true,
      events,
    });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}
