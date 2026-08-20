'use client';

import { cn } from '@/lib/utils';

interface MatchScoreBadgeProps {
  score: number;
  size?: 'sm' | 'lg';
  className?: string;
}

export function scoreTone(score: number): string {
  if (score >= 80) return 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300 ring-lime-500/30';
  if (score >= 60) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 ring-yellow-500/30';
  return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 ring-gray-500/20';
}

export function MatchScoreBadge({ score, size = 'sm', className }: MatchScoreBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-bold ring-1 shrink-0',
        scoreTone(score),
        size === 'sm' ? 'min-w-[52px] px-2 py-1.5 text-small' : 'min-w-[72px] px-3 py-2 text-h3',
        className
      )}
      title={`${score}% match`}
    >
      {score}%
    </div>
  );
}