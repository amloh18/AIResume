'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Lock,
  Play,
  BookOpen,
  Clock,
  Flame,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { CHIP_INLINE, CHIP_TONES } from '@/components/ui/chip-styles';

interface Module {
  id: string;
  name: string;
  title?: string;
  description?: string;
  questionIds?: string[];
}

interface Question {
  id: string;
  _id?: string;
  question: string;
  category?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard' | string;
  status: 'pending' | 'drafted' | 'completed';
  content?: {
    question: string;
    difficulty: string;
    tags?: string[];
  };
  userAnswer?: {
    status: string;
  };
}

interface ModuleListProps {
  modules: Module[];
  questionsByModule: Record<string, Question[]>;
  jobId: string;
}

export default function ModuleList({ modules, questionsByModule, jobId }: ModuleListProps) {
  const router = useRouter();
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    [modules[0]?.id || '']: true,
  });

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const getQuestionText = (q: Question): string => {
    return q.question || q.content?.question || '';
  };

  const getDifficulty = (q: Question): string => {
    return q.difficulty || q.content?.difficulty || 'Medium';
  };

  const isCompleted = (q: Question): boolean => {
    return q.status === 'completed' || q.userAnswer?.status === 'analyzed';
  };

  return (
    <div className="space-y-4">
      {modules.map((module, index) => {
        const questions = questionsByModule[module.id] || [];
        const completedCount = questions.filter((q) => isCompleted(q)).length;
        const totalCount = questions.length;
        const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        const isExpanded = expandedModules[module.id];
        const isLocked = false;

        // Find the first uncompleted question
        const nextQuestionIndex = questions.findIndex((q) => !isCompleted(q));

        return (
          <div
            key={module.id}
            className={`bg-[var(--bg-secondary)] border ${
              isExpanded
                ? 'border-emerald-600/40 dark:border-lime-500/40 shadow-xs'
                : 'border-[var(--border-primary)] hover:border-emerald-600/30'
            } rounded-2xl overflow-hidden transition-all duration-200`}
          >
            <button
              onClick={() => !isLocked && toggleModule(module.id)}
              className="w-full flex items-start sm:items-center justify-between p-5 md:p-6 cursor-pointer text-left focus:outline-none"
              disabled={isLocked}
            >
              <div className="flex items-start sm:items-center gap-4 flex-1">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    isExpanded
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-lime-400 border border-emerald-500/20'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'
                  }`}
                >
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="flex-1 pr-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-1">
                    <h3
                      className={`text-sm md:text-base font-bold ${
                        isLocked ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {index + 1}. {module.name || module.title}
                    </h3>
                    {isExpanded && progress > 0 && progress < 100 && (
                      <span className={`${CHIP_INLINE} ${CHIP_TONES.emerald} font-bold uppercase tracking-wider w-max`}>
                        In Progress
                      </span>
                    )}
                    {isExpanded && progress === 100 && (
                      <span className={`${CHIP_INLINE} ${CHIP_TONES.emerald} font-bold uppercase tracking-wider w-max`}>
                        Completed
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {module.description || 'Assessing core skills in this competency.'}
                  </p>

                  {isExpanded && (
                    <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-xs font-semibold text-[var(--text-secondary)] mt-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 sm:w-28 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-600 dark:bg-lime-500 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-emerald-700 dark:text-lime-400 font-bold tabular-nums">
                          {progress}%
                        </span>
                      </div>
                      <span className="text-[var(--border-primary)]">|</span>
                      <div className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
                        <Clock className="w-3.5 h-3.5" />
                        ~{totalCount * 5} min
                      </div>
                      <span className="text-[var(--border-primary)]">|</span>
                      <div className="flex items-center gap-1.5 text-emerald-700 dark:text-lime-400 font-bold">
                        <Flame className="w-3.5 h-3.5" />
                        High Impact
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 pl-2 shrink-0">
                <span className="text-xs font-bold text-[var(--text-secondary)] whitespace-nowrap hidden sm:block tabular-nums">
                  {completedCount}/{totalCount} Done
                </span>
                {isLocked ? (
                  <Lock className="w-4 h-4 text-[var(--text-tertiary)]" />
                ) : isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-[var(--text-tertiary)]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />
                )}
              </div>
            </button>

            <AnimatePresence>
              {isExpanded && !isLocked && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="px-5 sm:px-6 pb-6 space-y-2.5">
                    {questions.map((q, qIndex) => {
                      const questionId = q.id || q._id;
                      const isDone = isCompleted(q);
                      const difficulty = getDifficulty(q);
                      const isNext = qIndex === nextQuestionIndex;

                      return (
                        <div
                          key={questionId}
                          onClick={() =>
                            router.push(`/dashboard/interview/practice/${questionId}?jobId=${jobId}`)
                          }
                          className={`w-full flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border transition-all cursor-pointer group ${
                            isNext
                              ? 'bg-[var(--bg-tertiary)] border-emerald-600/30 dark:border-lime-500/30 shadow-xs'
                              : 'bg-[var(--bg-tertiary)]/50 border-[var(--border-primary)] hover:border-emerald-600/30'
                          }`}
                        >
                          <div className="flex items-start sm:items-center gap-3.5 flex-1 pr-4 min-w-0">
                            <div
                              className={`mt-0.5 sm:mt-0 shrink-0 ${
                                isDone
                                  ? 'text-emerald-600 dark:text-lime-400'
                                  : isNext
                                  ? 'w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-lime-400 flex items-center justify-center'
                                  : 'text-[var(--text-tertiary)]'
                              }`}
                            >
                              {isDone ? (
                                <CheckCircle2 className="w-5 h-5" />
                              ) : isNext ? (
                                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                              ) : (
                                <Circle className="w-5 h-5" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-xs sm:text-sm leading-relaxed ${
                                  isDone
                                    ? 'text-[var(--text-tertiary)] line-through'
                                    : isNext
                                    ? 'text-[var(--text-primary)] font-bold'
                                    : 'text-[var(--text-secondary)] font-medium group-hover:text-[var(--text-primary)] transition-colors'
                                }`}
                              >
                                {getQuestionText(q)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 mt-3 md:mt-0 pl-10 md:pl-0 w-full md:w-auto justify-between md:justify-end shrink-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`${CHIP_INLINE} font-bold uppercase ${CHIP_TONES[difficulty.toLowerCase() === 'hard' ? 'rose' : difficulty.toLowerCase() === 'medium' ? 'amber' : 'emerald']}`}
                              >
                                {difficulty}
                              </span>
                              {(q.category || q.content?.tags?.[0]) && (
                                <span className={`${CHIP_INLINE} ${CHIP_TONES.slate} font-bold uppercase max-w-[120px] truncate`}>
                                  {q.category || q.content?.tags?.[0]}
                                </span>
                              )}
                            </div>

                            {isNext ? (
                              <button className="px-3.5 py-1.5 bg-[#013f2e] hover:bg-[#025c43] text-white font-bold text-xs rounded-xl shadow-xs transition-colors whitespace-nowrap">
                                Start Answering
                              </button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-semibold text-[var(--text-tertiary)] flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {difficulty.toLowerCase() === 'hard' ? '10' : '8'} min
                                </span>
                                <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-emerald-700 dark:group-hover:text-lime-400 transition-colors" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      <div className="text-center pt-4 pb-8">
        <p className="text-xs font-semibold text-[var(--text-secondary)] flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-700 dark:text-lime-400" />
          Modules are structured sequentially for your target role.
        </p>
      </div>
    </div>
  );
}