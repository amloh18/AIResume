'use client';

import React from 'react';
import { GrammarIssue } from '@/lib/grammar/engine';

interface GrammarCorrectionCardProps {
  issue: GrammarIssue;
  onApply: (issue: GrammarIssue) => void;
  onDismiss: () => void;
  position: { top: number; left: number };
}

export const GrammarCorrectionCard: React.FC<GrammarCorrectionCardProps> = ({
  issue,
  onApply,
  onDismiss,
  position
}) => {
  return (
    <div
      className="absolute z-50 bg-gray-900 border border-white/20 rounded-lg shadow-xl p-4 w-72"
      style={{ top: position.top, left: position.left }}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-white font-semibold text-small">Grammar Suggestion</h4>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-white transition-colors"
        >
          &times;
        </button>
      </div>
      <p className="text-gray-300 text-small mb-3">{issue.message}</p>
      
      {issue.suggestion && (
        <div className="flex flex-col gap-2">
          <div className="text-small text-gray-400">Suggestion:</div>
          <button
            onClick={() => onApply(issue)}
            className="w-full text-left px-3 py-2 bg-white/10 hover:bg-[#80FF00]/20 hover:text-[#80FF00] border border-transparent hover:border-[#80FF00]/40 rounded text-small text-white transition-all"
          >
            {issue.suggestion || '(Remove)'}
          </button>
        </div>
      )}
      
      {!issue.suggestion && (
        <button
          onClick={onDismiss}
          className="w-full mt-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded text-small text-white transition-all"
        >
          Got it
        </button>
      )}
    </div>
  );
};
