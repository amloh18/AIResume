import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { User, CV, Job, CoverLetter } from '@/models';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await connectDB();

    // Get recent activity from all user data
    const [cvs, jobs, coverLetters] = await Promise.all([
      CV.find({ userId }).sort({ updatedAt: -1 }).limit(10).lean(),
      Job.find({ userId }).sort({ updatedAt: -1 }).limit(10).lean(),
      CoverLetter.find({ userId }).sort({ updatedAt: -1 }).limit(10).lean()
    ]);

    // Combine and sort all activities
    const activities = [
      ...cvs.map(cv => ({
        id: cv._id,
        type: 'cv',
        action: cv.status === 'published' ? 'published' : 'updated',
        title: cv.title || 'Untitled CV',
        timestamp: cv.updatedAt,
        description: cv.status === 'published' ? 'Published CV' : 'Updated CV'
      })),
      ...jobs.map(job => ({
        id: job._id,
        type: 'job',
        action: 'added',
        title: `${job.jobTitle} at ${job.company}`,
        timestamp: job.createdAt,
        description: 'Added new job'
      })),
      ...coverLetters.map(letter => ({
        id: letter._id,
        type: 'cover_letter',
        action: letter.status === 'sent' ? 'sent' : 'created',
        title: letter.title || 'Untitled Cover Letter',
        timestamp: letter.updatedAt,
        description: letter.status === 'sent' ? 'Sent cover letter' : 'Created cover letter'
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

    // Get notes count (placeholder for now)
    const notesCount = Math.floor((cvs.length + jobs.length + coverLetters.length) * 0.3);

    return NextResponse.json({
      success: true,
      data: {
        activities,
        notesCount
      }
    });
  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity' },
      { status: 500 }
    );
  }
}
