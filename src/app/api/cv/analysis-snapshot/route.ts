import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { CV } from '@/models';
import { CentralScoreManager, INDUSTRY_STANDARD_KEYWORDS } from '@/lib/pill-engine/CentralScoreManager';
import { getAuthenticatedUser } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    await getConnection();
    const authResult = await getAuthenticatedUser();
    
    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { cvId } = body;

    if (!cvId) {
      return NextResponse.json({ success: false, error: 'cvId is required' }, { status: 400 });
    }

    const cv = await CV.findOne({ _id: cvId, userId: authResult.userId });
    if (!cv) {
      return NextResponse.json({ success: false, error: 'CV not found' }, { status: 404 });
    }

    const scoreManager = CentralScoreManager.getInstance();
    const cvData = cv.cvData;
    
    // Calculate industry-specific keyword match
    const industryMatch = scoreManager.calculateIndustryKeywordMatch(cvData);
    
    // Calculate overall scores
    const scoreResult = scoreManager.getScoreSync(cvData, null);
    
    // Extract strengths and weaknesses
    const strengths = scoreResult.recommendations
      .filter(r => !r.toLowerCase().includes('add') && !r.toLowerCase().includes('missing'))
      .slice(0, 3);
      
    if (strengths.length === 0 && industryMatch.matchedKeywords.length > 0) {
      strengths.push(`Strong keyword alignment for ${industryMatch.detectedRole.replace('_', ' ')}`);
      strengths.push(...industryMatch.matchedKeywords.slice(0, 2).map(k => `Proven expertise in ${k}`));
    }

    const weaknesses = scoreResult.issues
      .filter(i => i.severity === 'critical' || i.severity === 'warning')
      .map(i => i.message)
      .slice(0, 3);

    const snapshot = {
      healthIndex: scoreResult.cvScore.total,
      generatedAt: new Date(),
      
      // Score Breakdown (0-20 each for 100 total)
      breakdown: {
        structure: Math.round(scoreResult.cvScore.formatting * (20/15)), // Normalized to 20
        readability: Math.round(scoreResult.cvScore.readability), // 0-20
        contentStrength: Math.round(scoreResult.cvScore.completeness * (20/25)), // Normalized to 20
        skillsKeywords: Math.round(industryMatch.score / 2), // Normalized to 20 (original is 0-40)
        impactAchievements: Math.round(scoreResult.cvScore.impactVerbs), // 0-20
      },

      // At a Glance stats
      stats: {
        pagesDetected: Math.max(1, Math.ceil(JSON.stringify(cvData).length / 3000)), // Rough estimate
        totalWords: JSON.stringify(cvData).split(/\s+/).length,
        experienceYears: (() => {
          if (!cvData.work?.length) return 0;
          let totalDays = 0;
          cvData.work.forEach((w: any) => {
            if (w.startDate) {
              const start = new Date(w.startDate);
              const end = w.endDate && w.endDate.toLowerCase() !== 'present' ? new Date(w.endDate) : new Date();
              totalDays += (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
            }
          });
          return parseFloat((totalDays / 365).toFixed(1));
        })(),
        skillsFound: cvData.skills?.length || 0,
        sectionsDetected: [
          !!cvData.basics?.summary,
          !!cvData.work?.length,
          !!cvData.education?.length,
          !!cvData.skills?.length,
          !!cvData.projects?.length,
          !!cvData.certificates?.length,
          !!cvData.basics?.location,
          !!cvData.basics?.phone,
          !!cvData.basics?.profiles?.length
        ].filter(Boolean).length
      },

      // Missing Keywords
      missingKeywords: industryMatch.totalKeywords > 0 
        ? INDUSTRY_STANDARD_KEYWORDS[industryMatch.detectedRole].technicalSkills
            .filter(k => !industryMatch.matchedKeywords.includes(k))
            .slice(0, 10)
        : ['Agile', 'Leadership', 'Project Management', 'Data Analysis', 'Stakeholder Management'],

      strengths: strengths.length > 0 ? strengths : ['Professional experience structure', 'Clear contact information', 'Strong skills foundation'],
      weaknesses: weaknesses.length > 0 ? weaknesses : ['Missing industry keywords', 'Add quantified achievements', 'Professional summary needed'],
    };

    // Helper to get Industry Standard Keywords (copying the constant if needed or importing)
    // For now using the defaults if the manager doesn't export them easily
    
    await CV.findByIdAndUpdate(cvId, {
      $set: { 'metadata.analysisSnapshot': snapshot }
    });

    return NextResponse.json({
      success: true,
      data: snapshot
    });
  } catch (error: any) {
    console.error('Analysis snapshot error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}
