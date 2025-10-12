import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { CoverLetter } from '@/models';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Find the cover letter by ID and user ID
    const coverLetter = await CoverLetter.findOne({
      _id: id,
      userId: userId
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
    await connectDB();
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

    console.log('✅ Cover letter updated successfully:', { 
      coverLetterId: id, 
      updatedFields: Object.keys(updateData).filter(k => k !== 'metadata.lastModified')
    });

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
    await connectDB();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Find and delete the cover letter by ID and user ID
    const coverLetter = await CoverLetter.findOneAndDelete({
      _id: id,
      userId: userId
    });

    if (!coverLetter) {
      return NextResponse.json(
        { success: false, error: 'Cover letter not found' },
        { status: 404 }
      );
    }

    console.log('✅ Cover letter deleted successfully:', { coverLetterId: id, userId });

    return NextResponse.json({
      success: true,
      message: 'Cover letter deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting cover letter:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to delete cover letter' 
      },
      { status: 500 }
    );
  }
}