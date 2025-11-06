'use client';

import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, Crown, ArrowRight } from 'lucide-react';
import { useUsageLimits } from '@/lib/hooks/useUsageLimits';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export function TimeRemainingBanner() {
  const { timeRemaining, subscription, timeAccess } = useUsageLimits();
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute for accurate countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Don't show banner if no time remaining info or no active subscription
  if (!timeRemaining || !subscription || subscription.status !== 'active') {
    return null;
  }

  // Don't show for free plan
  if (subscription.planKey === 'free') {
    return null;
  }

  const isDayPass = subscription.planKey === 'day_pass';
  const isUrgent = isDayPass 
    ? (timeRemaining.hours || 0) < 3 
    : (timeRemaining.days || 0) < 7;

  const handleUpgrade = () => {
    router.push('/dashboard/settings?tab=membership');
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`w-full ${
          isUrgent
            ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
            : isDayPass
            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
            : 'bg-gradient-to-r from-lime-500 to-green-500 text-white'
        } shadow-lg`}
      >
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              {isUrgent ? (
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              ) : (
                <Clock className="w-5 h-5" />
              )}
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                <span className="font-medium">
                  {isDayPass ? 'Day Pass' : 'Pro Subscription'} 
                  {timeAccess?.isInGracePeriod && ' (Grace Period)'}
                </span>
                <span className="text-sm opacity-90">
                  {isUrgent ? (
                    <>
                      {isDayPass 
                        ? `Expires in ${timeRemaining.formatted}!` 
                        : `Expires in ${timeRemaining.formatted}!`}
                    </>
                  ) : (
                    <>
                      {isDayPass 
                        ? `Expires in ${timeRemaining.formatted}` 
                        : `Renews in ${timeRemaining.formatted}`}
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isUrgent && (
                <button
                  onClick={handleUpgrade}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors backdrop-blur-sm"
                >
                  <Crown className="w-4 h-4" />
                  {isDayPass ? 'Upgrade to Pro' : 'Renew Now'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              {!isDayPass && subscription.autoRenew && !isUrgent && (
                <span className="text-sm opacity-90">
                  Auto-renewal enabled
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

