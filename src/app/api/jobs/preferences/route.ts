/**
 * [TRANSITIONAL MIGRATION COMPATIBILITY]
 * 
 * This endpoint is a compatibility wrapper for legacy callers.
 * All preference mutations should use /api/job-search-profile directly.
 * 
 * This endpoint internally routes to JobSearchProfileService.
 * Do NOT add independent write implementations here.
 * 
 * TODO: Remove this endpoint after all callers are migrated.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { getConnection } from '@/lib/database';
import { JobSearchProfileService } from '@/lib/services/jobSearchProfileService';
import {
  DEFAULT_CV_TAILORING_MODE,
  parseCvTailoringMode,
} from '@/lib/cv-tailoring/tailoringMode';

export interface GlobalAutoApplyPreferences {
  enabled: boolean;
  targetRoles: string[];
  locations: string[];
  remoteOnly: boolean;
  workplaceTypes: ('remote' | 'hybrid' | 'onsite')[];
  minSalary: number;
  salaryCurrency: string;
  experienceYears: number;
  maxNoticePeriodDays: number;
  maxPerDay: number;
  useTailoredCV: boolean;
  useCoverLetter: boolean;
  autoAnswerQuestions: boolean;
  enabledPortals: ('naukri' | 'indeed' | 'greenhouse' | 'adzuna')[];
  searchIntensity: 'browsing' | 'exploring' | 'active' | 'aggressive';
  expectedApplicationsPerMonth: number;
  applicationMode: 'find_only' | 'manual_review' | 'automatic';
}

/**
 * GET /api/jobs/preferences
 * Returns user's job-search profile.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();

    const profile = await JobSearchProfileService.getProfile(auth.userId);
    
    if (!profile) {
      return NextResponse.json({
        success: true,
        cvTailoringMode: DEFAULT_CV_TAILORING_MODE,
        preferences: null,
      });
    }

    return NextResponse.json({
      success: true,
      cvTailoringMode: profile.cvTailoringMode || DEFAULT_CV_TAILORING_MODE,
      preferences: profile,
    });
  } catch (error: any) {
    console.error('Error fetching job preferences:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch job preferences' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/jobs/preferences
 * [TRANSITIONAL] Routes to JobSearchProfileService internally.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { preferences, cvTailoringMode: requestedMode } = body;

    await getConnection();

    // Build updates for JobSearchProfile
    const updates: Record<string, any> = {};
    
    if (requestedMode !== undefined) {
      updates.cvTailoringMode = parseCvTailoringMode(requestedMode);
    }

    if (preferences) {
      // Map legacy preference fields to JobSearchProfile
      if (preferences.targetRoles) updates.targetRoles = preferences.targetRoles;
      if (preferences.locations) updates.locations = preferences.locations;
      if (preferences.workplaceTypes) updates.workplaceTypes = preferences.workplaceTypes;
      if (preferences.remoteOnly !== undefined) updates.remoteOnly = preferences.remoteOnly;
      if (preferences.minSalary !== undefined) updates.minSalary = preferences.minSalary;
      if (preferences.salaryCurrency) updates.salaryCurrency = preferences.salaryCurrency;
      if (preferences.experienceYears !== undefined) updates.experienceYears = preferences.experienceYears;
      if (preferences.maxNoticePeriodDays !== undefined) updates.maxNoticePeriodDays = preferences.maxNoticePeriodDays;
      if (preferences.maxPerDay !== undefined) updates.maxPerDay = preferences.maxPerDay;
      if (preferences.useTailoredCV !== undefined) updates.useTailoredCV = preferences.useTailoredCV;
      if (preferences.useCoverLetter !== undefined) updates.useCoverLetter = preferences.useCoverLetter;
      if (preferences.autoAnswerQuestions !== undefined) updates.autoAnswerQuestions = preferences.autoAnswerQuestions;
      if (preferences.enabledPortals) updates.enabledPortals = preferences.enabledPortals;
      if (preferences.searchIntensity) updates.searchIntensity = preferences.searchIntensity;
      if (preferences.expectedApplicationsPerMonth !== undefined) updates.expectedApplicationsPerMonth = preferences.expectedApplicationsPerMonth;
      if (preferences.applicationMode) updates.applicationMode = preferences.applicationMode;
      if (preferences.enabled !== undefined) updates.autoApplyEnabled = preferences.enabled;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    // Validate the updates
    const validationErrors = JobSearchProfileService.validateProfile(updates);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      );
    }

    const profile = await JobSearchProfileService.patchProfile(auth.userId, updates);

    // [CANONICAL MIRROR] User.settings.cvTailoringMode is the store that
    // document generation actually reads (see getUserCvTailoringMode). Legacy
    // callers still write the mode through this endpoint, so mirror it forward
    // or the toggle silently does nothing for them. Best-effort: never fail
    // the request because of the mirror.
    if (requestedMode !== undefined) {
      try {
        const { default: User } = await import('@/models/User');
        await User.findByIdAndUpdate(auth.userId, {
          'settings.cvTailoringMode': parseCvTailoringMode(requestedMode),
        });
      } catch (mirrorError) {
        console.warn('Failed to mirror cvTailoringMode to User.settings:', mirrorError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Preferences saved',
      cvTailoringMode: profile.cvTailoringMode || DEFAULT_CV_TAILORING_MODE,
      preferences: profile,
    });
  } catch (error: any) {
    console.error('Error saving job preferences:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save job preferences' },
      { status: 500 }
    );
  }
}
