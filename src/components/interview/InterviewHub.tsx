'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Trophy,
  Sparkles,
  Target,
  Flame,
  Play,
  Clock,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronRight,
  BookOpen,
  Loader2,
} from 'lucide-react';
import ReadinessChart from './ReadinessChart';
import ModuleList from './ModuleList';

interface InterviewHubProps {
  session: any;
  questionsByModule: any;
  /**
   * True while the AI is still generating the plan. The hub paints its whole
   * layout up front and fills only the dynamic regions with skeletons, so the
   * page renders the UI first and streams the content in rather than blocking
   * behind a full-screen loader for the length of the generation.
   */
  isPreparing?: boolean;
}

export default function InterviewHub({
  session,
  questionsByModule,
  isPreparing = false,
}: InterviewHubProps) {
  const router = useRouter();

  const targetRole = session?.targetRole || 'Interview Preparation';
  const jobId = session?.jobId?._id || session?.jobId || session?._id || '';
  const company = session?.jobId?.company || '';
  const readinessScore = session?.readinessScore || 0;
  const currentStreak = session?.currentStreak || 0;
  const modules = session?.modules || [];

  // Find the next best question (first pending/drafted question)
  let nextQuestion: any = null;
  let nextModuleId: string | null = null;
  if (modules && questionsByModule) {
    for (const mod of modules) {
      const qs = questionsByModule[mod.id] || [];
      const pending = qs.find(
        (q: any) => q.status !== 'completed' && q.userAnswer?.status !== 'analyzed'
      );
      if (pending) {
        nextQuestion = pending;
        nextModuleId = mod.id;
        break;
      }
    }
  }

  return (
    <div className="absolute inset-0 dashboard-workspace text-[#0f172a] dark:text-gray-150 font-sans overflow-hidden flex flex-col pr-3 pb-3 pl-3 lg:pl-0">
      <div className="dashboard-content-card rounded-2xl border border-[var(--border-primary)] shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden px-5 md:px-8">
        <div className="max-w-[1400px] w-full mx-auto flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hide py-5 md:py-8 space-y-6">

          {/* 1. Header (Headings & Actions Inline) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
            <div>
              <div className="text-[11px] font-medium text-[var(--text-secondary)] mb-1 flex items-center gap-1.5">
                <span
                  className="cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                  onClick={() => router.push('/dashboard')}
                >
                  Dashboard
                </span>
                <span>›</span>
                <span
                  className="cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                  onClick={() => router.push('/dashboard/interview')}
                >
                  Interview Prep
                </span>
                <span>›</span>
                <span className="text-[var(--text-primary)] font-semibold truncate max-w-[240px]">
                  {targetRole}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                  {targetRole}
                </h1>
                {company && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-primary)]">
                    <Building2 className="w-3.5 h-3.5" />
                    {company}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 px-2.5 py-0.5 text-xs font-semibold border border-emerald-200 dark:border-emerald-800/40">
                  <Sparkles className="w-3 h-3 text-emerald-600 dark:text-lime-400" />
                  {isPreparing ? 'Preparing your plan…' : `${modules.length} Modules Active`}
                </span>
              </div>
              <p className="text-xs md:text-sm text-[var(--text-secondary)] mt-1">
                Step-by-step role competency learning path and mock question scenarios.
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
              <button
                onClick={() => router.push('/dashboard/interview')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all shadow-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Opportunities
              </button>
              {nextQuestion && (
                <button
                  onClick={() =>
                    router.push(
                      `/dashboard/interview/practice/${nextQuestion.id || nextQuestion._id}?jobId=${jobId}`
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#013f2e] hover:bg-[#025c43] text-white font-bold text-xs shadow-sm transition-all active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Resume Session
                </button>
              )}
            </div>
          </div>

          {/* Main 2-Column Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Rail: Stats & Coaching Widgets (4 Cols) */}
            <div className="lg:col-span-4 space-y-5">
              
              {/* Readiness Card */}
              <div className="bg-[var(--bg-secondary)] rounded-2xl p-5 sm:p-6 border border-[var(--border-primary)] shadow-xs flex flex-col items-center text-center">
                <div className="flex items-center justify-between w-full mb-4">
                  <h3 className="font-bold text-xs sm:text-sm text-[var(--text-primary)] flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-emerald-700 dark:text-lime-400" />
                    Target Readiness
                  </h3>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-primary)]">
                    Live Score
                  </span>
                </div>

                <div className="my-2">
                  {isPreparing ? (
                    <div
                      className="rounded-full border-[10px] border-[var(--bg-tertiary)] animate-pulse"
                      style={{ width: 170, height: 170 }}
                      aria-hidden="true"
                    />
                  ) : (
                    <ReadinessChart score={readinessScore} />
                  )}
                </div>

                {isPreparing ? (
                  <div className="w-full max-w-xs space-y-2 mt-3 mb-4" aria-hidden="true">
                    <div className="h-3 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
                    <div className="h-3 w-4/5 mx-auto rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-secondary)] mt-3 mb-4 leading-relaxed max-w-xs">
                    {readinessScore >= 80
                      ? 'Your responses demonstrate strong role readiness. Keep fine-tuning edge questions.'
                      : 'Practice 2–3 more questions in high-impact modules to boost your readiness score.'}
                  </p>
                )}

                {nextQuestion && (
                  <button
                    onClick={() =>
                      router.push(
                        `/dashboard/interview/practice/${nextQuestion.id || nextQuestion._id}?jobId=${jobId}`
                      )
                    }
                    className="w-full py-2.5 px-4 rounded-xl bg-[var(--bg-tertiary)] hover:bg-emerald-500/10 text-emerald-700 dark:text-lime-400 border border-[var(--border-primary)] hover:border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    Continue Practice Round
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* AI Coach Focus Insight */}
              <div className="bg-[#013f2e] text-white rounded-2xl p-5 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-lime-300" />
                  </div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-lime-300">
                    AI Coach Tip
                  </h4>
                </div>
                <p className="text-xs text-white/90 leading-relaxed mb-4">
                  Focus on specific metrics and business impact when answering technical depth questions. Use quantifiable results to stand out.
                </p>
                <div className="text-[11px] text-white/70 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  Tailored to {targetRole} competency map
                </div>
              </div>

              {/* Practice Streak Card */}
              <div className="bg-[var(--bg-secondary)] rounded-2xl p-5 border border-[var(--border-primary)] shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[var(--text-primary)]">Practice Streak</h4>
                      <p className="text-[10px] text-[var(--text-secondary)]">Daily consistency</p>
                    </div>
                  </div>
                  <span className="text-sm font-black text-[var(--text-primary)] tabular-nums">
                    {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-1.5 text-center">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
                    const isActive = i < Math.min(currentStreak, 7) || (currentStreak > 0 && i === 0);
                    return (
                      <div key={i} className="flex flex-col items-center gap-1.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                            isActive
                              ? 'bg-emerald-600 dark:bg-lime-500 text-white dark:text-black font-black'
                              : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'
                          }`}
                        >
                          {isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : day}
                        </div>
                        <span className="text-[9px] font-semibold text-[var(--text-tertiary)]">{day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Right Column: Hero Banner & Module Learning Path (8 Cols) */}
            <div className="lg:col-span-8 space-y-6">

              {/* Preparing state — deliberately a slim status row, not a hero.
                  The orb is reserved for voice input, so plan generation uses a
                  plain spinner and the skeleton modules below carry the
                  "content is coming" signal. The page chrome is already real at
                  this point, so nothing here needs to shout. */}
              {isPreparing && (
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-600/30 bg-[var(--bg-secondary)] px-4 py-3 dark:border-lime-500/30">
                  <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-emerald-600 dark:text-lime-400" />
                  <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                    <span className="font-semibold text-[var(--text-primary)]">
                      Building your interview plan.
                    </span>{' '}
                    Analysing your profile against this role and writing tailored questions —
                    usually under a minute. You can leave this tab open.
                  </p>
                </div>
              )}

              {/* Continue Where You Left Off Hero Banner */}
              {nextQuestion && (
                <div className="bg-[var(--bg-secondary)] border border-emerald-600/30 dark:border-lime-500/30 rounded-2xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-lime-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      <Sparkles className="w-3 h-3" />
                      Next Best Question
                    </span>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] leading-snug mb-3">
                        {nextQuestion.question || nextQuestion.content?.question || 'Question prompt'}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase border ${
                            (nextQuestion.difficulty || nextQuestion.content?.difficulty || '').toLowerCase() === 'hard'
                              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                              : (nextQuestion.difficulty || nextQuestion.content?.difficulty || '').toLowerCase() === 'medium'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                          }`}
                        >
                          {nextQuestion.difficulty || nextQuestion.content?.difficulty || 'Medium'}
                        </span>
                        {(nextQuestion.category || nextQuestion.content?.tags?.[0]) && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-md border border-[var(--border-primary)] uppercase">
                            {nextQuestion.category || nextQuestion.content?.tags?.[0]}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        router.push(
                          `/dashboard/interview/practice/${nextQuestion.id || nextQuestion._id}?jobId=${jobId}`
                        )
                      }
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#013f2e] hover:bg-[#025c43] text-white font-bold text-xs shadow-sm transition-all active:scale-95 shrink-0"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Start Answering
                    </button>
                  </div>
                </div>
              )}

              {/* Learning Path Header */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                    Your Learning Path
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Master key question categories tailored to this role.
                  </p>
                </div>
              </div>

              {/* Module Accordion List */}
              {isPreparing ? (
                <div className="space-y-3" aria-hidden="true">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-16 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <ModuleList
                  modules={modules}
                  questionsByModule={questionsByModule}
                  jobId={jobId}
                />
              )}

            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
