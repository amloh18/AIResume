import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, RotateCcw, FileText, ArrowRight } from 'lucide-react';
import { LINKEDIN_COLORS } from '@/types/linkedin';

interface SuccessFeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUndo: () => void;
    appliedSectionsCount: number;
}

export default function SuccessFeedbackModal({ isOpen, onClose, onUndo, appliedSectionsCount }: SuccessFeedbackModalProps) {
    if (!isOpen) return null;

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
                    className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-center"
                >
                    <div className="p-8">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
                            >
                                <CheckCircle className="w-10 h-10 text-green-500" />
                            </motion.div>
                        </div>
                        
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">🎉 Profile Updated!</h2>
                        <p className="text-gray-600 mb-8">
                            Successfully applied enhancements to {appliedSectionsCount} section{appliedSectionsCount === 1 ? '' : 's'} on your LinkedIn profile.
                        </p>

                        <div className="bg-gray-50 rounded-xl p-4 mb-8 text-left">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">Summary of Improvements:</h3>
                            <ul className="space-y-2">
                                <li className="flex items-start gap-2 text-sm text-gray-600">
                                    <FileText className="w-4 h-4 text-blue-500 mt-0.5" />
                                    <span>Keywords optimized for ATS</span>
                                </li>
                                <li className="flex items-start gap-2 text-sm text-gray-600">
                                    <FileText className="w-4 h-4 text-blue-500 mt-0.5" />
                                    <span>Action-oriented bullet points added</span>
                                </li>
                                <li className="flex items-start gap-2 text-sm text-gray-600">
                                    <FileText className="w-4 h-4 text-blue-500 mt-0.5" />
                                    <span>Tone adjusted to match your professional brand</span>
                                </li>
                            </ul>
                        </div>

                        <div className="flex flex-col gap-3">
                            <motion.button
                                onClick={onClose}
                                className="w-full py-3 px-4 bg-gray-900 text-white rounded-xl font-medium shadow-sm hover:bg-gray-800 transition-colors"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                Continue to Dashboard
                            </motion.button>
                            <motion.button
                                onClick={onUndo}
                                className="w-full py-3 px-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <RotateCcw className="w-4 h-4" />
                                <span>Undo Changes</span>
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
