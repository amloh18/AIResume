'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { CentralScoreManager } from '@/lib/pill-engine/CentralScoreManager';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

interface ATSCompatibilityMeterProps {
  cvData?: UnifiedCVDataStructure;
  impactScore?: {
    quantifiableStatements?: number;
    highImpactVerbs?: number;
    industryKeywords?: number;
  };
  cvOptimization?: {
    totalLength?: string;
    bulletPointLength?: string;
    educationPlacement?: string;
  };
  industrySpecialization?: {
    keywords?: string[];
    contactIssues?: string[];
  };
}

const ATSCompatibilityMeter: React.FC<ATSCompatibilityMeterProps> = ({
  cvData,
  impactScore,
  cvOptimization,
  industrySpecialization
}) => {
  // Use CentralScoreManager to get the actual ATS score if cvData is available
  const scoreResult = useMemo(() => {
    if (cvData) {
      return CentralScoreManager.getInstance().getScoreSync(cvData);
    }
    return null;
  }, [cvData]);

  // Fallback to a default if cvData is not available, but prefer CentralScoreManager
  const atsScore = scoreResult?.atsScore?.total ?? 0;


  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-[#80FF00]';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-[#80FF00]';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    return 'Needs Improvement';
  };

  const checks = [
    {
      label: 'Quantifiable Statements',
      passed: (impactScore?.quantifiableStatements || 0) >= 10,
      value: `${impactScore?.quantifiableStatements || 0}/15`,
      target: '10+'
    },
    {
      label: 'Industry Keywords',
      passed: (impactScore?.industryKeywords || 0) >= 90,
      value: `${impactScore?.industryKeywords || 0}%`,
      target: '90%+'
    },
    {
      label: 'CV Length',
      passed: cvOptimization?.totalLength === '1 Page' || cvOptimization?.totalLength?.includes('1'),
      value: cvOptimization?.totalLength || 'N/A',
      target: '1 Page'
    },
    {
      label: 'Bullet Point Length',
      passed: cvOptimization?.bulletPointLength?.includes('2.') || cvOptimization?.bulletPointLength?.includes('Max 2'),
      value: cvOptimization?.bulletPointLength || 'N/A',
      target: 'Max 2 Lines'
    },
    {
      label: 'Contact Information',
      passed: (industrySpecialization?.contactIssues?.length || 0) === 0,
      value: (industrySpecialization?.contactIssues?.length || 0) === 0 ? 'Complete' : 'Issues Found',
      target: 'Complete'
    }
  ];

  return (
    <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-black" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">ATS Compatibility Meter</h3>
      </div>

      <div className="space-y-4">
        {/* Score Display */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">ATS Compatibility Score</div>
            <div className={`text-2xl font-bold ${getScoreColor(atsScore)}`}>
              {atsScore}%
            </div>
            <div className={`text-sm font-semibold ${getScoreColor(atsScore)} mt-1`}>
              {getScoreLabel(atsScore)}
            </div>
          </div>
          <div className="flex-1 ml-4">
            <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${getScoreBgColor(atsScore)} rounded-full`}
                initial={{ width: 0 }}
                animate={{ width: `${atsScore}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>

        {/* ATS Checks */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            ATS Compatibility Checks
          </h4>
          {checks.map((check, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg"
            >
              <div className="flex items-center gap-3">
                {check.passed ? (
                  <CheckCircle className="w-5 h-5 text-[#80FF00] flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                )}
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {check.label}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Target: {check.target}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-semibold ${check.passed ? 'text-[#80FF00]' : 'text-red-600 dark:text-red-400'}`}>
                  {check.value}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Failure Points */}
        {atsScore < 80 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
                  ATS Optimization Needed
                </h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-400 leading-relaxed">
                  {checks.filter(c => !c.passed).length} critical issue{checks.filter(c => !c.passed).length !== 1 ? 's' : ''} detected. 
                  Address these to improve your CV's ATS compatibility.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ATSCompatibilityMeter;

