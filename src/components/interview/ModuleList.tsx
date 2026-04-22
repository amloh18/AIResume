'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, CheckCircle2, Circle, Lock, Play, BookOpen, Clock, Flame, ChevronRight, Sparkles } from 'lucide-react';

interface Module {
    id: string;
    name: string;
    title?: string; // Legacy support
    description?: string;
    questionIds?: string[];
}

interface Question {
    id: string;
    _id?: string; // Legacy support
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

const ModuleList: React.FC<ModuleListProps> = ({ modules, questionsByModule, jobId }) => {
    const router = useRouter();
    const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
        [modules[0]?.id || '']: true
    });

    const toggleModule = (id: string) => {
        setExpandedModules(prev => ({
            ...prev,
            [id]: !prev[id]
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
                const completedCount = questions.filter(q => isCompleted(q)).length;
                const totalCount = questions.length;
                const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                const isExpanded = expandedModules[module.id];
                const isLocked = false; // Open all for now
                
                // Find the first uncompleted question
                const nextQuestionIndex = questions.findIndex(q => !isCompleted(q));

                return (
                    <div
                        key={module.id}
                        className={`bg-white dark:bg-[#141810] border ${isExpanded ? 'border-green-500/50 ring-1 ring-green-500/20 shadow-sm' : 'border-gray-200 dark:border-gray-800 hover:border-purple-200 dark:hover:border-purple-900/50'
                            } rounded-2xl overflow-hidden transition-all duration-300`}
                    >
                        <button
                            onClick={() => !isLocked && toggleModule(module.id)}
                            className="w-full flex items-start sm:items-center justify-between p-5 md:p-6 cursor-pointer text-left"
                            disabled={isLocked}
                        >
                            <div className="flex items-start sm:items-center gap-4 flex-1">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                    isExpanded 
                                    ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' 
                                    : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                                }`}>
                                    <BookOpen className="w-6 h-6" />
                                </div>
                                <div className="flex-1 pr-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-1">
                                        <h3 className={`text-base md:text-lg font-bold ${isLocked ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                                            {index + 1}. {module.name || module.title}
                                        </h3>
                                        {isExpanded && progress > 0 && progress < 100 && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-green-50 text-green-600 border border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30 w-max">
                                                In Progress
                                            </span>
                                        )}
                                        {isExpanded && progress === 100 && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-600 border border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-900/30 w-max">
                                                Completed
                                            </span>
                                        )}
                                    </div>
                                    
                                    {!isExpanded ? (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xl truncate mt-1">
                                            {module.description || 'Assessing core skills in this competency.'}
                                        </p>
                                    ) : (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-3">
                                            {module.description || 'Assessing core skills in this competency.'}
                                        </p>
                                    )}

                                    {isExpanded && (
                                        <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs font-bold text-gray-500">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 sm:w-24 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                                                </div>
                                                <span className="text-green-600 dark:text-green-500">{progress}%</span>
                                            </div>
                                            <span className="text-gray-300 dark:text-gray-700">|</span>
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5" />
                                                ~{totalCount * 5} min
                                            </div>
                                            <span className="text-gray-300 dark:text-gray-700">|</span>
                                            <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                                                <Flame className="w-3.5 h-3.5" />
                                                High Impact
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-4 pl-2">
                                <span className="text-sm font-bold text-gray-500 whitespace-nowrap hidden sm:block">
                                    {completedCount}/{totalCount} Completed
                                </span>
                                {isLocked ? <Lock className="w-5 h-5 text-gray-300" /> :
                                    isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> :
                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                }
                            </div>
                        </button>

                        <AnimatePresence>
                            {isExpanded && !isLocked && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                >
                                    <div className="px-6 pb-6 space-y-3">
                                        {questions.map((q, qIndex) => {
                                            const questionId = q.id || q._id;
                                            const isDone = isCompleted(q);
                                            const difficulty = getDifficulty(q);
                                            const isNext = qIndex === nextQuestionIndex;

                                            return (
                                                <div
                                                    key={questionId}
                                                    onClick={() => router.push(`/dashboard/interview/practice/${questionId}?jobId=${jobId}`)}
                                                    className={`w-full flex flex-col md:flex-row md:items-center justify-between p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer group ${
                                                        isNext 
                                                        ? 'bg-white dark:bg-[#1a2015] border-purple-100 dark:border-purple-900/30 shadow-sm' 
                                                        : 'bg-white dark:bg-[#141810] border-gray-100 dark:border-gray-800 hover:border-purple-200'
                                                    }`}
                                                >
                                                    <div className="flex items-start sm:items-center gap-4 flex-1 pr-4">
                                                        <div className={`mt-0.5 sm:mt-0 ${
                                                            isDone ? 'text-green-500' 
                                                            : isNext ? 'w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400' 
                                                            : 'text-gray-300 dark:text-gray-600'
                                                        }`}>
                                                            {isDone ? <CheckCircle2 className="w-6 h-6" /> : isNext ? <Play className="w-4 h-4 fill-current ml-0.5" /> : <Circle className="w-6 h-6" />}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className={`text-sm md:text-base ${
                                                                isDone ? 'text-gray-400 dark:text-gray-500 line-through' 
                                                                : isNext ? 'text-gray-900 dark:text-white font-bold' 
                                                                : 'text-gray-700 dark:text-gray-300 font-medium'
                                                            }`}>
                                                                {getQuestionText(q)}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4 mt-4 md:mt-0 pl-12 md:pl-0 w-full md:w-auto justify-between md:justify-end">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[10px] px-2 py-1 font-bold rounded-md uppercase ${
                                                                difficulty.toLowerCase() === 'hard' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                                                                difficulty.toLowerCase() === 'medium' ? 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                                                'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                                                            }`}>
                                                                {difficulty}
                                                            </span>
                                                            {(q.category || q.content?.tags?.[0]) && (
                                                                <span className="text-[10px] px-2 py-1 font-bold rounded-md bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 uppercase hidden sm:inline-block max-w-[120px] truncate">
                                                                    {q.category || q.content?.tags?.[0]}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {isNext ? (
                                                            <button className="px-4 py-2 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 font-bold text-xs rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors whitespace-nowrap">
                                                                Start Answering
                                                            </button>
                                                        ) : (
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                                                                    <Clock className="w-3.5 h-3.5" />
                                                                    {difficulty.toLowerCase() === 'hard' ? '10' : '8'} min
                                                                </span>
                                                                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-purple-400 transition-colors" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    
                                    <div className="border-t border-gray-100 dark:border-gray-800 p-3 flex justify-center bg-gray-50 dark:bg-[#11140e]">
                                        <button className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1 hover:text-purple-700 transition-colors">
                                            <BookOpen className="w-3.5 h-3.5" />
                                            Show module summary
                                            <ChevronDown className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}

            <div className="text-center pt-6 pb-12">
                <p className="text-sm font-medium text-gray-500 flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    Modules are ordered to build your skills step-by-step. Keep going!
                </p>
            </div>
        </div>
    );
};

export default ModuleList;