import { NextRequest, NextResponse } from 'next/server';
import { AIAssistantService } from '@/lib/services/aiAssistantService';
import { UnifiedCVService } from '@/lib/services/unified-cv-service';
import { loadJobContext } from '@/lib/jobs/serverJobContext';
import { getAuthenticatedUser } from '@/lib/auth-helpers';

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
    const cvData = await UnifiedCVService.getCV(cvId);
    if (!cvData) {
      return NextResponse.json(
        { success: false, error: 'CV not found' },
        { status: 404 }
      );
    }

    // Load job data if provided.
    // Previously this called `JobService.getJob(jobId)` — a browser-only HTTP client
    // whose relative `fetch('/api/...')` throws in Node, and whose `userId` argument
    // was never supplied. It threw on every request, so `jobData` was always null and
    // the result was never actually tailored to the job.
    let jobData = null;
    if (jobId) {
      const auth = await getAuthenticatedUser(req).catch(() => null);
      jobData = await loadJobContext(jobId, auth?.userId);
    }

    // Generate summary suggestions
    const suggestions = await AIAssistantService.buildTailoredSummary(cvData.cvData, jobData);

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
