/**
 * Comprehensive Analysis Prompt
 * 
 * Canonical prompt for multi-dimensional CV analysis.
 * Absorbs the comprehensive-analysis modules into a single prompt.
 * Used by /api/cv/analyze.
 */

export interface ComprehensiveAnalysisPromptInput {
    cvData: any;
    jobTitle?: string;
    company?: string;
    jobDescription?: string;
    hasJobData: boolean;
}

export function buildComprehensiveAnalysisPrompt(input: ComprehensiveAnalysisPromptInput): string {
    const { cvData, jobTitle, company, jobDescription, hasJobData } = input;

    return `
You are an expert CV/resume analyst and career coach. Please provide a comprehensive analysis of this CV against the job requirements.

CV Data:
${JSON.stringify(cvData, null, 2)}

${hasJobData ? `
TARGET JOB INFORMATION:
Job Title: ${jobTitle || 'Position'}
Company: ${company || 'Company'}
Job Description:
${jobDescription || 'No job description provided'}

IMPORTANT: Analyze the CV specifically against the job description above. Focus on:
- Matching skills and keywords from the job description
- Identifying gaps between CV and job requirements
- Providing job-specific recommendations
- Tailoring suggestions to align with the job description
` : 'No specific job data provided - provide general CV analysis'}

Please provide a detailed analysis in the following JSON format:

{
  "ATSScoreAndKeywords": {
    "score": number (0-100),
    "missingKeywords": ["keyword1", "keyword2"],
    "matchedKeywords": ["keyword1", "keyword2"],
    "relevanceSummary": "string"
  },
  "ContentOptimizer": {
    "improvements": ["suggestion1", "suggestion2"],
    "toneAndClarity": "string",
    "redundancies": ["redundancy1", "redundancy2"]
  },
  "QuantificationAssistant": {
    "recommendations": ["recommendation1", "recommendation2"],
    "examples": ["example1", "example2"]
  },
  "SkillsAndKeywordsMapper": {
    "cvSkills": ["skill1", "skill2"],
    "jobRequiredSkills": ["skill1", "skill2"],
    "overlap": ["skill1", "skill2"],
    "gaps": ["skill1", "skill2"]
  },
  "GapAnalyzer": {
    "experienceGaps": ["gap1", "gap2"],
    "skillGaps": ["gap1", "gap2"],
    "educationGaps": ["gap1", "gap2"]
  },
  "AchievementGenerator": {
    "enhancedAchievements": ["achievement1", "achievement2"],
    "impactStatements": ["statement1", "statement2"]
  },
  "ConsistencyAndCompliance": {
    "formatIssues": ["issue1", "issue2"],
    "complianceIssues": ["issue1", "issue2"]
  },
  "TailoredSummaryBuilder": {
    "optimizedSummary": "string",
    "elevatorPitch": "string"
  },
  "FinalATSScore": {
    "score": number (0-100),
    "summary": "string"
  }
}

Guidelines:
1. Be specific and actionable in all recommendations
2. Focus on quantifiable improvements
3. Consider ATS optimization
4. Provide realistic and implementable suggestions
5. Use professional language throughout
6. Ensure all scores are between 0-100
7. Make suggestions job-specific when job data is available
`;
}
