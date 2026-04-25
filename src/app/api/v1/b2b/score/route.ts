import { NextRequest, NextResponse } from 'next/server';
import { withB2BAuth } from '@/lib/middleware/b2b-auth';
import { calculateScore } from '@/lib/utils/cv-scoring';
import { KeywordGapAnalysisService } from '@/lib/services/keyword-gap-analysis-service';
import { B2BScoringExplainService } from '@/lib/services/b2b-scoring-explain-service';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { getConnection } from '@/lib/database';
import B2BCandidate from '@/models/b2b/B2BCandidate';
import { B2BBillingService } from '@/lib/services/b2b-billing-service';

export async function POST(req: NextRequest, context: any) {
  return withB2BAuth(req, context, async (req, context, tenant, apiKey) => {
    try {
      const body = await req.json();
      const { cvData, jobDescription, jobTitle, company } = body;

      if (!cvData) {
        return NextResponse.json({ error: 'cvData is required' }, { status: 400 });
      }

      let keywordAnalysis = null;
      if (jobDescription) {
        keywordAnalysis = await KeywordGapAnalysisService.analyze(cvData as UnifiedCVDataStructure, {
          description: jobDescription,
          title: jobTitle,
          company: company
        });
      }

      const scoreResult = calculateScore(cvData as UnifiedCVDataStructure, keywordAnalysis);

      // Utilize Google Gemini to generate the explainable AI analysis summary
      const analysis_summary = await B2BScoringExplainService.explainScore(
        cvData as UnifiedCVDataStructure,
        scoreResult,
        { description: jobDescription, title: jobTitle, company: company },
        keywordAnalysis
      );

      // Save to database to appear in Smart Roster
      await getConnection();
      const candidate = new B2BCandidate({
        tenantId: tenant._id,
        firstName: cvData?.basics?.name?.split(' ')[0] || '',
        lastName: cvData?.basics?.name?.split(' ').slice(1).join(' ') || '',
        email: cvData?.basics?.email || '',
        phone: cvData?.basics?.phone || '',
        cvData: cvData,
        score: scoreResult.cvScore?.total || scoreResult.atsScore?.total || 0,
        status: 'reviewed',
        metadata: {
          jobDescription,
          jobTitle,
          company,
          scoreResult,
          analysis_summary
        }
      });
      await candidate.save();

      // Track API usage for billing
      await B2BBillingService.trackUsage(tenant._id.toString());

      return NextResponse.json({
        success: true,
        data: {
          ...scoreResult,
          analysis_summary
        },
        candidateId: candidate._id,
        metadata: {
          tenantId: tenant._id,
          environment: apiKey.environment,
          analyzedWithJobDescription: !!jobDescription
        }
      });
    } catch (error: any) {
      return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
  }, ['score']);
}
