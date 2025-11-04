import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { JobApplication, ApplicationJourney } from '@/models';
import jwt from 'jsonwebtoken';
import type { MyJwtPayload } from '@/types/jwt-payload';
import mongoose from 'mongoose';

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
        const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as MyJwtPayload;
        
        if (decoded.type !== 'extension') {
          console.log('❌ Invalid token type');
          return NextResponse.json(
            { success: false, error: 'Invalid token type' },
            { status: 401 }
          );
        }
        
        userId = decoded.userId || '';
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
      tags,
      contactDetails
    } = body;
    
    // Validate required fields
    if (!jobTitle || !company) {
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { success: false, error: 'Job title and company are required' },
        { status: 400 }
      );
    }
    
    await getConnection();
    
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
      contactDetails: contactDetails || undefined,
      contacts: [],
      interviews: [],
      followUps: [],
      attachments: [],
      tags: source === 'extension' ? ['extension-saved'] : (tags || [])
    });
    
    await jobApplication.save();
    
    console.log('✅ Job application created successfully in application tracker:', jobApplication._id);
    
    // Create ApplicationJourney for this job
    try {
      const journeyData = {
        journeyId: `journey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: new mongoose.Types.ObjectId(userId),
        jobId: jobApplication._id.toString(),
        cvId: null,
        coverLetterId: null,
        status: 'in-progress',
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
      
      const newJourney = await ApplicationJourney.create(journeyData);
      console.log('✅ ApplicationJourney created successfully:', newJourney._id);
    } catch (journeyError) {
      console.error('⚠️ Failed to create ApplicationJourney (non-critical):', journeyError);
      // Don't fail the request if journey creation fails
    }
    
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
    
    // Ensure connection is established
    await getConnection();
    
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
    
    // Get job applications with pagination - include ALL fields
    const jobApplications = await JobApplication.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
    // Get total count
    const total = await JobApplication.countDocuments(query);
    
    console.log('✅ Job applications retrieved from application tracker:', jobApplications.length);
    
    // Helper to convert Date to ISO string for frontend
    const dateToISO = (date: Date | undefined | null): string | undefined => {
      if (!date) return undefined;
      if (date instanceof Date) {
        return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
      }
      return undefined;
    };
    
    return NextResponse.json({
      success: true,
      data: {
        jobs: jobApplications.map(job => ({
          id: job._id.toString(),
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
          deadline: dateToISO(job.deadline),
          applicationDate: dateToISO(job.applicationDate),
          interviews: (job.interviews || []).map((iv: any) => ({
            ...iv.toObject ? iv.toObject() : iv,
            date: iv.date instanceof Date ? dateToISO(iv.date) : iv.date
          })),
          followUps: (job.followUps || []).map((fu: any) => ({
            ...fu.toObject ? fu.toObject() : fu,
            date: fu.date instanceof Date ? dateToISO(fu.date) : fu.date
          })),
          attachments: (job.attachments || []).map((att: any) => att.toObject ? att.toObject() : att),
          sourceUrl: job.sourceUrl,
          atsScore: job.atsScore,
          isArchived: job.isArchived || false,
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