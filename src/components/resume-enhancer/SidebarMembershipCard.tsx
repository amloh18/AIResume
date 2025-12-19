'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AlertCircle, Clock, Star, Zap } from 'lucide-react';
import { getPlanName, PlanKey } from '@/lib/utils/userPlanUtils';

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

  // Keep day pass countdown fresh (match dashboard sidebar behavior)
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

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

  // Day pass countdown (matches dashboard sidebar logic)
  const timeRemaining = (() => {
    if (planKey !== 'day_pass') return null;
    const accessExpiresAt = subscription?.accessExpiresAt;
    if (!accessExpiresAt) return null;
    const expiryDate = new Date(accessExpiresAt);
    const diffTime = expiryDate.getTime() - currentTime.getTime();
    if (diffTime <= 0) return { hours: 0, minutes: 0 };
    const hours = Math.floor(diffTime / (1000 * 60 * 60));
    const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
    return { hours, minutes };
  })();

  const isDayPass = planKey === 'day_pass';
  const isExpired = isDayPass && timeRemaining && timeRemaining.hours === 0 && timeRemaining.minutes === 0;
  const isUrgent = isDayPass && timeRemaining && timeRemaining.hours < 3;

  // Loading placeholder (keeps layout stable)
  if (loading) {
    return (
      <div className="rounded-2xl p-3 bg-[#222327] shadow-sm shadow-black/10 dark:shadow-black/30">
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
      <div className="rounded-2xl p-3 text-white shadow-sm shadow-black/20 dark:shadow-black/40" style={{ backgroundColor: '#603a86' }}>
        <div className="text-sm font-semibold mb-2">
          Your Free Plan
        </div>

        {!isUnlimited && limit > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-[11px] text-white/80 mb-1">
              <span>Credits used</span>
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
            ⚠️ Credits exhausted. Upgrade to continue creating jobs.
          </div>
        )}

        <div className="text-xs font-semibold mb-1.5">
          Go Pro to get:
        </div>

        <ul className="text-xs text-white/90 space-y-0.5 mb-3">
          <li>• Unlimited job creation</li>
          <li>• Unlimited CVs & cover letters</li>
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
            Buy Day Pass
          </motion.button>

          <motion.button
            onClick={openMembership}
            className="w-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Zap className="w-3 h-3" />
            View All Plans
          </motion.button>
        </div>
      </div>
    );
  }

  // --- Day Pass (orange/red) ---
  if (planKey === 'day_pass') {
    return (
      <motion.div
        className={`bg-gradient-to-r ${isUrgent ? 'from-red-500 to-red-600' : 'from-orange-500 to-orange-600'} rounded-2xl p-3 text-white shadow-sm shadow-black/20 dark:shadow-black/40`}
        animate={isUrgent ? {
          boxShadow: ['0 0 0px rgba(239, 68, 68, 0.4)', '0 0 12px rgba(239, 68, 68, 0.6)', '0 0 0px rgba(239, 68, 68, 0.4)']
        } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            {isUrgent && <AlertCircle className="w-3.5 h-3.5 animate-pulse" />}
            <div className="text-sm font-semibold">Day Pass</div>
          </div>
          {timeRemaining && (
            <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${isUrgent ? 'bg-red-400/30' : 'bg-white/20'}`}>
              <Clock className="w-3 h-3" />
              <span>{isExpired ? 'Expired' : `${timeRemaining.hours}h ${timeRemaining.minutes}m`}</span>
            </div>
          )}
        </div>

        <div className="text-xs text-white/95 mb-2 leading-relaxed">
          <span>We have created tailored CVs/CLs for <span className="font-bold">{totalCreated}</span> {totalCreated === 1 ? 'job' : 'jobs'} for you.</span>
        </div>

        {!isUnlimited && limit > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-[11px] text-white/85 mb-1">
              <span>Credits used</span>
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

        {!hasCredits && !isExpired && (
          <div className="text-xs text-yellow-200 mb-2 font-medium">
            ⚠️ Credits exhausted. Upgrade to continue.
          </div>
        )}

        <div className="text-xs text-white/95 mb-2.5 leading-relaxed">
          {isUrgent ? (
            <span className="font-medium">Need your plan to last for a month? Monthly or quarterly plans keep you covered.</span>
          ) : (
            <span>Job searching was never easier. Upgrade to monthly or quarterly plans for longer access.</span>
          )}
        </div>

        <motion.button
          onClick={openMembership}
          className={`w-full text-white text-xs font-semibold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${isUrgent ? 'bg-white text-red-600 hover:bg-red-50 shadow-lg' : 'bg-white/20 hover:bg-white/30'}`}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <Zap className="w-3 h-3" />
          {isUrgent ? 'Upgrade Now' : 'Upgrade'}
        </motion.button>
      </motion.div>
    );
  }

  // --- Pro Monthly (blue) ---
  if (planKey === 'pro_monthly') {
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
          <div className="text-[10px] text-white/70 mt-0.5">Unlimited credits</div>
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
  if (planKey === 'pro_quarterly') {
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
          <div className="text-[10px] text-white/70 mt-0.5">Unlimited credits</div>
        </div>

        <div className="text-xs text-white/90 leading-relaxed">
          <span>Quarterly plan • Unlimited job creation & CV/CL generation</span>
        </div>
      </div>
    );
  }

  // --- Pro Yearly (amber, best value badge) ---
  if (planKey === 'pro_yearly') {
    return (
      <div className="rounded-2xl p-3 bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-sm shadow-black/20 dark:shadow-black/40 relative overflow-hidden">
        <div className="absolute -right-8 top-2 bg-white/20 text-white text-[9px] font-bold px-8 py-0.5 rotate-45 transform">
          BEST VALUE
        </div>

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
          <div className="text-[10px] text-white/70 mt-0.5">Unlimited credits</div>
        </div>

        <div className="text-xs text-white/90 leading-relaxed">
          <span>Annual plan • Best value with unlimited access all year</span>
        </div>
      </div>
    );
  }

  return null;
}


