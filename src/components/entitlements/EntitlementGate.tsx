'use client';

import React from 'react';
import { useEntitlements, FeatureKey } from '@/lib/hooks/useEntitlements';
import { UpgradePrompt } from './UpgradePrompt';

interface EntitlementGateProps {
  feature: FeatureKey;
  /** Content to render when feature is available */
  children: React.ReactNode;
  /** Content to render when feature is locked (replaces default upgrade prompt) */
  fallback?: React.ReactNode;
  /** Hide content instead of showing fallback (use for hiding nav items) */
  hideWhenLocked?: boolean;
  /** Show usage meter alongside upgrade prompt */
  showUsage?: boolean;
  /** Custom class for the locked wrapper */
  lockedClassName?: string;
}

/**
 * Wrapper that conditionally renders children based on feature access.
 *
 * Usage:
 *   <EntitlementGate feature="track.interview_coach">
 *     <InterviewCoach />
 *   </EntitlementGate>
 *
 *   <EntitlementGate feature="apply.auto" hideWhenLocked>
 *     <AutoApplyButton />
 *   </EntitlementGate>
 *
 *   <EntitlementGate feature="build.ai_surgeon.full" showUsage>
 *     <AISurgeonPanel />
 *   </EntitlementGate>
 */
export function EntitlementGate({
  feature,
  children,
  fallback,
  hideWhenLocked = false,
  showUsage = false,
  lockedClassName = '',
}: EntitlementGateProps) {
  const { can, loading } = useEntitlements();

  if (loading) {
    return null;
  }

  if (can(feature)) {
    return <>{children}</>;
  }

  if (hideWhenLocked) {
    return null;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className={lockedClassName}>
      <UpgradePrompt feature={feature} showUsage={showUsage} />
    </div>
  );
}
