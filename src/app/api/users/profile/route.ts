import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { User } from '@/models';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { handleCorsPreflight, setCorsHeaders } from '@/lib/utils/cors-helpers';

const toNumberOrNull = (value: number | null | undefined) =>
  typeof value === 'number' ? value : null;

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return setCorsHeaders(
        NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        ),
        request
      );
    }

    await getConnection();

    const user = await User.findById(auth.userId).select([
      'firstName',
      'lastName',
      'email',
      'avatar',
      'role',
      'currentPlanKey',
      'credits',
      'usage',
      'settings',
      'phone',
      'location',
      'company',
      'jobTitle',
      'industry',
      'experience',
      'region',
      'linkedin',
      'github',
      'website',
      'monthlyGoal',
      'createdAt',
      'updatedAt'
    ]);

    if (!user) {
      return setCorsHeaders(
        NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        ),
        request
      );
    }

    const profile = {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      avatar: user.avatar || null,
      role: user.role,
      plan: user.currentPlanKey,
      credits: {
        jobCredits: typeof user.credits?.jobCredits === 'number' ? user.credits.jobCredits : 0,
        totalJobsCreated: typeof user.credits?.totalCreated?.jobs === 'number' ? user.credits.totalCreated.jobs : 0,
        lastResetDate: user.credits?.lastResetDate || null,
        resetSchedule: user.credits?.resetSchedule || 'monthly'
      },
      usage: {
        cvJourneyCount: user.usage?.cvJourneyCount ?? 0,
        journeysCreated: user.usage?.journeysCreated ?? 0,
        exportCount: user.usage?.exportCount ?? 0,
        atsCheckCount: user.usage?.atsCheckCount ?? 0
      },
      contact: {
        phone: user.phone || null,
        location: user.location || null,
        region: user.region || null
      },
      professional: {
        company: user.company || null,
        jobTitle: user.jobTitle || null,
        industry: user.industry || null,
        experienceLevel: user.experience || null
      },
      links: {
        website: user.website || null,
        linkedin: user.linkedin || null,
        github: user.github || null
      },
      settings: {
        theme: user.settings?.theme || 'light',
        timezone: user.settings?.timezone || 'UTC',
        language: user.settings?.languagePreference || 'en',
        notifications: {
          email: user.settings?.notifications?.email ?? true,
          push: user.settings?.notifications?.push ?? false
        }
      },
      metrics: {
        monthlyGoal: toNumberOrNull(user.monthlyGoal),
        totalCreditsUsed: user.credits?.totalCreated?.jobs ?? 0
      },
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return setCorsHeaders(
      NextResponse.json({ success: true, data: profile }),
      request
    );
  } catch (error) {
    console.error('❌ User profile error:', error);
    return setCorsHeaders(
      NextResponse.json(
        { success: false, error: 'Failed to fetch profile' },
        { status: 500 }
      ),
      request
    );
  }
}

