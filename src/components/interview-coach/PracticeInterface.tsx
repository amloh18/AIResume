'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Bell, Check, ChevronDown, Clock, Copy, FileText, Lightbulb, Mic, Lock, Settings, Sparkles, TrendingUp, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSession } from 'next-auth/react';

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

const PracticeInterface: React.FC<PracticeInterfaceProps> = ({ userId, jobId, moduleId, initialQuestionId }) => {
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
    const [showTranscript, setShowTranscript] = useState(true);

    const fetchData = useCallback(async (action: 'fetch' | 'generate' = 'fetch') => {
        try {
            const sessionRes = await fetch('/api/interview/initiate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId, action })
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
                        targetRole: sessionData.interviewCoach.targetRole || 'Candidate'
                    });

                    let qs = (ic.questions || []).map((q: any) => ({
                        _id: q.id,
                        moduleId: ic.modules?.find((m: any) => m.questionIds?.includes(q.id))?.id || 'unknown',
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
                        isHighRelevance: q.isHighRelevance
                    }));

                    if (moduleId) {
                        const targetId = moduleId.trim();
                        const filtered = qs.filter((q: any) => q.moduleId === targetId || q.moduleId?.trim() === targetId);
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
    }, [jobId, moduleId, router]);

    useEffect(() => {
        fetchData('fetch');
    }, [fetchData]);

    const currentQuestion = questions[currentIndex];
    const isAnswered = currentQuestion?.userAnswer?.status === 'analyzed';
    const isLocked = userPlanKey === 'free' && currentIndex > 0;

    // Mic / Speech Recognition Logic
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isRecording) {
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isRecording]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const toggleRecording = useCallback(async () => {
        if (isRecording && mediaRecorder) {
            mediaRecorder.stop();
            setIsRecording(false);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: BlobPart[] = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            recorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());
                
                setIsTranscribing(true);
                try {
                    const formData = new FormData();
                    formData.append('audio', blob, 'recording.webm');
                    
                    const response = await fetch('/api/ai/transcribe', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const data = await response.json();
                    if (data.success && data.text) {
                        setAnswer(prev => prev + (prev ? ' ' : '') + data.text);
                        if (data.toneAnalysis) {
                            toast.success(`Tone: ${data.toneAnalysis.tone} | Pace: ${data.toneAnalysis.pace}`, {
                                icon: '🎙️',
                                duration: 4000
                            });
                        }
                    } else {
                        toast.error(data.error || 'Failed to transcribe audio');
                    }
                } catch (error) {
                    console.error('Transcription error:', error);
                    toast.error('Failed to process audio recording');
                } finally {
                    setIsTranscribing(false);
                }
            };

            setRecordingTime(0);
            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
        } catch (err) {
            console.error('Error accessing microphone:', err);
            toast.error('Could not access microphone. Please check permissions.');
        }
    }, [isRecording, mediaRecorder]);

    const handleSubmitAnswer = async () => {
        if (!answer.trim() || analyzing) return;

        setAnalyzing(true);
        try {
            const response = await fetch('/api/interview/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobId,
                    questionId: currentQuestion._id,
                    answer
                })
            });
            const data = await response.json();

            if (data.success) {
                setQuestions(prev => prev.map(q =>
                    q._id === currentQuestion._id
                        ? {
                            ...q,
                            userAnswer: { text: answer, status: 'analyzed' },
                            aiFeedback: data.feedback
                        }
                        : q
                ));

                if (data.newReadinessScore !== undefined && session) {
                    setSession(prev => prev ? { ...prev, readinessScore: data.newReadinessScore } : null);
                }

                if (data.streakEvent) {
                    if (data.streakEvent.type === 'continued') {
                        toast.success(`Streak extended! You are on a ${data.streakEvent.currentStreak}-day streak 🔥`, { icon: '🔥' });
                    } else if (data.streakEvent.type === 'reset') {
                        toast('Oh no! You missed ' + data.streakEvent.missedDays + ' days. Your streak is back to 1.', { icon: '⚠️' });
                    } else if (data.streakEvent.type === 'started') {
                        toast.success('You started your interview prep streak! Day 1 🔥', { icon: '🔥' });
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
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            const currentModuleIndex = modules.findIndex(m => m.id === moduleId);
            const nextModuleId = (currentModuleIndex >= 0 && currentModuleIndex < modules.length - 1)
                ? modules[currentModuleIndex + 1].id
                : null;

            if (nextModuleId) {
                router.push(`/dashboard/interview/${jobId}/practice?moduleId=${nextModuleId}`);
            } else {
                router.push(`/dashboard/interview/${jobId}`);
                toast.success('All modules completed! Great job!');
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
        }
    }, [currentIndex, questions]);

    const copySampleScript = () => {
        if (currentQuestion?.aiFeedback?.improvedScript) {
            navigator.clipboard.writeText(currentQuestion.aiFeedback.improvedScript);
            toast.success('Script copied to clipboard!');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen app-page-bg flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    if (!questions.length) {
        return (
            <div className="min-h-screen app-page-bg flex flex-col items-center justify-center p-6 text-center">
                <h2 className="text-h2 font-bold text-gray-900 dark:text-white mb-4">No Questions Found</h2>
                <button onClick={() => router.push(`/dashboard/interview/${jobId}`)} className="px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors">
                    Back to Plan
                </button>
            </div>
        );
    }

    return (
        <div className="h-macro app-page-bg flex flex-col font-sans overflow-hidden">
            {/* Header matching Image 2 */}
            <div className="bg-white dark:bg-[#141810] border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 shadow-sm sticky top-0 z-10">
                <button
                    onClick={() => router.push(`/dashboard/interview/${jobId}`)}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors font-medium text-small"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Back to Plan</span>
                </button>
                
                {/* Progress Dots / Steps */}
                <div className="flex-1 flex items-center justify-center max-w-3xl mx-auto px-4 overflow-hidden">
                    <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-hide pb-1 pt-1 px-2 mask-edges">
                        {questions.map((q, i) => {
                            const isCompleted = q.userAnswer?.status === 'analyzed';
                            const isCurrent = i === currentIndex;
                            const isLockedStep = userPlanKey === 'free' && i > 0;
                            
                            return (
                                <React.Fragment key={q._id}>
                                    {i > 0 && <div className={`w-4 sm:w-8 h-[2px] rounded-full flex-shrink-0 transition-colors ${isCompleted || isCurrent ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-800'}`} />}
                                    <button
                                        onClick={() => setCurrentIndex(i)}
                                        disabled={isLockedStep}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-small font-bold transition-all flex-shrink-0 ${
                                            isLockedStep ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 opacity-50 cursor-not-allowed border border-gray-200 dark:border-gray-700' :
                                            isCurrent ? 'bg-white dark:bg-gray-900 text-purple-600 border-2 border-purple-600 shadow-md scale-110' :
                                            isCompleted ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm' : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-purple-400'
                                        }`}
                                        title={`Question ${i + 1}`}
                                    >
                                        {isLockedStep ? <Lock className="w-3 h-3" /> : isCompleted && !isCurrent ? <Check className="w-4 h-4" strokeWidth={3} /> : (i + 1)}
                                    </button>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-1.5 text-small text-gray-500 dark:text-gray-400">
                        <Check className="w-4 h-4" />
                        <span>Saved just now</span>
                    </div>
                    <button className="relative p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-purple-600 rounded-full border-2 border-white dark:border-[#141810]"></span>
                    </button>
                    {authSession?.user?.image ? (
                        <img src={authSession.user.image} alt="User" className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700" />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 font-bold text-small">
                            {authSession?.user?.name?.charAt(0) || 'U'}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8 overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 h-full min-h-[600px]">
                    
                    {/* LEFT COLUMN: Question + Input */}
                    <div className="col-span-1 lg:col-span-7 flex flex-col gap-6 h-full overflow-y-auto pr-2 scrollbar-hide pb-20 lg:pb-0">
                        
                        {isLocked ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white dark:bg-[#141810] rounded-2xl p-10 shadow-sm text-center flex-1 flex flex-col items-center justify-center border border-gray-200 dark:border-gray-800"
                            >
                                <div className="w-20 h-20 bg-purple-50 dark:bg-purple-900/20 rounded-full flex items-center justify-center mb-6">
                                    <Lock className="w-10 h-10 text-purple-600" />
                                </div>
                                <h2 className="text-h2 font-bold text-gray-900 dark:text-white mb-3">Unlock Full Interview Practice</h2>
                                <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
                                    Free users can practice one question to experience the AI Interview Coach. Upgrade to Pro to unlock unlimited questions, modules, and deep career analysis.
                                </p>
                                <button 
                                    onClick={() => router.push('/dashboard/settings?tab=billing')}
                                    className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/20 transition-all active:scale-95"
                                >
                                    Upgrade to Pro
                                </button>
                            </motion.div>
                        ) : (
                            <>
                                {/* Question Section */}
                                <motion.div
                                    key={`q-${currentQuestion._id}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white dark:bg-[#141810] rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-800"
                                >
                                    <div className="flex flex-wrap gap-2 mb-5">
                                        <span className="px-3 py-1 text-small font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-md tracking-wide uppercase">
                                            QUESTION {currentIndex + 1} OF {questions.length}
                                        </span>
                                        {currentQuestion.content.tags.map((tag, i) => (
                                            <span key={i} className="px-3 py-1 text-small font-bold bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 rounded-md tracking-wide uppercase">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>

                                    <h1 className="text-h2 sm:text-h1 font-extrabold text-gray-900 dark:text-white leading-snug mb-6">
                                        {currentQuestion.content.question}
                                    </h1>

                                    <button 
                                        onClick={() => setShowWhyAsked(!showWhyAsked)}
                                        className="flex items-center gap-2 text-small font-medium text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                                    >
                                        <Lightbulb className="w-4 h-4" />
                                        Why is this question asked?
                                        <ChevronDown className={`w-4 h-4 transition-transform ${showWhyAsked ? 'rotate-180' : ''}`} />
                                    </button>

                                    <AnimatePresence>
                                        {showWhyAsked && (
                                            <motion.div 
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <p className="mt-4 text-small text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl leading-relaxed">
                                                    {currentQuestion.content.whyAsked || 'This question assesses your ability to handle specific scenarios relevant to the role.'}
                                                </p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>

                                {/* Response Area */}
                                <div className="bg-white dark:bg-[#141810] rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-800 flex-1 flex flex-col min-h-[350px]">
                                    {!isAnswered && !answer && !isRecording ? (
                                        // Empty State (Image 3)
                                        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                                            <div className="relative mb-6">
                                                <div className="absolute inset-0 bg-purple-100 dark:bg-purple-900/20 rounded-full scale-[2] blur-xl opacity-50"></div>
                                                <div className="w-20 h-20 bg-purple-50 dark:bg-purple-900/30 rounded-full flex items-center justify-center relative z-10 shadow-sm border border-purple-100 dark:border-purple-800">
                                                    <Mic className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                                                </div>
                                            </div>
                                            <h3 className="text-h3 font-bold text-gray-900 dark:text-white mb-2">Your response area is ready!</h3>
                                            <p className="text-gray-500 dark:text-gray-400 mb-10 max-w-sm">
                                                Click the microphone to start speaking. You can speak naturally, and we'll transcribe it for you.
                                            </p>
                                            
                                            <div className="flex items-center gap-4 w-full max-w-md">
                                                <button className="flex-1 py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700 font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                                                    <Settings className="w-4 h-4" />
                                                    Mic Settings
                                                </button>
                                                <div className="flex flex-col items-center gap-2">
                                                    <button 
                                                        onClick={toggleRecording}
                                                        className="w-16 h-16 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/30 flex items-center justify-center transition-transform active:scale-95"
                                                    >
                                                        <Mic className="w-8 h-8" />
                                                    </button>
                                                    <span className="text-small font-medium text-gray-500">Press to speak</span>
                                                </div>
                                                <button 
                                                    onClick={() => setAnswer(' ')} // Just to trigger text mode
                                                    className="flex-1 py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700 font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                    Type Response
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        // Filled / Recording State (Image 1 style)
                                        <div className="flex-1 flex flex-col">
                                            <div className="flex items-center justify-between mb-6">
                                                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                                    Your Response
                                                    {isAnswered && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-small rounded-md">Completed</span>}
                                                    {isRecording && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-small rounded-md animate-pulse">Recording</span>}
                                                    {isTranscribing && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-small rounded-md animate-pulse">Processing</span>}
                                                </h3>
                                                <div className="flex items-center gap-1.5 text-gray-500 font-medium">
                                                    <span>{formatTime(recordingTime)}</span>
                                                    <Clock className="w-4 h-4" />
                                                </div>
                                            </div>

                                            {/* Audio Waveform Area */}
                                            <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                                <button 
                                                    onClick={toggleRecording}
                                                    className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-all shadow-md ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-purple-600 hover:bg-purple-700'}`}
                                                >
                                                    {isRecording ? <div className="w-4 h-4 bg-white rounded-sm" /> : <Mic className="w-5 h-5" />}
                                                </button>
                                                
                                                <div className="flex-1 h-8 flex items-center gap-1 opacity-60">
                                                    {/* Fake waveform */}
                                                    {[...Array(40)].map((_, i) => (
                                                        <div 
                                                            key={i} 
                                                            className={`w-1 rounded-full bg-purple-500 ${isRecording ? 'animate-pulse' : ''}`}
                                                            style={{ 
                                                                height: `${Math.max(20, Math.random() * 100)}%`,
                                                                animationDelay: `${i * 0.05}s`
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                                <span className="text-small font-bold text-gray-400">1x</span>
                                            </div>

                                            <button 
                                                onClick={() => setShowTranscript(!showTranscript)}
                                                className="flex items-center gap-2 text-small font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 transition-colors mb-3 w-max"
                                            >
                                                View Transcript
                                                <ChevronDown className={`w-4 h-4 transition-transform ${showTranscript ? 'rotate-180' : ''}`} />
                                            </button>

                                            <AnimatePresence>
                                                {showTranscript && (
                                                    <motion.div 
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="flex-1 flex flex-col min-h-[150px]"
                                                    >
                                                        <textarea
                                                            value={answer}
                                                            onChange={(e) => setAnswer(e.target.value)}
                                                            disabled={isAnswered || analyzing}
                                                            placeholder="Start typing your response here..."
                                                            className="flex-1 w-full p-5 bg-white dark:bg-[#1a230f] border border-gray-200 dark:border-gray-700 rounded-2xl text-gray-800 dark:text-gray-200 text-body leading-relaxed resize-none focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all disabled:bg-gray-50 dark:disabled:bg-gray-800/30"
                                                        />
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            <div className="flex items-center gap-3 mt-6">
                                                {!isAnswered ? (
                                                    <button
                                                        onClick={handleSubmitAnswer}
                                                        disabled={!answer.trim() || analyzing || isRecording || isTranscribing}
                                                        className="flex-1 py-3.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                                                    >
                                                        {analyzing ? (
                                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <Sparkles className="w-5 h-5" />
                                                        )}
                                                        {analyzing ? 'Analyzing Response...' : 'Analyze My Answer'}
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button 
                                                            onClick={() => {
                                                                // Reset answer to try again
                                                                const updatedQuestions = [...questions];
                                                                updatedQuestions[currentIndex] = {
                                                                    ...updatedQuestions[currentIndex],
                                                                    userAnswer: undefined,
                                                                    aiFeedback: undefined
                                                                };
                                                                setQuestions(updatedQuestions);
                                                                setAnswer('');
                                                            }}
                                                            className="flex-1 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <Mic className="w-5 h-5" /> Record Again
                                                        </button>
                                                        <button 
                                                            className="flex-1 py-3.5 border border-gray-200 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                                                        >
                                                            <FileText className="w-5 h-5" /> Type Response
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Bottom Navigation */}
                                <div className="flex items-center justify-between mt-4">
                                    <button
                                        onClick={handlePrevious}
                                        disabled={currentIndex === 0}
                                        className="px-5 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors flex items-center gap-2"
                                    >
                                        <ArrowLeft className="w-4 h-4" /> Previous Question
                                    </button>
                                    
                                    <button
                                        onClick={handleNext}
                                        className="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors shadow-md flex items-center gap-2"
                                    >
                                        {currentIndex === questions.length - 1 ? 'Finish Module' : 'Next Question'}
                                        <ArrowLeft className="w-4 h-4 rotate-180" />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* RIGHT COLUMN: Insights & Feedback */}
                    <div className="col-span-1 lg:col-span-5 flex flex-col gap-6 h-full overflow-y-auto pr-2 scrollbar-hide pb-20 lg:pb-0">
                        
                        {/* Overall Score Card */}
                        <div className="bg-white dark:bg-[#141810] rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-800">
                            <h3 className="text-h3 font-bold text-gray-900 dark:text-white mb-6">Overall Score</h3>
                            
                            {!isAnswered || !currentQuestion?.aiFeedback ? (
                                // Empty Score State
                                <>
                                    <div className="flex items-center gap-6 mb-8">
                                        <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center">
                                            <span className="text-h1 font-bold text-gray-400">--</span>
                                        </div>
                                        <div>
                                            <h4 className="text-h3 font-bold text-gray-700 dark:text-gray-300 mb-1">Complete your response</h4>
                                            <p className="text-small text-gray-500 max-w-[200px] leading-relaxed">
                                                Your score and detailed analysis will appear here after you submit your response.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-5 gap-2 border-t border-gray-100 dark:border-gray-800 pt-6">
                                        {[
                                            { label: 'Clarity', icon: <Sparkles className="w-4 h-4 text-purple-400" /> },
                                            { label: 'Structure', icon: <Check className="w-4 h-4 text-green-400" /> },
                                            { label: 'Impact', icon: <Zap className="w-4 h-4 text-orange-400" /> },
                                            { label: 'Relevance', icon: <TrendingUp className="w-4 h-4 text-blue-400" /> },
                                            { label: 'Confidence', icon: <Lightbulb className="w-4 h-4 text-amber-400" /> }
                                        ].map((stat, i) => (
                                            <div key={i} className="text-center flex flex-col items-center">
                                                <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center mb-2">
                                                    {stat.icon}
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{stat.label}</span>
                                                <span className="text-small font-bold text-gray-400">-- / 10</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                // Filled Score State
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                                    <div className="flex items-center gap-6 mb-8">
                                        <div className="relative w-24 h-24 flex items-center justify-center">
                                            {/* SVG Circle Chart */}
                                            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                                                <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100 dark:text-gray-800" />
                                                <circle 
                                                    cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="8" fill="transparent" 
                                                    strokeDasharray="276.46" 
                                                    strokeDashoffset={276.46 - (276.46 * (currentQuestion.aiFeedback.score / 100))}
                                                    className="text-green-500 transition-all duration-1000 ease-out" 
                                                />
                                            </svg>
                                            <div className="text-center relative z-10 flex flex-col items-center justify-center mt-1">
                                                <span className="text-h1 font-black text-gray-900 dark:text-white leading-none">{(currentQuestion.aiFeedback.score / 10).toFixed(1)}</span>
                                                <span className="text-[10px] font-bold text-gray-500 uppercase mt-1">/ 10</span>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-h3 font-bold text-green-600 dark:text-green-400 mb-1 flex items-center gap-2">
                                                {currentQuestion.aiFeedback.score >= 80 ? 'Great Response! 🎉' : currentQuestion.aiFeedback.score >= 60 ? 'Good Effort! 👍' : 'Needs Work 🛠️'}
                                            </h4>
                                            <p className="text-small text-gray-600 dark:text-gray-400 leading-relaxed">
                                                {currentQuestion.aiFeedback.feedback_summary || 'You demonstrated strong skills in most areas. Keep refining for even more impact.'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-5 gap-2 border-t border-gray-100 dark:border-gray-800 pt-6">
                                        {[
                                            { label: 'Clarity', val: 8.5, icon: <Sparkles className="w-4 h-4 text-purple-500" />, bg: 'bg-purple-50 dark:bg-purple-900/20' },
                                            { label: 'Structure', val: 8.0, icon: <Check className="w-4 h-4 text-green-500" />, bg: 'bg-green-50 dark:bg-green-900/20' },
                                            { label: 'Impact', val: 8.5, icon: <Zap className="w-4 h-4 text-orange-500" />, bg: 'bg-orange-50 dark:bg-orange-900/20' },
                                            { label: 'Relevance', val: 8.0, icon: <TrendingUp className="w-4 h-4 text-blue-500" />, bg: 'bg-blue-50 dark:bg-blue-900/20' },
                                            { label: 'Confidence', val: 8.0, icon: <Lightbulb className="w-4 h-4 text-amber-500" />, bg: 'bg-amber-50 dark:bg-amber-900/20' }
                                        ].map((stat, i) => (
                                            <div key={i} className="text-center flex flex-col items-center">
                                                <div className={`w-8 h-8 rounded-full ${stat.bg} flex items-center justify-center mb-2`}>
                                                    {stat.icon}
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{stat.label}</span>
                                                <span className="text-small font-bold text-gray-900 dark:text-white">{stat.val} <span className="text-gray-400 text-small">/10</span></span>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* AI Insights Card */}
                        <div className="bg-white dark:bg-[#141810] rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-800 flex-1">
                            <h3 className="text-h3 font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-blue-500" />
                                AI Insights
                            </h3>
                            <p className="text-small text-gray-500 dark:text-gray-400 mb-6">
                                {!isAnswered ? "Hints and tips to help you craft your response." : "Here's what stood out and what you can improve."}
                            </p>

                            <AnimatePresence mode="wait">
                                {!isAnswered || !currentQuestion?.aiFeedback ? (
                                    // Hints State (Before Answer)
                                    <motion.div
                                        key="hints"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="space-y-4"
                                    >
                                        <div className="p-5 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                                            <h4 className="text-small font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                                                <Sparkles className="w-4 h-4" /> Your Edge
                                            </h4>
                                            <p className="text-small text-blue-700 dark:text-blue-400/80 leading-relaxed">
                                                {currentQuestion.edgeTip?.content || currentQuestion.content.tags.includes('behavioral')
                                                    ? 'Focus on your past experiences where you demonstrated this skill.'
                                                    : 'Highlight your technical proficiency and problem-solving approach.'}
                                            </p>
                                        </div>

                                        <div className="p-5 rounded-2xl bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-small font-bold text-purple-800 dark:text-purple-300 flex items-center gap-2">
                                                    <FileText className="w-4 h-4" /> Sample Framework
                                                </h4>
                                            </div>
                                            <p className="text-small text-purple-700 dark:text-purple-400/80 italic leading-relaxed">
                                                {currentQuestion.content?.tags.includes('behavioral')
                                                    ? '"Use the STAR method: Situation, Task, Action, Result. Be specific about your role and the impact you made."'
                                                    : '"Start with a high-level summary, then dive into the details. Use specific examples if possible."'}
                                            </p>
                                        </div>
                                    </motion.div>
                                ) : (
                                    // Analysis State (After Answer)
                                    <motion.div
                                        key="analysis"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="space-y-4"
                                    >
                                        <div className="p-5 rounded-2xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30">
                                            <h4 className="text-small font-bold text-green-800 dark:text-green-400 mb-3 flex items-center gap-2">
                                                <Check className="w-4 h-4" /> What You Did Well
                                            </h4>
                                            <ul className="space-y-2">
                                                {currentQuestion.aiFeedback.strengths.map((s, i) => (
                                                    <li key={i} className="text-small text-green-700 dark:text-green-300/90 flex items-start gap-2">
                                                        <Check className="w-4 h-4 mt-0.5 flex-shrink-0" /> 
                                                        <span className="leading-relaxed">{s}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="p-5 rounded-2xl bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30">
                                            <h4 className="text-small font-bold text-orange-800 dark:text-orange-400 mb-3 flex items-center gap-2">
                                                <TrendingUp className="w-4 h-4" /> Areas to Improve
                                            </h4>
                                            <ul className="space-y-2">
                                                {currentQuestion.aiFeedback.improvements.map((s, i) => (
                                                    <li key={i} className="text-small text-orange-700 dark:text-orange-300/90 flex items-start gap-2">
                                                        <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0" /> 
                                                        <span className="leading-relaxed">{s}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {(currentQuestion.aiFeedback.your_edge || currentQuestion.aiFeedback.improvedScript) && (
                                            <div className="p-5 rounded-2xl bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-900/30 relative group">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h4 className="text-small font-bold text-purple-800 dark:text-purple-400 flex items-center gap-2">
                                                        <Sparkles className="w-4 h-4" /> Coach Tip & Edge
                                                    </h4>
                                                    <button onClick={copySampleScript} className="p-1.5 hover:bg-purple-200 dark:hover:bg-purple-800 rounded-lg transition-colors text-purple-600 dark:text-purple-400" title="Copy script">
                                                        <Copy className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <p className="text-small text-purple-700 dark:text-purple-300/90 leading-relaxed mb-3 font-medium">
                                                    {currentQuestion.aiFeedback.your_edge}
                                                </p>
                                                {currentQuestion.aiFeedback.improvedScript && (
                                                    <p className="text-small text-purple-700 dark:text-purple-300/80 italic leading-relaxed border-l-2 border-purple-300 dark:border-purple-700 pl-3">
                                                        "{currentQuestion.aiFeedback.improvedScript}"
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        
                        {/* Next Steps (Static mockup to match design) */}
                        <div className="bg-white dark:bg-[#141810] rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-800">
                            <h3 className="text-h3 font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-purple-500" />
                                Suggested Next Steps
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                <div className="p-4 border border-gray-100 dark:border-gray-800 rounded-xl hover:border-purple-300 cursor-pointer transition-colors group">
                                    <h4 className="text-small font-bold text-purple-600 dark:text-purple-400 mb-1 flex items-center justify-between">
                                        Practice Similar
                                        <ArrowLeft className="w-3 h-3 rotate-180 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </h4>
                                    <p className="text-[11px] text-gray-500 leading-tight">Another stakeholder scenario</p>
                                </div>
                                <div className="p-4 border border-gray-100 dark:border-gray-800 rounded-xl hover:border-purple-300 cursor-pointer transition-colors group">
                                    <h4 className="text-small font-bold text-purple-600 dark:text-purple-400 mb-1 flex items-center justify-between">
                                        Improve Skill
                                        <ArrowLeft className="w-3 h-3 rotate-180 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </h4>
                                    <p className="text-[11px] text-gray-500 leading-tight">Influencing & Negotiation</p>
                                </div>
                                <div className="p-4 border border-gray-100 dark:border-gray-800 rounded-xl hover:border-purple-300 cursor-pointer transition-colors group md:col-span-2 lg:col-span-1">
                                    <h4 className="text-small font-bold text-purple-600 dark:text-purple-400 mb-1 flex items-center justify-between">
                                        Mock Interview
                                        <ArrowLeft className="w-3 h-3 rotate-180 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </h4>
                                    <p className="text-[11px] text-gray-500 leading-tight">Full-length simulation</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default PracticeInterface;