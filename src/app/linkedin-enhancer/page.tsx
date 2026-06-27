'use client';

import LinkedInEnhancerContainer from '@/components/linkedin-enhancer/LinkedInEnhancerContainer';
import RouteGuard from '@/components/auth/RouteGuard';
import { useMembership } from '@/lib/hooks/useMembership';
import { usePaymentModal } from '@/contexts/PaymentModalContext';
import { motion } from 'framer-motion';
import { Linkedin, Sparkles, Sliders, FileText, Lock, ChevronRight, CheckCircle } from 'lucide-react';

const LINKEDIN_FEATURES = [
    { icon: Sparkles, label: 'AI Section Rewriter', desc: 'Rewrite any LinkedIn section with one click' },
    { icon: Sliders, label: 'Tone Control', desc: 'Choose from Professional, Creative, Executive tones' },
    { icon: FileText, label: 'CV-Matched Summaries', desc: 'Pull from your CV for consistent, tailored content' },
    { icon: CheckCircle, label: 'ATS-Optimised Language', desc: 'Keyword-rich copy that passes recruiter filters' },
];

function LinkedInGate() {
    const { openPaymentModal } = usePaymentModal();

    const handleUpgrade = () => {
        openPaymentModal({
            preselectedPlanKey: 'focused_monthly',
            triggerContext: 'linkedin-enhancer',
            returnUrl: window.location.href
        });
    };

    return (
        <div className="min-h-[calc(100vh-120px)] flex flex-col items-center justify-center px-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-2xl"
            >
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20 mb-5">
                        <Linkedin className="w-7 h-7 text-blue-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                        LinkedIn Enhancer
                    </h1>
                    <p className="text-gray-500 dark:text-white/50 text-base max-w-md mx-auto">
                        Transform your LinkedIn profile with AI-powered rewrites tuned to your CV and target role.
                    </p>
                </div>

                {/* Feature cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                    {LINKEDIN_FEATURES.map(({ icon: Icon, label, desc }) => (
                        <div
                            key={label}
                            className="flex items-start gap-3 p-4 rounded-xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10"
                        >
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center mt-0.5">
                                <Icon className="w-4 h-4 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-800 dark:text-white">{label}</p>
                                <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5">{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Upgrade CTA */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/5 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-6 text-center">
                    <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/10 px-3 py-1.5 rounded-full mb-4">
                        <Lock className="w-3 h-3" />
                        Focused Plan Required
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        Unlock LinkedIn Enhancer with Focused
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-white/50 mb-5">
                        Get LinkedIn Enhancer, Interview Coach, unlimited job tracking, and full AI tools — starting from Focused.
                    </p>
                    <button
                        onClick={handleUpgrade}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[rgb(129,255,0)] hover:bg-[rgb(110,230,0)] text-black font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                        Upgrade to Focused
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

import OptimizedDashboardLayout from '@/components/dashboard/OptimizedDashboardLayout';

function LinkedInEnhancerPageContent() {
    const { membership, loading } = useMembership();

    // Show nothing while loading (avoids flash of wrong content)
    if (loading) return null;

    // Gate: LinkedIn Enhancer requires Focused plan or higher
    // Check linkedinToneChange as the proxy for full enhancer access
    const hasAccess = membership?.limits.linkedinToneChange ?? false;

    if (!hasAccess) {
        return <LinkedInGate />;
    }

    return (
        <OptimizedDashboardLayout noPadding={true}>
            <LinkedInEnhancerContainer />
        </OptimizedDashboardLayout>
    );
}

export default function LinkedInEnhancerPage() {
    return (
        <RouteGuard requireAuth={true}>
            <LinkedInEnhancerPageContent />
        </RouteGuard>
    );
}
