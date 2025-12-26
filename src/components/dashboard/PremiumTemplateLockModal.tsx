'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, X, FileText, Palette, ArrowRight } from 'lucide-react';
import { usePaymentModal } from '@/contexts/PaymentModalContext';

interface PremiumTemplateLockModalProps {
    isOpen: boolean;
    onClose: () => void;
    cvTitle: string;
    templateName?: string;
    onSwitchTemplate?: () => void;
}

export default function PremiumTemplateLockModal({
    isOpen,
    onClose,
    cvTitle,
    templateName = 'Premium',
    onSwitchTemplate
}: PremiumTemplateLockModalProps) {
    const { openPaymentModal } = usePaymentModal();

    const handleUpgrade = () => {
        onClose();
        openPaymentModal({ preselectedPlanKey: 'pro_monthly' });
    };

    const handleSwitch = () => {
        if (onSwitchTemplate) {
            onSwitchTemplate();
        }
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 relative">
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>

                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                                        <Crown className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Premium Template</h3>
                                        <p className="text-purple-100 text-sm">Editing requires Pro access</p>
                                    </div>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="p-6 space-y-4">
                                <div className="flex items-start gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800">
                                    <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            "{cvTitle}"
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                            This CV uses the <span className="font-semibold">{templateName}</span> template,
                                            which is part of our Premium collection.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                                        Choose an option to continue:
                                    </p>

                                    {/* Option 1: Upgrade */}
                                    <button
                                        onClick={handleUpgrade}
                                        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Crown className="h-5 w-5" />
                                            <div className="text-left">
                                                <p className="font-semibold">Upgrade to Pro</p>
                                                <p className="text-xs text-purple-100">
                                                    Unlock all premium templates + unlimited features
                                                </p>
                                            </div>
                                        </div>
                                        <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                    </button>

                                    {/* Option 2: Switch Template */}
                                    {onSwitchTemplate && (
                                        <button
                                            onClick={handleSwitch}
                                            className="w-full flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Palette className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                                                <div className="text-left">
                                                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                                                        Switch to Free Template
                                                    </p>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                                        Keep your content, change the design
                                                    </p>
                                                </div>
                                            </div>
                                            <ArrowRight className="h-5 w-5 text-gray-500 dark:text-gray-400 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    )}
                                </div>

                                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                        💡 Tip: You can view and download this CV anytime. Premium templates
                                        just require a Pro plan for editing.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
