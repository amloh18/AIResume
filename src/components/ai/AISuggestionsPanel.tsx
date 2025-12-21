'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Loader2, Info } from 'lucide-react';

interface AISuggestion {
  method: string;
  size?: string;
  content: string;
}

interface AISuggestionsPanelProps {
  isVisible: boolean;
  suggestions: AISuggestion[];
  isLoading: boolean;
  onSelect: (content: string) => void;
  onClose: () => void;
}

const METHOD_DESCRIPTIONS: Record<string, string> = {
  'STAR': 'STAR Method: Situation, Task, Action, Result - Structured approach highlighting context, responsibility, actions taken, and measurable outcomes.',
  'CAR': 'CAR Method: Challenge, Action, Result - Focuses on problems faced, solutions implemented, and results achieved.',
  'Quantified': 'Quantified Achievements: Emphasizes metrics, numbers, percentages, and measurable impact to showcase concrete results.',
  'Narrative': 'Narrative Format: Tells a compelling story of impact and value delivered, focusing on transformation and outcomes.'
};

export const AISuggestionsPanel: React.FC<AISuggestionsPanelProps> = ({
  isVisible,
  suggestions,
  isLoading,
  onSelect,
  onClose
}) => {
  const [showDetailed, setShowDetailed] = useState(true);

  if (!isVisible) return null;

  // Filter suggestions based on toggle
  const filteredSuggestions = suggestions.filter(s => {
    if (!s.size) return true; // Backward compatibility
    // For 'Full' size (cover letter body), always show regardless of toggle
    if (s.size === 'Full') return true;
    return showDetailed ? s.size === 'Detailed' : s.size === 'Short';
  });

  // Group by method for better organization
  const groupedSuggestions = filteredSuggestions.reduce((acc, suggestion) => {
    const method = suggestion.method || 'Other';
    if (!acc[method]) {
      acc[method] = [];
    }
    acc[method].push(suggestion);
    return acc;
  }, {} as Record<string, AISuggestion[]>);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="mb-4 p-4 bg-[var(--bg-tertiary)] border border-[rgb(129,255,0)]/20 rounded-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[rgb(129,255,0)]" />
              <h4 className="text-sm font-semibold text-[color:var(--text-primary)]">AI Suggestions</h4>
            </div>
            <div className="flex items-center gap-3">
              {/* Toggle for Short/Detailed - only show if suggestions have Short/Detailed sizes */}
              {suggestions.some(s => s.size === 'Short' || s.size === 'Detailed') && (
                <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 rounded-lg p-1">
                  <button
                    onClick={() => setShowDetailed(false)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      !showDetailed
                        ? 'bg-[rgb(129,255,0)]/15 text-[rgb(129,255,0)] font-semibold'
                        : 'text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]'
                    }`}
                  >
                    Short
                  </button>
                  <button
                    onClick={() => setShowDetailed(true)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      showDetailed
                        ? 'bg-[rgb(129,255,0)]/15 text-[rgb(129,255,0)] font-semibold'
                        : 'text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]'
                    }`}
                  >
                    Detailed
                  </button>
                </div>
              )}
              <button
                onClick={onClose}
                className="text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] transition-colors"
                title="Close suggestions"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-[rgb(129,255,0)] animate-spin" />
              <span className="ml-2 text-[color:var(--text-tertiary)] text-sm">Generating suggestions...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {Object.entries(groupedSuggestions).map(([method, methodSuggestions]) =>
                methodSuggestions.map((suggestion, index) => {
                  const methodDescription = METHOD_DESCRIPTIONS[method] || `${method} method for CV content`;
                  return (
                    <motion.button
                      key={`${method}-${index}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => onSelect(suggestion.content)}
                      className="text-left p-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-[var(--border-primary)] hover:border-[rgb(129,255,0)]/30 rounded-lg transition-all group relative"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[rgb(129,255,0)]">
                            {method}
                          </span>
                          <div className="relative group/info">
                            <Info className="w-3 h-3 text-[color:var(--text-tertiary)] hover:text-[color:var(--text-secondary)] cursor-help" />
                            <div className="absolute left-0 top-full mt-2 hidden group-hover/info:block z-10 w-64 p-2 bg-[var(--modal-bg)] border border-[var(--border-primary)] rounded text-xs text-[color:var(--text-primary)] shadow-lg pointer-events-none">
                              {methodDescription}
                            </div>
                          </div>
                        </div>
                        {suggestion.size && (
                          <span className="text-xs text-[color:var(--text-tertiary)]">
                            {suggestion.size}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[color:var(--text-secondary)] whitespace-pre-wrap">
                        {suggestion.content}
                      </div>
                    </motion.button>
                  );
                })
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

