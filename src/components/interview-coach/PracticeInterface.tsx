'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Check, Bookmark, BarChart3, Lightbulb,
    Sparkles, FileText, Clock, Copy, Mic
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
                // Check for new embedded data format
                if (sessionData.interviewCoach) {
                    const ic = sessionData.interviewCoach;
                    setModules(ic.modules || []); // Save modules for navigation logic
                    setSession({
                        _id: ic.linkedCvId || jobId,
                        targetRole: sessionData.interviewCoach.targetRole || 'Candidate' // fallback
                    });

                    // Map embedded questions to frontend structure
                    // The backend returns a unified 'questions' array in interviewCoach
                    let qs = (ic.questions || []).map((q: any) => ({
                        _id: q.id,
                        moduleId: ic.modules.find((m: any) => m.questionIds?.includes(q.id))?.id || 'unknown',
                        content: {
                            question: q.question,
                            whyAsked: q.aiContext?.rationale || '',
                            difficulty: q.difficulty || 'Medium',
                            tags: [q.category]
                        },
                        edgeTip: {
                            content: q.aiContext?.edge || ''
                        },
                        userAnswer: q.status === 'completed' ? { text: q.userAnswer || '', status: 'analyzed' } : undefined,
                        aiFeedback: q.feedback,
                        isHighRelevance: q.isHighRelevance // if available
                    }));

                    console.log(`Debug: Questions mapped: ${qs.length}`);

                    // Filter by module if specified (normalize IDs)
                    if (moduleId) {
                        const targetId = moduleId.trim();
                        console.log(`Debug: Filtering for module '${targetId}'`);

                        const filtered = qs.filter((q: any) =>
                            q.moduleId === targetId ||
                            q.moduleId?.trim() === targetId
                        );

                        console.log(`Debug: Filtered result: ${filtered.length} questions for '${targetId}'`);

                        // Fallback: If filtering returns nothing, but we have questions
                        if (filtered.length === 0 && qs.length > 0) {
                            console.warn(`⚠️ Filtering by moduleId '${moduleId}' returned 0 results. Showing all questions instead.`);
                            toast('Module questions not found. Showing all questions.', { icon: 'ℹ️' });
                            // keep qs as is
                        } else {
                            qs = filtered;
                        }
                    }
                    setQuestions(qs);
                }
                // Legacy fallback (optional, can likely remove if backend is fully migrated)
                else if (sessionData.session) {
                    setSession(sessionData.session);
                    // If we fall back here, we might still fail on the next fetch if legacy endpoint is gone
                    // But typically initiate returns the new format now.
                }
            } else {
                console.error('Session init failed:', sessionData.error);
                toast.error(sessionData.error || 'Failed to load session');
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

    // Mic / Speech Recognition Logic
    const [isRecording, setIsRecording] = useState(false);

    const toggleRecording = useCallback(() => {
        if (isRecording) {
            // Stop recording logic handled by onend usually, but we can force stop
            // Actual stop is handled by the recognition instance if we had access to it here
            // For simple implementation without external library, we rely on browser events
            setIsRecording(false);
            if ((window as any).recognition) {
                (window as any).recognition.stop();
            }
        } else {
            if (!('webkitSpeechRecognition' in window)) {
                toast.error('Voice input is not supported in this browser.');
                return;
            }

            const SpeechRecognition = (window as any).webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            (window as any).recognition = recognition; // store ref to stop later

            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onstart = () => {
                setIsRecording(true);
                toast('Listening...', { icon: '🎙️' });
            };

            recognition.onresult = (event: any) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    setAnswer(prev => prev + ' ' + finalTranscript);
                }
            };

            recognition.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                setIsRecording(false);
            };

            recognition.onend = () => {
                setIsRecording(false);
            };

            recognition.start();
        }
    }, [isRecording]);

    const handleSubmitAnswer = async () => {
        if (!answer.trim() || !currentQuestion) return;

        setAnalyzing(true);
        try {
            const response = await fetch('/api/interview/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questionId: currentQuestion._id,
                    answer: answer.trim(),
                    jobId // Pass jobId for score update
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

                // Update session score if returned
                if (data.newReadinessScore !== undefined && session) {
                    setSession(prev => prev ? { ...prev, readinessScore: data.newReadinessScore } : null);
                    toast.success(`Readiness Score updated to ${data.newReadinessScore}%!`);
                } else {
                    toast.success('Answer analyzed!');
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
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setAnswer('');
        } else {
            // Check if there is a next module
            // We need to know the current module index from the session data
            // Since we only have questions here, we can infer from the current question's module ID
            // But we filtered the questions list to only show the CURRENT module.
            // So we need to look at the FULL session module list to find what's next.

            // This requires us to store the full module list in state or infer it. 
            // Ideally `session` object should have it, or we fetch it.
            // Let's assume we can fetch/find it from the session data we got in init.
            // Since we didn't store the full module list in `session` state (we only stored basic info), 
            // we might need to improve how we store session data or just navigate back to hub for now 
            // if we can't easily determine the next one.

            // However, to fulfill the request, let's try to find the next module ID.
            // We can look at `session.modules` if we saved it? We didn't.
            // Let's update `fetchData` to save modules to state, OR
            // simplified approach: Navigate back to hub with a success message/toast?

            // BETTER: Let's fetch the full order in `fetchData` and store it.
            // But that requires another large change. 
            // Quickest wins:
            // 1. If we have multiple modules, maybe query param `moduleId` can be switched.
            // Let's assume for now we go back to hub, but user asked for "Next Module".

            // Actually, `sessionData.interviewCoach.modules` was available in `fetchData`. 
            // Let's assume `session` has been updated to include modules list or we add a new state `modules`.
            // I will add a `modules` state to the component.

            if (nextModuleId) {
                router.push(`/interview-coach/${jobId}/practice?moduleId=${nextModuleId}`);
            } else {
                router.push(`/interview-coach/${jobId}`);
                toast.success('All modules completed! Great job!');
            }
        }
    };

    // Need to add `modules` state to store module order
    const [modules, setModules] = useState<any[]>([]);

    // Computed next module
    const currentModuleIndex = modules.findIndex(m => m.id === moduleId);
    const nextModuleId = (currentModuleIndex >= 0 && currentModuleIndex < modules.length - 1)
        ? modules[currentModuleIndex + 1].id
        : null;

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            // setAnswer(questions[currentIndex - 1]?.userAnswer?.text || ''); 
            // Better to load the answer for the new current index
            setAnswer(questions[currentIndex - 1]?.userAnswer?.text || '');
        }
    };

    // Update answer text when switching questions (crucial fix)
    useEffect(() => {
        if (questions[currentIndex]) {
            setAnswer(questions[currentIndex].userAnswer?.text || '');
        }
    }, [currentIndex, questions]);


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
                {/* Back & Progress Header */}
                <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Hub
                    </button>

                    {/* Progress Dots */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                        {questions.map((q, i) => {
                            const isCompleted = q.userAnswer?.status === 'analyzed';
                            const isCurrent = i === currentIndex;
                            return (
                                <button
                                    key={q._id}
                                    onClick={() => setCurrentIndex(i)}
                                    className={`w-3 h-3 rounded-full transition-colors flex-shrink-0 ${isCurrent ? 'bg-lime-500 scale-125' :
                                        isCompleted ? 'bg-lime-500/50' : 'bg-gray-300 dark:bg-gray-700'
                                        }`}
                                    title={`Question ${i + 1}`}
                                />
                            );
                        })}
                    </div>

                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Question {currentIndex + 1} of {questions.length}
                    </div>
                </div>


                {/* Main 2-Column Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-200px)] min-h-[600px]">

                    {/* LEFT COLUMN: Question + Input */}
                    <div className="flex flex-col gap-6 h-full overflow-y-auto pr-2">
                        {/* Question Card */}
                        <motion.div
                            key={currentQuestion._id} // Animate on change
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white dark:bg-[#141810] rounded-2xl p-8 shadow-md"
                        >
                            <div className="flex flex-wrap gap-2 mb-4">
                                {currentQuestion.content.tags.map((tag, i) => (
                                    <span key={i} className="px-3 py-1 text-xs font-semibold bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300 rounded-full uppercase">
                                        {tag}
                                    </span>
                                ))}
                                {currentQuestion.isHighRelevance && (
                                    <span className="px-3 py-1 text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full uppercase flex items-center gap-1">
                                        <Sparkles className="w-3 h-3" /> High Relevance
                                    </span>
                                )}
                            </div>

                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
                                {currentQuestion.content.question}
                            </h1>
                        </motion.div>

                        {/* Input Area */}
                        <div className="bg-white dark:bg-[#141810] rounded-2xl p-6 shadow-md flex-1 flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Mic className={`w-5 h-5 ${isRecording ? 'text-red-500 animate-pulse' : ''}`} />
                                    Your Answer
                                </h3>
                                <span className={`text-xs px-2 py-1 rounded ${isRecording ? 'bg-red-100 text-red-600' : 'text-gray-400'}`}>
                                    {isRecording ? 'Listening...' : 'Draft Mode'}
                                </span>
                            </div>

                            <div className="relative flex-1">
                                <textarea
                                    value={answer}
                                    onChange={(e) => setAnswer(e.target.value)}
                                    placeholder="Click the microphone to start speaking, or type your answer here..."
                                    className="w-full h-full p-4 bg-gray-50 dark:bg-[#1a230f] border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-lime-500 text-lg leading-relaxed"
                                />
                                <button
                                    onClick={toggleRecording}
                                    className={`absolute bottom-4 right-4 p-3 rounded-full shadow-lg transition-all ${isRecording
                                        ? 'bg-red-500 text-white animate-pulse scale-110'
                                        : 'bg-lime-500 text-black hover:bg-lime-400'
                                        }`}
                                >
                                    <Mic className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="flex items-center justify-between mt-6">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handlePrevious}
                                        disabled={currentIndex === 0}
                                        className="px-4 py-2 text-gray-500 hover:text-gray-700 disabled:opacity-30 transition-colors"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={handleNext}
                                        disabled={currentIndex === questions.length - 1 && !nextModuleId}
                                        className={`px-4 py-2 font-medium rounded-lg disabled:opacity-30 transition-colors ${currentIndex === questions.length - 1 && nextModuleId
                                                ? 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                            }`}
                                    >
                                        {currentIndex === questions.length - 1 && nextModuleId ? 'Next Module →' : 'Skip'}
                                    </button>
                                </div>

                                <button
                                    onClick={handleSubmitAnswer}
                                    disabled={!answer.trim() || analyzing}
                                    className="flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg transition-transform active:scale-95"
                                >
                                    <BarChart3 className="w-5 h-5" />
                                    {analyzing ? 'Analyzing...' : 'Analyze My Answer'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Insights & Feedback */}
                    <div className="flex flex-col gap-6 h-full overflow-y-auto pr-2 custom-scrollbar">
                        {/* AI Feedback Result (Shows on top if answered) */}
                        {isAnswered && currentQuestion.aiFeedback && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-lime-50 dark:bg-lime-900/10 border border-lime-200 dark:border-lime-800 rounded-2xl p-6 shadow-sm"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-lime-500" />
                                        Assessment
                                    </h3>
                                    <div className="px-3 py-1 bg-lime-500 text-black font-bold rounded-lg text-sm">
                                        Score: {currentQuestion.aiFeedback.score}/100
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Strengths</h4>
                                        <ul className="space-y-1">
                                            {currentQuestion.aiFeedback.strengths.map((s, i) => (
                                                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                                                    <Check className="w-4 h-4 text-lime-600 mt-0.5" /> {s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Improvements</h4>
                                        <ul className="space-y-1">
                                            {currentQuestion.aiFeedback.improvements.map((s, i) => (
                                                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                                                    <span className="text-orange-500 mt-0.5">•</span> {s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </motion.div>
                        )}


                        {/* Context: Why Asked */}
                        <div className="bg-white dark:bg-[#141810] rounded-2xl p-6 shadow-sm border-l-4 border-yellow-400">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                <Lightbulb className="w-5 h-5 text-yellow-500" />
                                Why this is asked
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                {currentQuestion.content.whyAsked || 'This question assesses your ability to handle specific scenarios relevant to the role.'}
                            </p>
                        </div>

                        {/* Context: Your Edge */}
                        <div className="bg-white dark:bg-[#141810] rounded-2xl p-6 shadow-sm border-l-4 border-blue-500">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-blue-500" />
                                Your Edge
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                {currentQuestion.edgeTip?.content || currentQuestion.content.tags.includes('behavioral')
                                    ? 'Focus on your past experiences where you demonstrated this skill.'
                                    : 'Highlight your technical proficiency and problem-solving approach.'}
                            </p>
                        </div>

                        {/* Context: Sample Script */}
                        <div className="bg-white dark:bg-[#141810] rounded-2xl p-6 shadow-sm border-l-4 border-purple-500 flex-1">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-purple-500" />
                                    Sample Script
                                </h3>
                                <button onClick={copySampleScript} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors" title="Copy script">
                                    <Copy className="w-4 h-4 text-gray-400" />
                                </button>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-[#1C2217] rounded-xl text-sm text-gray-600 dark:text-gray-400 italic leading-relaxed">
                                {currentQuestion.aiFeedback?.improvedScript || currentQuestion.content?.tags.includes('behavioral')
                                    ? (currentQuestion.aiFeedback?.improvedScript || '"Use the STAR method: Situation, Task, Action, Result. Be specific about your role and the impact you made."')
                                    : '"Start with a high-level summary, then dive into the details. Use specific examples if possible."'}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default PracticeInterface;
