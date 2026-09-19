'use client';

import React from 'react';
import { useEntitlements, FeatureKey } from '@/lib/hooks/useEntitlements';
import { getFeatureBadge } from '@/lib/entitlements/catalog';

interface FeatureBadgeProps {
  feature: FeatureKey;
  className?: string;
  /** Override badge text */
  badge?: string;
}

const BADGE_STYLES: Record<string, string> = {
  NEW: 'bg-emerald-500 text-white',
  AI: 'bg-violet-500 text-white',
  AUTO: 'bg-amber-500 text-white',
  PRO: 'bg-blue-500 text-white',
  FOCUSED: 'bg-purple-500 text-white',
};

/**
 * Small badge that shows next to a feature name in navigation, menus, etc.
 *
 * Usage:
 *   <FeatureBadge feature="tailor.linkedin_tone" />
 *   <FeatureBadge feature="apply.auto" badge="AUTO" />
 */
export function FeatureBadge({ feature, className = '', badge: override }: FeatureBadgeProps) {
  const { can } = useEntitlements();
  const text = override ?? getFeatureBadge(feature);

  // Don't show badge if user has the feature or no badge defined
  if (!text || can(feature)) return null;

  const style = BADGE_STYLES[text] ?? 'bg-gray-500 text-white';

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${style} ${className}`}
    >
      {text}
    </span>
  );
}
