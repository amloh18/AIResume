import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  let cvData: any;
  let jobData: any;
  
  try {
    const requestData = await request.json();
    cvData = requestData.cvData;
    jobData = requestData.jobData;

    if (!cvData) {
      return NextResponse.json(
        { success: false, error: 'CV data is required' },
        { status: 400 }
      );
    }

    // Create comprehensive analysis prompt
    const analysisPrompt = `
You are an expert CV/resume analyst and career coach. Please provide a comprehensive analysis of this CV against the job requirements.

CV Data:
${JSON.stringify(cvData, null, 2)}

Job Data:
${jobData ? JSON.stringify(jobData, null, 2) : 'No specific job data provided'}

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

    // Generate analysis using Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const result = await model.generateContent(analysisPrompt);
    const response = await result.response;
    const content = response.text();

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'No analysis generated' },
        { status: 500 }
      );
    }

    // Try to parse the JSON response
    let analysis;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // Return fallback analysis
      analysis = generateFallbackAnalysis(cvData, jobData);
    }

    return NextResponse.json({
      success: true,
      data: analysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Comprehensive analysis error:', error);
    
    // Return fallback analysis
    const fallbackAnalysis = generateFallbackAnalysis(cvData, jobData);
    
    return NextResponse.json({
      success: true,
      data: fallbackAnalysis,
      timestamp: new Date().toISOString(),
      note: 'Using fallback analysis due to AI service unavailability'
    });
  }
}

function generateFallbackAnalysis(cvData: any, jobData: any) {
  // Extract basic information from CV
  const cvText = JSON.stringify(cvData).toLowerCase();
  const jobText = jobData ? JSON.stringify(jobData).toLowerCase() : '';
  
  // Simple keyword matching
  const commonKeywords = ['javascript', 'react', 'node', 'python', 'java', 'aws', 'docker', 'git', 'agile', 'leadership', 'communication', 'project management'];
  const cvKeywords = commonKeywords.filter(keyword => cvText.includes(keyword));
  const jobKeywords = jobData ? commonKeywords.filter(keyword => jobText.includes(keyword)) : [];
  const matchingKeywords = cvKeywords.filter(keyword => jobKeywords.includes(keyword));
  const missingKeywords = jobKeywords.filter(keyword => !cvKeywords.includes(keyword));
  
  // Calculate basic ATS score
  const atsScore = jobData ? Math.min(100, Math.round((matchingKeywords.length / Math.max(jobKeywords.length, 1)) * 100)) : 75;

  return {
    ATSScoreAndKeywords: {
      score: atsScore,
      missingKeywords: missingKeywords.slice(0, 5),
      matchedKeywords: matchingKeywords.slice(0, 5),
      relevanceSummary: jobData ? `CV matches ${matchingKeywords.length} out of ${jobKeywords.length} key requirements` : 'Analysis based on general CV best practices'
    },
    ContentOptimizer: {
      improvements: [
        'Add more quantifiable achievements',
        'Use stronger action verbs',
        'Include specific metrics and numbers',
        'Focus on results rather than responsibilities'
      ],
      toneAndClarity: 'Content is generally clear but could benefit from more specific achievements',
      redundancies: []
    },
    QuantificationAssistant: {
      recommendations: [
        'Add specific percentages for improvements',
        'Include dollar amounts for cost savings',
        'Mention team sizes and project scopes',
        'Add timeframes for achievements'
      ],
      examples: [
        'Increased efficiency by 25%',
        'Reduced costs by $50K',
        'Managed team of 10 people',
        'Delivered project 2 weeks early'
      ]
    },
    SkillsAndKeywordsMapper: {
      cvSkills: cvKeywords,
      jobRequiredSkills: jobKeywords,
      overlap: matchingKeywords,
      gaps: missingKeywords.slice(0, 5)
    },
    GapAnalyzer: {
      experienceGaps: [],
      skillGaps: missingKeywords.slice(0, 3),
      educationGaps: []
    },
    AchievementGenerator: {
      enhancedAchievements: [
        'Led cross-functional team to deliver project on time',
        'Improved system performance by 30%',
        'Reduced customer complaints by 25%'
      ],
      impactStatements: [
        'Demonstrated leadership in challenging environments',
        'Proven track record of delivering results',
        'Strong problem-solving and analytical skills'
      ]
    },
    ConsistencyAndCompliance: {
      formatIssues: [],
      complianceIssues: []
    },
    TailoredSummaryBuilder: {
      optimizedSummary: cvData?.basics?.summary || 'Experienced professional with proven track record of delivering results',
      elevatorPitch: 'Skilled professional ready to contribute to your organization'
    },
    FinalATSScore: {
      score: atsScore,
      summary: `ATS compatibility score: ${atsScore}% - ${atsScore >= 80 ? 'Excellent' : atsScore >= 60 ? 'Good' : 'Needs improvement'}`
    }
  };
}
