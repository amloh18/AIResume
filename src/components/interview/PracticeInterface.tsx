'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Bookmark, BarChart2, Clock, Sparkles } from 'lucide-react';
import QuestionCard from './QuestionCard';
import QuestionStepper from './QuestionStepper';
import FeedbackPanel from './FeedbackPanel';
import { motion, AnimatePresence } from 'framer-motion';

interface Question {
    id: string;
    question: string;
    category?: string;
    difficulty?: string;
    status: 'pending' | 'drafted' | 'completed';
    userAnswer: string;
    isSavedToCheatSheet?: boolean;
    aiContext?: {
        rationale?: string;
        edge?: string;
        gap?: string;
        sampleAnswer?: string;
    };
    feedback?: {
        score: number;
        strengths: string[];
        improvements: string[];
        refinedAnswer: string;
    };
    // Legacy support
    content?: any;
    edgeTip?: any;
}

interface PracticeInterfaceProps {
    question: Question;
    allQuestions?: Question[];
    jobId?: string;
}

const PracticeInterface: React.FC<PracticeInterfaceProps> = ({
    question: initialQuestion,
    allQuestions: initialAllQuestions,
    jobId: propJobId
}) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const jobId = propJobId || searchParams.get('jobId') || '';

    const [question, setQuestion] = useState(initialQuestion);
    const [allQuestions, setAllQuestions] = useState(initialAllQuestions || [initialQuestion]);
    const [currentIndex, setCurrentIndex] = useState(
        initialAllQuestions?.findIndex(q => q.id === initialQuestion.id) || 0
    );
    const [answer, setAnswer] = useState(initialQuestion.userAnswer || '');
    const [analyzing, setAnalyzing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const [isSavedToCheatSheet, setIsSavedToCheatSheet] = useState(
        initialQuestion.isSavedToCheatSheet || false
    );

    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Derived state
    const hasFeedback = !!question.feedback;
    const isAnalyzed = question.status === 'completed';

    // Auto-save draft with debounce
    const saveDraft = useCallback(async (text: string) => {
        if (!jobId || !question.id) return;

        setIsSaving(true);
        try {
            const res = await fetch(`/api/interview/question/${question.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ draft: text, jobId })
            });
            const data = await res.json();
            if (data.success) {
                setLastSavedAt(new Date(data.lastSaved));
            }
        } catch (error) {
            console.error('Failed to save draft:', error);
        } finally {
            setIsSaving(false);
        }
    }, [jobId, question.id]);

    // Debounced auto-save
    const handleAnswerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newText = e.target.value;
        setAnswer(newText);

        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Set new debounced save
        saveTimeoutRef.current = setTimeout(() => {
            saveDraft(newText);
        }, 1500); // Save after 1.5s of no typing
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    const handleAnalyze = async () => {
        if (!answer.trim() || !jobId) return;

        setAnalyzing(true);
        try {
            const res = await fetch('/api/interview/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questionId: question.id,
                    answer: answer,
                    jobId: jobId
                })
            });
            const data = await res.json();

            if (data.success) {
                // Optimistic update
                setQuestion(prev => ({
                    ...prev,
                    userAnswer: answer,
                    status: 'completed',
                    feedback: data.feedback
                }));

                // Update allQuestions list
                setAllQuestions(prev => prev.map(q =>
                    q.id === question.id
                        ? { ...q, status: 'completed' as const, feedback: data.feedback }
                        : q
                ));
            }
        } catch (error) {
            console.error('Analysis failed', error);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleToggleCheatSheet = async () => {
        const newValue = !isSavedToCheatSheet;

        // Optimistic update
        setIsSavedToCheatSheet(newValue);

        try {
            await fetch('/api/interview/cheat-sheet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questionId: question.id,
                    jobId: jobId,
                    isSaved: newValue
                })
            });
        } catch (error) {
            // Revert on failure
            setIsSavedToCheatSheet(!newValue);
            console.error('Failed to toggle cheat sheet:', error);
        }
    };

    const handleQuestionSelect = (index: number) => {
        if (allQuestions[index]) {
            setCurrentIndex(index);
            const newQuestion = allQuestions[index];
            setQuestion(newQuestion);
            setAnswer(newQuestion.userAnswer || '');
            setIsSavedToCheatSheet(newQuestion.isSavedToCheatSheet || false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-[#0a0a0a]">
            {/* Header */}
            <div className="bg-white dark:bg-[#141810] border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between shrink-0">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-medium">Back to Plan</span>
                </button>
                <div className="text-sm text-gray-500">
                    {isSaving && <span className="text-amber-500">Saving...</span>}
                    {lastSavedAt && !isSaving && (
                        <span className="text-gray-400">
                            Saved {lastSavedAt.toLocaleTimeString()}
                        </span>
                    )}
                </div>
            </div>

            {/* Question Stepper */}
            {allQuestions.length > 1 && (
                <div className="bg-white dark:bg-[#141810] border-b border-gray-200 dark:border-gray-800 px-6">
                    <QuestionStepper
                        questions={allQuestions}
                        currentIndex={currentIndex}
                        onSelect={handleQuestionSelect}
                    />
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-5xl mx-auto p-6 space-y-8">
                    {/* Question Card with Context Panels */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={question.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            <QuestionCard question={question} />
                        </motion.div>
                    </AnimatePresence>

                    {/* Your Turn Section */}
                    <div className="bg-white dark:bg-[#141810] rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-lime-500" />
                                <h3 className="font-bold text-gray-900 dark:text-white">Your Turn</h3>
                            </div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                DRAFT MODE
                            </span>
                        </div>

                        <textarea
                            value={answer}
                            onChange={handleAnswerChange}
                            placeholder="Type your answer here... try to incorporate the 'STAR' method (Situation, Task, Action, Result)."
                            className="w-full min-h-[200px] p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-lime-500/50"
                            disabled={analyzing}
                        />

                        {/* Action Bar */}
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Clock className="w-4 h-4" />
                                <span>Suggested time: 2 min</span>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleToggleCheatSheet}
                                    className={`
                                        flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all
                                        ${isSavedToCheatSheet
                                            ? 'bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-400 border border-lime-300 dark:border-lime-700'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }
                                    `}
                                >
                                    <Bookmark className={`w-4 h-4 ${isSavedToCheatSheet ? 'fill-current' : ''}`} />
                                    Save to Cheat Sheet
                                </button>

                                <button
                                    onClick={handleAnalyze}
                                    disabled={analyzing || !answer.trim()}
                                    className={`
                                        flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm transition-all
                                        ${analyzing || !answer.trim()
                                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                            : 'bg-lime-500 hover:bg-lime-600 text-white shadow-lg shadow-lime-500/30 hover:shadow-lime-500/50'
                                        }
                                    `}
                                >
                                    <BarChart2 className="w-4 h-4" />
                                    {analyzing ? 'Analyzing...' : 'Analyze My Answer'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Feedback Panel */}
                    {hasFeedback && question.feedback && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <FeedbackPanel feedback={question.feedback} />
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PracticeInterface;
