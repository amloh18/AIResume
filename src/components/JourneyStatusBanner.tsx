'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, FileText, CheckCircle, Download, X } from 'lucide-react';
import { useJobJourney } from '@/contexts/JobJourneyContext';

const JourneyStatusBanner: React.FC = () => {
  const { state, endJourney } = useJobJourney();
  const { isJourneyActive, jobTitle, company, currentStep, steps } = state;

  if (!isJourneyActive) {
    return null;
  }

  const getStepIcon = (step: number) => {
    switch (step) {
      case 1: return <Briefcase className="h-4 w-4" />;
      case 2: return <FileText className="h-4 w-4" />;
      case 3: return <CheckCircle className="h-4 w-4" />;
      case 4: return <FileText className="h-4 w-4" />;
      case 5: return <Download className="h-4 w-4" />;
      default: return <Briefcase className="h-4 w-4" />;
    }
  };

  const getStepLabel = (step: number) => {
    switch (step) {
      case 1: return 'Add Job';
      case 2: return 'Create CV';
      case 3: return 'ATS Score';
      case 4: return 'Cover Letter';
      case 5: return 'Download';
      default: return 'Unknown';
    }
  };

  return (
    <motion.div
      className="bg-gradient-to-r from-lime-500/10 to-lime-600/10 border-b border-lime-500/20 px-6 py-3"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Job Info and Progress */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-lime-400" />
            <div>
              <h3 className="text-sm font-medium text-white">
                {jobTitle || 'Untitled Job'}
              </h3>
              {company && (
                <p className="text-xs text-white/60">{company}</p>
              )}
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    step.status === 'completed' ? 'bg-lime-500' :
                    step.status === 'active' ? 'bg-lime-400' : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-white/60">
              Step {currentStep} of {steps.length}
            </span>
          </div>

          {/* Current Step */}
          <div className="flex items-center gap-2 px-3 py-1 bg-lime-500/20 rounded-full">
            {getStepIcon(currentStep)}
            <span className="text-xs font-medium text-lime-400">
              {getStepLabel(currentStep)}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <motion.button
            onClick={endJourney}
            className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="End Journey"
          >
            <X className="h-4 w-4" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default JourneyStatusBanner;
