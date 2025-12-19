import { NextRequest, NextResponse } from 'next/server';
import { SkillGapAnalysisService } from '@/lib/services/skillGapAnalysisService';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cvData, jobData }: { 
      cvData: UnifiedCVDataStructure; 
      jobData?: any;
    } = body;

    if (!cvData) {
      return NextResponse.json(
        { success: false, error: 'CV data is required' },
        { status: 400 }
      );
    }

    // Normalize job description field
    const jobDescription = jobData?.jobDescription || jobData?.description || jobData?.jd || '';
    
    if (!jobDescription.trim()) {
      return NextResponse.json(
        { success: false, error: 'Job description is required for skill gap analysis' },
        { status: 400 }
      );
    }

    // Perform skill gap analysis
    const analysis = await SkillGapAnalysisService.analyzeSkillGap(
      jobDescription,
      cvData,
      jobData?.title || jobData?.jobTitle,
      jobData?.company
    );

    return NextResponse.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Error in skill gap analysis API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to analyze skill gap' 
      },
      { status: 500 }
    );
  }
}

