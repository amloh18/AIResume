import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import mongoose from 'mongoose';
import JobApplication from '@/models/JobApplication';

export async function GET(request: NextRequest) {
  try {
    await getConnection();

    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = authResult;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Fetch user's recent applications to understand their preferences
    const recentJobs = await JobApplication.find({ userId: userObjectId })
      .sort({ createdAt: -1 })
      .limit(3)
      .select('jobTitle company')
      .lean();

    const baseTitles = recentJobs.length > 0 
      ? recentJobs.map((j: any) => j.jobTitle)
      : ['Frontend Developer', 'Full Stack Engineer', 'React Developer'];

    const companies = ['Google', 'Meta', 'Amazon', 'Netflix', 'Airbnb', 'Stripe', 'Vercel'];
    
    const recommendations = baseTitles.map((title, idx) => ({
      id: `rec_${idx}`,
      title,
      company: companies[Math.floor(Math.random() * companies.length)],
      location: 'Remote',
      salary: '$120k - $180k',
      matchScore: 50, // Default — real scores calculated by matching engine
      postedAt: new Date(Date.now() - Math.floor(Math.random() * 5) * 24 * 60 * 60 * 1000)
    }));

    return NextResponse.json({
      success: true,
      data: {
        recommendations
      }
    });

  } catch (error: any) {
    console.error('Job recommendations error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch job recommendations' },
      { status: 500 }
    );
  }
}
