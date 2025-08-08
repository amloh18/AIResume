import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { getJobParserService, JobDetails } from '@/lib/services/jobParserService';
import { v4 as uuidv4 } from 'uuid';

// CORS headers for frontend access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { url, userId } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, message: 'URL is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid URL format' },
        { status: 400, headers: corsHeaders }
      );
    }



    console.log('🚀 Starting job parsing...');
    console.log('📝 URL:', url);

    // Use headless browser to parse job
    const jobParserService = getJobParserService();
    const jobDetails = await jobParserService.parseJobFromUrl(url);

    // Create job object for frontend
    const jobData = {
      jobid: uuidv4(),
      title: jobDetails.title,
      company: jobDetails.company,
      location: jobDetails.location,
      description: jobDetails.description,
      sourceUrl: jobDetails.sourceUrl,
      salary: jobDetails.salary,
      requirements: jobDetails.requirements,
      skills: jobDetails.skills,
      jobType: jobDetails.jobType,
      experience: jobDetails.experience,
      education: jobDetails.education,
      postedDate: jobDetails.postedDate,
      sponsorship: false, // Default value
      createdAt: new Date().toISOString(),
      userId: userId || null
    };

    console.log('✅ Job parsing completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Job parsed successfully!',
      data: jobData
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('❌ Error in job parsing API:', error);
    
    // Handle specific error types
    let errorMessage = 'Failed to parse job';
    let statusCode = 500;

    if (error.message.includes('net::ERR_CONNECTION_REFUSED') || 
        error.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
      errorMessage = 'Unable to access the job URL. Please check if the URL is correct and accessible.';
      statusCode = 400;
    } else if (error.message.includes('timeout')) {
      errorMessage = 'The job page took too long to load. Please try again or check if the URL is accessible.';
      statusCode = 408;
    } else if (error.message.includes('net::ERR_ABORTED')) {
      errorMessage = 'The job page was blocked or is not accessible. This might be due to anti-bot protection.';
      statusCode = 403;
    } else if (error.message.includes('Failed to parse job from URL')) {
      errorMessage = 'Unable to extract job information from this URL. The page might not be a job posting or has a different structure.';
      statusCode = 422;
    }

    return NextResponse.json(
      { 
        success: false, 
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: statusCode, headers: corsHeaders }
    );
  }
} 