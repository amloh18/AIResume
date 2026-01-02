'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Check, Bookmark, BarChart3, Lightbulb,
    Sparkles, FileText, Clock, Copy
} from 'lucide-react';
import toast from 'react-hot-toast';
import InterviewCoachHeader from './InterviewCoachHeader';

interface PracticeInterfaceProps {
    userId: string;
    jobId: string;
    moduleId?: string;
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
    };
    isHighRelevance?: boolean;
}

interface Session {
    _id: string;
    targetRole: string;
}

const PracticeInterface: React.FC<PracticeInterfaceProps> = ({ userId, jobId, moduleId }) => {
    const router = useRouter();
    const [session, setSession] = useState<Session | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answer, setAnswer] = useState('');
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            // Get or create session
            const sessionRes = await fetch('/api/interview/initiate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId })
            });
            const sessionData = await sessionRes.json();

            if (sessionData.success) {
                setSession(sessionData.session);

                // Fetch questions
                const questionsRes = await fetch(`/api/interview/questions?sessionId=${sessionData.session._id}`);
                const questionsData = await questionsRes.json();

                if (questionsData.success) {
                    let qs = questionsData.questions || [];
                    console.log(`Debug: Questions fetched: ${qs.length} for session ${sessionData.session._id}`);

                    // Log available moduleIds for debugging
                    const availableModules = Array.from(new Set(qs.map((q: Question) => q.moduleId)));
                    console.log(`Debug: Available moduleIds:`, availableModules);

                    // Filter by module if specified (normalize IDs)
                    if (moduleId) {
                        const targetId = moduleId.trim();
                        console.log(`Debug: Filtering for module '${targetId}'`);

                        const filtered = qs.filter((q: Question) =>
                            q.moduleId === targetId ||
                            q.moduleId?.trim() === targetId
                        );

                        console.log(`Debug: Filtered result: ${filtered.length} questions for '${targetId}'`);

                        // Fallback: If filtering returns nothing, but we have questions
                        if (filtered.length === 0 && qs.length > 0) {
                            console.warn(`⚠️ Filtering by moduleId '${moduleId}' returned 0 results. Showing all questions instead.`);
                            console.warn(`Available modules: ${availableModules.join(', ')}`);
                            toast('Module questions not found. Showing all questions.', { icon: 'ℹ️' });
                            // Keep qs as is (all questions)
                        } else {
                            qs = filtered;
                        }
                    }
                    setQuestions(qs);
                }
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
            toast.error('Failed to load questions');
        } finally {
            setLoading(false);
        }
    }, [jobId, moduleId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const currentQuestion = questions[currentIndex];

    const handleSubmitAnswer = async () => {
        if (!answer.trim() || !currentQuestion) return;

        setAnalyzing(true);
        try {
            const response = await fetch('/api/interview/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questionId: currentQuestion._id,
                    answer: answer.trim()
                })
            });

            const data = await response.json();

            if (data.success) {
                // Update question with feedback
                setQuestions(prev => prev.map(q =>
                    q._id === currentQuestion._id
                        ? {
                            ...q,
                            userAnswer: { text: answer, status: 'analyzed' },
                            aiFeedback: data.feedback
                        }
                        : q
                ));
                toast.success('Answer analyzed!');
            } else {
                toast.error(data.error || 'Failed to analyze');
            }
        } catch (error) {
            console.error('Failed to analyze:', error);
            toast.error('Failed to analyze answer');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setAnswer('');
        }
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setAnswer(questions[currentIndex - 1]?.userAnswer?.text || '');
        }
    };

    const handleBack = () => {
        router.push(`/interview-coach/${jobId}`);
    };

    const copySampleScript = () => {
        if (currentQuestion?.aiFeedback?.improvedScript) {
            navigator.clipboard.writeText(currentQuestion.aiFeedback.improvedScript);
            toast.success('Sample script copied!');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#1a230f] flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-lime-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!currentQuestion) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#1a230f] flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                        No questions found {moduleId ? `for module: ${moduleId}` : ''}
                    </p>
                    {/* Debug Info for User/Dev */}
                    <p className="text-xs text-red-400 mb-4 opacity-70">
                        {questions.length === 0 ? "(API returned 0 questions)" : `(Filter matched 0, Fallback failed? Total: ${questions.length})`}
                    </p>
                    <button onClick={handleBack} className="text-lime-600 hover:text-lime-700">
                        Go Back to Hub
                    </button>
                </div>
            </div>
        );
    }

    const isAnswered = currentQuestion.userAnswer?.status === 'analyzed';

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#1a230f] flex flex-col">
            <InterviewCoachHeader />
            <div className="flex-1 w-full max-w-[1800px] mx-auto px-6 py-8">
                {/* Back Button */}
                <button
                    onClick={handleBack}
                    className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Hub
                </button>

                {/* Progress Indicator */}
                <div className="flex items-center justify-center gap-4 mb-8">
                    {questions.map((q, i) => {
                        const isCompleted = q.userAnswer?.status === 'analyzed';
                        const isCurrent = i === currentIndex;

                        return (
                            <button
                                key={q._id}
                                onClick={() => {
                                    setCurrentIndex(i);
                                    setAnswer(q.userAnswer?.text || '');
                                }}
                                className="flex flex-col items-center"
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${isCompleted
                                    ? 'bg-lime-500 text-white'
                                    : isCurrent
                                        ? 'bg-lime-500 text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                    }`}>
                                    {isCompleted ? <Check className="w-5 h-5" /> : i + 1}
                                </div>
                                <span className={`text-xs mt-1 font-medium ${isCurrent ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                    Q{i + 1}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Question Card */}
                <motion.div
                    key={currentQuestion._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-[#141810] rounded-2xl p-8 shadow-sm mb-8"
                >
                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        {currentQuestion.content.tags.map((tag, i) => (
                            <span
                                key={i}
                                className="px-3 py-1 text-xs font-semibold bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300 rounded-full uppercase"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>

                    {/* Question Text */}
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                        {currentQuestion.content.question}
                    </h1>

                    {/* High Relevance Badge */}
                    {currentQuestion.isHighRelevance && (
                        <div className="flex items-center gap-2 p-3 bg-lime-50 dark:bg-lime-900/20 rounded-lg border-l-4 border-lime-500">
                            <Check className="w-5 h-5 text-lime-600 dark:text-lime-400" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                <strong>High Relevance</strong> — This question directly addresses skills listed in the Job Description.
                            </span>
                        </div>
                    )}
                </motion.div>

                {/* Info Panels (3 columns) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Why this is asked */}
                    <div className="bg-white dark:bg-[#141810] rounded-2xl p-6 shadow-sm">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-yellow-500" />
                            Why this is asked
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {currentQuestion.content.whyAsked}
                        </p>
                    </div>

                    {/* Your Edge */}
                    <div className="bg-white dark:bg-[#141810] rounded-2xl p-6 shadow-sm">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-blue-500" />
                            Your Edge
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {currentQuestion.edgeTip?.content || 'Think about your unique experiences that relate to this question.'}
                        </p>
                    </div>

                    {/* Sample Script */}
                    <div className="bg-white dark:bg-[#141810] rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <FileText className="w-5 h-5 text-purple-500" />
                                Sample Script
                            </h3>
                            {currentQuestion.aiFeedback?.improvedScript && (
                                <button onClick={copySampleScript} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded">
                                    <Copy className="w-4 h-4 text-gray-400" />
                                </button>
                            )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                            {currentQuestion.aiFeedback?.improvedScript
                                ? currentQuestion.aiFeedback.improvedScript.substring(0, 200) + '...'
                                : '"Use the STAR method: Situation, Task, Action, Result. Be specific about your role and the impact you made."'
                            }
                        </p>
                    </div>
                </div>

                {/* Answer Section */}
                <div className="bg-white dark:bg-[#141810] rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Your Turn
                        </h3>
                        <span className="text-xs text-gray-400 uppercase">Draft Mode</span>
                    </div>

                    <textarea
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder="Type your answer here... try to incorporate the 'STAR' method (Situation, Task, Action, Result)."
                        className="w-full h-40 p-4 bg-gray-50 dark:bg-[#1a230f] border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-lime-500"
                    />

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <Clock className="w-4 h-4" />
                            Suggested time: 2 min
                        </div>

                        <div className="flex items-center gap-3">
                            <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5">
                                <Bookmark className="w-4 h-4" />
                                Save to Cheat Sheet
                            </button>
                            <button
                                onClick={handleSubmitAnswer}
                                disabled={!answer.trim() || analyzing}
                                className="flex items-center gap-2 px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <BarChart3 className="w-4 h-4" />
                                {analyzing ? 'Analyzing...' : 'Analyze My Answer'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Feedback Panel (if analyzed) */}
                {isAnswered && currentQuestion.aiFeedback && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 bg-white dark:bg-[#141810] rounded-2xl p-6 shadow-sm"
                    >
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4">
                            AI Feedback — Score: {currentQuestion.aiFeedback.score}/100
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Strengths */}
                            <div>
                                <h4 className="font-semibold text-lime-600 dark:text-lime-400 mb-2">Strengths</h4>
                                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                    {currentQuestion.aiFeedback.strengths.map((s, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <Check className="w-4 h-4 text-lime-500 mt-0.5" />
                                            {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Improvements */}
                            <div>
                                <h4 className="font-semibold text-orange-600 dark:text-orange-400 mb-2">Improvements</h4>
                                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                    {currentQuestion.aiFeedback.improvements.map((imp, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="text-orange-500 mt-0.5">•</span>
                                            {imp}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8">
                    <button
                        onClick={handlePrevious}
                        disabled={currentIndex === 0}
                        className="px-6 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={currentIndex === questions.length - 1}
                        className="px-6 py-2 bg-lime-500 hover:bg-lime-600 text-black font-semibold rounded-lg disabled:opacity-50"
                    >
                        Next Question
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PracticeInterface;
