import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { applicationDryRunService } from '@/lib/services/applicationDryRunService';

/**
 * POST /api/applications/dry-run
 * Perform a dry-run of an application (detect fields, map data, but don't submit)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();

    const body = await request.json();
    const {
      applicationId,
      jobId,
      applicationUrl,
      firstName,
      lastName,
      email,
      phone,
      linkedin,
      portfolio,
      resumeUrl,
      coverLetterText,
    } = body;

    // Validate required fields
    if (!applicationUrl) {
      return NextResponse.json(
        { error: 'Application URL is required' },
        { status: 400 }
      );
    }

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'First name, last name, and email are required' },
        { status: 400 }
      );
    }

    // Perform dry-run
    const result = await applicationDryRunService.performDryRun({
      applicationId: applicationId || 'test-' + Date.now(),
      userId: session.user.id,
      jobId: jobId || 'test-job',
      applicationUrl,
      candidateData: {
        firstName,
        lastName,
        email,
        phone,
        linkedin,
        portfolio,
        resumeUrl,
        coverLetterText,
      },
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error performing dry-run:', error);
    return NextResponse.json(
      { error: 'Failed to perform dry-run' },
      { status: 500 }
    );
  }
}
