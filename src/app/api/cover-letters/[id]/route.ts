import { NextRequest, NextResponse } from 'next/server';
import getConnection from '@/lib/database';
import { CoverLetter } from '@/models';
import mongoose from 'mongoose';
import { toObjectId } from '@/lib/db-utils';
import { getAuthenticatedUser } from '@/lib/auth-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getConnection();
    const { id } = await params;
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const userId = authResult.userId;

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    // Find the cover letter by ID and user ID
    // Convert userId to ObjectId for proper MongoDB query
    const coverLetter = await CoverLetter.findOne({
      _id: toObjectId(id),
      userId: toObjectId(userId)
    });

    if (!coverLetter) {
      return NextResponse.json(
        { success: false, error: 'Cover letter not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      coverLetter: coverLetter
    });

  } catch (error: any) {
    console.error('Error fetching cover letter:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch cover letter' 
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getConnection();
    const { id } = await params;
    const body = await request.json();
    const { jobId, userId, title, content, header, body: bodyContent, footer, status, metadata, targetCompany, targetPosition, keywords, cvId, journeyId } = body;

    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch the cover letter document
    const coverLetter = await CoverLetter.findById(id);

    if (!coverLetter) {
      return NextResponse.json(
        { success: false, error: 'Cover letter not found' },
        { status: 404 }
      );
    }

    if (coverLetter.userId.toString() !== authResult.userId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Update core fields if provided
    if (title !== undefined) coverLetter.title = title;
    if (header !== undefined) coverLetter.header = header;
    if (bodyContent !== undefined) coverLetter.body = bodyContent;
    if (footer !== undefined) coverLetter.footer = footer;
    if (status !== undefined) coverLetter.status = status;
    if (jobId !== undefined) coverLetter.jobId = jobId;
    if (cvId !== undefined) coverLetter.cvId = cvId;
    if (journeyId !== undefined) coverLetter.journeyId = journeyId;
    
    // Update metadata fields if provided
    if (!coverLetter.metadata) {
      coverLetter.metadata = { lastModified: new Date(), wordCount: 0, characterCount: 0, estimatedReadingTime: 0, tags: [], isPublic: false, viewCount: 0, downloadCount: 0 };
    }
    if (targetCompany !== undefined) coverLetter.metadata.targetCompany = targetCompany;
    if (targetPosition !== undefined) coverLetter.metadata.targetPosition = targetPosition;
    if (keywords !== undefined) coverLetter.metadata.keywords = keywords;
    
    // If metadata object is provided, merge it
    if (metadata) {
      Object.keys(metadata).forEach(key => {
        if (key !== 'lastModified') { // Don't override lastModified
          coverLetter.set(`metadata.${key}`, metadata[key]);
        }
      });
    }

    // Save the cover letter document (runs pre-save hook to merge content)
    const updatedCoverLetter = await coverLetter.save();

    if (!updatedCoverLetter) {
      return NextResponse.json(
        { success: false, error: 'Cover letter not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedCoverLetter._id,
        title: updatedCoverLetter.title,
        content: updatedCoverLetter.content,
        header: updatedCoverLetter.header,
        body: updatedCoverLetter.body,
        footer: updatedCoverLetter.footer,
        status: updatedCoverLetter.status,
        jobId: updatedCoverLetter.jobId,
        cvId: updatedCoverLetter.cvId,
        userId: updatedCoverLetter.userId,
        metadata: updatedCoverLetter.metadata,
        createdAt: updatedCoverLetter.createdAt,
        updatedAt: updatedCoverLetter.updatedAt
      }
    });

  } catch (error: any) {
    console.error('Error updating cover letter:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to update cover letter' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getConnection();
    const { id } = await params;
    
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const userId = authResult.userId;

    // CRITICAL: Log to stderr to ensure it appears even if stdout is buffered
    console.error('🔍 DELETE Cover Letter - Request:', JSON.stringify({ id, userId }));

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
      console.error('❌ DELETE Cover Letter - Invalid ID format:', JSON.stringify({ id, userId }));
      return NextResponse.json(
        { success: false, error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    // Check if cover letter exists first (for debugging) - try both string and ObjectId
    const coverLetterId = toObjectId(id);
    const existingCoverLetter = await CoverLetter.findOne({
      _id: coverLetterId
    }).lean() as any;
    
    console.error('🔍 DELETE Cover Letter - Found (any user):', JSON.stringify({
      exists: !!existingCoverLetter,
      foundUserId: existingCoverLetter?.userId?.toString(),
      foundUserIdType: typeof existingCoverLetter?.userId,
      requestedUserId: userId,
      requestedUserIdType: typeof userId,
      coverLetterId: coverLetterId.toString(),
      userIdsMatch: existingCoverLetter?.userId?.toString() === userId
    }));

    // Match the exact query pattern used in GET /api/cover-letters/route.ts (line 25)
    // which uses userId as string and Mongoose auto-converts it
    // This is the same pattern that successfully finds 86 cover letters
    const coverLetter = await CoverLetter.findOneAndDelete({
      _id: coverLetterId,
      userId: userId  // Use string directly, let Mongoose auto-convert like the GET endpoint does
    });

    if (!coverLetter) {
      console.error('❌ DELETE Cover Letter - Not found:', JSON.stringify({
        id,
        coverLetterId: coverLetterId.toString(),
        userId,
        existingCoverLetterExists: !!existingCoverLetter,
        existingCoverLetterUserId: existingCoverLetter?.userId?.toString(),
        existingCoverLetterUserIdRaw: existingCoverLetter?.userId,
        userIdComparison: existingCoverLetter?.userId?.toString() === userId,
        userIdStrictComparison: existingCoverLetter?.userId?.equals?.(toObjectId(userId)),
        queryUsed: { _id: coverLetterId.toString(), userId: userId }
      }));
      return NextResponse.json(
        { success: false, error: 'Cover letter not found' },
        { status: 404 }
      );
    }

    console.error('✅ Cover letter deleted successfully:', JSON.stringify({ 
      coverLetterId: id, 
      userId,
      deletedId: coverLetter._id?.toString()
    }));

    // Unlink this Cover Letter from any ApplicationJourney
    try {
      const { ApplicationJourney } = await import('@/models');
      const unlinkResult = await ApplicationJourney.updateMany(
        { coverLetterId: coverLetterId },
        { 
          $unset: { coverLetterId: "" }, 
          $set: { status: 'draft' } 
        }
      );
      console.error('✅ DELETE Cover Letter - Unlinked Cover Letter from journeys:', unlinkResult);
    } catch (unlinkError) {
      console.error('Failed to unlink Cover Letter from journeys:', unlinkError);
    }

    return NextResponse.json({
      success: true,
      message: 'Cover letter deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ Error deleting cover letter:', error);
    console.error('❌ Error stack:', error.stack);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to delete cover letter' 
      },
      { status: 500 }
    );
  }
}
