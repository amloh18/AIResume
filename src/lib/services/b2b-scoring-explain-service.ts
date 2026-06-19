import { callGeminiWithAllKeysFallback } from '@/lib/utils/gemini-api-fallback';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ScoreResult } from '@/lib/pill-engine/CentralScoreManager';
import { KeywordGapAnalysisResult } from '@/types/keyword-gap';

export interface AnalysisSummaryItem {
  category: string;
  finding: string;
  impact: string;
}

export class B2BScoringExplainService {
  /**
   * Explains the CV score by generating an analysis summary using Google Gemini.
   */
  static async explainScore(
    cvData: UnifiedCVDataStructure,
    scoreResult: ScoreResult,
    jobData?: { description?: string; title?: string; company?: string },
    keywordAnalysis?: KeywordGapAnalysisResult | null
  ): Promise<AnalysisSummaryItem[]> {
    try {
      // Build a concise context to avoid token limits while providing enough detail
      const context = {
        candidateInfo: {
          experienceYears: cvData.work?.length ? `${cvData.work.length} roles` : 'No work experience listed',
          skillsCount: cvData.skills?.length || 0,
          educationCount: cvData.education?.length || 0,
        },
        jobContext: jobData ? {
          title: jobData.title,
          company: jobData.company,
          hasDescription: !!jobData.description
        } : null,
        scoring: {
          totalScore: scoreResult.atsScore ? scoreResult.atsScore.total : scoreResult.cvScore.total,
          breakdown: scoreResult.atsScore || scoreResult.cvScore,
        },
        identifiedIssues: scoreResult.issues.map(i => i.message),
        keywords: keywordAnalysis ? {
          matched: keywordAnalysis.matchedKeywords.slice(0, 10), // Top 10 to save context
          missing: keywordAnalysis.gaps.map(g => g.keyword).slice(0, 10)
        } : null
      };

      const prompt = `
You are an expert Talent Intelligence AI.
Analyze the following candidate scoring context and generate an explanation of the score.

Context Data:
${JSON.stringify(context, null, 2)}

Instructions:
Generate an "analysis_summary" detailing why points were awarded or deducted based on the provided data.
You must return ONLY a JSON array of objects. Do not include any markdown formatting (like \`\`\`json).

Each object must follow this structure:
{
  "category": "String (e.g., 'Experience', 'Skills', 'Formatting', 'Keywords')",
  "finding": "String (A specific, evidence-based explanation. e.g., 'Candidate has relevant frontend experience but lacks required CI/CD deployment knowledge')",
  "impact": "String (e.g., '+10 points', '-5 points', 'Neutral')"
}

Generate 3 to 5 highly relevant summary items.
      `;

      const responseText = await callGeminiWithAllKeysFallback(prompt, {
        model: 'gemini-2.5-flash-lite',
        temperature: 0.3,
        action: 'b2b_score_explain'
      });

      // Robust JSON extraction
      let jsonStr = responseText.trim();
      
      // Remove markdown blocks if present
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(json)?/, '').replace(/```$/, '').trim();
      }

      // Sometimes the model might still return text before/after the JSON array
      const match = jsonStr.match(/\[[\s\S]*\]/);
      if (match) {
        jsonStr = match[0];
      }

      const parsed = JSON.parse(jsonStr);
      
      if (Array.isArray(parsed)) {
        return parsed.map(item => ({
          category: item.category || 'General',
          finding: item.finding || 'No specific finding',
          impact: item.impact || 'Neutral'
        }));
      }
      
      throw new Error('Parsed result is not an array');
    } catch (error) {
      console.error('B2BScoringExplainService: Error generating analysis summary with Gemini:', error);
      // Graceful fallback
      return [
        {
          category: "System",
          finding: "Score calculated successfully. AI explanation generation is currently unavailable.",
          impact: "Neutral"
        }
      ];
    }
  }
}
