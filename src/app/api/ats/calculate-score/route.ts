import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { CV, JobApplication, ApplicationJourney } from '@/models';
import { CentralScoreManager } from '@/lib/pill-engine/CentralScoreManager';
import { KeywordGapAnalysisService } from '@/lib/services/keyword-gap-analysis-service';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ApplicationJourneyRelationshipService } from '@/lib/services/cvJourneyRelationshipService';
import { CVRepository } from '@/lib/repositories/cv-repository';
import jwt from 'jsonwebtoken';
import type { MyJwtPayload } from '@/types/jwt-payload';
import crypto from 'crypto';

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
 * Generate content hash for CV versioning
 */
function generateContentHash(cvData: UnifiedCVDataStructure): string {
  // Create a stable string representation of CV data
  const cvString = JSON.stringify({
    basics: cvData.basics,
    work: cvData.work,
    education: cvData.education,
    skills: cvData.skills,
    projects: cvData.projects
  });

  // Generate SHA-256 hash
  return crypto.createHash('sha256').update(cvString).digest('hex');
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

    // Generate content hash for versioning (Critical Action Item #5)
    const contentHash = generateContentHash(cvData);

    // Check if score is stale (content hash mismatch)
    const cvRepository = new CVRepository();
    const isStale = await cvRepository.isATSScoreStale(cvId, contentHash);

    if (!isStale && cv.metadata?.atsScore !== undefined) {
      console.log('📊 ATS Calculate Score API - Using cached score (content unchanged)');
      // Return existing score if content hasn't changed
      return NextResponse.json({
        success: true,
        data: {
          score: cv.metadata.atsScore,
          atsScore: cv.metadata.atsScore,
          cached: true,
          factorBreakdown: cv.metadata.atsScoreBreakdown,
          knockOutFactors: cv.metadata.knockOutFactors
        }
      });
    }

    // Check AI Quota before performing expensive calculation
    const { AIQuotaService } = await import('@/lib/services/ai-quota-service');
    const quotaStatus = await AIQuotaService.checkAndConsumeQuota(userId, 'ats_calculator', true);
    
    if (!quotaStatus.allowed) {
      console.log('⚠️ ATS Calculate Score API - Quota exceeded for user:', userId);
      return NextResponse.json({
        success: false,
        error: 'quota_exceeded',
        quotaStatus
      }, { status: 403 });
    }

    // Step 1: Run keyword gap analysis using AI (same as FloatingPulsePill)
    console.log('📊 ATS Calculate Score API - Running keyword gap analysis...');
    const keywordAnalysis = await KeywordGapAnalysisService.analyze(cvData, {
      title: job.jobTitle || '',
      description: job.jobDescription || '',
      company: job.company || ''
    });

    console.log('📊 ATS Calculate Score API - Keyword analysis complete:', {
      matchScore: keywordAnalysis.matchScore,
      gapsFound: keywordAnalysis.gaps.length,
      matchedKeywords: keywordAnalysis.matchedKeywords.length
    });

    // Step 2: Calculate ATS score using CentralScoreManager (same formula as FloatingPulsePill)
    const scoreResult = CentralScoreManager.getInstance().getScoreSync(
      cvData,
      keywordAnalysis,
      100 // atsScoreCap
    );

    // Use ATS score if available (journey CV), otherwise fall back to CV score
    let finalScore = scoreResult.atsScore?.total ?? scoreResult.cvScore.total;

    // Prioritize overall score from analysis report or metadata score syncs
    const reportScore = cv.metadata?.surgeonAnalysis?.scoreReport?.overall_score || 
                        cv.scoreReport?.overall_score ||
                        cv.metadata?.atsScore ||
                        cv.metadata?.cvScore;

    if (reportScore !== undefined && reportScore !== null && reportScore > 0) {
      console.log('📊 ATS Calculate Score API - Overriding calculate-score with surgeon analysis score report:', reportScore);
      finalScore = reportScore;
    }

    console.log('✅ ATS Calculate Score API - Score calculated using CentralScoreManager:', {
      score: finalScore,
      hasAtsScore: !!scoreResult.atsScore,
      cvScoreTotal: scoreResult.cvScore.total,
      atsScoreTotal: scoreResult.atsScore?.total
    });

    // Save ATS score to database (atomic operation)
    try {
      // Find journey by jobId and userId (or cvId and jobId)
      let journey = await ApplicationJourney.findOne({
        jobId,
        userId: new (await import('mongoose')).Types.ObjectId(userId)
      });

      // If not found by jobId, try finding by cvId and jobId
      if (!journey) {
        journey = await ApplicationJourney.findOne({
          cvId,
          jobId,
          userId: new (await import('mongoose')).Types.ObjectId(userId)
        });
      }

      // Atomic transaction: Save to both Journey and CV
      const savePromises: Promise<any>[] = [];

      // Save to Journey if found
      if (journey) {
        const journeyId = journey._id.toString();
        savePromises.push(
          ApplicationJourneyRelationshipService.updateJourneyATSScore(
            journeyId,
            finalScore,
            jobId,
            scoreResult.atsScore || scoreResult.cvScore,
            contentHash
          )
        );
        console.log('✅ ATS Calculate Score API - Score saved to journey:', journeyId);
      } else {
        console.log('⚠️ ATS Calculate Score API - No journey found for cvId and jobId');
      }

      // Save to CV metadata with content hash
      savePromises.push(
        cvRepository.updateATSScore(
          cvId,
          finalScore,
          contentHash,
          scoreResult.atsScore || scoreResult.cvScore
        )
      );

      // Execute all saves in parallel
      await Promise.all(savePromises);
      console.log('✅ ATS Calculate Score API - Score saved to database with content hash');

    } catch (dbError) {
      console.error('⚠️ ATS Calculate Score API - Error saving to database:', dbError);
      // Continue even if database save fails - return the calculated score
    }

    return NextResponse.json({
      success: true,
      data: {
        score: finalScore,
        atsScore: finalScore,
        missingKeywords: keywordAnalysis.gaps.map(g => g.keyword),
        strengths: keywordAnalysis.matchedKeywords,
        suggestions: scoreResult.recommendations,
        factorBreakdown: scoreResult.atsScore || scoreResult.cvScore,
        keywordAnalysis: keywordAnalysis,
        contentHash,
        scoreResult // Include full score result for debugging
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

