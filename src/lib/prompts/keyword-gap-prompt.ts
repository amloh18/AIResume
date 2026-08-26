/**
 * Keyword Gap Analysis Prompt
 * 
 * Canonical prompt for analyzing CV content against a job description
 * to identify missing keywords. Used by /api/jobs/match and
 * CVSurgeonService.
 */

export interface KeywordGapPromptInput {
    cvContent: string;
    jobDescription: string;
    jobTitle?: string;
    company?: string;
}

export function buildKeywordGapPrompt(input: KeywordGapPromptInput): string {
    const { cvContent, jobDescription, jobTitle, company } = input;

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
  "totalKeywordsFound": 15,
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
