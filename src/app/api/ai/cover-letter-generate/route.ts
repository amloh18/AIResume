import { NextRequest, NextResponse } from 'next/server';
import { aiCoverLetterService } from '@/lib/services/aiCoverLetterService';

export async function POST(request: NextRequest) {
  try {
    const {
      cvData,
      jobData,
      recipientName,
      companyName
    } = await request.json();

    if (!cvData || !jobData) {
      return NextResponse.json(
        { success: false, error: 'CV data and job data are required' },
        { status: 400 }
      );
    }

    const { structuredContent, legacyBody } = await aiCoverLetterService.generateModularCoverLetter({
      cvData,
      jobData,
      recipientName,
      companyName
    });

    return NextResponse.json({
      success: true,
      structuredContent,
      content: legacyBody,
      body: legacyBody,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cover letter generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate cover letter' },
      { status: 500 }
    );
  }
}
