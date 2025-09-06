'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Calendar, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Zap,
  Crown,
  Star
} from 'lucide-react';
import { useUsageLimits } from '@/lib/hooks/useUsageLimits';
import UniversalPaymentModal from '@/components/payment/UniversalPaymentModal';

interface AnalyticsWithPaymentIntegrationProps {
  className?: string;
}

const AnalyticsWithPaymentIntegration: React.FC<AnalyticsWithPaymentIntegrationProps> = ({ 
  className = '' 
}) => {
  const {
    usageLimits,
    loading,
    error,
    getRemainingUsage,
    hasUnlimitedAccess,
    isDayPassExpired,
    getTimeUntilDayPassExpiry
  } = useUsageLimits();

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('');

  const formatTimeRemaining = (milliseconds: number): string => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getPlanIcon = (planKey: string) => {
    switch (planKey) {
      case 'free':
        return <Zap className="w-5 h-5 text-gray-500" />;
      case 'day_pass':
        return <Star className="w-5 h-5 text-orange-500" />;
      case 'pro_monthly':
      case 'pro_quarterly':
      case 'pro_yearly':
        return <Crown className="w-5 h-5 text-blue-500" />;
      default:
        return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
  };

  const getPlanName = (planKey: string) => {
    switch (planKey) {
      case 'free':
        return 'Free Plan';
      case 'day_pass':
        return 'Day Pass';
      case 'pro_monthly':
        return 'Pro Monthly';
      case 'pro_quarterly':
        return 'Pro Quarterly';
      case 'pro_yearly':
        return 'Pro Yearly';
      default:
        return 'Unknown Plan';
    }
  };

  const handleUpgrade = (planKey: string) => {
    setSelectedPlan(planKey);
    setIsPaymentModalOpen(true);
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">Error loading usage data</span>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mt-2">{error}</p>
      </div>
    );
  }

  if (!usageLimits) {
    return null;
  }

  const remainingCVs = getRemainingUsage('cv_journey');
  const remainingExports = getRemainingUsage('export');
  const timeUntilExpiry = getTimeUntilDayPassExpiry();

  return (
    <>
      <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Usage Analytics
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Track your plan usage and limits
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {getPlanIcon(usageLimits.planLimits.maxCVs === -1 ? 'pro_yearly' : 'free')}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {getPlanName(usageLimits.planLimits.maxCVs === -1 ? 'pro_yearly' : 'free')}
            </span>
          </div>
        </div>

        {/* Day Pass Expiry Warning */}
        {timeUntilExpiry !== null && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg"
          >
            <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
              <Clock className="w-5 h-5" />
              <span className="font-medium">Day Pass Expires Soon</span>
            </div>
            <p className="text-orange-700 dark:text-orange-300 text-sm mt-1">
              Your day pass expires in {formatTimeRemaining(timeUntilExpiry)}. 
              Upgrade to Pro to continue unlimited access.
            </p>
            <button
              onClick={() => handleUpgrade('pro_monthly')}
              className="mt-3 px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors"
            >
              Upgrade Now
            </button>
          </motion.div>
        )}

        {/* Usage Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* CV Journeys */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-gray-900 dark:text-white">CV Journeys</span>
              </div>
              {remainingCVs === -1 ? (
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">Unlimited</span>
              ) : (
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {remainingCVs} remaining
                </span>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">Used</span>
                <span className="text-gray-900 dark:text-white">
                  {usageLimits.cvJourneyCount}
                  {usageLimits.planLimits.maxCVs !== -1 && `/${usageLimits.planLimits.maxCVs}`}
                </span>
              </div>
              
              {usageLimits.planLimits.maxCVs !== -1 && (
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min(100, (usageLimits.cvJourneyCount / usageLimits.planLimits.maxCVs) * 100)}%` 
                    }}
                  ></div>
                </div>
              )}
            </div>
          </div>

          {/* Exports */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="font-medium text-gray-900 dark:text-white">Exports</span>
              </div>
              {remainingExports === -1 ? (
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">Unlimited</span>
              ) : (
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {remainingExports} remaining
                </span>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">Used</span>
                <span className="text-gray-900 dark:text-white">
                  {usageLimits.exportCount}
                  {usageLimits.planLimits.maxExports !== -1 && `/${usageLimits.planLimits.maxExports}`}
                </span>
              </div>
              
              {usageLimits.planLimits.maxExports !== -1 && (
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min(100, (usageLimits.exportCount / usageLimits.planLimits.maxExports) * 100)}%` 
                    }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upgrade Prompt */}
        {!hasUnlimitedAccess() && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                  Unlock Unlimited Access
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Upgrade to Pro for unlimited CVs, exports, and premium features.
                </p>
              </div>
              <button
                onClick={() => handleUpgrade('pro_monthly')}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                Upgrade
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Payment Modal */}
      <UniversalPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        preselectedPlanKey={selectedPlan}
        onSuccess={() => {
          setIsPaymentModalOpen(false);
          // Refresh usage limits
          window.location.reload();
        }}
        returnUrl={window.location.href}
        triggerContext="usage-analytics"
      />
    </>
  );
};

export default AnalyticsWithPaymentIntegration;