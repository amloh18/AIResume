import { NextRequest, NextResponse } from 'next/server';
import { callGeminiWithAllKeysFallback } from '@/lib/utils/gemini-api-fallback';
import type {
  KeywordGap,
  KeywordGapAnalysisResult,
  ExtractedKeyword
} from '@/types/keyword-gap';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/ai/keyword-gap-analysis
 * 
 * Analyzes a CV against a Job Description to find missing keywords.
 * Returns keyword gaps categorized by importance without auto-adding skills.
 * This prevents AI hallucination - gaps are reported for user to manually address.
 */
export async function POST(request: NextRequest) {
  try {
    const { cvData, jobDescription, jobTitle, company } = await request.json();

    if (!cvData || !jobDescription) {
      return NextResponse.json(
        { success: false, error: 'CV data and job description are required' },
        { status: 400 }
      );
    }

    // Check JD length
    const wordCount = jobDescription.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 20) {
      return NextResponse.json(
        { success: false, error: 'Job description is too short for accurate analysis' },
        { status: 400 }
      );
    }

    // Generate content hash for caching
    const jdContentHash = crypto
      .createHash('md5')
      .update(jobDescription)
      .digest('hex');

    // Extract CV content for comparison
    const cvContent = extractCVContent(cvData);

    // Build prompt for AI analysis
    const prompt = buildKeywordAnalysisPrompt(cvContent, jobDescription, jobTitle, company);

    // Call AI for analysis
    // Call AI for analysis
    const aiResponse = await callGeminiWithAllKeysFallback(prompt, {
      maxTokens: 8192
    });

    if (!aiResponse) {
      return NextResponse.json(
        { success: false, error: 'Failed to analyze keywords' },
        { status: 500 }
      );
    }

    // Parse AI response
    const analysisResult = parseAIResponse(aiResponse, cvContent, jdContentHash);

    return NextResponse.json({
      success: true,
      data: analysisResult
    });

  } catch (error) {
    console.error('Keyword gap analysis error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to analyze keyword gaps' },
      { status: 500 }
    );
  }
}

/**
 * Extract all text content from CV for comparison
 */
function extractCVContent(cvData: any): string {
  const parts: string[] = [];

  // Basics
  if (cvData.basics) {
    if (cvData.basics.summary) parts.push(cvData.basics.summary);
    if (cvData.basics.label) parts.push(cvData.basics.label);
  }

  // Work experience
  if (cvData.work && Array.isArray(cvData.work)) {
    cvData.work.forEach((job: any) => {
      if (job.position) parts.push(job.position);
      if (job.summary) parts.push(job.summary);
      if (job.highlights && Array.isArray(job.highlights)) {
        parts.push(...job.highlights);
      }
    });
  }

  // Skills
  if (cvData.skills && Array.isArray(cvData.skills)) {
    cvData.skills.forEach((skill: any) => {
      if (skill.name) parts.push(skill.name);
      if (skill.keywords && Array.isArray(skill.keywords)) {
        parts.push(...skill.keywords);
      }
    });
  }

  // Projects
  if (cvData.projects && Array.isArray(cvData.projects)) {
    cvData.projects.forEach((project: any) => {
      if (project.name) parts.push(project.name);
      if (project.description) parts.push(project.description);
      if (project.keywords && Array.isArray(project.keywords)) {
        parts.push(...project.keywords);
      }
    });
  }

  // Education
  if (cvData.education && Array.isArray(cvData.education)) {
    cvData.education.forEach((edu: any) => {
      if (edu.area) parts.push(edu.area);
      if (edu.studyType) parts.push(edu.studyType);
      if (edu.courses && Array.isArray(edu.courses)) {
        parts.push(...edu.courses);
      }
    });
  }

  // Certificates
  if (cvData.certificates && Array.isArray(cvData.certificates)) {
    cvData.certificates.forEach((cert: any) => {
      if (cert.name) parts.push(cert.name);
    });
  }

  return parts.join(' ').toLowerCase();
}

/**
 * Build the AI prompt for keyword analysis
 */
