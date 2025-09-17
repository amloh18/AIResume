'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Briefcase, TrendingUp, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { getThemeClasses } from '@/lib/utils/themeUtils';
import JobSelector from './JobSelector';
import ATSScoreAnalyzer from './ATSScoreAnalyzer';

interface JobATSSectionProps {
  selectedJobId: string | null;
  onJobSelection: (jobId: string | null) => void;
  userId: string;
  cvData: any;
  jobData: any;
  atsScore: number | null;
  onScoreUpdate: (score: number) => void;
  onRestructure?: (restructuredContent: string) => void;
  onUpdateField?: (path: string, value: any) => void;
  autoLoadedFromJourney?: boolean;
}

const JobATSSection: React.FC<JobATSSectionProps> = ({
  selectedJobId,
  onJobSelection,
  userId,
  cvData,
  jobData,
  atsScore,
  onScoreUpdate,
  onRestructure,
  onUpdateField,
  autoLoadedFromJourney = false
}) => {
  const themeClasses = getThemeClasses;
  const [isExpanded, setIsExpanded] = useState(true);

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-gray-500 dark:text-gray-400';
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreIcon = (score: number | null) => {
    if (!score) return <AlertCircle className="w-5 h-5" />;
    if (score >= 80) return <CheckCircle className="w-5 h-5" />;
    if (score >= 60) return <AlertCircle className="w-5 h-5" />;
    return <AlertCircle className="w-5 h-5" />;
  };

  return (
    <div className={`${themeClasses.card.base} rounded-lg border ${themeClasses.border.primary} overflow-hidden`}>
      {/* Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-lime-100 dark:bg-lime-900/20 rounded-lg">
              <Target className="w-5 h-5 text-lime-600 dark:text-lime-400" />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${themeClasses.text.primary}`}>
                Job & ATS Analysis
              </h3>
              <p className={`text-sm ${themeClasses.text.tertiary}`}>
                Select target job and analyze ATS compatibility
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* ATS Score Badge */}
            {atsScore !== null && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                atsScore >= 80 
                  ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                  : atsScore >= 60
                  ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                  : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              }`}>
                {getScoreIcon(atsScore)}
                <span>ATS: {atsScore}%</span>
              </div>
            )}
            
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <TrendingUp className={`w-5 h-5 ${themeClasses.text.tertiary}`} />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Content */}
      <motion.div
        initial={false}
        animate={{ height: isExpanded ? 'auto' : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="overflow-hidden"
      >
        <div className="p-4 pt-0 space-y-4">
          {/* Compact Job Selection */}
          <div className="mb-4">
            <JobSelector
              selectedJobId={selectedJobId}
              onJobSelection={onJobSelection}
              userId={userId}
              autoLoadedFromJourney={autoLoadedFromJourney}
            />
          </div>

          {/* ATS Score Analyzer - Main Content */}
          {jobData && cvData && (
            <div>
              <ATSScoreAnalyzer
                cvData={cvData}
                jobData={jobData}
                onScoreUpdate={onScoreUpdate}
                onRestructure={onRestructure}
                onUpdateField={onUpdateField}
              />
            </div>
          )}

          {/* Show message when no job is selected */}
          {!jobData && (
            <div className={`p-6 text-center rounded-lg ${themeClasses.background.secondary}`}>
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className={`text-sm ${themeClasses.text.secondary}`}>
                Select a job position to analyze ATS compatibility
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default JobATSSection;