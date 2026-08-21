import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { getConnection } from '@/lib/database';
import User from '@/models/User';

export interface GlobalAutoApplyPreferences {
  enabled: boolean;
  targetRoles: string[];
  locations: string[];
  remoteOnly: boolean;
  minSalary: number;
  salaryCurrency: string;
  experienceYears: number;
  maxNoticePeriodDays: number;
  maxPerDay: number;
  useTailoredCV: boolean;
  useCoverLetter: boolean;
  autoAnswerQuestions: boolean;
  enabledPortals: ('naukri' | 'indeed' | 'greenhouse' | 'adzuna')[];
}

const DEFAULT_GLOBAL_PREFERENCES: GlobalAutoApplyPreferences = {
  enabled: false,
  targetRoles: ['Full Stack Developer', 'Software Engineer', 'Frontend Developer'],
  locations: ['Remote', 'London', 'Bangalore', 'New York'],
  remoteOnly: false,
  minSalary: 12,
  salaryCurrency: 'INR_LPA',
  experienceYears: 3,
  maxNoticePeriodDays: 30,
  maxPerDay: 25,
  useTailoredCV: true,
  useCoverLetter: true,
  autoAnswerQuestions: true,
  enabledPortals: ['naukri', 'indeed', 'greenhouse', 'adzuna'],
};

/**
 * GET /api/jobs/preferences
 * Returns global auto-apply and matching criteria for the user.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();
    const user: any = await User.findById(auth.userId).lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const saved = user.autoApplyPreferences || {};

    const preferences: GlobalAutoApplyPreferences = {
      enabled: saved.enabled ?? user.naukriIntegration?.preferences?.autoApplyEnabled ?? false,
      targetRoles:
        saved.targetRoles?.length > 0
          ? saved.targetRoles
          : user.naukriIntegration?.preferences?.targetTitles?.length > 0
          ? user.naukriIntegration?.preferences?.targetTitles
          : DEFAULT_GLOBAL_PREFERENCES.targetRoles,
      locations:
        saved.locations?.length > 0
          ? saved.locations
          : user.naukriIntegration?.preferences?.targetLocations?.length > 0
          ? user.naukriIntegration?.preferences?.targetLocations
          : DEFAULT_GLOBAL_PREFERENCES.locations,
      remoteOnly: saved.remoteOnly ?? false,
      minSalary: saved.minSalary ?? user.naukriIntegration?.preferences?.minCtcLakhs ?? 12,
      salaryCurrency: saved.salaryCurrency ?? 'INR_LPA',
      experienceYears: saved.experienceYears ?? user.naukriIntegration?.preferences?.experienceYears ?? 3,
      maxNoticePeriodDays: saved.maxNoticePeriodDays ?? user.naukriIntegration?.preferences?.maxNoticePeriodDays ?? 30,
      maxPerDay: saved.maxPerDay ?? user.naukriIntegration?.preferences?.dailyLimit ?? 25,
      useTailoredCV: saved.useTailoredCV ?? true,
      useCoverLetter: saved.useCoverLetter ?? true,
      autoAnswerQuestions: saved.autoAnswerQuestions ?? true,
      enabledPortals: saved.enabledPortals || ['naukri', 'indeed', 'greenhouse', 'adzuna'],
    };

    return NextResponse.json({
      success: true,
      preferences,
      portalStatus: {
        naukri: user.naukriIntegration?.sessionStatus === 'active',
        indeed: user.indeedIntegration?.sessionStatus === 'active',
        greenhouse: false,
        adzuna: false,
      },
    });
  } catch (error: any) {
    console.error('Error fetching global job preferences:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch job preferences' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/jobs/preferences
 * Saves global auto-apply and matching criteria and syncs across connected portals.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { preferences } = body;

    if (!preferences) {
      return NextResponse.json({ error: 'Preferences payload required' }, { status: 400 });
    }

    await getConnection();
    const user = await User.findById(auth.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updatedGlobal: GlobalAutoApplyPreferences = {
      enabled: Boolean(preferences.enabled),
      targetRoles: preferences.targetRoles || [],
      locations: preferences.locations || [],
      remoteOnly: Boolean(preferences.remoteOnly),
      minSalary: Number(preferences.minSalary || 0),
      salaryCurrency: preferences.salaryCurrency || 'INR_LPA',
      experienceYears: Number(preferences.experienceYears || 2),
      maxNoticePeriodDays: Number(preferences.maxNoticePeriodDays || 30),
      maxPerDay: Math.min(Math.max(Number(preferences.maxPerDay || 25), 1), 25),
      useTailoredCV: Boolean(preferences.useTailoredCV ?? true),
      useCoverLetter: Boolean(preferences.useCoverLetter ?? true),
      autoAnswerQuestions: Boolean(preferences.autoAnswerQuestions ?? true),
      enabledPortals: preferences.enabledPortals || ['naukri', 'indeed', 'greenhouse', 'adzuna', 'lever', 'ashby', 'workable'],
    };

    // Save on user document
    (user as any).autoApplyPreferences = updatedGlobal;

    // Sync to Naukri preferences
    if (user.naukriIntegration) {
      user.naukriIntegration.preferences = {
        targetTitles: updatedGlobal.targetRoles,
        targetLocations: updatedGlobal.locations,
        minCtcLakhs: updatedGlobal.minSalary,
        experienceYears: updatedGlobal.experienceYears,
        maxNoticePeriodDays: updatedGlobal.maxNoticePeriodDays,
        dailyLimit: updatedGlobal.maxPerDay,
        autoApplyEnabled: updatedGlobal.enabled,
      };
    }

    // Sync to Indeed preferences
    if (user.indeedIntegration) {
      user.indeedIntegration.preferences = {
        targetTitles: updatedGlobal.targetRoles,
        targetLocations: updatedGlobal.locations,
        minSalary: updatedGlobal.minSalary * 10000,
        salaryCurrency: updatedGlobal.salaryCurrency.startsWith('INR') ? 'INR' : 'USD',
        remoteOnly: updatedGlobal.remoteOnly,
        dailyLimit: updatedGlobal.maxPerDay,
        autoApplyEnabled: updatedGlobal.enabled,
      };
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Global auto-apply preferences saved and synced across all portals!',
      preferences: updatedGlobal,
    });
  } catch (error: any) {
    console.error('Error saving global job preferences:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save job preferences' },
      { status: 500 }
    );
  }
}
