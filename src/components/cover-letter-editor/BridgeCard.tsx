import React from 'react';
import { Target, Trophy, Sparkles } from 'lucide-react';

interface BridgeCardProps {
    title: string;
    jdRequirement?: string;
    cvEvidence?: string;
    content: string;
    onChange: (value: string) => void;
    feedback?: string;
    className?: string;
}

export default function BridgeCard({
    title,
    jdRequirement,
    cvEvidence,
    content,
    onChange,
    feedback,
    className = ''
}: BridgeCardProps) {
    return (
        <div className={`bg-white dark:bg-[#141810] rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden ${className}`}>
            {/* Header */}
            <div className="bg-gray-50 dark:bg-[#1a230f] px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                    {title}
                </h3>
            </div>

            <div className="p-4 space-y-4">
                {/* Context Section (Agoda Needs / Your Evidence) */}
                {(jdRequirement || cvEvidence) && (
                    <div className="bg-gray-50 dark:bg-[#1a230f] rounded-lg p-3 space-y-3">
                        {jdRequirement && (
                            <div className="flex items-start gap-2">
                                <Target className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-0.5">
                                        Company Needs:
                                    </p>
                                    <p className="text-sm text-gray-800 dark:text-gray-200 font-medium italic">
                                        "{jdRequirement}"
                                    </p>
                                </div>
                            </div>
                        )}

                        {jdRequirement && cvEvidence && (
                            <div className="h-px bg-gray-200 dark:bg-gray-700 w-full" />
                        )}

                        {cvEvidence && (
                            <div className="flex items-start gap-2">
                                <Trophy className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-0.5">
                                        Your Evidence (from CV):
                                    </p>
                                    <p className="text-sm text-gray-800 dark:text-gray-200 font-medium italic">
                                        "{cvEvidence}"
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Editable Text Area */}
                <div>
                    <textarea
                        value={content}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full min-h-[120px] p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#141810] text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-lime-500 dark:focus:ring-[#99FF00] focus:border-transparent transition-all resize-y font-normal leading-relaxed"
                        placeholder="Write your persuasive bridge paragraph here..."
                    />
                </div>

                {/* Feedback Pill */}
                {feedback && (
                    <div className="flex justify-end">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-lime-100 dark:bg-lime-900/30 border border-lime-200 dark:border-lime-900/50">
                            <Sparkles className="w-3.5 h-3.5 text-lime-600 dark:text-lime-400" />
                            <span className="text-xs font-medium text-lime-700 dark:text-lime-300">
                                {feedback}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
