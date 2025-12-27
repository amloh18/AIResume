'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Zap, ArrowRight } from 'lucide-react';

interface MasterCVJDBlockerProps {
    onConvertToJourney?: () => void;
    onCreateNewJourney?: () => void;
    className?: string;
}

export default function MasterCVJDBlocker({
    onConvertToJourney,
    onCreateNewJourney,
    className = ''
}: MasterCVJDBlockerProps) {
    return (
        <div className={`relative ${className}`}>
            {/* Blocker Overlay */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-10 bg-gradient-to-br from-gray-900/95 via-gray-900/90 to-gray-800/95 backdrop-blur-sm rounded-xl border-2 border-dashed border-yellow-500/30"
            >
                <div className="h-full flex items-center justify-center p-6">
                    <div className="text-center max-w-md">
                        {/* Lock Icon */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/30 mb-4"
                        >
                            <Lock size={28} className="text-yellow-400" />
                        </motion.div>

                        {/* Title */}
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Master CVs Are Role-Based Only
                        </h3>

                        {/* Description */}
                        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                            Master CVs are designed for role-based analysis. To analyze against a specific job description, create a <span className="text-yellow-400 font-medium">Journey CV</span>.
                        </p>

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            {onConvertToJourney && (
                                <button
                                    onClick={onConvertToJourney}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 hover:from-yellow-500/30 hover:to-orange-500/30 border border-yellow-500/30 rounded-lg text-yellow-400 font-medium transition-all group"
                                >
                                    <Zap size={18} className="group-hover:scale-110 transition-transform" />
                                    <span>Convert to Journey CV</span>
                                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            )}

                            {onCreateNewJourney && (
                                <button
                                    onClick={onCreateNewJourney}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg text-gray-300 font-medium transition-all"
                                >
                                    <span>Create New Journey CV</span>
                                </button>
                            )}
                        </div>

                        {/* Help Text */}
                        <div className="mt-6 pt-4 border-t border-gray-700/50">
                            <p className="text-xs text-gray-500">
                                💡 <span className="font-medium">Tip:</span> Journey CVs are job-specific variants tailored to individual applications, while Master CVs are your comprehensive baseline.
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Placeholder Content (to maintain layout) */}
            <div className="min-h-[300px] opacity-20 pointer-events-none border border-gray-700 rounded-xl p-4 bg-gray-800/20">
                {/* This maintains the space while being visually subdued */}
            </div>
        </div>
    );
}
