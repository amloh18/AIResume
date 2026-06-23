'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ArrowRight, TrendingUp } from 'lucide-react';

interface ATSDiffPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  title?: string;
  currentScore: number;
  targetScore: number;
  oldText: string;
  newText: string;
}

export default function ATSDiffPreviewModal({
  isOpen,
  onClose,
  onApply,
  title = 'Summary Improvement',
  currentScore,
  targetScore,
  oldText,
  newText,
}: ATSDiffPreviewModalProps) {
  if (!isOpen) return null;

  const diff = targetScore - currentScore;

  // Simple word-level highlighting for diffs
  const renderWordDiff = () => {
    const cleanOld = oldText.replace(/<[^>]+>/g, '').split(/\s+/);
    const cleanNew = newText.replace(/<[^>]+>/g, '').split(/\s+/);
    
    // Quick simple diff visualization: highlight words in newText that aren't in oldText in green
    const oldWordsSet = new Set(cleanOld.map(w => w.toLowerCase().replace(/[^a-z0-9]/g, '')));
    const newWordsSet = new Set(cleanNew.map(w => w.toLowerCase().replace(/[^a-z0-9]/g, '')));

    return (
      <div className="space-y-4">
        {/* Original Text (Deletions Highlighted) */}
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs font-mono text-gray-800 dark:text-gray-200">
          <div className="flex justify-between text-[10px] font-bold text-red-500 uppercase tracking-widest mb-2">
            <span>Current Content</span>
            <span>- Deletions</span>
          </div>
          <p className="leading-relaxed">
            {cleanOld.map((word, idx) => {
              const normWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');
              const isDeleted = normWord && !newWordsSet.has(normWord);
              return (
                <span 
                  key={idx} 
                  className={isDeleted ? 'bg-red-500/20 text-red-700 dark:text-red-400 line-through px-0.5 rounded' : ''}
                >
                  {word}{' '}
                </span>
              );
            })}
          </p>
        </div>

        {/* Proposed Text (Additions Highlighted) */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs font-mono text-gray-800 dark:text-gray-200">
          <div className="flex justify-between text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2">
            <span>Proposed Content</span>
            <span>+ Additions</span>
          </div>
          <p className="leading-relaxed">
            {cleanNew.map((word, idx) => {
              const normWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');
              const isAdded = normWord && !oldWordsSet.has(normWord);
              return (
                <span 
                  key={idx} 
                  className={isAdded ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold px-0.5 rounded' : ''}
                >
                  {word}{' '}
                </span>
              );
            })}
          </p>
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col font-sans"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">ATS Diff Preview</h3>
              <h2 className="text-lg font-extrabold text-gray-900 dark:text-white mt-0.5">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Score Impact Panel */}
          <div className="mx-6 mt-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">ATS Match Optimization</h4>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400/80">Applying this suggestion improves keyword matches and phrasing.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/40 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-white/25">
              <span className="text-sm font-bold text-gray-400">{currentScore}</span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{targetScore}</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">+{diff} pts</span>
            </div>
          </div>

          {/* Body: Diff Content */}
          <div className="p-6 overflow-y-auto max-h-[50vh]">
            {renderWordDiff()}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/[0.01] flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white uppercase tracking-wider rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
            >
              Discard Changes
            </button>
            <button
              onClick={() => {
                onApply();
                onClose();
              }}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 transition-all hover:scale-105 active:scale-95"
            >
              <Check className="w-4 h-4" /> Apply Changes
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
