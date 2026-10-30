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
      className="absolute z-50 bg-white/95 dark:bg-[#141414]/95 border border-gray-200/80 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/15 dark:shadow-black/50 backdrop-blur-md p-3.5 w-72 text-gray-900 dark:text-gray-100"
      style={{ top: position.top, left: position.left }}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-xs text-gray-900 dark:text-gray-100">Grammar Suggestion</h4>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 -mr-1 -mt-1 cursor-pointer"
        >
          &times;
        </button>
      </div>
      <p className="text-gray-600 dark:text-gray-400 text-[11px] mb-3 leading-relaxed">{issue.message}</p>
      
      {issue.suggestion && (
        <div className="flex flex-col gap-1.5">
          <div className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Suggestion:</div>
          <button
            onClick={() => onApply(issue)}
            className="w-full text-left px-3 py-2 bg-gray-50/80 dark:bg-white/5 hover:bg-emerald-500/10 border border-gray-200/80 dark:border-white/10 hover:border-emerald-500/40 rounded-xl text-xs font-semibold text-gray-900 dark:text-gray-100 transition-all cursor-pointer"
          >
            {issue.suggestion || '(Remove)'}
          </button>
        </div>
      )}
      
      {!issue.suggestion && (
        <button
          onClick={onDismiss}
          className="w-full mt-2 px-3 py-1.5 bg-[#013f2e] hover:bg-[#02523c] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl text-[11px] font-semibold transition-all cursor-pointer"
        >
          Got it
        </button>
      )}
    </div>
  );
};
