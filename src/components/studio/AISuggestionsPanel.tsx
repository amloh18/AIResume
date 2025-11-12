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
          className="mb-4 p-4 bg-[#2D332D] border border-[#80FF00]/20 rounded-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#80FF00]" />
              <h4 className="text-sm font-semibold text-white">AI Suggestions</h4>
            </div>
            <div className="flex items-center gap-3">
              {/* Toggle for Short/Detailed - only show if suggestions have Short/Detailed sizes */}
              {suggestions.some(s => s.size === 'Short' || s.size === 'Detailed') && (
                <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1">
                  <button
                    onClick={() => setShowDetailed(false)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      !showDetailed
                        ? 'bg-[#80FF00]/20 text-[#80FF00] font-semibold'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Short
                  </button>
                  <button
                    onClick={() => setShowDetailed(true)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      showDetailed
                        ? 'bg-[#80FF00]/20 text-[#80FF00] font-semibold'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Detailed
                  </button>
                </div>
              )}
              <button
                onClick={onClose}
                className="text-white/60 hover:text-white transition-colors"
                title="Close suggestions"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-[#80FF00] animate-spin" />
              <span className="ml-2 text-white/60 text-sm">Generating suggestions...</span>
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
                      className="text-left p-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#80FF00]/30 rounded-lg transition-all group relative"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#80FF00] group-hover:text-[#80FF00]">
                            {method}
                          </span>
                          <div className="relative group/info">
                            <Info className="w-3 h-3 text-white/40 hover:text-white/60 cursor-help" />
                            <div className="absolute left-0 top-full mt-2 hidden group-hover/info:block z-10 w-64 p-2 bg-[#1a1a1a] border border-white/20 rounded text-xs text-white/90 shadow-lg pointer-events-none">
                              {methodDescription}
                            </div>
                          </div>
                        </div>
                        {suggestion.size && (
                          <span className="text-xs text-white/40">
                            {suggestion.size}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-white/80 group-hover:text-white whitespace-pre-wrap">
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

