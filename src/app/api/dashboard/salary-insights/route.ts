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

    // Fetch user profile for region detection
    const User = mongoose.models.User;
    const user = (await User.findById(userObjectId).select('region location subscription').lean()) as any;

    // Fetch job applications with salary info
    const jobs = await JobApplication.find({
      userId: userObjectId,
      'salary.min': { $exists: true }
    }).select('salary jobTitle company').lean();

    let averageSalary = 0;
    let minSalary = Infinity;
    let maxSalary = -Infinity;
    let currency = 'USD';

    // Region-based currency and mock data
    const userRegion = (user?.region || user?.location || '').toLowerCase();
    if (userRegion.includes('india') || userRegion.includes('in')) {
      currency = 'INR';
      averageSalary = 2400000;
      minSalary = 1200000;
      maxSalary = 4500000;
    } else if (userRegion.includes('uk') || userRegion.includes('united kingdom')) {
      currency = 'GBP';
      averageSalary = 65000;
      minSalary = 45000;
      maxSalary = 95000;
    }

    const validSalaries = jobs.filter((j: any) => j.salary?.min !== undefined);
    if (validSalaries.length > 0) {
      const salaries = validSalaries.map((j: any) => (j.salary.min + (j.salary.max || j.salary.min)) / 2);
      averageSalary = salaries.reduce((a, b) => a + b, 0) / salaries.length;
      minSalary = Math.min(...salaries);
      maxSalary = Math.max(...salaries);
      currency = validSalaries[0]?.salary?.currency || currency;
    }

    return NextResponse.json({
      success: true,
      data: {
        average: Math.round(averageSalary),
        min: minSalary === Infinity ? 0 : Math.round(minSalary),
        max: maxSalary === -Infinity ? 0 : Math.round(maxSalary),
        currency,
        percentile: 75 // Mock percentile
      }
    });

  } catch (error: any) {
    console.error('Salary insights error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch salary insights' },
      { status: 500 }
    );
  }
}
