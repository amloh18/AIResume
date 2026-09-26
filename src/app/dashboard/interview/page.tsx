'use client';

import React from 'react';
import InterviewCoachContainer from '@/components/interview-coach/InterviewCoachContainer';
import { useEntitlements } from '@/lib/hooks/useEntitlements';
import { usePaymentModal } from '@/contexts/PaymentModalContext';
import { motion } from 'framer-motion';
import { Mic, Sparkles, Target, TrendingUp, Lock, ChevronRight } from 'lucide-react';

const INTERVIEW_FEATURES = [
    { icon: Mic, label: 'AI-Powered Mock Interviews', desc: 'Practice with realistic questions tailored to your role' },
    { icon: Target, label: 'Role-Specific Questions', desc: 'Curated questions based on your job description' },
    { icon: TrendingUp, label: 'Instant Feedback', desc: 'Get scored answers and improvement tips instantly' },
    { icon: Sparkles, label: 'Unlimited Sessions', desc: 'Practice for every job in your tracker' },
];

function InterviewCoachGate() {
    const { openPaymentModal } = usePaymentModal();

    const handleUpgrade = () => {
        openPaymentModal({
            preselectedPlanKey: 'focused_monthly',
            triggerContext: 'interview-coach',
            returnUrl: window.location.href
        });
    };

    return (
        /* Same rounded-card-with-margins shell as the dashboard */
        <div className="absolute inset-0 dashboard-workspace text-[#0f172a] dark:text-gray-150 font-sans overflow-hidden flex flex-col pr-3 pb-3 pl-3 lg:pl-0">
            <div className="dashboard-content-card rounded-2xl border border-[var(--border-primary)] shadow-sm flex-1 min-h-0 flex items-center justify-center overflow-hidden px-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-2xl"
            >
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-lime-400/20 to-emerald-500/10 border border-lime-500/20 mb-5">
                        <Mic className="w-7 h-7 text-lime-400" />
                    </div>
                    <h1 className="text-h1 font-bold text-gray-900 dark:text-white mb-3">
                        Interview Prep
                    </h1>
                    <p className="text-gray-500 dark:text-white/50 text-body max-w-md mx-auto">
                        Practice smarter with AI-powered mock interviews tailored to your exact job description.
                    </p>
                </div>

                {/* Feature cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                    {INTERVIEW_FEATURES.map(({ icon: Icon, label, desc }) => (
                        <div
                            key={label}
                            className="flex items-start gap-3 p-4 rounded-xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10"
                        >
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-lime-400/10 flex items-center justify-center mt-0.5">
                                <Icon className="w-4 h-4 text-lime-500 dark:text-lime-400" />
                            </div>
                            <div>
                                <p className="text-small font-semibold text-gray-800 dark:text-white">{label}</p>
                                <p className="text-small text-gray-500 dark:text-white/40 mt-0.5">{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Upgrade CTA */}
                <div className="bg-gradient-to-br from-lime-50 to-emerald-50 dark:from-lime-500/10 dark:to-emerald-500/5 border border-lime-200 dark:border-lime-500/20 rounded-2xl p-6 text-center">
                    <div className="inline-flex items-center gap-2 text-small font-semibold text-lime-700 dark:text-lime-400 bg-lime-100 dark:bg-lime-500/10 px-3 py-1.5 rounded-full mb-4">
                        <Lock className="w-3 h-3" />
                        Focused Plan Required
                    </div>
                    <h2 className="text-h3 font-bold text-gray-900 dark:text-white mb-2">
                        Unlock Interview Prep with Focused
                    </h2>
                    <p className="text-small text-gray-500 dark:text-white/50 mb-5">
                        Get Interview Prep, unlimited job tracking, LinkedIn Enhancer, and full AI tools — all in one plan.
                    </p>
                    <button
                        onClick={handleUpgrade}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#013f2e] hover:bg-[#025c43] text-white font-bold text-small transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                        Upgrade to Focused
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </motion.div>
            </div>
        </div>
    );
}

const InterviewDashboard = () => {
    const { loading, can } = useEntitlements();

    // Brief loader while the entitlement check resolves (avoids flash of the wrong view)
    if (loading) return (
        <div className="flex items-center justify-center min-h-[40vh]" role="status" aria-label="Checking your plan">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-lime-500 rounded-full animate-spin" />
        </div>
    );

    // Gate: Interview Coach requires Focused plan or higher
    const hasAccess = can('track.interview_coach');

    if (!hasAccess) {
        return <InterviewCoachGate />;
    }

    return <InterviewCoachContainer userId="" />;
};

export default InterviewDashboard;
