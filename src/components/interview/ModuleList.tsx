
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, CheckCircle2, Circle, Lock, PlayCircle, BookOpen } from 'lucide-react';

interface Module {
    id: string;
    title: string;
    type: string;
    status: string;
}

interface Question {
    _id: string;
    content: {
        question: string;
        difficulty: string;
    };
    userAnswer?: {
        status: string;
    };
    displayOrder: number;
}

interface ModuleListProps {
    modules: Module[];
    questionsByModule: Record<string, Question[]>;
    jobId: string;
}

const ModuleList: React.FC<ModuleListProps> = ({ modules, questionsByModule, jobId }) => {
    const router = useRouter();
    // Default expand the first module
    const [expandedModule, setExpandedModule] = useState<string | null>(modules[0]?.id || null);

    const toggleModule = (id: string) => {
        setExpandedModule(expandedModule === id ? null : id);
    };

    return (
        <div className="space-y-4">
            {modules.map((module, index) => {
                const questions = questionsByModule[module.id] || [];
                const completedCount = questions.filter(q => q.userAnswer?.status === 'analyzed').length;
                const totalCount = questions.length;
                const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                const isExpanded = expandedModule === module.id;
                // Simple logic: Allow access if previous module is at least started or if it's the first one
                const isLocked = false; // For now open all

                return (
                    <div
                        key={module.id}
                        className={`bg-white dark:bg-[#141810] border ${isExpanded ? 'border-lime-500 dark:border-lime-500/50 ring-1 ring-lime-500/20' : 'border-gray-200 dark:border-gray-800'
                            } rounded-2xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md`}
                    >
                        <button
                            onClick={() => !isLocked && toggleModule(module.id)}
                            className="w-full flex items-center justify-between p-5 cursor-pointer text-left"
                            disabled={isLocked}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${completedCount === totalCount && totalCount > 0
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                                    : 'bg-lime-100 dark:bg-lime-900/20 text-lime-600'
                                    }`}>
                                    {completedCount === totalCount && totalCount > 0 ? (
                                        <CheckCircle2 className="w-5 h-5" />
                                    ) : (
                                        <BookOpen className="w-5 h-5" />
                                    )}
                                </div>
                                <div>
                                    <h3 className={`font-bold ${isLocked ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                                        {module.title}
                                    </h3>
                                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                        <span>{completedCount}/{totalCount} Questions</span>
                                        <div className="w-20 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-lime-500 rounded-full transition-all duration-500"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
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
                                    className="border-t border-gray-100 dark:border-gray-800"
                                >
                                    <div className="p-2 space-y-1">
                                        {questions.map((q, qIndex) => {
                                            const isDone = q.userAnswer?.status === 'analyzed';
                                            return (
                                                <button
                                                    key={q._id}
                                                    onClick={() => router.push(`/interview-coach/${jobId}/practice?question=${q._id}`)}
                                                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group text-left"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className={`mt-0.5 ${isDone ? 'text-green-500' : 'text-gray-300'}`}>
                                                            {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                                        </div>
                                                        <div>
                                                            <p className={`text-sm font-medium ${isDone ? 'text-gray-500 line-through' : 'text-gray-700 dark:text-gray-200'}`}>
                                                                {q.content.question}
                                                            </p>
                                                            <div className="flex gap-2 mt-1">
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${q.content.difficulty === 'hard' ? 'bg-red-50 text-red-600 border-red-100' :
                                                                    q.content.difficulty === 'medium' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                                                                        'bg-green-50 text-green-600 border-green-100'
                                                                    }`}>
                                                                    {q.content.difficulty}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <PlayCircle className="w-5 h-5 text-lime-500" />
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}
        </div>
    );
};

export default ModuleList;
