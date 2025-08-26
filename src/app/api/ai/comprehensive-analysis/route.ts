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
    // You can use OpenAI, Anthropic, or any other AI provider
    // For now, I'll create a mock response structure
    
    // Mock AI response - replace this with actual AI call
    const mockAnalysis = {
      ATSScoreAndKeywords: {
        score: 75,
        missingKeywords: ["React", "TypeScript", "AWS"],
        matchedKeywords: ["JavaScript", "Node.js", "MongoDB"],
        relevanceSummary: "Good match with 75% keyword alignment. Missing some key frontend technologies."
      },
      ContentOptimizer: {
        improvements: [
          "Replace 'responsible for' with action verbs like 'developed', 'implemented'",
          "Add specific metrics to achievements",
          "Use more industry-specific terminology"
        ],
        toneAndClarity: "Improve clarity by using more specific action verbs and quantifiable results.",
        redundancies: ["Repeated use of 'responsible for'", "Generic descriptions without metrics"]
      },
      QuantificationAssistant: {
        recommendations: [
          "Add percentage improvements to performance metrics",
          "Include team sizes and project scopes",
          "Specify budget and timeline impacts"
        ],
        examples: [
          "Before: 'Improved application performance' → After: 'Improved application performance by 40% reducing load times from 3s to 1.8s'"
        ]
      },
      SkillsAndKeywordsMapper: {
        cvSkills: ["JavaScript", "Node.js", "MongoDB", "Express"],
        jobRequiredSkills: ["React", "TypeScript", "JavaScript", "AWS", "Node.js"],
        overlap: ["JavaScript", "Node.js"],
        gaps: ["React", "TypeScript", "AWS"]
      },
      GapAnalyzer: {
        experienceGaps: ["Frontend development experience", "Cloud platform experience"],
        skillGaps: ["React ecosystem", "TypeScript", "AWS services"],
        educationGaps: []
      },
      AchievementGenerator: {
        enhancedAchievements: [
          "Developed and deployed 5+ microservices using Node.js, improving system reliability by 99.9%",
          "Led a team of 3 developers, reducing bug reports by 40% through improved code quality"
        ],
        impactStatements: [
          "Reduced deployment time by 60% through CI/CD implementation",
          "Improved application performance by 35% through database optimization"
        ]
      },
      ConsistencyAndCompliance: {
        formatIssues: ["Inconsistent verb tense usage", "Mixed formatting styles"],
        complianceIssues: ["No major ATS compliance issues detected"]
      },
      TailoredSummaryBuilder: {
        optimizedSummary: "Experienced software engineer with 5+ years in full-stack development, specializing in JavaScript, Node.js, and scalable web applications. Proven track record of leading development teams and implementing performance improvements.",
        elevatorPitch: "Senior software engineer with expertise in JavaScript and Node.js development, ready to contribute React and TypeScript skills to build scalable web applications. Demonstrated success in team leadership and performance optimization."
      },
      FinalATSScore: {
        score: 85,
        summary: "After implementing suggested improvements, ATS score improves to 85% with better keyword alignment and quantified achievements."
      }
    };

    return {
      success: true,
      data: JSON.stringify(mockAnalysis)
    };

  } catch (error) {
    console.error('AI service error:', error);
    return {
      success: false,
      error: 'AI service unavailable'
    };
  }
}
