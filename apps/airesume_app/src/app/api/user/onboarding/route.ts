import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { userRepository } from '@/lib/repositories/user-repository';
import { getConnection } from '@/lib/database/connection-manager';
import CV from '@/models/CV';

export async function GET(request: NextRequest) {
  try {
    await getConnection();
    const authResult = await getAuthenticatedUser(request);
    
    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.userId;

    const user = await userRepository.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Additional status checks
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const isNewUser = user.createdAt ? user.createdAt > fiveMinutesAgo : false;
    
    // Find master CV / Profile for this user
    const masterCV = await CV.findOne({ 
      userId: user._id, 
      $or: [{ 'metadata.isMaster': true }, { isMaster: true }, { cvType: 'master' }]
    }).sort({ updatedAt: -1 });
    
    const hasMasterCV = !!masterCV;
    const hasSeenWelcome = (user.settings as any)?.hasSeenWelcome || false;

    // Extract personalized name and role from Master CV / Profile or user record
    const profileName = masterCV?.cvData?.basics?.name || 
                        masterCV?.cvData?.personalInfo?.fullName || 
                        user.onboarding?.candidate_name ||
                        (user.firstName ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}` : '') ||
                        '';

    const profileRole = masterCV?.cvData?.basics?.label || 
                        masterCV?.cvData?.personalInfo?.jobTitle || 
                        masterCV?.cvData?.work?.[0]?.position || 
                        user.onboarding?.candidate_role ||
                        user.jobTitle || 
                        '';

    return NextResponse.json({
      success: true,
      data: {
        onboarding: user.onboarding || {},
        userLifecycleState: user.userLifecycleState,
        isAnonymous: !!user.isAnonymous,
        isNewUser,
        hasMasterCV,
        hasSeenWelcome,
        masterCVId: masterCV?._id?.toString() || masterCV?.id || null,
        profileName,
        profileRole,
        masterCVData: masterCV?.cvData || null,
        subscription: user.subscription
      }
    });
  } catch (error: any) {
    console.error('Onboarding fetch error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await getConnection();
    const authResult = await getAuthenticatedUser(request);
    
    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.userId;
    const body = await request.json();

    const updateFields: any = {};
    
    // Support nested onboarding body or flat body
    const onboardingData = body.onboarding || body;

    // Core journey stages
    if (onboardingData.current_stage) updateFields['onboarding.current_stage'] = onboardingData.current_stage;
    if (onboardingData.completed_stages) updateFields['onboarding.completed_stages'] = onboardingData.completed_stages;
    if (onboardingData.primary_goal) updateFields['onboarding.primary_goal'] = onboardingData.primary_goal;
    if (onboardingData.confidence_score !== undefined) updateFields['onboarding.confidence_score'] = onboardingData.confidence_score;
    if (onboardingData.initial_score !== undefined) updateFields['onboarding.initial_score'] = onboardingData.initial_score;
    if (onboardingData.transformed_score !== undefined) updateFields['onboarding.transformed_score'] = onboardingData.transformed_score;
    if (onboardingData.recommended_plan) updateFields['onboarding.recommended_plan'] = onboardingData.recommended_plan;
    
    if (onboardingData.primary_cv_id) {
      if (/^[0-9a-fA-F]{24}$/.test(onboardingData.primary_cv_id)) {
        updateFields['onboarding.primary_cv_id'] = onboardingData.primary_cv_id;
      } else {
        console.log(`[Onboarding API] Skipping non-ObjectId primary_cv_id format: ${onboardingData.primary_cv_id}`);
      }
    }

    // CV onboarding checklist dismissal ("never show again" once the master CV
    // reaches a good score, or when the user manually dismisses it)
    if (onboardingData.cv_checklist_dismissed !== undefined) {
      updateFields['onboarding.cv_checklist_dismissed'] = onboardingData.cv_checklist_dismissed;
      if (onboardingData.cv_checklist_dismissed === true) {
        updateFields['onboarding.cv_checklist_dismiss_reason'] = onboardingData.cv_checklist_dismiss_reason || 'manual';
        updateFields['onboarding.cv_checklist_dismissed_at'] = new Date().toISOString();
      }
    }

    if (onboardingData.activation_status) updateFields['onboarding.activation_status'] = onboardingData.activation_status;
    if (onboardingData.activation_route) {
      if (!onboardingData.activation_route.startsWith('/editor')) {
        updateFields['onboarding.activation_route'] = onboardingData.activation_route;
      }
    }
    if (onboardingData.dashboard_layout_type) updateFields['onboarding.dashboard_layout_type'] = onboardingData.dashboard_layout_type;

    // Career Preferences & Profiling
    if (onboardingData.career_pathway) updateFields['onboarding.career_pathway'] = onboardingData.career_pathway;
    if (onboardingData.target_roles !== undefined) updateFields['onboarding.target_roles'] = onboardingData.target_roles;
    if (onboardingData.locations !== undefined) updateFields['onboarding.locations'] = onboardingData.locations;
    if (onboardingData.experience_level) {
      updateFields['onboarding.experience_level'] = onboardingData.experience_level;
      updateFields['experience'] = onboardingData.experience_level;
    }
    if (onboardingData.salary_range !== undefined) updateFields['onboarding.salary_range'] = onboardingData.salary_range;
    if (onboardingData.visa_required !== undefined) updateFields['onboarding.visa_required'] = onboardingData.visa_required;
    if (onboardingData.search_status) updateFields['onboarding.search_status'] = onboardingData.search_status;
    if (onboardingData.monthly_volume) updateFields['onboarding.monthly_volume'] = onboardingData.monthly_volume;
    if (onboardingData.tracker_interest) updateFields['onboarding.tracker_interest'] = onboardingData.tracker_interest;
    if (onboardingData.autoapply_interest) updateFields['onboarding.autoapply_interest'] = onboardingData.autoapply_interest;
    
    // Canonical job-search preferences
    if (onboardingData.workplace_types !== undefined) updateFields['onboarding.workplace_types'] = onboardingData.workplace_types;
    if (onboardingData.salary_min !== undefined) updateFields['onboarding.salary_min'] = onboardingData.salary_min;
    if (onboardingData.salary_currency) updateFields['onboarding.salary_currency'] = onboardingData.salary_currency;
    if (onboardingData.experience_years !== undefined) updateFields['onboarding.experience_years'] = onboardingData.experience_years;
    if (onboardingData.max_notice_period_days !== undefined) updateFields['onboarding.max_notice_period_days'] = onboardingData.max_notice_period_days;
    if (onboardingData.search_intensity) updateFields['onboarding.search_intensity'] = onboardingData.search_intensity;
    if (onboardingData.expected_applications_per_month !== undefined) updateFields['onboarding.expected_applications_per_month'] = onboardingData.expected_applications_per_month;
    if (onboardingData.application_mode) updateFields['onboarding.application_mode'] = onboardingData.application_mode;
    
    if (onboardingData.candidate_name) {
      updateFields['onboarding.candidate_name'] = onboardingData.candidate_name;
      const nameParts = onboardingData.candidate_name.trim().split(' ');
      if (nameParts.length > 0) {
        updateFields['firstName'] = nameParts[0];
        if (nameParts.length > 1) {
          updateFields['lastName'] = nameParts.slice(1).join(' ');
        }
      }
    }

    if (onboardingData.candidate_role) {
      updateFields['onboarding.candidate_role'] = onboardingData.candidate_role;
      updateFields['jobTitle'] = onboardingData.candidate_role;
    }

    if (body.userLifecycleState) updateFields['userLifecycleState'] = body.userLifecycleState;
    if (body.hasSeenWelcome !== undefined) updateFields['settings.hasSeenWelcome'] = body.hasSeenWelcome;

    const updatedUser = await userRepository.updateById(userId, { $set: updateFields } as any);

    return NextResponse.json({
      success: true,
      data: {
        onboarding: updatedUser?.onboarding,
        userLifecycleState: updatedUser?.userLifecycleState
      }
    });
  } catch (error: any) {
    console.error('Onboarding update error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
