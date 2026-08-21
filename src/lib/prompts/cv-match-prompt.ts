/**
 * CV-Job Match Prompt
 * 
 * Canonical prompt for comparing a CV profile against a job description.
 * Used by /api/jobs/match.
 */

export interface CVMatchPromptInput {
    cvProfile: {
        skills: string[];
        experience: { years: number; level: string; workHistory: any[] };
        education: any[];
        certifications: string[];
        summary: string;
        projects: any[];
        aiAnalysis?: any;
    };
    jobTitle?: string;
    company?: string;
    jobDescription: string;
}

export function buildCVMatchPrompt(input: CVMatchPromptInput): string {
    const { cvProfile, jobTitle, company, jobDescription } = input;

    return `You are a career matching expert. Compare this CV profile against the job description and provide a detailed match analysis.

CV PROFILE:
${JSON.stringify(cvProfile, null, 2)}

JOB DETAILS:
Title: ${jobTitle || 'Not specified'}
Company: ${company || 'Not specified'}
Description:
${jobDescription}

Provide a comprehensive JSON response with the following structure:
{
  "matchScore": <number 0-100>,
  "isTopApplicant": <boolean - true if matchScore >= 80>,
  "matchedSkills": <array of skills that match>,
  "missingSkills": <array of required skills not in CV>,
  "experienceMatch": <boolean>,
  "educationMatch": <boolean>,
  "summary": <brief text summary of the match>,
  "skillMatchScore": <number 0-100 - percentage of required skills matched>,
  "experienceMatchScore": <number 0-100>,
  "educationMatchScore": <number 0-100>,
  "skillGapAnalysis": {
    "critical": <array of must-have skills missing>,
    "important": <array of nice-to-have skills missing>,
    "recommendations": <array of improvement suggestions>
  },
  "cvRecommendations": <array of specific CV improvement tips>
}

Be thorough and accurate. Consider:
- Skill relevance and depth
- Experience level alignment
- Education requirements
- Industry fit
- Soft skills mentioned in job description
- Quantifiable achievements`;
}
