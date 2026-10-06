/**
 * POST /api/application-journey/[id]/refresh-ats
 *
 * The JourneyTimelineCard "refresh ATS" button has been calling this endpoint
 * since it was written, but the route never existed — the button always 404'd.
 * This implements it.
 *
 * Two modes:
 *
 *   Default (cheap, no AI):
 *     Re-syncs the journey's ATS score from the linked CV's own persisted score.
 *     The CV's score is already server-authoritative (written by
 *     POST /api/ats/calculate-score), so this is a legitimate server-side read,
 *     not a client write. This is the mode the card's cached-score path needs.
 *
 *   ?recalculate=true (costs an AI call, quota-gated):
 *     Recomputes from scratch against the journey's job description using the
 *     same deterministic engine as /api/ats/calculate-score, then writes both
 *     the CV and the journey.
 *
 * In both modes the score originates server-side. Nothing from the request body
 * is ever trusted as a score value.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { ApplicationJourney, CV, JobApplication } from '@/models';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { CentralScoreManager } from '@/lib/pill-engine/CentralScoreManager';
import { KeywordGapAnalysisService } from '@/lib/services/keyword-gap-analysis-service';
import { ApplicationJourneyRelationshipService } from '@/lib/services/cvJourneyRelationshipService';
import { CVRepository } from '@/lib/repositories/cv-repository';
import { getTemplateAtsProfile } from '@/lib/templates/template-utils';
import { getCvScoreForDisplay } from '@/lib/utils/cv-scoring';
import { extractCVSearchText } from '@/lib/utils/cv-text-extractor';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function generateContentHash(cvData: any): string {
  const cvString = JSON.stringify({
    basics: cvData?.basics,
    work: cvData?.work,
    education: cvData?.education,
    skills: cvData?.skills,
    projects: cvData?.projects,
  });
  return crypto.createHash('sha256').update(cvString).digest('hex');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getConnection();

    const { id: journeyId } = await params;
    if (!journeyId) {
      return NextResponse.json(
        { success: false, error: 'Journey ID is required' },
        { status: 400 }
      );
    }

    const authResult = await getAuthenticatedUser();
    if (!authResult?.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = authResult.userId;

    const recalculate =
      new URL(request.url).searchParams.get('recalculate') === 'true';

    const journey = await ApplicationJourney.findOne({ _id: journeyId, userId });
    if (!journey) {
      return NextResponse.json(
        { success: false, error: 'Journey not found' },
        { status: 404 }
      );
    }

    if (!journey.cvId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No CV linked',
          message: 'This journey has no CV yet, so there is no ATS score to refresh.',
        },
        { status: 400 }
      );
    }

    const cv = await CV.findOne({ _id: journey.cvId, userId });
    if (!cv) {
      return NextResponse.json(
        {
          success: false,
          error: 'Linked CV not found',
          message: 'The CV linked to this journey no longer exists.',
        },
        { status: 404 }
      );
    }

    const templateProfile = getTemplateAtsProfile(cv.templateId?.toString());
    const templateContext = {
      layoutType: templateProfile.layoutType,
      safety: templateProfile.safety,
      cap:
        typeof cv.metadata?.atsScoreCap === 'number'
          ? cv.metadata.atsScoreCap
          : templateProfile.cap,
    };

    // ─── Cheap path: reuse the CV's already server-computed score ──────────
    if (!recalculate) {
      const existingScore = getCvScoreForDisplay(cv);
      if (existingScore === undefined) {
        return NextResponse.json(
          {
            success: false,
            error: 'No score available',
            message:
              'This CV has not been scored yet. Retry with ?recalculate=true to compute one.',
          },
          { status: 409 }
        );
      }

      await ApplicationJourneyRelationshipService.updateJourneyATSScore(
        journeyId,
        existingScore,
        journey.jobId?.toString(),
        cv.metadata?.atsScoreBreakdown || undefined,
        cv.metadata?.atsScoreHash || undefined
      );

      console.log('✅ refresh-ats - Re-synced journey score from CV:', {
        journeyId,
        cvId: cv._id.toString(),
        score: existingScore,
        template: templateContext,
      });

      return NextResponse.json({
        success: true,
        data: {
          atsScore: existingScore,
          recalculated: false,
          source: 'cv-persisted-score',
          template: templateContext,
        },
      });
    }

    // ─── Expensive path: recompute deterministically ──────────────────────
    const job = await JobApplication.findById(journey.jobId);
    const jobDescription = job?.jobDescription || '';
    const cvData = cv.cvData as any;

    if (!cvData) {
      return NextResponse.json(
        { success: false, error: 'CV data is missing' },
        { status: 400 }
      );
    }

    // Quota-gate the AI keyword analysis before spending it.
    const { AIQuotaService } = await import('@/lib/services/ai-quota-service');
    const quotaStatus = await AIQuotaService.checkAndConsumeQuota(
      userId,
      'ats_calculator',
      true
    );
    if (!quotaStatus.allowed) {
      return NextResponse.json(
        { success: false, error: 'quota_exceeded', quotaStatus },
        { status: 403 }
      );
    }

    const keywordAnalysis = await KeywordGapAnalysisService.analyze(cvData, {
      title: job?.jobTitle || journey.jobTitle || '',
      description: jobDescription,
      company: job?.company || journey.company || '',
    });

    const scoreResult = CentralScoreManager.getInstance().getScoreSync(
      cvData,
      keywordAnalysis,
      templateContext.cap,
      templateContext
    );

    const finalScore = scoreResult.atsScore?.total ?? scoreResult.cvScore.total;
    const contentHash = generateContentHash(cvData);

    const cvRepository = new CVRepository();
    await Promise.all([
      cvRepository.updateATSScore(
        cv._id.toString(),
        finalScore,
        contentHash,
        scoreResult.atsScore || scoreResult.cvScore
      ),
      ApplicationJourneyRelationshipService.updateJourneyATSScore(
        journeyId,
        finalScore,
        journey.jobId?.toString(),
        scoreResult.atsScore || scoreResult.cvScore,
        contentHash
      ),
    ]);

    console.log('✅ refresh-ats - Recalculated score:', {
      journeyId,
      cvId: cv._id.toString(),
      score: finalScore,
      cvSearchTextLength: extractCVSearchText(cvData).length,
      template: templateContext,
    });

    return NextResponse.json({
      success: true,
      data: {
        atsScore: finalScore,
        recalculated: true,
        source: 'deterministic-engine',
        template: templateContext,
        factorBreakdown: scoreResult.atsScore || scoreResult.cvScore,
        missingKeywords: keywordAnalysis.gaps.map((g) => g.keyword),
        strengths: keywordAnalysis.matchedKeywords,
        suggestions: scoreResult.recommendations,
        contentHash,
      },
    });
  } catch (error: any) {
    console.error('❌ refresh-ats error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
