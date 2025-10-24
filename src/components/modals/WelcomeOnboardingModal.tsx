'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  FileText, 
  Briefcase, 
  Target, 
  TrendingUp,
  ArrowRight,
  Sparkles,
  CheckCircle
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface WelcomeOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

const WelcomeOnboardingModal: React.FC<WelcomeOnboardingModalProps> = ({
  isOpen,
  onClose,
  userName = 'there'
}) => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: `Welcome to CVCircle, ${userName}!`,
      description: 'Let\'s get you started with a quick tour of what you can do here.',
      image: '/images/Herobanner.png',
      highlights: [
        'Create tailored CVs for every job',
        'Track your application journey',
        'Get ATS scores and insights',
        'Generate AI-powered cover letters'
      ]
    },
    {
      title: 'Create Your Master CV',
      description: 'Your Master CV is your foundation. Create it once, use it for all applications.',
      image: '/images/CV Creation step 2.png',
      highlights: [
        'Contains all your experience and skills',
        'Duplicate it for each job application',
        'Customize for specific roles',
        'Never start from scratch again'
      ]
    },
    {
      title: 'Application Journey',
      description: 'Track every step of your application process visually.',
      image: '/images/Apply step5.png',
      highlights: [
        'See all your applications in one place',
        'Track status from creation to offer',
        'Manage CVs and cover letters per job',
        'Stay organized throughout your search'
      ]
    }
  ];

  const currentStepData = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleGetStarted();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGetStarted = () => {
    onClose();
    // Route to master CV onboarding
    router.push('/master-cv-onboarding');
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl"
          initial={{ scale: 0.9, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 50 }}
          transition={{ type: 'spring', damping: 20 }}
        >
          {/* Close Button */}
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={handleSkip}
              className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Progress Indicators */}
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? 'w-8 bg-lime-500'
                    : index < currentStep
                    ? 'w-4 bg-lime-400'
                    : 'w-4 bg-gray-300 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="grid lg:grid-cols-2 h-full"
            >
              {/* Left Side - Content */}
              <div className="p-12 flex flex-col justify-center">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-lime-100 dark:bg-lime-900/20 rounded-full mb-6">
                    <Sparkles className="h-4 w-4 text-lime-600 dark:text-lime-400" />
                    <span className="text-sm font-semibold text-lime-700 dark:text-lime-300">
                      Step {currentStep + 1} of {steps.length}
                    </span>
                  </div>

                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    {currentStepData.title}
                  </h2>
                  
                  <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
                    {currentStepData.description}
                  </p>

                  {/* Highlights */}
                  <div className="space-y-3 mb-8">
                    {currentStepData.highlights.map((highlight, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + index * 0.1 }}
                        className="flex items-start gap-3"
                      >
                        <CheckCircle className="h-5 w-5 text-lime-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 dark:text-gray-300">{highlight}</span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex gap-3">
                    {currentStep > 0 && (
                      <button
                        onClick={handlePrevious}
                        className="px-6 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
                      >
                        Previous
                      </button>
                    )}
                    
                    <button
                      onClick={handleNext}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700 text-black font-semibold rounded-lg transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      {currentStep === steps.length - 1 ? (
                        <>
                          Create Master CV
                          <Sparkles className="h-5 w-5" />
                        </>
                      ) : (
                        <>
                          Next
                          <ArrowRight className="h-5 w-5" />
                        </>
                      )}
                    </button>
                  </div>

                  {/* Skip Link */}
                  <button
                    onClick={handleSkip}
                    className="mt-4 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
                  >
                    Skip for now
                  </button>
                </motion.div>
              </div>

              {/* Right Side - Image */}
              <div className="relative bg-gradient-to-br from-lime-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900 p-8 flex items-center justify-center">
                <div className="relative w-full h-full max-w-md">
                  <Image
                    src={currentStepData.image}
                    alt={currentStepData.title}
                    fill
                    className="object-contain"
                    priority={currentStep === 0}
                  />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WelcomeOnboardingModal;


