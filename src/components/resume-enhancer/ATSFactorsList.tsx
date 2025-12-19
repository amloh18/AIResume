import React from 'react';
import type { ATSFactorScore } from '@/lib/utils/resumeEnhancerFactors';

function colorForPercent(pct: number): string {
  if (pct >= 80) return 'bg-[#80FF00]';
  if (pct >= 65) return 'bg-orange-400';
  return 'bg-rose-500';
}

export default function ATSFactorsList({ factors }: { factors: ATSFactorScore[] }) {
  return (
    <div className="space-y-2">
      {factors.map((f) => (
        <div key={f.key} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-3 h-3 rounded ${colorForPercent(f.percent)} flex-shrink-0`} />
            <div className="text-xs text-[color:var(--text-secondary)] truncate">{f.label}</div>
          </div>
          <div className="text-xs text-[color:var(--text-secondary)] tabular-nums flex-shrink-0">
            {f.percent}%
          </div>
        </div>
      ))}
    </div>
  );
}


