/**
 * API Route: /api/job-search-profile
 * 
 * Canonical API for job-search preferences.
 * All job-search preference mutations must go through this endpoint.
 * 
 * GET: Retrieve user's job-search profile
 * PATCH: Update user's job-search profile (partial update)
 * POST: Create or replace user's job-search profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { getConnection } from '@/lib/database';
import { JobSearchProfileService } from '@/lib/services/jobSearchProfileService';
import { isFeatureFlagEnabled, FEATURE_FLAGS } from '@/lib/feature-flags';

// Fields that must never be written by the client
const SYSTEM_FIELDS = new Set([
  '_id', 'id', 'userId', '__v', 'profileVersion', 'createdAt', 'updatedAt',
]);

function stripSystemFields(obj: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!SYSTEM_FIELDS.has(key)) {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * GET /api/job-search-profile
 * Returns the user's job-search profile.
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
        profile: null,
        message: 'No job-search profile found. Complete onboarding to create one.',
      });
    }

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error: any) {
    console.error('Error fetching job-search profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch job-search profile' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/job-search-profile
 * Partially update user's job-search profile.
 * Only the provided fields are updated.
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { updates } = body;

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'Updates object required' },
        { status: 400 }
      );
    }

    await getConnection();

    // Strip system fields that must not be written by the client
    const cleanUpdates = stripSystemFields(updates);

    // Validate the updates
    const validationErrors = JobSearchProfileService.validateProfile(cleanUpdates);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      );
    }

    const profile = await JobSearchProfileService.patchProfile(auth.userId, cleanUpdates);

    return NextResponse.json({
      success: true,
      profile,
      message: 'Job-search profile updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating job-search profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update job-search profile' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/job-search-profile
 * Create or replace user's job-search profile.
 * Used during onboarding to create initial profile.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { profileData } = body;

    if (!profileData || typeof profileData !== 'object') {
      return NextResponse.json(
        { error: 'Profile data object required' },
        { status: 400 }
      );
    }

    await getConnection();

    // Strip system fields that must not be written by the client
    const cleanProfileData = stripSystemFields(profileData);

    // Validate the profile data
    const validationErrors = JobSearchProfileService.validateProfile(cleanProfileData);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      );
    }

    const profile = await JobSearchProfileService.updateProfile(auth.userId, cleanProfileData);

    return NextResponse.json({
      success: true,
      profile,
      message: 'Job-search profile created/updated successfully',
    });
  } catch (error: any) {
    console.error('Error creating job-search profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create job-search profile' },
      { status: 500 }
    );
  }
}
