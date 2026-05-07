import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import mongoose from 'mongoose';
import CV from '@/models/CV';

export async function GET(request: NextRequest) {
  try {
    await getConnection();

    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = authResult;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Fetch user's CVs to extract skills
    const cvs = await CV.find({ userId: userObjectId }).select('sections').lean();

    const skillsMap = new Map<string, number>();
    cvs.forEach((cv: any) => {
      const skillsSection = cv.sections?.find((s: any) => s.type === 'skills');
      if (skillsSection?.content?.items) {
        skillsSection.content.items.forEach((skill: any) => {
          const name = typeof skill === 'string' ? skill : skill.name;
          if (name) {
            skillsMap.set(name, (skillsMap.get(name) || 0) + 1);
          }
        });
      }
    });

    const topSkills = Array.from(skillsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({
        name,
        demand: Math.floor(Math.random() * 40) + 60, // Mock demand 60-100%
        trend: Math.random() > 0.3 ? 'up' : 'stable'
      }));

    // If no skills found, provide some default ones
    if (topSkills.length === 0) {
      const defaults = ['React', 'TypeScript', 'Node.js', 'Next.js', 'Tailwind CSS'];
      defaults.forEach(name => {
        topSkills.push({
          name,
          demand: Math.floor(Math.random() * 40) + 60,
          trend: 'up'
        });
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        skills: topSkills,
        marketDemand: 85 // Mock overall market demand
      }
    });

  } catch (error: any) {
    console.error('Skills market data error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch skills market data' },
      { status: 500 }
    );
  }
}
