/**
 * Grace Period Notification Banner Component
 * 
 * Displays a countdown banner for Day Pass users in their 48-hour download grace period
 * Shows when access expires but download capability remains
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Download, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GracePeriodBannerProps {
    /** Grace period expiration date */
    expiresAt: Date | string;
    /** Callback when user dismisses banner */
    onDismiss?: () => void;
    /** Number of frozen documents */
    frozenCount?: number;
}

export default function GracePeriodBanner({ expiresAt, onDismiss, frozenCount = 0 }: GracePeriodBannerProps) {
    const [timeRemaining, setTimeRemaining] = useState<string>('');
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const calculateTimeRemaining = () => {
            const now = new Date().getTime();
            const expiryTime = new Date(expiresAt).getTime();
            const diff = expiryTime - now;

            if (diff <= 0) {
                setIsExpired(true);
                setTimeRemaining('Expired');
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            if (hours >= 24) {
                const days = Math.floor(hours / 24);
                const remainingHours = hours % 24;
                setTimeRemaining(`${days}d ${remainingHours}h`);
            } else if (hours > 0) {
                setTimeRemaining(`${hours}h ${minutes}m`);
            } else {
                setTimeRemaining(`${minutes}m`);
            }
        };

        calculateTimeRemaining();
        const interval = setInterval(calculateTimeRemaining, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [expiresAt]);

    if (isExpired) {
        return null;
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="relative bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl p-4 mb-4"
            >
                <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                            <Clock className="w-6 h-6 text-orange-500" />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                            <h3 className="text-lg font-semibold text-orange-500">
                                Download Grace Period Active
                            </h3>
                        </div>

                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                            Your Day Pass has expired, but you can still download existing documents for{' '}
                            <span className="font-semibold text-orange-500">{timeRemaining}</span>.
                            {frozenCount > 0 && (
                                <> You have <span className="font-semibold">{frozenCount} frozen document{frozenCount !== 1 ? 's' : ''}</span> that you can download.</>
                            )}
                        </p>

                        {/* Features */}
                        <div className="flex flex-wrap gap-4 text-sm">
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                <Download className="w-4 h-4" />
                                <span>Download existing PDFs</span>
                            </div>
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                <X className="w-4 h-4" />
                                <span>Cannot generate new CVs</span>
                            </div>
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                <X className="w-4 h-4" />
                                <span>Cannot edit frozen documents</span>
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="mt-4 flex items-center gap-3">
                            <a
                                href="/dashboard?tab=pricing"
                                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium text-sm transition-colors"
                            >
                                Upgrade to Pro
                            </a>
                            <a
                                href="/dashboard/vault"
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium text-sm transition-colors"
                            >
                                View Frozen Documents
                            </a>
                        </div>
                    </div>

                    {/* Dismiss button */}
                    {onDismiss && (
                        <button
                            onClick={onDismiss}
                            className="flex-shrink-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                            aria-label="Dismiss notification"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Progress bar showing time remaining */}
                <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                        initial={{ width: '100%' }}
                        animate={{
                            width: `${Math.max(0, Math.min(100, (new Date(expiresAt).getTime() - Date.now()) / (48 * 60 * 60 * 1000) * 100))}%`
                        }}
                        transition={{ duration: 1 }}
                    />
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
