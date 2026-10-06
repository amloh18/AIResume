import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import mongoose from 'mongoose';
import CV from '@/models/CV';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    await getConnection();

    // Authenticate user
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId } = authResult;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Fetch user data and CVs in parallel
    const [user, cvs] = await Promise.all([
      User.findById(userObjectId)
        .select('firstName lastName email summary location linkedin github website industry experience')
        .lean(),
      CV.find({ userId: userObjectId })
        .select('title status cvData')
        .lean()
    ]);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate profile strength (0-100)
    const strength = calculateProfileStrength(user, cvs);

    return NextResponse.json({
      success: true,
      data: { strength }
    });

  } catch (error: any) {
    console.error('Profile strength calculation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to calculate profile strength' },
      { status: 500 }
    );
  }
}

function calculateProfileStrength(user: any, cvs: any[]): number {
  let score = 0;
  const weights = {
    basicInfo: 25,
    cvCompleteness: 40,
    additionalInfo: 20,
    cvCount: 15
  };

  // Basic info (25 points)
  let basicInfoScore = 0;
  if (user.firstName) basicInfoScore += 5;
  if (user.lastName) basicInfoScore += 5;
  if (user.email) basicInfoScore += 5;
  if (user.summary || user.bio) basicInfoScore += 5;
  if (user.location) basicInfoScore += 5;
  score += (basicInfoScore / 25) * weights.basicInfo;

  // CV completeness (40 points) - average of all CVs
  if (cvs.length > 0) {
    let totalCVScore = 0;
    cvs.forEach(cv => {
      let cvScore = 0;
      const cvData = cv.cvData || {};
      // Basics
      if (cvData?.basics?.name) cvScore += 10;
      if (cvData?.basics?.email) cvScore += 5;
      if (cvData?.basics?.phone) cvScore += 5;
      if (cvData?.basics?.summary) cvScore += 10;
      // Experience
      if (cvData?.work && cvData.work.length > 0) cvScore += 20;
      // Education
      if (cvData?.education && cvData.education.length > 0) cvScore += 15;
      // Skills
      if (cvData?.skills && cvData.skills.length > 0) cvScore += 20;
      // Projects (bonus)
      if (cvData?.projects && cvData.projects.length > 0) cvScore += 10;
      // Languages
      if (cvData?.languages && cvData.languages.length > 0) cvScore += 5;
      totalCVScore += Math.min(cvScore, 100);
    });
    const avgCVScore = totalCVScore / cvs.length;
    score += (avgCVScore / 100) * weights.cvCompleteness;
  } else {
    score += 0; // No CVs = 0 for this component
  }

  // Additional profile info (20 points)
  let additionalScore = 0;
  if (user.linkedin) additionalScore += 5;
  if (user.github) additionalScore += 5;
  if (user.website) additionalScore += 5;
  if (user.industry) additionalScore += 5;
  if (user.experience) additionalScore += 5;
  score += (additionalScore / 20) * weights.additionalInfo;

  // CV count (15 points) - having at least 1 CV gives full points
  if (cvs.length >= 1) {
    score += weights.cvCount;
  }

  return Math.round(score);
}
