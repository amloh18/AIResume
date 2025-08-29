import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { cvData, jobData } = await request.json();

    if (!cvData || !jobData) {
      return NextResponse.json(
        { error: 'CV data and job data are required' },
        { status: 400 }
      );
    }

    console.log('🔍 Comprehensive AI Analysis - Starting analysis...');
    console.log('🔍 CV Data keys:', Object.keys(cvData));
    console.log('🔍 Job Data keys:', Object.keys(jobData));

    // Prepare the comprehensive analysis prompt
    const analysisPrompt = `You are an AI career assistant. 
You will be given two JSON objects:
1. CV JSON
2. Job JSON

Your task is to deeply analyze the CV against the job and return a **structured JSON response** with the following sections:

{
  "ATSScoreAndKeywords": {
    "score": "<numeric ATS score out of 100>",
    "missingKeywords": ["<keyword1>", "<keyword2>", "..."],
    "matchedKeywords": ["<keyword1>", "<keyword2>", "..."],
    "relevanceSummary": "<short explanation of match quality>"
  },
  "ContentOptimizer": {
    "improvements": ["<specific rewrite suggestions for sentences>", "..."],
    "toneAndClarity": "<how to improve tone, readability, and clarity>",
    "redundancies": ["<list of repeated or unnecessary content>"]
  },
  "QuantificationAssistant": {
    "recommendations": ["<suggest how to add numbers, metrics, percentages to achievements>", "..."],
    "examples": ["<before vs after quantification samples>"]
  },
  "SkillsAndKeywordsMapper": {
    "cvSkills": ["<skills found in CV>"],
    "jobRequiredSkills": ["<skills found in Job description>"],
    "overlap": ["<skills in both>"],
    "gaps": ["<skills missing from CV>"]
  },
  "GapAnalyzer": {
    "experienceGaps": ["<areas where CV experience does not meet job requirements>"],
    "skillGaps": ["<skills not demonstrated>"],
    "educationGaps": ["<missing educational aspects if any>"]
  },
  "AchievementGenerator": {
    "enhancedAchievements": ["<rephrased achievements tailored to job>", "..."],
    "impactStatements": ["<newly suggested bullet points with measurable impact>"]
  },
  "ConsistencyAndCompliance": {
    "formatIssues": ["<detected inconsistencies in formatting, tense, or style>"],
    "complianceIssues": ["<issues with ATS compliance such as tables, graphics, uncommon fonts>"]
  },
  "TailoredSummaryBuilder": {
    "optimizedSummary": "<rewrite the CV summary tailored to the job>",
    "elevatorPitch": "<2-3 sentence compelling pitch combining CV and job requirements>"
  },
  "FinalATSScore": {
    "score": "<revised ATS score out of 100 after applying improvements>",
    "summary": "<brief explanation of how the new version aligns better>"
  }
}

Make sure each section is detailed and actionable.
Use the CV JSON and Job JSON provided below.

---
CV JSON:
${JSON.stringify(cvData, null, 2)}

---
JOB JSON:
${JSON.stringify(jobData, null, 2)}

Please provide a comprehensive analysis that will help the candidate optimize their CV for this specific job opportunity.`;

    // Call the AI service (you can use your preferred AI provider)
    const aiResponse = await callAI(analysisPrompt);

    if (!aiResponse.success) {
      throw new Error(aiResponse.error || 'AI analysis failed');
    }

    // Parse the AI response
    let analysisResult;
    try {
      if (!aiResponse.data) {
        throw new Error('No data received from AI service');
      }
      analysisResult = JSON.parse(aiResponse.data);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Invalid AI response format');
    }

    console.log('✅ Comprehensive AI Analysis - Analysis completed successfully');

    return NextResponse.json({
      success: true,
      data: analysisResult
    });

  } catch (error) {
    console.error('❌ Comprehensive AI Analysis - Error:', error);
    return NextResponse.json(
      { error: 'Failed to perform comprehensive analysis' },
      { status: 500 }
    );
  }
}

// AI service call function (replace with your actual AI provider)
async function callAI(prompt: string) {
  try {
    // TODO: Replace with actual AI provider integration
    // Examples: OpenAI, Anthropic Claude, Google Gemini, etc.
    
    // For now, return an error indicating AI service is not configured
    throw new Error('AI service not configured. Please set up your preferred AI provider.');
    
  } catch (error) {
    console.error('AI service error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'AI service unavailable'
    };
  }
}
