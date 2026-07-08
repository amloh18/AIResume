'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, LayoutTemplate, Palette, Sparkles, Target, ChevronRight, Circle } from 'lucide-react';

export interface ChecklistItemProgress {
  completed: boolean;
  completedAt?: string;
}

export interface EditorChecklistProgress {
  layout?: ChecklistItemProgress;
  design?: ChecklistItemProgress;
  aiChat?: ChecklistItemProgress;
  review?: ChecklistItemProgress;
}

export interface EditorChecklistItem {
  id: keyof EditorChecklistProgress;
  title: string;
  description: string;
  icon: React.ReactNode;
  progress?: ChecklistItemProgress;
}

interface EditorChecklistProps {
  progress: EditorChecklistProgress;
  onOpenLayout?: () => void;
  onOpenDesign?: () => void;
  onOpenAiChat?: () => void;
  onOpenReview?: () => void;
  onItemComplete?: (id: keyof EditorChecklistProgress) => void;
  className?: string;
}

const DEFAULT_ITEMS: EditorChecklistItem[] = [
  {
    id: 'layout',
    title: 'Structure Your Layout',
    description: 'Choose a structural template that best organizes your career history.',
    icon: <LayoutTemplate className="h-4 w-4" />,
  },
  {
    id: 'design',
    title: 'Refine Your Aesthetics',
    description: 'Adjust typography, spacing, and accent colors to craft a clean, professional visual identity.',
    icon: <Palette className="h-4 w-4" />,
  },
  {
    id: 'aiChat',
    title: 'Enhance Content with AI',
    description: 'Open the AI chat interface to refine your bullet points, parse phrasing, or generate targeted summaries.',
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    id: 'review',
    title: 'Run Analysis & Review',
    description: 'Transition to the Review phase to scan your document\'s overall health and finalize your Master CV.',
    icon: <Target className="h-4 w-4" />,
  },
];

export default function EditorChecklist({
  progress,
  onOpenLayout,
  onOpenDesign,
  onOpenAiChat,
  onOpenReview,
  onItemComplete,
  className = '',
}: EditorChecklistProps) {
  const [expandedId, setExpandedId] = useState<keyof EditorChecklistProgress | null>(null);
  const [justCompleted, setJustCompleted] = useState<keyof EditorChecklistProgress | null>(null);

  const items: EditorChecklistItem[] = DEFAULT_ITEMS.map(item => ({
    ...item,
    progress: progress[item.id],
  }));

  const completedCount = items.filter(item => item.progress?.completed).length;
  const isComplete = completedCount === items.length;

  const handleItemClick = useCallback((item: EditorChecklistItem) => {
    if (item.progress?.completed) return;

    setExpandedId(prev => (prev === item.id ? null : item.id));

    switch (item.id) {
      case 'layout':
        onOpenLayout?.();
        break;
      case 'design':
        onOpenDesign?.();
        break;
      case 'aiChat':
        onOpenAiChat?.();
        break;
      case 'review':
        onOpenReview?.();
        break;
      default:
        break;
    }
  }, [onOpenLayout, onOpenDesign, onOpenAiChat, onOpenReview]);

  const handleMarkComplete = useCallback((id: keyof EditorChecklistProgress) => {
    if (progress[id]?.completed) return;
    setJustCompleted(id);
    onItemComplete?.(id);
    setTimeout(() => setJustCompleted(null), 1200);
  }, [onItemComplete, progress]);

  return (
    <div className={`shrink-0 bg-white dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm select-none overflow-y-auto scrollbar-hide ${className}`}>
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
          <Sparkles className="h-4 w-4 stroke-[2.5]" />
          <h3 className="font-extrabold text-sm tracking-tight text-gray-900 dark:text-white">
            Editor Checklist
          </h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Explore the core tools to unlock your document&rsquo;s full potential.
        </p>

        {/* Progress */}
        <div className="space-y-1.5 pt-2">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-gray-400">Progress</span>
            <span className="text-teal-700 dark:text-teal-400">
              {completedCount} of {items.length} completed
            </span>
          </div>
          <div className="w-full bg-gray-150 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
            <motion.div
              className="bg-teal-500 h-full"
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / items.length) * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Checklist Items */}
        <div className="space-y-2 pt-2">
          <AnimatePresence>
            {items.map(item => {
              const isExpanded = expandedId === item.id;
              const isDone = item.progress?.completed || false;
              const isJustDone = justCompleted === item.id;

              return (
                <motion.button
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => handleItemClick(item)}
                  className={`
                    w-full text-left p-3 rounded-lg border transition-all flex items-start gap-3
                    ${isDone ? 'bg-teal-50/40 border-teal-100 dark:bg-teal-950/20 dark:border-teal-900/30' : 'bg-slate-50/50 border-gray-150 dark:bg-gray-900/30 dark:border-gray-800/40 hover:border-teal-200 dark:hover:border-teal-800'}
                  `}
                >
                  <motion.div
                    className={`mt-0.5 rounded-full p-0.5 shrink-0 ${
                      isDone || isJustDone
                        ? 'bg-teal-500 text-white'
                        : 'bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600'
                    }`}
                    animate={isJustDone ? { scale: [1, 1.25, 1] } : {}}
                    transition={{ duration: 0.4 }}
                  >
                    {isDone || isJustDone ? (
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 stroke-[2.5]" />
                    )}
                  </motion.div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-teal-600 dark:text-teal-400">{item.icon}</span>
                      <h4 className={`text-xs font-bold truncate ${
                        isDone
                          ? 'text-gray-900 dark:text-white line-through decoration-teal-500/40'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {item.title}
                      </h4>
                      {!isDone && (
                        <ChevronRight className={`h-3 w-3 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                      )}
                    </div>

                    <AnimatePresence>
                      {isExpanded && !isDone && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-[10px] text-gray-500 leading-relaxed dark:text-gray-500"
                        >
                          {item.description}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Overall status */}
        <div className="pt-1">
          {isComplete ? (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[10px] font-bold text-teal-700 dark:text-teal-400 text-center uppercase tracking-wider"
            >
              All tools explored — you&rsquo;re ready to finalize.
            </motion.p>
          ) : (
            <p className="text-[9px] text-center text-gray-400">
              Click an item to open the tool and begin.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
