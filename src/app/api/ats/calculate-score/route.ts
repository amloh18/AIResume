import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { CV, JobApplication } from '@/models';
import { AIAssistantService } from '@/lib/services/aiAssistantService';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import jwt from 'jsonwebtoken';
import type { MyJwtPayload } from '@/types/jwt-payload';

export const dynamic = 'force-dynamic';

// Helper function to get userId from either session, extension token, or request body
async function getUserIdFromRequest(request: NextRequest, bodyUserId?: string): Promise<{ userId: string; source: 'session' | 'extension' | 'body' } | null> {
  // Check if this is an extension request (with JWT token)
  const authHeader = request.headers.get('authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Extension request with JWT token
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as MyJwtPayload;
      
      if (decoded.type !== 'extension') {
        console.log('❌ Invalid token type');
        return null;
      }
      
      const userId = decoded.userId || decoded.id || '';
      if (!userId) {
        console.log('❌ No userId in extension token');
        return null;
      }
      
      console.log('✅ Extension token verified for user:', userId);
      return { userId, source: 'extension' };
    } catch (error) {
      console.log('❌ Invalid extension token:', error);
      return null;
    }
  } else if (bodyUserId) {
    // UserId provided in request body (for backward compatibility)
    return { userId: bodyUserId, source: 'body' };
  } else {
    // Web interface request with session
    try {
      const { getAuthenticatedUser } = await import('@/lib/auth-helpers');
      const authResult = await getAuthenticatedUser();
      
      if (!authResult) {
        console.log('❌ No valid authentication found for web request');
        return null;
      }
      
      console.log('✅ Web session verified for user:', authResult.userId);
      return { userId: authResult.userId, source: 'session' };
    } catch (error) {
      console.log('❌ Session authentication failed:', error);
      return null;
    }
  }
}

/**
 * POST /api/ats/calculate-score
 * Calculate ATS score for a CV against a job
 */
export async function POST(request: NextRequest) {
  try {
    await getConnection();

    const body = await request.json();
    const { cvId, jobId, userId: bodyUserId } = body;

    if (!cvId || !jobId) {
      return NextResponse.json(
        { success: false, error: 'cvId and jobId are required' },
        { status: 400 }
      );
    }

    // Get userId from either session, extension token, or request body
    const authInfo = await getUserIdFromRequest(request, bodyUserId);
    
    if (!authInfo) {
      console.log('❌ ATS Calculate Score API - No valid authentication found');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authInfo.userId;
    console.log('🔍 ATS Calculate Score API - Starting calculation:', { cvId, jobId, userId, source: authInfo.source });

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

    // Verify user owns the CV
    // Convert both to strings for comparison (cv.userId is ObjectId, userId is string)
    if (cv.userId?.toString() !== userId) {
      console.error('❌ ATS Calculate Score API - Unauthorized access attempt', {
        cvUserId: cv.userId?.toString(),
        requestUserId: userId,
        match: cv.userId?.toString() === userId
      });
      return NextResponse.json(
        { success: false, error: 'Unauthorized - CV does not belong to user' },
        { status: 403 }
      );
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

