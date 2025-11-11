'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Loader2 } from 'lucide-react';

interface AISuggestion {
  method: string;
  content: string;
}

interface AISuggestionsPanelProps {
  isVisible: boolean;
  suggestions: AISuggestion[];
  isLoading: boolean;
  onSelect: (content: string) => void;
  onClose: () => void;
}

export const AISuggestionsPanel: React.FC<AISuggestionsPanelProps> = ({
  isVisible,
  suggestions,
  isLoading,
  onSelect,
  onClose
}) => {
  if (!isVisible) return null;

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
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors"
              title="Close suggestions"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-[#80FF00] animate-spin" />
              <span className="ml-2 text-white/60 text-sm">Generating suggestions...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {suggestions.map((suggestion, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => onSelect(suggestion.content)}
                  className="text-left p-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#80FF00]/30 rounded-lg transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-semibold text-[#80FF00] group-hover:text-[#80FF00]">
                      {suggestion.method}
                    </span>
                  </div>
                  <div className="text-xs text-white/80 line-clamp-3 group-hover:text-white">
                    {suggestion.content.split('\n').slice(0, 3).join(' ')}
                    {suggestion.content.split('\n').length > 3 && '...'}
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

