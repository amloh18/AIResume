'use client';

import React from 'react';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';
import { useMembership } from '@/lib/hooks/useMembership';
import { usePaymentModal } from '@/contexts/PaymentModalContext';
import { useMobileSidebar } from '@/contexts/MobileSidebarContext';
import { useUserData, getUserDisplayName, getUserEmail, getUserAvatar } from '@/lib/hooks/useUserData';
import PageHeader from '@/components/dashboard/PageHeader';
import { motion } from 'framer-motion';
import { Archive, FileText, Star, Shield, Crown, Lock, ChevronRight } from 'lucide-react';

const VAULT_FEATURES = [
    { icon: FileText, label: 'Saved CV Versions', desc: 'Snapshot and restore any version of your CV at any point' },
    { icon: Star, label: 'Favourite Sections', desc: 'Save your best bullet points and reuse them across CVs' },
    { icon: Shield, label: 'Encrypted Storage', desc: 'Your sensitive career data stored securely, always private' },
    { icon: Archive, label: 'Reusable Templates', desc: 'Build a personal library of cover letter and bio blocks' },
];

function VaultLockedContent({ user, onMobileMenuToggle, isMobileMenuOpen }: {
    user: any;
    onMobileMenuToggle: () => void;
    isMobileMenuOpen: boolean;
}) {
    const { openPaymentModal } = usePaymentModal();

    const handleUpgrade = () => {
        openPaymentModal({
            preselectedPlanKey: 'focused_yearly',
            triggerContext: 'career-vault',
            returnUrl: window.location.href
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Career Vault"
                description="Your personal career asset library"
                user={user}
                showSettings={true}
                onMobileMenuToggle={onMobileMenuToggle}
                isMobileMenuOpen={isMobileMenuOpen}
            />

            <div className="flex flex-col items-center justify-center py-8 px-4">
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-2xl"
                >
                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/10 border border-amber-500/20 mb-5">
                            <Crown className="w-7 h-7 text-amber-400" />
                        </div>
                        <h1 className="text-h2 font-bold text-gray-900 dark:text-white mb-3">
                            Career Vault
                        </h1>
                        <p className="text-gray-500 dark:text-white/50 text-small max-w-md mx-auto">
                            A permanent home for your most valuable career assets — exclusively for Lifetime members.
                        </p>
                    </div>

                    {/* Feature preview */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                        {VAULT_FEATURES.map(({ icon: Icon, label, desc }) => (
                            <div
                                key={label}
                                className="flex items-start gap-3 p-4 rounded-xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10"
                            >
                                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center mt-0.5">
                                    <Icon className="w-4 h-4 text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-small font-semibold text-gray-800 dark:text-white">{label}</p>
                                    <p className="text-small text-gray-500 dark:text-white/40 mt-0.5">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Upgrade CTA */}
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/5 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-6 text-center">
                        <div className="inline-flex items-center gap-2 text-small font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/10 px-3 py-1.5 rounded-full mb-4">
                            <Lock className="w-3 h-3" />
                            Pro Lifetime Exclusive
                        </div>
                        <h2 className="text-h3 font-bold text-gray-900 dark:text-white mb-2">
                            One-Time Purchase. Lifetime Access.
                        </h2>
                        <p className="text-small text-gray-500 dark:text-white/50 mb-5">
                            Career Vault is included with Pro Lifetime — pay once, own it forever. Plus every future feature we ship.
                        </p>
                        <button
                            onClick={handleUpgrade}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white font-semibold text-small transition-all duration-200 shadow-md hover:shadow-lg"
                        >
                            <Crown className="w-4 h-4" />
                            Get Lifetime Access
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

const VaultPage: React.FC = () => {
    const { user } = useUnifiedAuth();
    const { userData } = useUserData();
    const { membership, loading } = useMembership();
    const { toggleSidebar, isOpen: isMobileMenuOpen } = useMobileSidebar();

    const userForHeader = {
        name: getUserDisplayName(userData),
        email: getUserEmail(userData),
        username: userData?.username,
        profilePhoto: getUserAvatar(userData),
        designation: userData?.role || 'Professional',
        subscription: userData?.subscription,
    };

    // Show nothing while loading (avoids flash)
    if (loading) return null;

    const hasVaultAccess = membership?.limits.hasVault ?? false;

    if (!hasVaultAccess) {
        return (
            <VaultLockedContent
                user={userForHeader}
                onMobileMenuToggle={toggleSidebar}
                isMobileMenuOpen={isMobileMenuOpen}
            />
        );
    }

    // Full vault content (coming soon — placeholder until feature ships)
    return (
        <div className="space-y-6">
            <PageHeader
                title="Career Vault"
                description="Your personal career asset library"
                user={userForHeader}
                showSettings={true}
                onMobileMenuToggle={toggleSidebar}
                isMobileMenuOpen={isMobileMenuOpen}
            />
            <div className="text-center py-20">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-400/20 to-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Archive size={24} className="text-amber-400" />
                </div>
                <h2 className="text-h2 font-bold text-gray-900 dark:text-white mb-2">Career Vault</h2>
                <p className="text-gray-600 dark:text-white/60">Your career assets will appear here</p>
                <p className="text-gray-500 dark:text-white/40 text-small mt-4">Coming soon — we&apos;re building this for you!</p>
            </div>
        </div>
    );
};

export default VaultPage;
