'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, ArrowRight, Link as LinkIcon } from 'lucide-react';
import { signIn } from 'next-auth/react';

interface LinkedInAuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LinkedInAuthModal({ isOpen, onClose }: LinkedInAuthModalProps) {
    if (!isOpen) return null;

    const handleConnect = () => {
        signIn('linkedin', { callbackUrl: window.location.href });
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="bg-white dark:bg-[#141810] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800 transition-colors"
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-transparent">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-[#0a66c2]/10 text-[#0a66c2] rounded-lg">
                                <LinkIcon className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Connect LinkedIn</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 text-center flex flex-col items-center">
                        <div className="w-16 h-16 bg-[#0a66c2]/10 rounded-full flex items-center justify-center text-[#0a66c2] mb-4">
                            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
                        </div>
                        
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">LinkedIn Account Required</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                            To import your profile data and keep your CV-matched summaries up to date, connect your LinkedIn profile securely.
                        </p>

                        <div className="w-full bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 text-left text-sm text-blue-800 dark:text-blue-300 flex gap-3 mb-6">
                            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                            <p>
                                <strong>Secure Connection:</strong> We only import public profile details and will never post on your behalf or share your information.
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-transparent flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <motion.button
                            onClick={handleConnect}
                            className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white rounded-lg shadow-sm bg-[#0a66c2] hover:bg-[#004182]"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <span>Connect LinkedIn</span>
                            <ArrowRight className="w-4 h-4" />
                        </motion.button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
