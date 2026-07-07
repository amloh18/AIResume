'use client';

import React from 'react';

interface MatchScoreGapWidgetProps {
  status?: string;
}

const MatchScoreGapWidget: React.FC<MatchScoreGapWidgetProps> = ({ status }) => {
  return (
    <div className="p-4 rounded-xl border border-[color:var(--border-primary)] bg-[var(--bg-secondary)]">
      <h4 className="text-small font-bold text-[color:var(--text-primary)] mb-2">Match Score Gap</h4>
      <p className="text-small text-[color:var(--text-secondary)]">
        Missing keywords and skills will be highlighted here.
      </p>
    </div>
  );
};

export default MatchScoreGapWidget;
