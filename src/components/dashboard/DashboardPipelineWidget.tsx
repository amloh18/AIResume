'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, FileText, CheckCircle, Download, ArrowRight } from 'lucide-react';
import { useJobJourney } from '@/contexts/JobJourneyContext';

const DashboardPipelineWidget: React.FC = () => {
  const { state } = useJobJourney();
  const { isJourneyActive, jobTitle, company, currentStep, steps, atsScore } = state;

  if (!isJourneyActive) {
    return null;
  }

  const getStepIcon = (step: number) => {
    switch (step) {
      case 1: return <Briefcase className="h-3 w-3" />;
      case 2: return <FileText className="h-3 w-3" />;
      case 3: return <CheckCircle className="h-3 w-3" />;
      case 4: return <FileText className="h-3 w-3" />;
      case 5: return <Download className="h-3 w-3" />;
      default: return <Briefcase className="h-3 w-3" />;
    }
  };

  const getStepLabel = (step: number) => {
    switch (step) {
      case 1: return 'Job';
      case 2: return 'CV';
      case 3: return 'ATS';
      case 4: return 'Cover';
      case 5: return 'Download';
      default: return 'Unknown';
    }
  };

  const getProgressPercentage = () => {
    return (currentStep / steps.length) * 100;
  };

  return (
    <motion.div
      className="frosted-glass-widget rounded-xl p-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start gap-4">
        {/* Job Card */}
        <div className="flex-1">
          <div className="bg-gradient-to-r from-lime-500/10 to-lime-600/10 border border-lime-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="h-4 w-4 text-lime-400" />
              <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {jobTitle || 'Untitled Job'}
              </h3>
            </div>
            {company && (
              <p className="text-xs text-gray-600 dark:text-white/60 truncate">{company}</p>
            )}
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-600 dark:text-white/60">Step {currentStep} of {steps.length}</span>
              <span className="text-xs text-lime-600 dark:text-lime-400 font-medium">
                {Math.round(getProgressPercentage())}% Complete
              </span>
            </div>
          </div>
        </div>

        {/* Progress Line */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-0.5 h-16 bg-white/20 relative">
            <motion.div
              className="absolute bottom-0 left-0 w-full bg-lime-500"
              initial={{ height: 0 }}
              animate={{ height: `${getProgressPercentage()}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          
          {/* Step Indicators */}
          <div className="flex flex-col gap-1">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 ${
                  step.status === 'completed'
                    ? 'bg-green-500 text-black'
                    : step.status === 'active'
                    ? 'bg-lime-500 text-black'
                    : 'bg-white/10 text-white/40'
                }`}
                whileHover={{ scale: 1.1 }}
                title={`${getStepLabel(step.id)} - ${step.status}`}
              >
                {getStepIcon(step.id)}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col gap-2">
          {currentStep === 2 && (
            <motion.button
              className="px-3 py-1.5 bg-lime-500 hover:bg-lime-600 text-black text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.href = '/studio?mode=cv-onboarding'}
            >
              <FileText className="h-3 w-3" />
              Create CV
              <ArrowRight className="h-3 w-3" />
            </motion.button>
          )}
          
          {currentStep === 3 && (
            <motion.button
              className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.href = '/studio?mode=ats-edit'}
            >
              <CheckCircle className="h-3 w-3" />
              Check ATS
              <ArrowRight className="h-3 w-3" />
            </motion.button>
          )}
          
          {currentStep === 4 && (
            <motion.button
              className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.href = '/studio?mode=cover-letter-edit'}
            >
              <FileText className="h-3 w-3" />
              Cover Letter
              <ArrowRight className="h-3 w-3" />
            </motion.button>
          )}
          
          {currentStep === 5 && (
            <motion.button
              className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.href = '/dashboard/cv-journey'}
            >
              <Download className="h-3 w-3" />
              Download
              <ArrowRight className="h-3 w-3" />
            </motion.button>
          )}

          {/* ATS Score Display */}
          {atsScore && (
            <div className="text-center">
              <div className="text-xs text-white/60 mb-1">ATS Score</div>
              <div className={`text-lg font-bold ${
                atsScore >= 80 ? 'text-green-400' :
                atsScore >= 60 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {atsScore}%
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default DashboardPipelineWidget;
