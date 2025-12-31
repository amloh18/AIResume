'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, FileText, Target, MessageSquare, Sparkles, Check } from 'lucide-react';
import InterviewCoachHeader from './InterviewCoachHeader';

interface PreparingSessionLoaderProps {
    onComplete: () => void;
}

const steps = [
    { id: 1, label: 'Reading your CV...', icon: FileText, duration: 2000 },
    { id: 2, label: 'Analyzing job description...', icon: BookOpen, duration: 2500 },
    { id: 3, label: 'Checking skill gaps...', icon: Target, duration: 2000 },
    { id: 4, label: 'Identifying key domains...', icon: Sparkles, duration: 1500 },
    { id: 5, label: 'Generating interview questions...', icon: MessageSquare, duration: 3000 },
];

const PreparingSessionLoader: React.FC<PreparingSessionLoaderProps> = ({ onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);

    useEffect(() => {
        let timeout: NodeJS.Timeout;

        const runStep = (stepIndex: number) => {
            if (stepIndex >= steps.length) {
                // All done
                setTimeout(onComplete, 500);
                return;
            }

            setCurrentStep(stepIndex);

            timeout = setTimeout(() => {
                setCompletedSteps(prev => [...prev, stepIndex]);
                runStep(stepIndex + 1);
            }, steps[stepIndex].duration);
        };

        runStep(0);

        return () => {
            if (timeout) clearTimeout(timeout);
        };
    }, [onComplete]);

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-[#1a230f] flex flex-col">
            <InterviewCoachHeader />
            <div className="flex-1 flex items-center justify-center">
                <div className="bg-white dark:bg-[#141810] rounded-2xl p-8 shadow-lg max-w-md w-full mx-4">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 rounded-full bg-lime-100 dark:bg-lime-900/30 flex items-center justify-center mx-auto mb-4">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                            >
                                <Sparkles className="w-8 h-8 text-lime-600 dark:text-lime-400" />
                            </motion.div>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Preparing your interview plan...
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400">
                            This may take a moment while the AI analyzes your profile.
                        </p>
                    </div>

                    {/* Steps */}
                    <div className="space-y-3">
                        {steps.map((step, index) => {
                            const isActive = currentStep === index;
                            const isCompleted = completedSteps.includes(index);
                            const Icon = step.icon;

                            return (
                                <motion.div
                                    key={step.id}
                                    initial={{ opacity: 0.5 }}
                                    animate={{
                                        opacity: isActive || isCompleted ? 1 : 0.5,
                                    }}
                                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive
                                        ? 'bg-lime-50 dark:bg-lime-900/20 border border-lime-200 dark:border-lime-800'
                                        : isCompleted
                                            ? 'bg-gray-50 dark:bg-white/5'
                                            : ''
                                        }`}
                                >
                                    {/* Icon/Check */}
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCompleted
                                        ? 'bg-lime-500'
                                        : isActive
                                            ? 'bg-lime-100 dark:bg-lime-900/50'
                                            : 'bg-gray-100 dark:bg-gray-800'
                                        }`}>
                                        {isCompleted ? (
                                            <Check className="w-4 h-4 text-white" />
                                        ) : (
                                            <Icon className={`w-4 h-4 ${isActive
                                                ? 'text-lime-600 dark:text-lime-400'
                                                : 'text-gray-400'
                                                }`} />
                                        )}
                                    </div>

                                    {/* Label */}
                                    <span className={`text-sm font-medium ${isActive
                                        ? 'text-lime-700 dark:text-lime-300'
                                        : isCompleted
                                            ? 'text-gray-700 dark:text-gray-300'
                                            : 'text-gray-400 dark:text-gray-500'
                                        }`}>
                                        {step.label}
                                    </span>

                                    {/* Loading indicator */}
                                    {isActive && (
                                        <motion.div
                                            className="ml-auto"
                                            animate={{ opacity: [0.5, 1, 0.5] }}
                                            transition={{ duration: 1, repeat: Infinity }}
                                        >
                                            <div className="w-4 h-4 border-2 border-lime-500 border-t-transparent rounded-full animate-spin" />
                                        </motion.div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PreparingSessionLoader;
