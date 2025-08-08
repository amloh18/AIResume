'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { OnboardingProvider, useOnboarding } from '@/contexts/OnboardingContext';
import AuthModal from '@/components/onboarding/AuthModal';
import RoleSelection from '@/components/onboarding/RoleSelection';
import PersonalInfoStep from '@/components/onboarding/PersonalInfoStep';
import ExperienceStep from '@/components/onboarding/ExperienceStep';
import EducationStep from '@/components/onboarding/EducationStep';
import CompletionStep from '@/components/onboarding/CompletionStep';
import { Sparkles, ArrowLeft, CheckCircle } from 'lucide-react';

const OnboardingContent: React.FC = () => {
  const { state, dispatch, nextStep, prevStep } = useOnboarding();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleRoleSelect = (role: any) => {
    dispatch({ type: 'SET_SELECTED_ROLE', payload: role });
    setShowAuthModal(true);
  };

  const handleAuthSuccess = (userData: any) => {
    dispatch({ type: 'SET_AUTHENTICATED', payload: true });
    dispatch({ type: 'SET_USER_DATA', payload: userData });
    setShowAuthModal(false);
    nextStep();
  };

  const handleComplete = async () => {
    setIsLoading(true);
    
    try {
      // Save CV data to database
      const response = await fetch('/api/cvs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: state.userData.id,
          title: `${state.userData.firstName} ${state.userData.lastName}'s CV`,
          sections: state.cvData
        }),
      });

      if (response.ok) {
        // Set completion flag for dashboard
        sessionStorage.setItem('fromOnboarding', 'true');
        
        // Redirect to dashboard
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        throw new Error('Failed to save CV');
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (state.currentStep) {
      case 0:
        return <RoleSelection onRoleSelect={handleRoleSelect} />;
      case 1:
        return <PersonalInfoStep onNext={nextStep} />;
      case 2:
        return <ExperienceStep onNext={nextStep} onBack={prevStep} />;
      case 3:
        return <EducationStep onNext={nextStep} onBack={prevStep} />;
      case 4:
        return <CompletionStep onComplete={handleComplete} onBack={prevStep} isLoading={isLoading} />;
      default:
        return <RoleSelection onRoleSelect={handleRoleSelect} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <motion.div 
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-lime-400/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.4, 0.7, 0.4],
            x: [0, -40, 0],
            y: [0, 40, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Back Button */}
            {state.currentStep > 0 && (
              <motion.button
                onClick={prevStep}
                className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ x: -5 }}
              >
                <ArrowLeft size={20} />
                Back
              </motion.button>
            )}

            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-lime-400 to-lime-500 rounded-xl flex items-center justify-center">
                <Sparkles size={20} className="text-black" />
              </div>
              <div className="text-2xl font-bold">
                <span className="text-lime-400">CV</span>
                <span className="text-white">CIRCLE</span>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="hidden md:flex items-center gap-4">
              {state.steps.map((step, index) => (
                <div key={step.id} className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                      step.isActive
                        ? 'bg-lime-400 text-black shadow-lg'
                        : step.isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-white/10 text-white/40'
                    }`}
                  >
                    {step.isCompleted ? <CheckCircle size={16} /> : index + 1}
                  </div>
                  {index < state.steps.length - 1 && (
                    <div
                      className={`w-8 h-1 transition-all duration-300 ${
                        step.isCompleted ? 'bg-green-500' : 'bg-white/10'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-5rem)] p-4">
        <div className="w-full max-w-4xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={state.currentStep}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        selectedRole={state.selectedRole?.id}
      />
    </div>
  );
};

const OnboardingPage: React.FC = () => {
  return (
    <OnboardingProvider>
      <OnboardingContent />
    </OnboardingProvider>
  );
};

export default OnboardingPage;
