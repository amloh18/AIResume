
import React from 'react';
import { Lightbulb, Sparkles, HelpCircle } from 'lucide-react';

interface QuestionCardProps {
    question: any;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question }) => {
    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Question</h3>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-relaxed">
                    "{question.content.question}"
                </h1>
            </div>

            {/* Why asking */}
            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-4 border border-blue-100 dark:border-blue-900/30">
                <div className="flex items-start gap-3">
                    <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-blue-900 dark:text-blue-200 text-sm mb-1">Why they ask this</h4>
                        <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
                            {question.content.whyAsked}
                        </p>
                    </div>
                </div>
            </div>

            {/* My Edge (Personalized) */}
            {question.edgeTip?.content && (
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-lime-500 to-green-500 rounded-2xl opacity-75 group-hover:opacity-100 blur transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative bg-white dark:bg-[#1a2015] rounded-xl p-5 border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-5 h-5 text-lime-500" />
                            <h4 className="font-bold text-gray-900 dark:text-white">Your Edge</h4>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed italic border-l-2 border-lime-500 pl-3">
                            "{question.edgeTip.content}"
                        </p>
                    </div>
                </div>
            )}

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-3">Key Skills to Highlight</h4>
                <div className="flex flex-wrap gap-2">
                    {question.content.tags?.map((tag: string) => (
                        <span key={tag} className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-md font-medium">
                            {tag}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default QuestionCard;
