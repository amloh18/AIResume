import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
// Removed - using Clerk now
import connectDB from '@/lib/database';
import { User, CV, CoverLetter } from '@/models';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d';

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Fetch KPI data
    const [
      totalUsers,
      activeUsers,
      totalCVs,
      totalCoverLetters,
      recentCVs,
      recentCoverLetters
    ] = await Promise.all([
      // Total users
      User.countDocuments(),
      
      // Active users (users who logged in within the last 30 days)
      User.countDocuments({
        lastLogin: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
      }),
      
      // Total CVs
      CV.countDocuments(),
      
      // Total cover letters
      CoverLetter.countDocuments(),
      
      // Recent CVs (within date range)
      CV.countDocuments({ createdAt: { $gte: startDate } }),
      
      // Recent cover letters (within date range)
      CoverLetter.countDocuments({ createdAt: { $gte: startDate } })
    ]);

    // Calculate growth rates
    const previousStartDate = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));
    
    const [
      previousCVs,
      previousCoverLetters
    ] = await Promise.all([
      CV.countDocuments({ 
        createdAt: { 
          $gte: previousStartDate, 
          $lt: startDate 
        } 
      }),
      CoverLetter.countDocuments({ 
        createdAt: { 
          $gte: previousStartDate, 
          $lt: startDate 
        } 
      })
    ]);

    // Mock AI usage data (in real implementation, this would come from AI usage logs)
    const aiUsage = Math.floor(Math.random() * 10000) + 5000;
    const revenue = Math.floor(Math.random() * 1000) + 500;

    // Calculate growth rates
    const cvGrowthRate = previousCVs > 0 ? ((recentCVs - previousCVs) / previousCVs) * 100 : 0;
    const coverLetterGrowthRate = previousCoverLetters > 0 ? ((recentCoverLetters - previousCoverLetters) / previousCoverLetters) * 100 : 0;

    const kpiData = {
      totalUsers,
      activeUsers,
      totalCVs,
      totalCoverLetters,
      aiUsage,
      revenue,
      growthRate: Math.round((cvGrowthRate + coverLetterGrowthRate) / 2),
      recentActivity: {
        cvs: recentCVs,
        coverLetters: recentCoverLetters
      }
    };

    return NextResponse.json(kpiData);
  } catch (error) {
    console.error('Error fetching KPI data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KPI data' },
      { status: 500 }
    );
  }
} 