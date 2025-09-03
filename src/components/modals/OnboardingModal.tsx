'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Briefcase, FileText, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import { useJobJourney } from '@/contexts/JobJourneyContext';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const { startJourney } = useJobJourney();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to CV Journey',
      description: 'Let\'s create a professional CV tailored to your dream job. We\'ll guide you through each step.',
      icon: <Sparkles className="h-8 w-8 text-lime-400" />,
      action: 'Get Started'
    },
    {
      title: 'Add Your Job',
      description: 'First, let\'s add the job you\'re applying for. We\'ll use this to tailor your CV and cover letter.',
      icon: <Briefcase className="h-8 w-8 text-blue-400" />,
      action: 'Add Job'
    },
    {
      title: 'Create Your CV',
      description: 'Next, we\'ll create or select a CV that matches the job requirements.',
      icon: <FileText className="h-8 w-8 text-green-400" />,
      action: 'Create CV'
    },
    {
      title: 'Optimize for ATS',
      description: 'We\'ll check your CV against the job description to ensure it passes ATS systems.',
      icon: <CheckCircle className="h-8 w-8 text-purple-400" />,
      action: 'Optimize'
    },
    {
      title: 'Write Cover Letter',
      description: 'Finally, we\'ll help you write a compelling cover letter that complements your CV.',
      icon: <FileText className="h-8 w-8 text-orange-400" />,
      action: 'Write Cover Letter'
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleStartJourney();
    }
  };

  const handleStartJourney = () => {
    // Start a new journey with a temporary job ID
    const tempJobId = `temp-${Date.now()}`;
    startJourney(tempJobId);
    onClose();
  };

  const handleClose = () => {
    setCurrentStep(0);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-gray-900 border border-white/10 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">CV Journey Setup</h2>
              <button
                onClick={handleClose}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs text-white/60 mb-2">
                <span>Step {currentStep + 1} of {steps.length}</span>
                <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <motion.div
                  className="bg-lime-500 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Current Step Content */}
            <div className="text-center mb-6">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mb-4"
              >
                {steps[currentStep].icon}
              </motion.div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {steps[currentStep].title}
              </h3>
              <p className="text-white/60 text-sm leading-relaxed">
                {steps[currentStep].description}
              </p>
            </div>

            {/* Step Indicators */}
            <div className="flex justify-center gap-2 mb-6">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index <= currentStep ? 'bg-lime-500' : 'bg-white/20'
                  }`}
                />
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {currentStep > 0 && (
                <motion.button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Previous
                </motion.button>
              )}
              <motion.button
                onClick={handleNext}
                className="flex-1 px-4 py-2 bg-lime-500 hover:bg-lime-600 text-black font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    Start Journey
                    <Sparkles className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    {steps[currentStep].action}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </motion.button>
            </div>

            {/* Skip Option */}
            {currentStep === 0 && (
              <div className="mt-4 text-center">
                <button
                  onClick={handleStartJourney}
                  className="text-white/40 hover:text-white/60 text-sm transition-colors"
                >
                  Skip tutorial and start directly
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OnboardingModal;
