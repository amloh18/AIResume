import { NextRequest, NextResponse } from 'next/server';
import { AIAssistantService } from '@/lib/services/aiAssistantService';
import { UnifiedCVService } from '@/lib/services/unified-cv-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { cvId } = await req.json();

    if (!cvId) {
      return NextResponse.json(
        { success: false, error: 'CV ID is required' },
        { status: 400 }
      );
    }

    // Load CV data
    const cvData = await UnifiedCVService.getCV(cvId);
    if (!cvData) {
      return NextResponse.json(
        { success: false, error: 'CV not found' },
        { status: 404 }
      );
    }

    // Generate consistency check suggestions
    const suggestions = await AIAssistantService.checkConsistency(cvData.cvData);

    return NextResponse.json({
      success: true,
      data: suggestions
    });

  } catch (error: any) {
    console.error('Consistency check error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to check consistency' 
      },
      { status: 500 }
    );
  }
}
