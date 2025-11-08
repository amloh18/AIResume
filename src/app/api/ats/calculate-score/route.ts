import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { CV, JobApplication } from '@/models';
import { AIAssistantService } from '@/lib/services/aiAssistantService';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ats/calculate-score
 * Calculate ATS score for a CV against a job
 */
export async function POST(request: NextRequest) {
  try {
    await getConnection();

    const body = await request.json();
    const { cvId, jobId, userId } = body;

    if (!cvId || !jobId) {
      return NextResponse.json(
        { success: false, error: 'cvId and jobId are required' },
        { status: 400 }
      );
    }

    console.log('🔍 ATS Calculate Score API - Starting calculation:', { cvId, jobId, userId });

    // Fetch CV data
    const cv = await CV.findOne({ _id: cvId });
    if (!cv) {
      console.error('❌ ATS Calculate Score API - CV not found:', cvId);
      return NextResponse.json(
        { success: false, error: 'CV not found' },
        { status: 404 }
      );
    }

    // Block ATS check for Master CV
    const isMasterCV = cv.isMaster === true || 
                       cv.metadata?.isMaster === true || 
                       cv.metadata?.isMaster === 'true';

    if (isMasterCV) {
      console.log('❌ ATS Calculate Score API - ATS check blocked for Master CV');
      return NextResponse.json(
        { 
          success: false, 
          error: 'ATS check is not available for Master CV. Please use a job-specific CV.' 
        },
        { status: 403 }
      );
    }

    // Verify user owns the CV (if userId provided)
    // Convert both to strings for comparison (cv.userId is ObjectId, userId is string)
    if (userId && cv.userId?.toString() !== userId) {
      console.error('❌ ATS Calculate Score API - Unauthorized access attempt', {
        cvUserId: cv.userId?.toString(),
        requestUserId: userId,
        match: cv.userId?.toString() === userId
      });
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // If no userId provided, try to get from session (optional auth)
    if (!userId) {
      try {
        const { getAuthenticatedUser } = await import('@/lib/auth-helpers');
        const authResult = await getAuthenticatedUser();
        if (authResult) {
          const sessionUserId = authResult.userId;
          // Verify CV ownership using session user
          if (cv.userId?.toString() !== sessionUserId) {
            console.error('❌ ATS Calculate Score API - Session user does not own CV');
            return NextResponse.json(
              { success: false, error: 'Unauthorized' },
              { status: 403 }
            );
          }
        }
      } catch (authError) {
        // If auth helper fails, continue without auth check (for backward compatibility)
        console.warn('⚠️ ATS Calculate Score API - Could not verify auth, continuing without check');
      }
    }

    // Fetch job data
    const job = await JobApplication.findOne({ _id: jobId });
    if (!job) {
      console.error('❌ ATS Calculate Score API - Job not found:', jobId);
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    // Get CV data structure
    const cvData: UnifiedCVDataStructure = cv.cvData || cv as any;
    
    if (!cvData) {
      console.error('❌ ATS Calculate Score API - CV data is missing');
      return NextResponse.json(
        { success: false, error: 'CV data is missing' },
        { status: 400 }
      );
    }

    // Convert job to format expected by AIAssistantService (Job type from store)
    const jobData: any = {
      title: job.jobTitle || '',
      description: job.jobDescription || '',
      requirements: job.notes || '', // Use notes as requirements if available
      company: job.company || ''
    };

    console.log('📊 ATS Calculate Score API - Calculating score with:', {
      hasCvData: !!cvData,
      hasJobData: !!jobData,
      jobTitle: jobData.title
    });

    // Calculate ATS score using AIAssistantService
    const analysis = await AIAssistantService.calculateATSScore(cvData, jobData);

    console.log('✅ ATS Calculate Score API - Score calculated:', {
      score: analysis.score,
      missingKeywords: analysis.missingKeywords.length,
      strengths: analysis.strengths.length
    });

    // Return result in expected format
    return NextResponse.json({
      success: true,
      data: {
        score: analysis.score,
        atsScore: analysis.score, // Alias for compatibility
        missingKeywords: analysis.missingKeywords,
        strengths: analysis.strengths,
        suggestions: analysis.suggestions,
        analysis
      }
    });

  } catch (error) {
    console.error('❌ ATS Calculate Score API - Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

