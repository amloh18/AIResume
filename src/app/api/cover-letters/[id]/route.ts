import { NextRequest, NextResponse } from 'next/server';
import getConnection from '@/lib/database';
import { CoverLetter } from '@/models';
import mongoose from 'mongoose';
import { toObjectId } from '@/lib/db-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getConnection();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

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
    const { jobId, userId, title, content, status, metadata, targetCompany, targetPosition, keywords, cvId } = body;

    // Build update object dynamically based on provided fields
    const updateData: any = {
      'metadata.lastModified': new Date()
    };

    // Update core fields if provided
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (status !== undefined) updateData.status = status;
    if (jobId !== undefined) updateData.jobId = jobId;
    if (cvId !== undefined) updateData.cvId = cvId;
    
    // Update metadata fields if provided
    if (targetCompany !== undefined) updateData['metadata.targetCompany'] = targetCompany;
    if (targetPosition !== undefined) updateData['metadata.targetPosition'] = targetPosition;
    if (keywords !== undefined) updateData['metadata.keywords'] = keywords;
    
    // If metadata object is provided, merge it
    if (metadata) {
      Object.keys(metadata).forEach(key => {
        if (key !== 'lastModified') { // Don't override lastModified
          updateData[`metadata.${key}`] = metadata[key];
        }
      });
    }

    // Update the cover letter
    const updatedCoverLetter = await CoverLetter.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // CRITICAL: Log to stderr to ensure it appears even if stdout is buffered
    console.error('🔍 DELETE Cover Letter - Request:', JSON.stringify({ id, userId }));

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

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