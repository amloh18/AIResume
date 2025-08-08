import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import { User, CV, Job } from '@/models';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get users with their CV and job counts
    const users = await User.aggregate([
      {
        $lookup: {
          from: 'cvs',
          localField: '_id',
          foreignField: 'userId',
          as: 'cvs'
        }
      },
      {
        $lookup: {
          from: 'jobs',
          localField: '_id',
          foreignField: 'userId',
          as: 'jobs'
        }
      },
      {
        $addFields: {
          cvsCount: { $size: '$cvs' },
          jobsCount: { $size: '$jobs' }
        }
      },
      {
        $project: {
          _id: 1,
          email: 1,
          firstName: 1,
          lastName: 1,
          role: 1,
          isEmailVerified: 1,
          createdAt: 1,
          lastLogin: 1,
          cvsCount: 1,
          jobsCount: 1,
          status: {
            $cond: {
              if: { $eq: ['$isEmailVerified', true] },
              then: 'active',
              else: 'inactive'
            }
          }
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
} 