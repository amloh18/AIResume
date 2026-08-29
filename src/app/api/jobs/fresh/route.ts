/**
 * API Route: /api/jobs/fresh
 *
 * Returns fresh jobs sorted by freshness score.
 * Used by the FreshMatchesWidget on the dashboard.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const minScore = parseInt(searchParams.get('minScore') || '50');
    const sortBy = searchParams.get('sortBy') || 'freshness';

    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || '');
    }

    // Query jobs with freshness scores
    const jobs = await mongoose.connection.collection('jobs').aggregate([
      {
        $match: {
          status: 'active',
          'freshness.score': { $gte: minScore },
        },
      },
      {
        $addFields: {
          // Calculate match score (simplified - would use actual matching logic)
          matchScore: {
            $cond: [
              { $gte: ['$freshness.score', 90] },
              { $add: [70, { $multiply: [{ $rand: {} }, 25] }] },
              { $add: [60, { $multiply: [{ $rand: {} }, 30] }] },
            ],
          },
        },
      },
      {
        $sort: sortBy === 'freshness'
          ? { 'freshness.score': -1, 'ingestion.lastSeenAt': -1 }
          : { matchScore: -1, 'freshness.score': -1 },
      },
      {
        $limit: Math.min(limit, 50), // Cap at 50
      },
      {
        $project: {
          _id: 1,
          title: 1,
          company: 1,
          location: 1,
          remote: '$location.remote',
          remoteType: '$location.remoteType',
          postedAt: 1,
          freshness: 1,
          matchScore: 1,
          skills: 1,
          applicationUrl: '$source.applicationUrl',
          source: '$source.primary',
          salary: 1,
          employmentType: 1,
          companyLogo: '$company.logoUrl',
        },
      },
    ]).toArray();

    return NextResponse.json({
      success: true,
      jobs,
      meta: {
        count: jobs.length,
        minScore,
        sortBy,
      },
    });
  } catch (error: any) {
    console.error('Error fetching fresh jobs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
