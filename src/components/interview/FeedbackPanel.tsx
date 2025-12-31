
import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, TrendingUp, Sparkles, AlertCircle } from 'lucide-react';

interface FeedbackPanelProps {
    feedback: {
        score: number;
        strengths: string[];
        improvements: string[];
        improvedScript?: string;
        sentiment?: string;
    };
}

const FeedbackPanel: React.FC<FeedbackPanelProps> = ({ feedback }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 animate-in slide-in-from-bottom-4 duration-500"
        >
            <div className="flex items-center gap-4 bg-white dark:bg-[#1a2015] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold border-4 ${feedback.score >= 80 ? 'border-green-500 text-green-500' :
                        feedback.score >= 60 ? 'border-yellow-500 text-yellow-500' :
                            'border-red-500 text-red-500'
                    }`}>
                    {feedback.score}
                </div>
                <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Analysis Result</h3>
                    <p className="text-gray-500 dark:text-gray-400">
                        {feedback.score >= 80 ? 'Excellent answer! Strong impact.' :
                            feedback.score >= 60 ? 'Good start, but room for improvement.' :
                                'Needs more structure and specific details.'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Strengths */}
                <div className="bg-green-50 dark:bg-green-900/10 p-5 rounded-2xl border border-green-100 dark:border-green-900/20">
                    <h4 className="font-bold text-green-800 dark:text-green-400 mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        What you did well
                    </h4>
                    <ul className="space-y-2">
                        {feedback.strengths.map((point, i) => (
                            <li key={i} className="text-sm text-green-900 dark:text-green-200 flex items-start gap-2">
                                <span className="mt-1.5 w-1 h-1 rounded-full bg-green-500 shrink-0" />
                                {point}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Improvements */}
                <div className="bg-orange-50 dark:bg-orange-900/10 p-5 rounded-2xl border border-orange-100 dark:border-orange-900/20">
                    <h4 className="font-bold text-orange-800 dark:text-orange-400 mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Areas to Improve
                    </h4>
                    <ul className="space-y-2">
                        {feedback.improvements.map((point, i) => (
                            <li key={i} className="text-sm text-orange-900 dark:text-orange-200 flex items-start gap-2">
                                <span className="mt-1.5 w-1 h-1 rounded-full bg-orange-500 shrink-0" />
                                {point}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Improved Script */}
            {feedback.improvedScript && (
                <div className="bg-gray-900 text-gray-200 p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Sparkles className="w-24 h-24" />
                    </div>
                    <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-lime-400" />
                        AI Enhanced Version
                    </h4>
                    <div className="prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                        {feedback.improvedScript}
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default FeedbackPanel;
