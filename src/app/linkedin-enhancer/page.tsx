'use client';

import LinkedInEnhancerContainer from '@/components/linkedin-enhancer/LinkedInEnhancerContainer';
import RouteGuard from '@/components/auth/RouteGuard';
import { useMembership } from '@/lib/hooks/useMembership';
import { usePaymentModal } from '@/contexts/PaymentModalContext';
import { motion } from 'framer-motion';
import { Linkedin, Sparkles, Sliders, FileText, Lock, ChevronRight, CheckCircle, X } from 'lucide-react';
import Link from 'next/link';

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
        /* Same rounded-card-with-margins shell as the dashboard */
        <div className="absolute inset-0 dashboard-workspace text-[#0f172a] dark:text-gray-150 font-sans overflow-hidden flex flex-col pr-3 pb-3 pl-3 lg:pl-0">
            <div className="dashboard-content-card rounded-2xl border border-[var(--border-primary)] shadow-sm flex-1 min-h-0 flex items-center justify-center overflow-hidden px-4 py-12 relative linkedin-enhancer">
            {/* Close Button to return to dashboard */}
            <Link 
                href="/dashboard"
                className="absolute top-6 right-6 p-2 rounded-full border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-[var(--bg-secondary)]/70 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all shadow-sm z-20"
                title="Return to Dashboard"
            >
                <X className="w-5 h-5" />
            </Link>
            {/* Glowing meshes for premium dark mode aesthetics */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 dark:opacity-100">
                <div className="absolute top-[20%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-500/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-[10%] left-[30%] w-[300px] h-[300px] bg-emerald-500/5 dark:bg-emerald-500/3 blur-[100px] rounded-full" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-2xl relative z-10"
            >
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20 mb-6 shadow-lg shadow-blue-500/5">
                        <Linkedin className="w-9 h-9 text-blue-500" />
                    </div>
                    <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4">
                        LinkedIn <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-400 dark:to-indigo-400">Enhancer</span>
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-base max-w-md mx-auto leading-relaxed">
                        Transform your LinkedIn profile with AI-powered rewrites tuned to your CV and target role.
                    </p>
                </div>

                {/* Feature cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    {LINKEDIN_FEATURES.map(({ icon: Icon, label, desc }) => (
                        <div
                            key={label}
                            className="flex items-start gap-4 p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-xs hover:shadow-sm transition-all duration-300"
                        >
                            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-lime-500/10 flex items-center justify-center">
                                <Icon className="w-5 h-5 text-emerald-600 dark:text-lime-400" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-[var(--text-primary)]">{label}</p>
                                <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-relaxed">{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Upgrade CTA */}
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-3xl p-8 text-center shadow-sm relative overflow-hidden">
                    <div className="relative inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3.5 py-1.5 rounded-full mb-4 border border-emerald-200 dark:border-emerald-800/40">
                        <Lock className="w-3.5 h-3.5" />
                        Focused Plan Required
                    </div>
                    <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                        Unlock LinkedIn Enhancer with Focused
                    </h2>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] mb-6 max-w-lg mx-auto leading-relaxed">
                        Get LinkedIn Enhancer, Interview Coach, unlimited job tracking, and full AI tools — starting from Focused.
                    </p>
                    <button
                        onClick={handleUpgrade}
                        className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-[#013f2e] hover:bg-[#025c43] active:scale-95 text-white font-bold text-sm transition-colors duration-200 shadow-lg"
                    >
                        Upgrade to Focused
                        <ChevronRight className="w-4 h-4 stroke-[3]" />
                    </button>
                </div>
            </motion.div>
            </div>
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
        return (
            <OptimizedDashboardLayout>
                <LinkedInGate />
            </OptimizedDashboardLayout>
        );
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
