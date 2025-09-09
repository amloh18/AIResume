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
    const { jobId, userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Update the cover letter with the job ID
    const updatedCoverLetter = await CoverLetter.findByIdAndUpdate(
      id,
      { 
        jobId: jobId,
        'metadata.lastModified': new Date()
      },
      { new: true }
    );

    if (!updatedCoverLetter) {
      return NextResponse.json(
        { success: false, error: 'Cover letter not found' },
        { status: 404 }
      );
    }

    console.log('✅ Cover letter linked to job:', { coverLetterId: id, jobId });

    return NextResponse.json({
      success: true,
      data: updatedCoverLetter
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