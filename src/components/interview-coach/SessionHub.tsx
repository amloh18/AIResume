'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Calendar, Edit2, Mic, Download, Lightbulb,
    CheckCircle2, Circle, AlertTriangle, TrendingUp, Clock,
    ChevronRight, User, MapPin
} from 'lucide-react';
import toast from 'react-hot-toast';
import PreparingSessionLoader from './PreparingSessionLoader';
import CompanyLogo from '@/components/ui/CompanyLogo';
import InterviewCoachHeader from './InterviewCoachHeader';

interface SessionHubProps {
    userId: string;
    jobId: string;
}

interface Session {
    _id: string;
    targetRole: string;
    readinessScore: number;
    modules: Array<{
        id: string;
        title: string;
        type: string;
        status: 'pending' | 'in-progress' | 'completed';
        displayOrder: number;
    }>;
    createdAt: string;
    lastPracticedAt?: string;
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
    userAnswer?: {
        status: string;
    };
    aiFeedback?: {
        score: number;
    };
}

interface Job {
    _id: string;
    jobTitle: string;
    company: string;
    location?: string;
    companyLogo?: string;
}

const SessionHub: React.FC<SessionHubProps> = ({ userId, jobId }) => {
    const router = useRouter();
    const [session, setSession] = useState<Session | null>(null);
    const [job, setJob] = useState<Job | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [preparing, setPreparing] = useState(false);

    const initSession = useCallback(async () => {
        // setPreparing(true); // Optimization: Skip animation, just load
        try {
            const response = await fetch('/api/interview/initiate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId })
            });

            const data = await response.json();

            if (data.success) {
                // Handle new embedded data format
                if (data.interviewCoach) {
                    const ic = data.interviewCoach;

                    // Map backend data to frontend Session interface
                    setSession({
                        _id: ic.linkedCvId || jobId, // Use jobID as fallback if no linked ID
                        targetRole: job?.jobTitle || 'Candidate', // Fallback title
                        readinessScore: ic.readinessScore || 0,
                        modules: ic.modules.map((m: any, idx: number) => ({
                            id: m.id,
                            title: m.name,
                            type: m.name.toLowerCase().includes('behavioral') ? 'behavioral' :
                                m.name.toLowerCase().includes('technical') ? 'technical' : 'general',
                            status: 'pending',
                            displayOrder: idx
                        })),
                        createdAt: ic.generatedAt,
                        lastPracticedAt: ic.generatedAt
                    });

                    // Directly set questions from the monolithic response
                    // Map backend question format to frontend Question interface
                    const mappedQuestions = (ic.questions || []).map((q: any) => ({
                        _id: q.id,
                        moduleId: ic.modules.find((m: any) => m.questionIds?.includes(q.id))?.id || 'unknown',
                        content: {
                            question: q.question,
                            whyAsked: q.aiContext?.rationale || '',
                            difficulty: q.difficulty || 'Medium',
                            tags: [q.category]
                        },
                        userAnswer: q.status === 'completed' ? { status: 'analyzed' } : undefined,
                        aiFeedback: q.feedback
                    }));

                    setQuestions(mappedQuestions);
                } else if (data.session) {
                    // Fallback for legacy format if any
                    setSession(data.session);
                    if (data.session?._id) {
                        // convert legacy fetch to internal if needed, but likely we can skip
                    }
                }
            } else {
                console.error('Session init failed:', data.error);
                toast.error(data.error || 'Failed to create session');
                router.push('/dashboard/interview');
            }
        } catch (error) {
            console.error('Failed to init session:', error);
            toast.error('Failed to initialize session');
            router.push('/dashboard/interview');
        } finally {
            // setPreparing(false);
            setLoading(false);
        }
    }, [jobId, job?.jobTitle]); // Added job.jobTitle dependency for session mapping

    const fetchJobDetails = async () => {
        try {
            const response = await fetch(`/api/jobs?id=${jobId}`);
            const data = await response.json();
            if (data.success && data.data) {
                setJob(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch job:', error);
        }
    };

    useEffect(() => {
        fetchJobDetails();
        initSession();
    }, [jobId, initSession]);

    const handleStartPractice = (moduleId?: string) => {
        router.push(`/interview-coach/${jobId}/practice${moduleId ? `?module=${moduleId}` : ''}`);
    };

    const handleBack = () => {
        router.push('/dashboard/interview');
    };

    // Show preparing loader
    if (preparing) {
        return <PreparingSessionLoader onComplete={() => setPreparing(false)} />;
    }

    // Still loading
    if (loading) {
        return (
            <div className="min-h-screen app-page-bg flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-lime-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    // Error state
    if (!session && !loading && !preparing) {
        return (
            <div className="min-h-screen app-page-bg flex flex-col items-center justify-center p-4">
                <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
                <h2 className="text-h3 font-bold text-gray-900 dark:text-white mb-2">Could not load session</h2>
                <p className="text-gray-500 text-center max-w-md mb-6">
                    We encountered an issue preparing your interview plan.
                </p>
                <div className="flex gap-4">
                    <button
                        onClick={handleBack}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                    >
                        Go Back
                    </button>
                    <button
                        onClick={() => initSession()}
                        className="px-4 py-2 bg-lime-500 text-black font-semibold rounded-lg hover:bg-lime-400"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // Group questions by module
    const questionsByModule: Record<string, Question[]> = {};
    questions.forEach(q => {
        if (!questionsByModule[q.moduleId]) {
            questionsByModule[q.moduleId] = [];
        }
        questionsByModule[q.moduleId].push(q);
    });

    const getModuleIcon = (type: string) => {
        switch (type) {
            case 'behavioral': return '👥';
            case 'technical': return '🔧';
            case 'system-design': return '🏗️';
            case 'leadership': return '🎯';
            default: return '📋';
        }
    };

    return (
        <div className="min-h-screen app-page-bg flex flex-col">
            <InterviewCoachHeader />
            <div className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full">
                {/* Header */}
                <div className="mb-8 flex items-start justify-between">
                    <div>
                        <button
                            onClick={handleBack}
                            className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </button>
                        <h1 className="text-h1 md:text-display font-bold text-gray-900 dark:text-white">
                            {job?.jobTitle || session?.targetRole} @ {job?.company}
                        </h1>
                        <div className="flex items-center gap-4 mt-2 text-gray-500 dark:text-gray-400">
                            {session?.lastPracticedAt && (
                                <span className="flex items-center gap-1 text-small">
                                    <Calendar className="w-4 h-4" />
                                    Last practice: {new Date(session.lastPracticedAt).toLocaleDateString()}
                                </span>
                            )}
                            {job?.location && (
                                <span className="flex items-center gap-1 text-small">
                                    <MapPin className="w-4 h-4" />
                                    {job.location}
                                </span>
                            )}
                        </div>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5">
                        <Edit2 className="w-4 h-4" />
                        Edit Job
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content - Learning Path */}
                    <div className="lg:col-span-2 space-y-6">
                        <h2 className="text-h3 font-bold text-gray-900 dark:text-white">Your Learning Path</h2>

                        {/* Modules */}
                        {(session?.modules || []).map((module, index) => {
                            const moduleQuestions = questionsByModule[module.id] || [];
                            const completedCount = moduleQuestions.filter(q => q.userAnswer?.status === 'analyzed').length;

                            return (
                                <motion.div
                                    key={module.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="bg-white dark:bg-[#141810] rounded-2xl p-6 shadow-sm"
                                >
                                    {/* Module Header */}
                                    <div className="flex items-start gap-3 mb-4">
                                        <span className="text-h2">{getModuleIcon(module.type)}</span>
                                        <div>
                                            <h3 className="font-bold text-gray-900 dark:text-white text-h3">
                                                Module {index + 1}: {module.title}
                                            </h3>
                                            <p className="text-small text-gray-500 dark:text-gray-400">
                                                Master {module.type} concepts frequently asked in interviews.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Questions List */}
                                    <div className="space-y-2 mb-4">
                                        {moduleQuestions.slice(0, 3).map((q) => {
                                            const isCompleted = q.userAnswer?.status === 'analyzed';

                                            return (
                                                <div
                                                    key={q._id}
                                                    className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        {isCompleted ? (
                                                            <CheckCircle2 className="w-5 h-5 text-lime-500" />
                                                        ) : (
                                                            <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                                                        )}
                                                        <span className={`text-small flex-1 truncate ${isCompleted ? 'text-gray-500 dark:text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                                            {q.content.question}
                                                        </span>
                                                    </div>
                                                    <button className="text-small text-lime-600 dark:text-lime-400 hover:text-lime-700 flex items-center gap-1">
                                                        Learn More
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Start Practice Button */}
                                    <button
                                        onClick={() => handleStartPractice(module.id)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-lime-500 hover:bg-lime-600 text-black font-semibold rounded-xl transition-colors"
                                    >
                                        <Mic className="w-5 h-5" />
                                        Start Module Practice
                                    </button>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Readiness Score */}
                        <div className="bg-white dark:bg-[#141810] rounded-2xl p-6 shadow-sm">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Your Readiness Score</h3>

                            <div className="flex justify-center mb-4">
                                <div className="relative w-32 h-32">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle
                                            cx="64"
                                            cy="64"
                                            r="56"
                                            stroke="currentColor"
                                            strokeWidth="8"
                                            fill="none"
                                            className="text-gray-200 dark:text-gray-700"
                                        />
                                        <circle
                                            cx="64"
                                            cy="64"
                                            r="56"
                                            stroke="currentColor"
                                            strokeWidth="8"
                                            fill="none"
                                            strokeDasharray={`${(session?.readinessScore || 0) * 3.52} 352`}
                                            strokeLinecap="round"
                                            className="text-lime-500"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-h1 font-bold text-gray-900 dark:text-white">
                                            {session?.readinessScore || 0}%
                                        </span>
                                        <span className="text-small text-gray-500 dark:text-gray-400">READY</span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-small text-gray-500 dark:text-gray-400 text-center mb-4">
                                You're strong in Technical, but System Design needs more structure.
                            </p>

                            <div className="flex items-center justify-center gap-4 text-small text-gray-500 dark:text-gray-400">
                                <span className="flex items-center gap-1">
                                    <TrendingUp className="w-4 h-4 text-lime-500" />
                                    +12% this week
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    Last practice: 2h ago
                                </span>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white dark:bg-[#141810] rounded-2xl p-6 shadow-sm">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                <button
                                    onClick={() => handleStartPractice()}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-lime-500 hover:bg-lime-600 text-black font-semibold rounded-xl transition-colors"
                                >
                                    <Mic className="w-5 h-5" />
                                    Start Practice Session
                                </button>
                                <button className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                    <Download className="w-5 h-5" />
                                    Download Cheat Sheet
                                </button>
                            </div>
                        </div>

                        {/* AI Coach Tips */}
                        <div className="bg-white dark:bg-[#141810] rounded-2xl p-6 shadow-sm">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Lightbulb className="w-5 h-5 text-yellow-500" />
                                AI Coach Tips
                            </h3>
                            <ul className="space-y-3 text-small text-gray-600 dark:text-gray-400">
                                <li className="flex items-start gap-2">
                                    <span className="text-yellow-500 mt-1">•</span>
                                    Remember to ask clarifying questions before diving into code.
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-yellow-500 mt-1">•</span>
                                    Emphasize collaboration in your stories.
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-yellow-500 mt-1">•</span>
                                    For system design, always mention trade-offs explicitly.
                                </li>
                            </ul>
                        </div>

                        {/* Company Info */}
                        {job && (
                            <div className="bg-white dark:bg-[#141810] rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <CompanyLogo company={job.company} size={40} logoUrl={job.companyLogo} jobId={job._id} />
                                    <div>
                                        <h4 className="font-semibold text-gray-900 dark:text-white">{job.company}</h4>
                                        <p className="text-small text-gray-500 dark:text-gray-400">{job.location}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SessionHub;
