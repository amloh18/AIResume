'use client';

import React from 'react';
import {
  Clock,
  ExternalLink,
  Eye,
  XCircle,
  Sparkles,
  CheckCircle,
  Key,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  deriveApplicationStatusBadge,
  type BadgeActionId,
  type StatusIconKey,
} from '@/lib/utils/application-status-badge';
import { chipTone } from '@/components/ui/chip-styles';

/**
 * The application status chip + the ONE control the row needs right now.
 *
 * Rendered by the applications list AND the kanban card so both surfaces show
 * the identical label/tone/action (derivation lives in
 * application-status-badge.ts). The action button calls back up to
 * ApplicationsPanel.handleAutomationAction → POST /api/applications/[id]/automation.
 *
 * `variant`:
 *   stacked (list cell, narrow) — chip, ETA and button on their own lines
 *   inline   (kanban card strip) — one wrapped row
 */

const STATUS_ICONS: Record<StatusIconKey, LucideIcon | null> = {
  clock: Clock,
  external: ExternalLink,
  eye: Eye,
  x: XCircle,
  sparkles: Sparkles,
  check: CheckCircle,
  key: Key,
  none: null,
};

const ACTION_STYLES: Record<BadgeActionId, string> = {
  approve: 'bg-violet-600 hover:bg-violet-700 text-white border border-transparent',
  retry: 'bg-amber-500 hover:bg-amber-600 text-white border border-transparent',
  enter_code: 'bg-emerald-600 hover:bg-emerald-700 text-white border border-transparent animate-pulse',
  submit_code: 'bg-emerald-600 hover:bg-emerald-700 text-white border border-transparent',
  dismiss:
    'border border-gray-300 dark:border-white/15 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10',
};

interface JobStatusActionChipProps {
  job: {
    status?: string;
    internalStatus?: string;
    reviewReason?: string;
    queueEtaSeconds?: number;
    queuePosition?: number;
  };
  onAutomationAction?: (job: any, actionId: BadgeActionId) => void;
  variant?: 'stacked' | 'inline';
}

export default function JobStatusActionChip({
  job,
  onAutomationAction,
  variant = 'stacked',
}: JobStatusActionChipProps) {
  const badge = deriveApplicationStatusBadge(job);
  const Icon = STATUS_ICONS[badge.icon];

  const chip = (
    <span className={`${chipTone(badge.tone, 'md')} font-semibold`} title={badge.title}>
      {Icon && <Icon className="w-3 h-3" />}
      {badge.label}
    </span>
  );

  const eta = badge.eta ? (
    <span
      className={`text-[10px] text-gray-500 dark:text-gray-400 whitespace-nowrap ${variant === 'inline' ? '' : 'pl-0.5'}`}
      title={badge.title}
    >
      {badge.eta} left
    </span>
  ) : null;

  const action =
    badge.action && onAutomationAction ? (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAutomationAction(job, badge.action!.id);
        }}
        title={badge.title || badge.action.label}
        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full transition-colors whitespace-nowrap ${ACTION_STYLES[badge.action.id]}`}
      >
        {badge.action.label}
      </button>
    ) : null;

  if (!eta && !action) return chip;

  if (variant === 'inline') {
    return (
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        {chip}
        {eta}
        {action}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      {chip}
      {eta}
      {action}
    </div>
  );
}
