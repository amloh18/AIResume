// @ts-nocheck
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AlertCircle, Clock, Star, Zap } from 'lucide-react';
import { getPlanName, PlanKey } from '@/lib/utils/userPlanUtils';
import UniversalPaymentModal from '@/components/payment/UniversalPaymentModal';

type CreditsInfo = {
  remaining: number;
  limit: number;
  used?: number;
  totalCreated?: number;
  planKey?: string;
  nextResetDate?: string | Date;
  resetSchedule?: string;
};

type SubscriptionInfo = {
  planKey: string;
  status: string;
  accessExpiresAt?: string;
  currentPeriodEnd?: string;
  autoRenew?: boolean;
};

export default function SidebarMembershipCard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState<CreditsInfo | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Keep day pass countdown fresh (match dashboard sidebar behavior)
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Load on mount only
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/user/usage-limits', { method: 'GET' });
        if (!res.ok) throw new Error('Failed to load usage limits');
        const json = await res.json();
        if (!cancelled && json?.success) {
          setCredits(json?.credits ?? null);
          setSubscription(json?.subscription ?? null);
        }
      } catch {
        if (!cancelled) {
          setCredits(null);
          setSubscription(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Listen for credit update events (only refresh when credits are actually used)
  useEffect(() => {
    const handleCreditUpdate = () => {
      console.log('🔄 SidebarMembershipCard - Credit update event received, refreshing credit info');
      // Reload credit info when credits are used
      const load = async () => {
        try {
          const res = await fetch('/api/user/usage-limits', { method: 'GET' });
          if (res.ok) {
            const json = await res.json();
            if (json?.success) {
              setCredits(json?.credits ?? null);
              setSubscription(json?.subscription ?? null);
            }
          }
        } catch (error) {
          console.error('Error refreshing credit info:', error);
        }
      };
      load();
    };

    window.addEventListener('creditsUpdated', handleCreditUpdate);

    return () => {
      window.removeEventListener('creditsUpdated', handleCreditUpdate);
    };
  }, []);

  const planKey = useMemo<PlanKey>(() => {
    const fromSub = subscription?.planKey as PlanKey | undefined;
    const fromCredits = credits?.planKey as PlanKey | undefined;
    return fromSub || fromCredits || 'free';
  }, [subscription?.planKey, credits?.planKey]);

  const planStatus = subscription?.status || 'active';
  // Match dashboard sidebar behavior: if past due/unpaid, don't show membership card here.
  if (!loading && (planStatus === 'past_due' || planStatus === 'unpaid')) {
    return null;
  }

  if (!loading && !credits) {
    // If we couldn't fetch credits, keep the UI clean and don't show a half-empty card.
    return null;
  }

  const limit = credits?.limit ?? 0;
  const remaining = credits?.remaining ?? 0;
  const isUnlimited = limit === -1;
  const used =
    credits?.used !== undefined
      ? credits.used
      : isUnlimited
        ? (credits?.totalCreated ?? 0)
        : Math.max(0, limit - remaining);
  const progressPercent =
    !isUnlimited && limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

  const totalCreated = credits?.totalCreated ?? used ?? 0;
  const hasCredits = isUnlimited || remaining > 0;
  const nextReset = credits?.nextResetDate ? new Date(credits.nextResetDate) : null;

  // Loading placeholder (keeps layout stable)
  if (loading) {
    return (
      <div className="rounded-2xl p-3 bg-gray-100 dark:bg-[#222327] shadow-sm shadow-black/10 dark:shadow-black/30">
        <div className="h-4 w-32 bg-black/10 dark:bg-white/10 rounded mb-2" />
        <div className="h-2 w-full bg-black/10 dark:bg-white/10 rounded mb-2" />
        <div className="h-8 w-full bg-black/10 dark:bg-white/10 rounded-xl" />
      </div>
    );
  }

  const openMembership = () => router.push('/dashboard/settings?tab=membership');

  // --- Free Plan (purple) ---
  if (planKey === 'free') {
    return (
      <>
        <div className="rounded-2xl p-3 text-white shadow-sm shadow-black/20 dark:shadow-black/40" style={{ backgroundColor: '#603a86' }}>
          <div className="text-sm font-semibold mb-2">
            Your Free Plan
          </div>

          {!isUnlimited && limit > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-[11px] text-white/80 mb-1">
                <span>Feature usage</span>
                <span>{used}/{limit}</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-2 bg-white rounded-full"
                />
              </div>
            </div>
          )}

          {!hasCredits && (
            <div className="text-xs text-yellow-300 mb-2 font-medium">
              ⚠️ Feature limit reached. Upgrade to continue.
            </div>
          )}

          <div className="text-xs font-semibold mb-1.5">
            Go Pro to get:
          </div>

          <ul className="text-xs text-white/90 space-y-0.5 mb-3">
            <li>• Unlimited job creation</li>
            <li>• 1st CV Free</li>
            <li>• Unlimited ATS checks per job</li>
            <li>• Premium templates</li>
            <li>• Priority support</li>
          </ul>

          <div className="space-y-2">
            <motion.button
              onClick={openMembership}
              className="w-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Star className="w-3 h-3" />
              Upgrade to Pro
            </motion.button>

            <motion.button
              onClick={() => setShowPaymentModal(true)}
              className="w-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Zap className="w-3 h-3" />
              View All Plans
            </motion.button>
          </div>
        </div>
        <UniversalPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            // Refresh credits after successful payment
            window.location.reload();
          }}
          triggerContext="sidebar-view-all-plans"
        />
      </>
    );
  }

  // --- Starter Monthly (indigo/purple) ---
  if (planKey === 'starter_monthly') {
    return (
      <>
        <div className="rounded-2xl p-3 text-white shadow-sm shadow-black/20 dark:shadow-black/40 bg-gradient-to-br from-indigo-600 to-purple-700">
          <div className="text-sm font-semibold mb-1">
            Starter Monthly
          </div>
          <div className="text-[11px] text-white/80 mb-2">
            Free Subscription ($0/mo)
          </div>

          {!isUnlimited && limit > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-[11px] text-white/80 mb-1">
                <span>Feature usage</span>
                <span>{used}/{limit}</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-2 bg-white rounded-full"
                />
              </div>
            </div>
          )}

          {!hasCredits && (
            <div className="text-xs text-yellow-300 mb-2 font-medium">
              ⚠️ Feature limit reached. Upgrade to continue.
            </div>
          )}

          <p className="text-[10px] text-white/80 leading-snug mb-3">
            You are subscribed to the $0/mo Starter plan. You will receive $0 invoice receipts.
          </p>

          <div className="text-[11px] font-semibold mb-1.5">
            Upgrade to Pro to get:
          </div>

          <ul className="text-[10px] text-white/95 space-y-0.5 mb-3 list-none p-0">
            <li>• Unlimited job creation & tracking</li>
            <li>• Unlimited ATS checks per job</li>
            <li>• Premium templates</li>
            <li>• Priority support</li>
          </ul>

          <div className="space-y-2">
            <motion.button
              onClick={openMembership}
              className="w-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Star className="w-3 h-3" />
              Upgrade to Pro
            </motion.button>

            <motion.button
              onClick={() => setShowPaymentModal(true)}
              className="w-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Zap className="w-3 h-3" />
              View All Plans
            </motion.button>
          </div>
        </div>
        <UniversalPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            window.location.reload();
          }}
          triggerContext="sidebar-view-all-plans"
        />
      </>
    );
  }

  // --- Starter Yearly (lime/greenish) ---
  if (planKey === 'starter_yearly') {
    return (
      <div className="rounded-2xl p-3 bg-gradient-to-br from-lime-600 to-lime-700 text-white shadow-sm shadow-black/20 dark:shadow-black/40">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-sm font-semibold">Starter Yearly</div>
            <div className="text-[11px] text-white/80">Active subscriber</div>
          </div>
          {nextReset && (
            <div className="text-[10px] text-white/70 bg-white/10 px-2 py-1 rounded-full">
              Renews {nextReset.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </div>
          )}
        </div>

        <div className="bg-white/15 rounded-xl p-3 mb-2">
          <div className="text-xs text-white/80 mb-0.5">CVs created this year</div>
          <div className="text-xl font-bold">{totalCreated}</div>
          <div className="text-[10px] text-white/70 mt-0.5">Unlimited CVs & AI Cover Letters</div>
        </div>

        <div className="text-xs text-white/90 leading-relaxed mb-3">
          <span>Starter Yearly • No Job Tracker included. Upgrade to Focused/Smart for Job Tracker.</span>
        </div>

        <motion.button
          onClick={openMembership}
          className="w-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <Zap className="w-3 h-3" />
          Upgrade to Focused
        </motion.button>
      </div>
    );
  }

  // --- Pro Monthly (blue) ---
  if (planKey === 'focused_monthly') {
    return (
      <div className="rounded-2xl p-3 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm shadow-black/20 dark:shadow-black/40">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-sm font-semibold">Monthly Plan</div>
            <div className="text-xs text-white/80">Pro subscriber</div>
          </div>
          {nextReset && (
            <div className="text-[10px] text-white/70 bg-white/10 px-2 py-1 rounded-full">
              Renews {nextReset.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </div>
          )}
        </div>

        <div className="bg-white/15 rounded-xl p-3 mb-2">
          <div className="text-xs text-white/80 mb-0.5">Jobs created this month</div>
          <div className="text-xl font-bold">{totalCreated}</div>
          <div className="text-[10px] text-white/70 mt-0.5">Unlimited access</div>
        </div>

        <div className="text-xs text-white/90 mb-2.5 leading-relaxed">
          <span className="font-medium">💡 Save up to 40% with quarterly or yearly plans!</span>
        </div>

        <motion.button
          onClick={openMembership}
          className="w-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <Zap className="w-3 h-3" />
          Upgrade & Save
        </motion.button>
      </div>
    );
  }

  // --- Pro Quarterly (green) ---
  if (planKey === 'focused_quarterly') {
    return (
      <div className="rounded-2xl p-3 bg-gradient-to-br from-green-500 to-green-600 text-white shadow-sm shadow-black/20 dark:shadow-black/40">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-sm font-semibold">Quarterly Plan</div>
            <div className="text-xs text-white/80">Pro subscriber</div>
          </div>
          {nextReset && (
            <div className="text-[10px] text-white/70 bg-white/10 px-2 py-1 rounded-full">
              Renews {nextReset.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </div>
          )}
        </div>

        <div className="bg-white/15 rounded-xl p-3 mb-2">
          <div className="text-xs text-white/80 mb-0.5">Jobs created this quarter</div>
          <div className="text-xl font-bold">{totalCreated}</div>
          <div className="text-[10px] text-white/70 mt-0.5">Unlimited access</div>
        </div>

        <div className="text-xs text-white/90 leading-relaxed">
          <span>Quarterly plan • Unlimited job creation & CV/CL generation</span>
        </div>
      </div>
    );
  }

  // --- Pro Yearly (indigo) ---
  if (planKey === 'focused_yearly') {
    return (
      <div className="rounded-2xl p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-sm shadow-black/20 dark:shadow-black/40">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-sm font-semibold">Yearly Plan</div>
            <div className="text-xs text-white/80">Pro subscriber</div>
          </div>
          {nextReset && (
            <div className="text-[10px] text-white/70 bg-white/10 px-2 py-1 rounded-full">
              Renews {nextReset.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </div>
          )}
        </div>

        <div className="bg-white/15 rounded-xl p-3 mb-2">
          <div className="text-xs text-white/80 mb-0.5">Jobs created this year</div>
          <div className="text-xl font-bold">{totalCreated}</div>
          <div className="text-[10px] text-white/70 mt-0.5">Unlimited access</div>
        </div>

        <div className="text-xs text-white/90 leading-relaxed">
          <span>Yearly plan • Unlimited job creation & CV/CL generation</span>
        </div>
      </div>
    );
  }

  // --- Pro Lifetime (amber, best value badge) ---
  if (planKey === 'focused_yearly') {
    return (
      <div className="rounded-2xl p-3 bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-sm shadow-black/20 dark:shadow-black/40 relative overflow-hidden">
        <div className="absolute right-[-35px] top-[10px] bg-white/25 text-white text-[8px] font-bold px-10 py-0.5 rotate-45 transform origin-center shadow-sm">
          BEST VALUE
        </div>

        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-sm font-semibold">Lifetime Plan</div>
            <div className="text-xs text-white/80">Pro subscriber</div>
          </div>
          <div className="text-[10px] text-white/70 bg-white/10 px-2 py-1 rounded-full">
            Lifetime Access
          </div>
        </div>

        <div className="bg-white/15 rounded-xl p-3 mb-2">
          <div className="text-xs text-white/80 mb-0.5">Jobs created</div>
          <div className="text-xl font-bold">{totalCreated}</div>
          <div className="text-[10px] text-white/70 mt-0.5">Unlimited access</div>
        </div>

        <div className="text-xs text-white/90 leading-relaxed">
          <span>One-time payment • Best value with unlimited access forever</span>
        </div>
      </div>
    );
  }

  return null;
}


