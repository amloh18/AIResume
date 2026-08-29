'use client';

/**
 * PracticeInterface
 *
 * Core interview practice workspace.
 * Uses VoiceInterviewStage for the voice-first experience.
 * Falls back to typing if needed.
 *
 * Flow: Question → Voice/Type → Transcript → Submit → AI Evaluation → Next
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Clock,
  Copy,
  FileText,
  Lightbulb,
  Lock,
  Sparkles,
  TrendingUp,
  HelpCircle,
  RotateCcw,
  CheckCircle2,
  Send,
  Keyboard,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import VoiceInterviewStage from './VoiceInterviewStage';

interface PracticeInterfaceProps {
  userId: string;
  jobId: string;
  moduleId?: string;
  initialQuestionId?: string;
}

interface Question {
  _id: string;
  moduleId: string;
  content: {
    question: string;
    whyAsked: string;
    difficulty: string;
    tags: string[];
  };
  edgeTip?: {
    content: string;
  };
  userAnswer?: {
    text: string;
    status: string;
  };
  aiFeedback?: {
    score: number;
    improvedScript: string;
    strengths: string[];
    improvements: string[];
    feedback_summary?: string;
    your_edge?: string;
  };
  isHighRelevance?: boolean;
}

interface Session {
  _id: string;
  targetRole: string;
}

export default function PracticeInterface({
  userId,
  jobId,
  moduleId,
  initialQuestionId,
}: PracticeInterfaceProps) {
  const router = useRouter();
  const { data: authSession } = useSession();
  const [session, setSession] = useState<Session | null>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [userPlanKey, setUserPlanKey] = useState<string>('free');

  // UI states
  const [showWhyAsked, setShowWhyAsked] = useState(false);
  const [inputMode, setInputMode] = useState<'voice' | 'type'>('voice');
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false);

  const fetchData = useCallback(
    async (action: 'fetch' | 'generate' = 'fetch') => {
      try {
        const sessionRes = await fetch('/api/interview/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, action }),
        });
        const sessionData = await sessionRes.json();

        if (sessionData.success) {
          if (sessionData.planKey) {
            setUserPlanKey(sessionData.planKey);
          }

          if (sessionData.interviewCoach) {
            const ic = sessionData.interviewCoach;

            if (ic.status === 'not_started' || !ic.questions || ic.questions.length === 0) {
              setLoading(false);
              return;
            }

            setModules(ic.modules || []);
            setSession({
              _id: ic.linkedCvId || jobId,
              targetRole: sessionData.interviewCoach.targetRole || 'Candidate',
            });

            let qs = (ic.questions || []).map((q: any) => ({
              _id: q.id,
              moduleId:
                ic.modules?.find((m: any) => m.questionIds?.includes(q.id))?.id || 'unknown',
              content: {
                question: q.question,
                whyAsked: q.aiContext?.rationale || '',
                difficulty: q.difficulty || 'Medium',
                tags: [q.category],
              },
              edgeTip: {
                content: q.aiContext?.edge || '',
              },
              userAnswer:
                q.status === 'completed' ? { text: q.userAnswer || '', status: 'analyzed' } : undefined,
              aiFeedback: q.feedback,
              isHighRelevance: q.isHighRelevance,
            }));

            if (moduleId) {
              const targetId = moduleId.trim();
              const filtered = qs.filter(
                (q: any) => q.moduleId === targetId || q.moduleId?.trim() === targetId
              );
              if (filtered.length > 0) {
                qs = filtered;
              }
            }
            setQuestions(qs);

            if (initialQuestionId) {
              const targetIdx = qs.findIndex((q: any) => q._id === initialQuestionId);
              if (targetIdx !== -1) {
                setCurrentIndex(targetIdx);
              }
            }
          }
        } else {
          toast.error(sessionData.error || 'Failed to load session');
          router.push('/dashboard/interview');
        }
      } catch (error) {
        console.error('Error fetching session:', error);
        toast.error('Network error loading session');
      } finally {
        setLoading(false);
      }
    },
    [jobId, moduleId, router, initialQuestionId]
  );

  useEffect(() => {
    fetchData('fetch');
  }, [fetchData]);

  const currentQuestion = questions[currentIndex];
  const isAnswered = currentQuestion?.userAnswer?.status === 'analyzed';
  const isLocked = userPlanKey === 'free' && currentIndex > 0;

  // ── Answer Submission ──────────────────────────────────────────────────

  const handleVoiceSubmit = useCallback(
    async (transcript: string, durationMs: number, provider: string) => {
      if (!transcript.trim() || analyzing) return;

      setAnswer(transcript);
      setAnalyzing(true);

      try {
        const response = await fetch('/api/interview/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId,
            questionId: currentQuestion._id,
            answer: transcript,
          }),
        });
        const data = await response.json();

        if (data.success) {
          setQuestions((prev) =>
            prev.map((q) =>
              q._id === currentQuestion._id
                ? {
                    ...q,
                    userAnswer: { text: transcript, status: 'analyzed' },
                    aiFeedback: data.feedback,
                  }
                : q
            )
          );
          setShowAnalysisPanel(true);

          if (data.streakEvent) {
            if (data.streakEvent.type === 'continued') {
              toast.success(
                `Streak extended! You are on a ${data.streakEvent.currentStreak}-day streak`,
                { icon: '🔥' }
              );
            } else if (data.streakEvent.type === 'started') {
              toast.success('You started your interview prep streak! Day 1', { icon: '🔥' });
            }
          }
        } else {
          toast.error(data.error || 'Failed to analyze');
        }
      } catch (error) {
        console.error('Failed to analyze:', error);
        toast.error('Failed to analyze answer');
      } finally {
        setAnalyzing(false);
      }
    },
    [jobId, currentQuestion, analyzing]
  );

  const handleTypeSubmit = useCallback(async () => {
    if (!answer.trim() || analyzing) return;
    setAnalyzing(true);

    try {
      const response = await fetch('/api/interview/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          questionId: currentQuestion._id,
          answer,
        }),
      });
      const data = await response.json();

      if (data.success) {
        setQuestions((prev) =>
          prev.map((q) =>
            q._id === currentQuestion._id
              ? {
                  ...q,
                  userAnswer: { text: answer, status: 'analyzed' },
                  aiFeedback: data.feedback,
                }
              : q
          )
        );
        setShowAnalysisPanel(true);

        if (data.streakEvent) {
          if (data.streakEvent.type === 'continued') {
            toast.success(
              `Streak extended! You are on a ${data.streakEvent.currentStreak}-day streak`,
              { icon: '🔥' }
            );
          } else if (data.streakEvent.type === 'started') {
            toast.success('You started your interview prep streak! Day 1', { icon: '🔥' });
          }
        }
      } else {
        toast.error(data.error || 'Failed to analyze');
      }
    } catch (error) {
      console.error('Failed to analyze:', error);
      toast.error('Failed to analyze answer');
    } finally {
      setAnalyzing(false);
    }
  }, [jobId, currentQuestion, answer, analyzing]);

  // ── Navigation ─────────────────────────────────────────────────────────

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      const currentModuleIndex = modules.findIndex((m) => m.id === moduleId);
      const nextModuleId =
        currentModuleIndex >= 0 && currentModuleIndex < modules.length - 1
          ? modules[currentModuleIndex + 1].id
          : null;

      if (nextModuleId) {
        router.push(`/dashboard/interview/${jobId}/practice?moduleId=${nextModuleId}`);
      } else {
        router.push(`/dashboard/interview/${jobId}`);
        toast.success('All questions reviewed! Great work!');
      }
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  useEffect(() => {
    if (questions[currentIndex]) {
      setAnswer(questions[currentIndex].userAnswer?.text || '');
      setShowWhyAsked(false);
      // Auto-show analysis if question is already answered
      if (questions[currentIndex].userAnswer?.status === 'analyzed') {
        setShowAnalysisPanel(true);
      } else {
        setShowAnalysisPanel(false);
      }
    }
  }, [currentIndex, questions]);

  const copySampleScript = () => {
    if (currentQuestion?.aiFeedback?.improvedScript) {
      navigator.clipboard.writeText(currentQuestion.aiFeedback.improvedScript);
      toast.success('Script copied to clipboard!');
    }
  };

  // ── Loading State ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="absolute inset-0 dashboard-workspace flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-600 dark:border-lime-500 border-t-transparent animate-spin" />
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            Loading question workspace...
          </span>
        </div>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="absolute inset-0 dashboard-workspace flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-base font-bold text-[var(--text-primary)] mb-2">No Questions Found</h2>
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          This module does not contain any practice questions yet.
        </p>
        <button
          onClick={() => router.push(`/dashboard/interview/${jobId}`)}
          className="px-4 py-2 bg-[#013f2e] text-white rounded-xl text-xs font-bold hover:bg-[#025c43] transition-colors"
        >
          Back to Plan
        </button>
      </div>
    );
  }

  // ── Main Render ────────────────────────────────────────────────────────

  return (
    <div className="absolute inset-0 dashboard-workspace text-[#0f172a] dark:text-gray-150 font-sans overflow-hidden flex flex-col pr-3 pb-3 pl-3 lg:pl-0">
      <div className="dashboard-content-card rounded-2xl border border-[var(--border-primary)] shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden px-5 md:px-8">
        <div className="max-w-[1400px] w-full mx-auto flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hide py-5 md:py-8 space-y-6">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
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
                  Interview Coach
                </span>
                <span>›</span>
                <span
                  className="cursor-pointer hover:text-[var(--text-primary)] transition-colors truncate max-w-[160px]"
                  onClick={() => router.push(`/dashboard/interview/${jobId}`)}
                >
                  {session?.targetRole || 'Prep Plan'}
                </span>
                <span>›</span>
                <span className="text-[var(--text-primary)] font-semibold">
                  Q{currentIndex + 1}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                  Practice Simulator
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 px-2.5 py-0.5 text-xs font-semibold border border-emerald-200 dark:border-emerald-800/40">
                  <Sparkles className="w-3 h-3 text-emerald-600 dark:text-lime-400" />
                  Live AI Evaluation
                </span>
              </div>
              <p className="text-xs md:text-sm text-[var(--text-secondary)] mt-1">
                Role-specific scenario for <span className="font-semibold text-[var(--text-primary)]">{session?.targetRole || 'your target role'}</span>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 self-start md:self-center shrink-0">
              {/* Stepper */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl px-2.5 py-1.5 shadow-xs">
                {questions.map((q, i) => {
                  const isCompleted = q.userAnswer?.status === 'analyzed';
                  const isCurrent = i === currentIndex;
                  const isLockedStep = userPlanKey === 'free' && i > 0;

                  return (
                    <React.Fragment key={q._id}>
                      {i > 0 && (
                        <div
                          className={`w-2 sm:w-3.5 h-[2px] rounded-full shrink-0 transition-colors ${
                            isCompleted || isCurrent
                              ? 'bg-emerald-600 dark:bg-lime-500'
                              : 'bg-[var(--border-primary)]'
                          }`}
                        />
                      )}
                      <button
                        onClick={() => setCurrentIndex(i)}
                        disabled={isLockedStep}
                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-[11px] font-bold transition-all shrink-0 ${
                          isLockedStep
                            ? 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)] opacity-40 cursor-not-allowed border border-[var(--border-primary)]'
                            : isCurrent
                            ? 'bg-[#013f2e] text-white dark:bg-lime-500 dark:text-black shadow-xs ring-2 ring-emerald-600/30'
                            : isCompleted
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-lime-400 border border-emerald-500/30'
                            : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-primary)]'
                        }`}
                        title={`Question ${i + 1}`}
                      >
                        {isLockedStep ? (
                          <Lock className="w-2.5 h-2.5" />
                        ) : isCompleted && !isCurrent ? (
                          <Check className="w-3 h-3" strokeWidth={2.5} />
                        ) : (
                          i + 1
                        )}
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>

              <button
                onClick={() => router.push(`/dashboard/interview/${jobId}`)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-all shadow-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Plan
              </button>
            </div>
          </div>

          {/* Main 2-Column Grid */}
          <div className={showAnalysisPanel || isAnswered ? 'grid grid-cols-1 lg:grid-cols-12 gap-6 items-start' : 'flex flex-col gap-6'}>

            {/* Left Column: Question & Voice Stage */}
            <div className={showAnalysisPanel || isAnswered ? 'lg:col-span-7 space-y-5' : 'w-full max-w-3xl mx-auto space-y-5'}>

              {isLocked ? (
                <div className="bg-[var(--bg-secondary)] rounded-2xl p-8 border border-[var(--border-primary)] text-center flex flex-col items-center justify-center">
                  <div className="w-14 h-14 bg-emerald-500/10 dark:bg-lime-500/10 rounded-2xl flex items-center justify-center mb-4 text-emerald-700 dark:text-lime-400">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
                    Upgrade to Unlock All Practice Questions
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mb-6 max-w-sm">
                    Upgrade to Focused or Pro to practice unlimited role-specific questions with AI speech analysis.
                  </p>
                  <button
                    onClick={() => router.push('/dashboard/settings?tab=billing')}
                    className="px-5 py-2.5 bg-[#013f2e] hover:bg-[#025c43] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    Upgrade Plan
                  </button>
                </div>
              ) : (
                <>
                  {/* Question Card */}
                  <motion.div
                    key={`q-${currentQuestion._id}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[var(--bg-secondary)] rounded-2xl p-5 sm:p-6 border border-[var(--border-primary)] shadow-xs space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 text-[10px] font-bold bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-md border border-[var(--border-primary)] uppercase tracking-wider">
                          Q{currentIndex + 1} OF {questions.length}
                        </span>
                        {currentQuestion.content.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-lime-400 rounded-md border border-emerald-500/20 uppercase tracking-wider"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 font-bold rounded-md uppercase border ${
                          (currentQuestion.content.difficulty || '').toLowerCase() === 'hard'
                            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                            : (currentQuestion.content.difficulty || '').toLowerCase() === 'medium'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                        }`}
                      >
                        {currentQuestion.content.difficulty || 'Medium'}
                      </span>
                    </div>

                    <h2 className="text-base sm:text-lg md:text-xl font-bold text-[var(--text-primary)] leading-snug">
                      {currentQuestion.content.question}
                    </h2>

                    {currentQuestion.content.whyAsked && (
                      <div className="pt-2 border-t border-[var(--border-primary)]">
                        <button
                          onClick={() => setShowWhyAsked(!showWhyAsked)}
                          className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors"
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-emerald-700 dark:text-lime-400" />
                          <span>Why interviewers ask this question</span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform ${
                              showWhyAsked ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        <AnimatePresence>
                          {showWhyAsked && (
                            <motion.p
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed bg-[var(--bg-tertiary)] p-3 rounded-xl border border-[var(--border-primary)]"
                            >
                              {currentQuestion.content.whyAsked}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </motion.div>

                  {/* Voice Interview Stage */}
                  <div className="bg-[var(--bg-secondary)] rounded-2xl p-5 sm:p-6 border border-[var(--border-primary)] shadow-xs">
                    {!isAnswered ? (
                      <VoiceInterviewStage
                        questionId={currentQuestion._id}
                        questionText={currentQuestion.content.question}
                        sessionId={session?._id}
                        onSubmit={handleVoiceSubmit}
                        onTypeFallback={() => setInputMode('type')}
                        disabled={analyzing}
                      />
                    ) : (
                      /* Already answered — show text fallback */
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-lime-400" />
                          <span className="text-sm font-semibold text-[var(--text-primary)]">Answer Submitted</span>
                        </div>
                        <textarea
                          value={answer}
                          onChange={(e) => setAnswer(e.target.value)}
                          disabled
                          rows={5}
                          className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] leading-relaxed resize-none opacity-80"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const updatedQuestions = [...questions];
                              updatedQuestions[currentIndex] = {
                                ...updatedQuestions[currentIndex],
                                userAnswer: undefined,
                                aiFeedback: undefined,
                              };
                              setQuestions(updatedQuestions);
                              setAnswer('');
                              setShowAnalysisPanel(false);
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-xs font-bold transition-all"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Practice Again
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Show Analysis button — visible when user has typed/recorded but panel is hidden */}
                  {!isAnswered && !showAnalysisPanel && answer.trim().length > 0 && (
                    <button
                      onClick={() => setShowAnalysisPanel(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Show Analysis
                    </button>
                  )}

                  {/* Navigation */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={handlePrevious}
                      disabled={currentIndex === 0}
                      className="px-3.5 py-2 rounded-xl border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none transition-all"
                    >
                      Previous
                    </button>
                    <button
                      onClick={handleNext}
                      className="px-4 py-2 rounded-xl bg-[#013f2e] hover:bg-[#025c43] text-white text-xs font-bold shadow-sm transition-all"
                    >
                      {currentIndex === questions.length - 1 ? 'Finish Module' : 'Next Question →'}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Right Column: AI Scoring & Feedback (5 Cols) */}
            {(showAnalysisPanel || isAnswered) && (
            <div className="lg:col-span-5 space-y-5">

              {/* Overall Score Box — shown when analysis is revealed or answer is complete */}
              {(showAnalysisPanel || isAnswered) && (
                <div className="bg-[var(--bg-secondary)] rounded-2xl p-5 sm:p-6 border border-[var(--border-primary)] shadow-xs">
                  <h3 className="font-bold text-xs sm:text-sm text-[var(--text-primary)] mb-4">
                    Evaluation Score
                  </h3>

                  {!isAnswered || !currentQuestion?.aiFeedback ? (
                    <div className="text-center py-4 space-y-3">
                      <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-[var(--border-primary)] flex items-center justify-center mx-auto text-xl font-bold text-[var(--text-tertiary)]">
                        --
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto">
                        Submit your response to receive real-time scoring across clarity, impact, and depth.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 dark:bg-lime-500/10 text-emerald-700 dark:text-lime-400 flex flex-col items-center justify-center border border-emerald-500/20 shrink-0">
                          <span className="text-xl font-black tabular-nums leading-none">
                            {(currentQuestion.aiFeedback.score / 10).toFixed(1)}
                          </span>
                          <span className="text-[9px] font-bold uppercase mt-0.5">/ 10</span>
                        </div>

                        <div>
                          <h4 className="font-bold text-xs text-emerald-700 dark:text-lime-400">
                            {currentQuestion.aiFeedback.score >= 80
                              ? 'High Impact Response'
                              : currentQuestion.aiFeedback.score >= 60
                              ? 'Good Progress'
                              : 'Needs Refinement'}
                          </h4>
                          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                            {currentQuestion.aiFeedback.feedback_summary ||
                              'Well-structured answer with strong candidate relevance.'}
                          </p>
                        </div>
                      </div>

                      {/* Breakdown Bars */}
                      <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-[var(--border-primary)]">
                        {[
                          { label: 'Clarity', val: 8.5 },
                          { label: 'Structure', val: 8.0 },
                          { label: 'Impact', val: 8.5 },
                          { label: 'Relevance', val: 8.0 },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] flex items-center justify-between"
                          >
                            <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase">
                              {item.label}
                            </span>
                            <span className="text-xs font-bold text-[var(--text-primary)] tabular-nums">
                              {item.val}/10
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Insights & Recommendations — shown when analysis is revealed or answer is complete */}
              {(showAnalysisPanel || isAnswered) && (
                <div className="bg-[var(--bg-secondary)] rounded-2xl p-5 sm:p-6 border border-[var(--border-primary)] shadow-xs space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-700 dark:text-lime-400" />
                    <h3 className="font-bold text-xs sm:text-sm text-[var(--text-primary)]">
                      AI Coaching Analysis
                    </h3>
                  </div>

                  {!isAnswered || !currentQuestion?.aiFeedback ? (
                    <div className="space-y-3">
                      <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                        <h4 className="text-[11px] font-bold text-emerald-700 dark:text-lime-400 flex items-center gap-1.5">
                          <Lightbulb className="w-3.5 h-3.5" /> Candidate Edge
                        </h4>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                          {currentQuestion.edgeTip?.content ||
                            'Focus on your direct impact and practical decisions in this scenario.'}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] space-y-1">
                        <h4 className="text-[11px] font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-[var(--text-tertiary)]" /> Recommended Structure
                        </h4>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic">
                          &quot;Use STAR: Situation, Task, Action, Result. Allocate 70% of time to Action &amp; Result.&quot;
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {currentQuestion.aiFeedback.strengths?.length > 0 && (
                        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
                          <h4 className="text-[11px] font-bold text-emerald-700 dark:text-lime-400 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> What You Did Well
                          </h4>
                          <ul className="space-y-1">
                            {currentQuestion.aiFeedback.strengths.map((s, i) => (
                              <li
                                key={i}
                                className="text-xs text-[var(--text-secondary)] leading-relaxed flex items-start gap-1.5"
                              >
                                <span className="text-emerald-700 dark:text-lime-400 shrink-0">•</span>
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {currentQuestion.aiFeedback.improvements?.length > 0 && (
                        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                          <h4 className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5" /> Areas to Boost
                          </h4>
                          <ul className="space-y-1">
                            {currentQuestion.aiFeedback.improvements.map((s, i) => (
                              <li
                                key={i}
                                className="text-xs text-[var(--text-secondary)] leading-relaxed flex items-start gap-1.5"
                              >
                                <span className="text-amber-600 shrink-0">•</span>
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {(currentQuestion.aiFeedback.your_edge ||
                        currentQuestion.aiFeedback.improvedScript) && (
                        <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-[11px] font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-700 dark:text-lime-400" /> Ideal Script
                            </h4>
                            <button
                              onClick={copySampleScript}
                              className="text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors"
                            >
                              <Copy className="w-3 h-3" /> Copy
                            </button>
                          </div>
                          {currentQuestion.aiFeedback.improvedScript && (
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic border-l-2 border-emerald-600 pl-2.5">
                              &quot;{currentQuestion.aiFeedback.improvedScript}&quot;
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
