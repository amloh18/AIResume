'use client';

import React, { useState } from 'react';
import { Plus, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useUsageLimits } from '@/lib/hooks/useUsageLimits';
import { usePaymentModal } from '@/contexts/PaymentModalContext';
import PaymentTrigger from './PaymentTrigger';
import UpgradePrompt from './UpgradePrompt';

// Example component showing how to integrate payment modal with usage limits
const PaymentIntegrationExample: React.FC = () => {
  const { 
    canCreateCV,
    canPerformATSCheck,
    canExport,
    usageLimits,
    loading 
  } = useUsageLimits();

  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeContext, setUpgradeContext] = useState<string>('');

  const handleCreateCV = async () => {
    const cvCheck = await canCreateCV();
    if (cvCheck.allowed) {
      // Proceed with CV creation
      console.log('Creating CV...');
    } else {
      setUpgradeContext('cv-creation');
      setShowUpgradePrompt(true);
    }
  };

  const handleCreateJourney = async () => {
    const journeyCheck = await canCreateCV(); // Use same check as CV creation
    if (journeyCheck.allowed) {
      // Proceed with journey creation
      console.log('Creating journey...');
    } else {
      setUpgradeContext('cv-journey');
      setShowUpgradePrompt(true);
    }
  };

  const handleATSCheck = async () => {
    const atsCheck = await canPerformATSCheck();
    if (atsCheck.allowed) {
      // Proceed with ATS check
      console.log('Running ATS check...');
    } else {
      setUpgradeContext('ats-check');
      setShowUpgradePrompt(true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Payment Integration Example
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          This component demonstrates how to integrate the universal payment modal with usage limits.
        </p>
      </div>

      {/* Usage Stats */}
      {usageLimits && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Current Usage
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  CV Creations
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {usageLimits.cvCreatedCount} / {usageLimits.planLimits.maxCVs === -1 ? '∞' : usageLimits.planLimits.maxCVs}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: usageLimits.planLimits.maxCVs === -1 ? '100%' : `${Math.min(100, (usageLimits.cvCreatedCount / usageLimits.planLimits.maxCVs) * 100)}%` 
                  }}
                />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  CV Journeys
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {usageLimits.cvJourneyCount} / {usageLimits.planLimits.maxCVs === -1 ? '∞' : usageLimits.planLimits.maxCVs}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: usageLimits.planLimits.maxCVs === -1 ? '100%' : `${Math.min(100, (usageLimits.cvJourneyCount / usageLimits.planLimits.maxCVs) * 100)}%` 
                  }}
                />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  ATS Checks
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {usageLimits.atsCheckCount} / {usageLimits.planLimits.maxCVs === -1 ? '∞' : usageLimits.planLimits.maxCVs}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: usageLimits.planLimits.maxCVs === -1 ? '100%' : `${Math.min(100, (usageLimits.atsCheckCount / usageLimits.planLimits.maxCVs) * 100)}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Create CV
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              Create a new CV with AI assistance
            </p>
            <button
              onClick={handleCreateCV}
              className="w-full py-2 px-4 rounded-lg font-medium transition-colors bg-blue-500 text-white hover:bg-blue-600"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Create CV
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              CV Journey
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              Start a complete CV journey
            </p>
            <button
              onClick={handleCreateJourney}
              className="w-full py-2 px-4 rounded-lg font-medium transition-colors bg-green-500 text-white hover:bg-green-600"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Start Journey
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              ATS Check
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              Check CV for ATS compatibility
            </p>
            <button
              onClick={handleATSCheck}
              className="w-full py-2 px-4 rounded-lg font-medium transition-colors bg-purple-500 text-white hover:bg-purple-600"
            >
              <CheckCircle className="w-4 h-4 inline mr-2" />
              Run Check
            </button>
          </div>
        </div>
      </div>

      {/* Payment Triggers */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Payment Triggers
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PaymentTrigger variant="card" preselectedPlanKey="pro_monthly" />
          
          <div className="space-y-4">
            <PaymentTrigger variant="button" size="sm" preselectedPlanKey="day_pass" />
            <PaymentTrigger variant="button" size="md" preselectedPlanKey="pro_monthly" />
            <PaymentTrigger variant="button" size="lg" preselectedPlanKey="pro_yearly" />
            <PaymentTrigger variant="inline" preselectedPlanKey="pro_quarterly">
              Upgrade to unlock more features
            </PaymentTrigger>
          </div>
        </div>
      </div>

      {/* Upgrade Prompt */}
      <UpgradePrompt
        isOpen={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        title="Upgrade Required"
        description="You've reached your limit"
        feature={upgradeContext === 'cv-creation' ? 'CV Creation' : 
                upgradeContext === 'cv-journey' ? 'CV Journey' : 'ATS Check'}
        currentCount={upgradeContext === 'cv-creation' ? usageLimits?.cvCreatedCount || 0 :
                     upgradeContext === 'cv-journey' ? usageLimits?.cvJourneyCount || 0 :
                     usageLimits?.atsCheckCount || 0}
        limit={upgradeContext === 'cv-creation' ? usageLimits?.planLimits.maxCVs || 1 :
               upgradeContext === 'cv-journey' ? usageLimits?.planLimits.maxCVs || 1 :
               usageLimits?.planLimits.maxCVs || 1}
        preselectedPlanKey="pro_monthly"
        triggerContext={upgradeContext}
      />
    </div>
  );
};

export default PaymentIntegrationExample;
