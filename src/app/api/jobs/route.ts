import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import { JobApplication, User } from '@/models';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Job creation request received');
    
    let userId: string;
    let source = 'web';
    
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
        source = 'extension';
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
    
    // Parse the request body
    const body = await request.json();
    const {
      jobTitle,
      company,
      jobUrl,
      jobDescription,
      location,
      status = 'created',
      priority = 'medium',
      salary,
      notes,
      deadline,
      applicationDate,
      sponsorship,
      tags
    } = body;
    
    // Validate required fields
    if (!jobTitle || !company) {
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { success: false, error: 'Job title and company are required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Create the job application in the application tracker
    const jobApplication = new JobApplication({
      userId,
      jobTitle,
      company,
      jobUrl: jobUrl || '',
      jobDescription: jobDescription || '',
      location: location || '',
      source,
      status,
      priority,
      salary: salary || undefined,
      notes: notes || '',
      deadline: deadline ? new Date(deadline) : undefined,
      applicationDate: applicationDate ? new Date(applicationDate) : undefined,
      sponsorship: sponsorship || 'unknown',
      contacts: [],
      interviews: [],
      followUps: [],
      attachments: [],
      tags: source === 'extension' ? ['extension-saved'] : (tags || [])
    });
    
    await jobApplication.save();
    
    console.log('✅ Job application created successfully in application tracker:', jobApplication._id);
    
    return NextResponse.json({
      success: true,
      message: 'Job saved to application tracker successfully',
      data: {
        id: jobApplication._id.toString(),
        jobTitle: jobApplication.jobTitle,
        company: jobApplication.company,
        location: jobApplication.location,
        source: jobApplication.source,
        status: jobApplication.status,
        priority: jobApplication.priority,
        createdAt: jobApplication.createdAt
      }
    });
    
  } catch (error: any) {
    console.error('❌ Job creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create job in application tracker' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Jobs list request received');
    
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
    
    // Ensure connection is established (may already be connected from auth check)
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    
    // Build query
    const query: any = { userId };
    
    if (status) {
      query.status = status;
    }
    
    if (source) {
      query.source = source;
    }
    
    // Get job applications with pagination
    const jobApplications = await JobApplication.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('jobTitle company location source status priority createdAt updatedAt tags');
    
    // Get total count
    const total = await JobApplication.countDocuments(query);
    
    console.log('✅ Job applications retrieved from application tracker:', jobApplications.length);
    
    return NextResponse.json({
      success: true,
      data: {
        jobs: jobApplications.map(job => ({
          id: job._id.toString(),
          jobTitle: job.jobTitle,
          company: job.company,
          location: job.location,
          source: job.source,
          status: job.status,
          priority: job.priority,
          tags: job.tags,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error: any) {
    console.error('❌ Jobs list error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve jobs from application tracker' },
      { status: 500 }
    );
  }
}