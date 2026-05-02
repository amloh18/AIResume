import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { getConnection } from '@/lib/database';
import CV from '@/models/CV';
import { CVThumbnailService } from '@/lib/services/cvThumbnailService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: cvId } = await params;
    const userId = authResult.userId;

    await getConnection();

    const cv = await CV.findOne({ _id: cvId, userId });
    if (!cv) {
      return NextResponse.json({ success: false, error: 'CV not found' }, { status: 404 });
    }

    const now = new Date();
    const thumbnailAge = cv.metadata?.thumbnailGeneratedAt
      ? now.getTime() - new Date(cv.metadata.thumbnailGeneratedAt).getTime()
      : Infinity;
    const isThumbnailRecent = !!cv.metadata?.thumbnailUrl && thumbnailAge < 7 * 24 * 60 * 60 * 1000;

    if (isThumbnailRecent) {
      return NextResponse.json({
        success: true,
        thumbnailUrl: cv.metadata.thumbnailUrl,
        cached: true
      });
    }

    const thumbnailUrl = await CVThumbnailService.generateAndSaveThumbnail(cvId, userId, false);
    if (!thumbnailUrl) {
      return NextResponse.json({ success: false, error: 'Failed to generate thumbnail' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      thumbnailUrl,
      cached: false
    });
  } catch (error) {
    console.error('Error generating CV thumbnail:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate thumbnail' },
      { status: 500 }
    );
  }
}