function buildKeywordAnalysisPrompt(
  cvContent: string,
  jobDescription: string,
  jobTitle?: string,
  company?: string
): string {
  return `You are an expert ATS (Applicant Tracking System) analyst and career advisor. Analyze the following job description and compare it against the candidate's CV content to identify missing keywords.

## JOB DETAILS
Job Title: ${jobTitle || 'Not specified'}
Company: ${company || 'Not specified'}

## JOB DESCRIPTION
${jobDescription}

## CANDIDATE'S CV CONTENT
${cvContent}

## TASK
1. Extract all important keywords/phrases from the job description (skills, tools, technologies, certifications, experiences)
2. Check which keywords are already present in the CV content
3. Identify gaps (keywords in JD but missing from CV)
4. Categorize each gap by importance

## OUTPUT FORMAT
Return a valid JSON object with this exact structure:
{
  "totalKeywordsFound": 15,    // Total number of important keywords found in JD
  "gaps": [
    {
      "keyword": "Kubernetes",
      "category": "tool",
      "frequency": 2,
      "importance": "preferred",
      "suggestion": "Add to Skills section if you have experience",
      "context": "Required for cloud infrastructure management"
    }
  ],
  "matchedKeywords": ["Python", "JavaScript", "React"],
  "matchScore": 72
}

## CATEGORIES
- skill: Technical or soft skills (e.g., "Python", "Leadership")
- tool: Software, platforms, or tools (e.g., "Kubernetes", "Jira")
- certification: Certifications or qualifications (e.g., "AWS Certified", "PMP")
- experience: Experience types (e.g., "5+ years", "team management")
- soft_skill: Interpersonal skills (e.g., "communication", "problem-solving")
- industry: Industry knowledge (e.g., "fintech", "healthcare")

## IMPORTANCE LEVELS
- critical: Required skills/tools mentioned multiple times or explicitly stated as "required"
- preferred: Nice-to-have skills mentioned in requirements
- nice-to-have: Skills mentioned but not emphasized

## RULES
1. Only report gaps for keywords ACTUALLY mentioned in the job description
2. Do NOT hallucinate or invent keywords
3. Match keywords case-insensitively (Python = python)
4. Consider synonyms and related terms (e.g., "JS" matches "JavaScript")
5. matchScore should be 0-100 based on (matched keywords / total important keywords * 100)

Return ONLY the JSON object, no markdown formatting.`;
}

/**
 * Parse AI response into structured KeywordGapAnalysisResult
 */
function parseAIResponse(
  aiResponse: string,
  cvContent: string,
  jdContentHash: string
): KeywordGapAnalysisResult {
  try {
    // Clean response (remove markdown if present)
    let cleanResponse = aiResponse.trim();
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(cleanResponse);

    // Build gaps array
    const gaps: KeywordGap[] = (parsed.gaps || []).map((gap: any) => ({
      keyword: gap.keyword || '',
      category: validateCategory(gap.category),
      frequency: gap.frequency || 1,
      importance: validateImportance(gap.importance),
      suggestion: gap.suggestion,
      context: gap.context,
      userConfirmed: false,
      dismissed: false
    }));

    // Calculate stats
    const totalJDKeywords = parsed.totalKeywordsFound || (parsed.matchedKeywords || []).length + gaps.length;
    const matchedCount = (parsed.matchedKeywords || []).length;
    const gapCount = gaps.length;
    const criticalGaps = gaps.filter(g => g.importance === 'critical').length;
    const preferredGaps = gaps.filter(g => g.importance === 'preferred').length;
    const niceToHaveGaps = gaps.filter(g => g.importance === 'nice-to-have').length;

    return {
      gaps,
      matchScore: parsed.matchScore || 0,
      matchedKeywords: parsed.matchedKeywords || [],
      stats: {
        totalJDKeywords,
        matchedCount,
        gapCount,
        criticalGaps,
        preferredGaps,
        niceToHaveGaps
      },
      analyzedAt: new Date(),
      jdContentHash
    };

  } catch (error) {
    console.error('Failed to parse AI response:', error);
    // Return empty result on parse failure
    return {
      gaps: [],
      matchScore: 0,
      matchedKeywords: [],
      stats: {
        totalJDKeywords: 0,
        matchedCount: 0,
        gapCount: 0,
        criticalGaps: 0,
        preferredGaps: 0,
        niceToHaveGaps: 0
      },
      analyzedAt: new Date(),
      jdContentHash
    };
  }
}

/**
 * Validate and normalize category
 */
function validateCategory(category: string): KeywordGap['category'] {
  const validCategories = ['skill', 'tool', 'certification', 'experience', 'soft_skill', 'industry'];
  if (validCategories.includes(category)) {
    return category as KeywordGap['category'];
  }
  return 'skill';
}

/**
 * Validate and normalize importance
 */
function validateImportance(importance: string): KeywordGap['importance'] {
  const validImportance = ['critical', 'preferred', 'nice-to-have'];
  if (validImportance.includes(importance)) {
    return importance as KeywordGap['importance'];
  }
  return 'preferred';
}

