import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculateEnhancedATSScore, extractEnhancedKeywords } from '@/lib/services/enhancedATSService';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { cvData, jobData } = await request.json();

    if (!cvData) {
      return NextResponse.json(
        { success: false, error: 'CV data is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Enhanced ATS Analysis - Starting calculation');

    // Use enhanced ATS calculation
    const enhancedResult = calculateEnhancedATSScore(cvData, jobData);

    console.log('✅ Enhanced ATS Analysis - Complete:', {
      score: enhancedResult.score,
      profileLevel: enhancedResult.profileLevel.title,
      hardSkillsMatch: enhancedResult.breakdown.hardSkillsMatch,
      matchedKeywords: enhancedResult.details.matchedKeywords.length,
      missingKeywords: enhancedResult.details.missingKeywords.length
    });

    // Generate AI-powered optimizations if score < 80
    let aiOptimizations = null;
    if (enhancedResult.score < 80 && jobData) {
      try {
        aiOptimizations = await generateAIOptimizations(cvData, jobData, enhancedResult);
      } catch (aiError) {
        console.error('AI optimization generation failed:', aiError);
        // Continue without AI optimizations
      }
    }

    // Format response to match expected structure
    const response = {
      score: enhancedResult.score,
      profileLevel: enhancedResult.profileLevel,
      breakdown: {
        keywordMatch: enhancedResult.breakdown.hardSkillsMatch,
        experienceEducation: enhancedResult.breakdown.jobTitleCompanyMatch,
        actionVerbs: enhancedResult.breakdown.experienceContentMatch,
        skills: enhancedResult.breakdown.hardSkillsMatch,
        formatting: enhancedResult.breakdown.formattingReadability
      },
      details: {
        matchedKeywords: enhancedResult.details.matchedKeywords.map(k => k.keyword),
        missingKeywords: enhancedResult.details.missingKeywords.slice(0, 15).map(k => k.keyword),
        experienceYears: enhancedResult.details.experienceYears,
        educationLevel: enhancedResult.details.educationLevel,
        actionVerbMatches: enhancedResult.details.actionVerbMatches,
        skillsMatched: enhancedResult.details.hardSkillsMatched,
        skillsMissing: enhancedResult.details.hardSkillsMissing.slice(0, 10),
        formatIssues: []
      },
      suggestions: enhancedResult.suggestions,
      optimizations: aiOptimizations || {
        summary: '',
        workExperience: [],
        skills: enhancedResult.details.hardSkillsMissing.slice(0, 5),
        keywords: enhancedResult.details.missingKeywords.slice(0, 10).map(k => k.keyword)
      }
    };

    return NextResponse.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Comprehensive ATS analysis error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform ATS analysis' },
      { status: 500 }
    );
  }
}

async function generateAIOptimizations(cvData: any, jobData: any, atsResult: any) {
  const jobDescription = jobData?.description || jobData?.jobDescription || '';
  const jobTitle = jobData?.title || jobData?.jobTitle || 'the position';
  const experienceLevel = atsResult.profileLevel.title;
  const missingKeywords = atsResult.details.missingKeywords.slice(0, 10).map((k: any) => k.keyword).join(', ');
  
  const prompt = `You are an expert ATS (Applicant Tracking System) and recruiting specialist. Generate ATS-optimized content for a CV.

**USER PROFILE:**
- Experience Level: ${experienceLevel}
- Current Professional Summary: ${cvData?.basics?.summary || 'None'}
- Years of Experience: ${atsResult.details.experienceYears}
- Target Role: ${jobTitle}

**JOB REQUIREMENTS:**
${jobDescription.substring(0, 800)}

**MISSING KEYWORDS TO INTEGRATE:**
${missingKeywords}

**TASK:**
Generate ONLY a JSON object with these fields:

{
  "summary": "A 3-4 sentence professional summary that naturally integrates the missing keywords while highlighting the candidate's relevant experience. Focus on measurable achievements.",
  "workExperience": [
    {
      "index": 0,
      "optimizedText": "Enhanced description for their most recent role that integrates missing keywords naturally and includes quantifiable metrics"
    }
  ],
  "skills": ["skill1", "skill2", "skill3"],
  "keywords": ["keyword1", "keyword2"]
}

**RULES:**
- Use the candidate's actual experience level (${experienceLevel})
- For Entry-Level: Focus on education, projects, and transferable skills
- For Mid-Level: Focus on growth and measurable impact
- For Senior: Focus on leadership and strategic business impact
- Integrate keywords naturally - do NOT just list them
- Include specific metrics where possible (%, $, numbers)
- Keep it professional and truthful

Output ONLY the JSON object.`;

  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const content = response.text();

  // Parse JSON response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  return null;
}
