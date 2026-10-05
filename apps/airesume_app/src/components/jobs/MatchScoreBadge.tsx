'use client';

import { cn } from '@/lib/utils';
import { metricTone, type ChipTone } from '@/components/ui/chip-styles';

interface MatchScoreBadgeProps {
  score: number;
  size?: 'sm' | 'lg';
  className?: string;
}

/**
 * Match score.
 *
 * This is a METRIC, not a chip: no background, no border, no pill — just the
 * value in its tone colour. Boxing a number made a row of metrics read as a row
 * of buttons. Only the hue encodes the band, via the shared `METRIC_TONES`.
 */
export function scoreTone(score: number): ChipTone {
  if (score >= 80) return 'green';
  if (score >= 60) return 'amber';
  return 'slate';
}

export function MatchScoreBadge({ score, size = 'sm', className }: MatchScoreBadgeProps) {
  return (
    <div
      className={cn(
        metricTone(scoreTone(score)),
        size === 'lg' && 'text-sm',
        className
      )}
      title={`${score}% match`}
    >
      {score}%
    </div>
  );
}
