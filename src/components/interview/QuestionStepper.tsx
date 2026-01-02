'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface QuestionStepperProps {
    questions: Array<{
        id: string;
        status: 'pending' | 'drafted' | 'completed';
    }>;
    currentIndex: number;
    onSelect: (index: number) => void;
}

const QuestionStepper: React.FC<QuestionStepperProps> = ({
    questions,
    currentIndex,
    onSelect
}) => {
    return (
        <div className="flex items-center justify-center gap-2 py-4">
            {questions.map((question, index) => {
                const isCompleted = question.status === 'completed';
                const isCurrent = index === currentIndex;
                const isDrafted = question.status === 'drafted';

                return (
                    <React.Fragment key={question.id}>
                        {/* Connector Line */}
                        {index > 0 && (
                            <div
                                className={`w-8 h-0.5 transition-colors ${index <= currentIndex
                                        ? 'bg-lime-500'
                                        : 'bg-gray-200 dark:bg-gray-700'
                                    }`}
                            />
                        )}

                        {/* Step Circle */}
                        <button
                            onClick={() => onSelect(index)}
                            className={`
                                relative w-10 h-10 rounded-full flex items-center justify-center
                                font-semibold text-sm transition-all duration-200
                                focus:outline-none focus:ring-2 focus:ring-lime-500/50
                                ${isCompleted
                                    ? 'bg-lime-500 text-white shadow-lg shadow-lime-500/30'
                                    : isCurrent
                                        ? 'bg-lime-500 text-white shadow-lg shadow-lime-500/30 ring-4 ring-lime-500/20'
                                        : isDrafted
                                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-2 border-yellow-300 dark:border-yellow-700'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-2 border-gray-200 dark:border-gray-700'
                                }
                                hover:scale-110 hover:shadow-lg
                            `}
                        >
                            {isCompleted ? (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                >
                                    <Check className="w-5 h-5" />
                                </motion.div>
                            ) : (
                                <span>{index + 1}</span>
                            )}
                        </button>

                        {/* Question Label */}
                        {isCurrent && (
                            <motion.span
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap"
                            >
                                Q{index + 1}
                            </motion.span>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default QuestionStepper;
