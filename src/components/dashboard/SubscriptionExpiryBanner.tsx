'use client';

import React, { useState } from 'react';
import { AlertTriangle, Clock, X, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface SubscriptionExpiryBannerProps {
  planKey: string;
  expiresAt?: Date | string;
  daysRemaining?: number;
  hoursRemaining?: number;
  isInGracePeriod?: boolean;
  gracePeriodEndsAt?: Date | string;
  onDismiss?: () => void;
}

export default function SubscriptionExpiryBanner({
  planKey,
  expiresAt,
  daysRemaining,
  hoursRemaining,
  isInGracePeriod = false,
  gracePeriodEndsAt,
  onDismiss
}: SubscriptionExpiryBannerProps) {
  const router = useRouter();
  const [isDismissed, setIsDismissed] = useState(false);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  const handleRenew = () => {
    router.push('/dashboard/settings?tab=membership');
  };

  if (isDismissed) {
    return null;
  }

  // Determine urgency level
  const isExpired = daysRemaining !== undefined && daysRemaining < 0;
  const isUrgent = daysRemaining !== undefined && daysRemaining <= 3;
  const isWarning = daysRemaining !== undefined && daysRemaining <= 7 && daysRemaining > 3;

  // Format expiry date
  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format time remaining
  const formatTimeRemaining = () => {
    if (isExpired) {
      return 'Expired';
    }
    if (daysRemaining !== undefined) {
      if (daysRemaining === 0) {
        return hoursRemaining !== undefined && hoursRemaining > 0 
          ? `${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''} remaining`
          : 'Expires today';
      }
      return `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`;
    }
    if (hoursRemaining !== undefined) {
      return `${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''} remaining`;
    }
    return 'Expiring soon';
  };

  // Get banner styling based on urgency
  const getBannerStyles = () => {
    if (isExpired || isInGracePeriod) {
      return {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-500 dark:border-red-400',
        text: 'text-red-900 dark:text-red-200',
        textSecondary: 'text-red-700 dark:text-red-300',
        button: 'bg-red-600 hover:bg-red-700 text-white'
      };
    }
    if (isUrgent) {
      return {
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        border: 'border-orange-500 dark:border-orange-400',
        text: 'text-orange-900 dark:text-orange-200',
        textSecondary: 'text-orange-700 dark:text-orange-300',
        button: 'bg-orange-600 hover:bg-orange-700 text-white'
      };
    }
    if (isWarning) {
      return {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        border: 'border-yellow-500 dark:border-yellow-400',
        text: 'text-yellow-900 dark:text-yellow-200',
        textSecondary: 'text-yellow-700 dark:text-yellow-300',
        button: 'bg-yellow-600 hover:bg-yellow-700 text-white'
      };
    }
    return {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-500 dark:border-blue-400',
      text: 'text-blue-900 dark:text-blue-200',
      textSecondary: 'text-blue-700 dark:text-blue-300',
      button: 'bg-blue-600 hover:bg-blue-700 text-white'
    };
  };

  const styles = getBannerStyles();
  const planName = planKey === 'pro_monthly' ? 'Pro Monthly' :
                   planKey === 'pro_quarterly' ? 'Pro Quarterly' :
                   planKey === 'pro_yearly' ? 'Pro Yearly' :
                   planKey === 'pro_lifetime' ? 'Pro Lifetime' : 'Subscription';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`${styles.bg} border-l-4 ${styles.border} p-4 mb-6 rounded-r-lg`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="flex-shrink-0">
              {isExpired || isUrgent ? (
                <AlertTriangle className={`w-6 h-6 ${styles.text} ${isUrgent ? 'animate-pulse' : ''}`} />
              ) : (
                <Clock className={`w-6 h-6 ${styles.text}`} />
              )}
            </div>
            <div className="flex-1">
              <h3 className={`text-h3 font-semibold ${styles.text} mb-1`}>
                {isExpired 
                  ? `${planName} Expired`
                  : isInGracePeriod
                  ? `${planName} - Grace Period`
                  : `${planName} Expiring Soon`}
              </h3>
              <p className={`text-small ${styles.textSecondary} mb-2`}>
                {isExpired 
                  ? 'Your subscription has expired. Renew now to continue using premium features.'
                  : isInGracePeriod
                  ? `Your subscription is in a grace period. Renew before ${gracePeriodEndsAt ? formatDate(gracePeriodEndsAt) : 'the grace period ends'} to avoid service interruption.`
                  : `Your ${planName.toLowerCase()} will expire ${formatTimeRemaining()}. Renew now to continue uninterrupted access.`}
              </p>
              {expiresAt && (
                <p className={`text-small ${styles.textSecondary} mb-3`}>
                  Expires: {formatDate(expiresAt)}
                </p>
              )}
              <button
                onClick={handleRenew}
                className={`inline-flex items-center gap-2 px-4 py-2 ${styles.button} rounded-lg transition-colors text-small font-medium`}
              >
                <ArrowRight className="w-4 h-4" />
                {isExpired ? 'Renew Subscription' : 'Renew Now'}
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className={`flex-shrink-0 ${styles.textSecondary} hover:${styles.text} transition-colors p-1`}
            aria-label="Dismiss banner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

