import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import { CV } from '@/models';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const { userId, jobId, atsScore, optimizations, appliedAt } = await request.json();

    if (userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update CV with ATS optimization data
    const updatedCV = await CV.findOneAndUpdate(
      { _id: id, userId: userId },
      {
        $set: {
          'metadata.atsScore': atsScore,
          'metadata.atsScoreJobId': jobId,
          'metadata.atsOptimizations': optimizations,
          'metadata.atsOptimizedAt': appliedAt,
          'metadata.lastModified': new Date()
        }
      },
      { new: true }
    );

    if (!updatedCV) {
      return NextResponse.json(
        { error: 'CV not found or access denied' },
        { status: 404 }
      );
    }

    console.log('✅ ATS optimization data saved for CV:', id);

    return NextResponse.json({
      success: true,
      message: 'ATS optimization data saved successfully',
      atsScore,
      optimizations
    });

  } catch (error) {
    console.error('Error saving ATS optimization:', error);
    return NextResponse.json(
      { error: 'Failed to save ATS optimization data' },
      { status: 500 }
    );
  }
}