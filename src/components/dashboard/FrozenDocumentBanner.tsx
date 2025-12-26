'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, FileText } from 'lucide-react';
import { usePaymentModal } from '@/contexts/PaymentModalContext';

interface FrozenDocumentBannerProps {
    frozenCount: number;
    documentType?: 'CV' | 'document';
}

export default function FrozenDocumentBanner({
    frozenCount,
    documentType = 'document'
}: FrozenDocumentBannerProps) {
    const { openPaymentModal } = usePaymentModal();

    if (frozenCount === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-l-4 border-amber-400 p-4 rounded-r-lg shadow-sm mb-4"
        >
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                    <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                </div>

                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                            {frozenCount} Frozen {documentType}{frozenCount > 1 ? 's' : ''}
                        </h4>
                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 text-xs font-medium rounded">
                            View Only
                        </span>
                    </div>

                    <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                        Your {frozenCount === 1 ? documentType.toLowerCase() : `${documentType.toLowerCase()}s`} {frozenCount === 1 ? 'is' : 'are'} safe in your vault
                        and you can view or download {frozenCount === 1 ? 'it' : 'them'} anytime.
                        <span className="font-medium"> To edit {frozenCount === 1 ? 'it' : 'them'}, upgrade your plan.</span>
                    </p>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => openPaymentModal({ preselectedPlanKey: 'pro_monthly' })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white text-sm font-medium rounded-md transition-colors"
                        >
                            Upgrade Now
                            <ArrowRight className="h-3.5 w-3.5" />
                        </button>

                        <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                            <FileText className="h-3.5 w-3.5" />
                            <span>All your data is safely stored</span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
