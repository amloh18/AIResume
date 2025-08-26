import { NextRequest, NextResponse } from 'next/server';
import { JobLinkParser, ParsedJobData } from '@/lib/services/jobLinkParser';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { success: false, message: 'URL is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Parse Job API - Parsing URL:', url);

    const parsedData = await JobLinkParser.parseJobUrl(url);

    return NextResponse.json({
      success: true,
      data: parsedData
    });

  } catch (error: any) {
    console.error('❌ Parse Job API - Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Failed to parse job URL' 
      },
      { status: 500 }
    );
  }
} 