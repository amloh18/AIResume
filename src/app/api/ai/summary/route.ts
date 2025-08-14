import { NextRequest, NextResponse } from 'next/server';
import { AIAssistantService } from '@/lib/services/aiAssistantService';
import { CVService } from '@/lib/services/cvService';
import { JobService } from '@/lib/services/jobService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { cvId, jobId } = await req.json();

    if (!cvId) {
      return NextResponse.json(
        { success: false, error: 'CV ID is required' },
        { status: 400 }
      );
    }

    // Load CV data
    const cvData = await CVService.getCV(cvId);
    if (!cvData) {
      return NextResponse.json(
        { success: false, error: 'CV not found' },
        { status: 404 }
      );
    }

    // Load job data if provided
    let jobData = null;
    if (jobId) {
      try {
        jobData = await JobService.getJob(jobId);
      } catch (error) {
        console.warn('Job not found, proceeding with general summary:', error);
      }
    }

    // Generate summary suggestions
    const suggestions = await AIAssistantService.buildTailoredSummary(cvData, jobData);

    return NextResponse.json({
      success: true,
      data: suggestions
    });

  } catch (error: any) {
    console.error('Summary generation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to generate summary' 
      },
      { status: 500 }
    );
  }
}
