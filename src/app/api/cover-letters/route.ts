import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { CoverLetter } from '@/models';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await connectDB();

    const coverLetters = await CoverLetter.find({ userId })
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: coverLetters
    });
  } catch (error) {
    console.error('Error fetching cover letters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cover letters' },
      { status: 500 }
    );
  }
}
