import { NextRequest, NextResponse } from 'next/server';
import { parseJobText } from '@/lib/services/jobTextParser';

/**
 * POST /api/jobs/parse-quick
 * Lightweight regex-based job parser. No AI, no auth required.
 * Returns instantly with best-effort extractions from pasted text.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string' || text.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please provide at least 10 characters of job description text' },
        { status: 400 }
      );
    }

    const parsed = parseJobText(text);

    return NextResponse.json({
      success: true,
      data: {
        jobTitle: parsed.title,
        company: parsed.company,
        location: parsed.location,
        salary: parsed.salary,
        experience: parsed.experience,
        jobType: parsed.jobType,
        remote: parsed.remote,
        skills: parsed.skills,
        jobDescription: parsed.description,
        jobUrl: parsed.url,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to parse job text', details: message },
      { status: 500 }
    );
  }
}
