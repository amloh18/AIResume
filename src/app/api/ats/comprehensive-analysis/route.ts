import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { calculateEnhancedATSScore } from '@/lib/services/enhancedATSService';
// Removed - using Clerk now

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cvText, jobDescription, cvData, jobData, cvId, comprehensive } = await request.json();

    if (!cvText || !jobDescription) {
      return NextResponse.json({ error: 'CV text and job description are required' }, { status: 400 });
    }

    console.log('🔍 Enhanced ATS Analysis (Legacy API) - Starting calculation');

    // Use enhanced ATS calculation
    const enhancedResult = calculateEnhancedATSScore(cvData, jobData);

    console.log('✅ Enhanced ATS Analysis (Legacy API) - Complete:', {
      score: enhancedResult.score,
      profileLevel: enhancedResult.profileLevel.title
    });

    // Format response to match expected structure
    const result = {
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
      optimizations: {
        summary: '',
        workExperience: [],
        skills: enhancedResult.details.hardSkillsMissing.slice(0, 5),
        keywords: enhancedResult.details.missingKeywords.slice(0, 10).map(k => k.keyword)
      }
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Comprehensive ATS analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to perform comprehensive ATS analysis' },
      { status: 500 }
    );
  }
}

// Legacy helper functions removed - now using enhancedATSService