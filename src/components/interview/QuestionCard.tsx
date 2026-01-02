'use client';

import React from 'react';
import { Lightbulb, Sparkles, HelpCircle, FileText, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface QuestionCardProps {
    question: {
        question: string;
        category?: string;
        difficulty?: string;
        aiContext?: {
            rationale?: string;
            edge?: string;
            gap?: string;
            sampleAnswer?: string;
        };
        // Legacy support
        content?: {
            question: string;
            whyAsked?: string;
            difficulty?: string;
            tags?: string[];
        };
        edgeTip?: {
            content?: string;
            gap?: string;
            sampleAnswer?: string;
        };
    };
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question }) => {
    const [copied, setCopied] = React.useState(false);

    // Support both new and legacy field structures
    const questionText = question.question || question.content?.question || '';
    const whyAsked = question.aiContext?.rationale || question.content?.whyAsked || '';
    const edge = question.aiContext?.edge || question.edgeTip?.content || '';
    const gap = question.aiContext?.gap || question.edgeTip?.gap || '';
    const sampleAnswer = question.aiContext?.sampleAnswer || question.edgeTip?.sampleAnswer || '';
    const category = question.category || (question.content?.tags?.[0] || 'General');
    const difficulty = question.difficulty || question.content?.difficulty || 'Medium';

    const handleCopy = async () => {
        if (sampleAnswer) {
            await navigator.clipboard.writeText(sampleAnswer);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="space-y-6">
            {/* Category Badges */}
            <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold rounded-full uppercase tracking-wide">
                    {category}
                </span>
                {difficulty && (
                    <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wide ${difficulty.toLowerCase() === 'hard'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            : difficulty.toLowerCase() === 'easy'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        }`}>
                        {difficulty}
                    </span>
                )}
            </div>

            {/* Main Question */}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-relaxed">
                {questionText}
            </h1>

            {/* High Relevance Badge */}
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 border-l-4 border-lime-500 pl-3 py-1 bg-lime-50 dark:bg-lime-900/10 rounded-r">
                <Check className="w-4 h-4 text-lime-600 dark:text-lime-400" />
                <span className="font-semibold text-lime-700 dark:text-lime-400">High Relevance</span>
                <span className="text-gray-500">|</span>
                <span className="text-gray-600 dark:text-gray-400">This question directly addresses skills listed in the Job Description.</span>
            </div>

            {/* Three Panel Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                {/* Panel 1: Why This Is Asked */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-5 border border-amber-100 dark:border-amber-900/30"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        <h4 className="font-bold text-amber-900 dark:text-amber-200">Why this is asked</h4>
                    </div>
                    <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                        {whyAsked || 'The interviewer wants to assess your experience and problem-solving abilities in this area.'}
                    </p>
                </motion.div>

                {/* Panel 2: Your Edge */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-cyan-50 dark:bg-cyan-900/10 rounded-xl p-5 border border-cyan-100 dark:border-cyan-900/30"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                        <h4 className="font-bold text-cyan-900 dark:text-cyan-200">Your Edge</h4>
                    </div>
                    <div className="space-y-3">
                        {edge && (
                            <p className="text-sm text-cyan-800 dark:text-cyan-300 leading-relaxed">
                                <span className="font-semibold text-cyan-700 dark:text-cyan-400">Highlight: </span>
                                {edge}
                            </p>
                        )}
                        {gap && (
                            <p className="text-sm text-orange-700 dark:text-orange-400 leading-relaxed italic border-l-2 border-orange-400 pl-2">
                                <span className="font-semibold">Watch out: </span>
                                {gap}
                            </p>
                        )}
                    </div>
                </motion.div>

                {/* Panel 3: Sample Script */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700 relative"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            <h4 className="font-bold text-gray-900 dark:text-gray-200">Sample Script</h4>
                        </div>
                        <button
                            onClick={handleCopy}
                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                            title="Copy to clipboard"
                        >
                            {copied ? (
                                <Check className="w-4 h-4 text-lime-500" />
                            ) : (
                                <Copy className="w-4 h-4 text-gray-500" />
                            )}
                        </button>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic max-h-48 overflow-y-auto">
                        "{sampleAnswer || 'A sample STAR method answer will be generated based on your CV and the job requirements.'}"
                    </p>
                </motion.div>
            </div>
        </div>
    );
};

export default QuestionCard;
