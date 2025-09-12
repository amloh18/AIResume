'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, LogOut, User, CheckCircle } from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { signOut } from 'next-auth/react';

// Import the new onboarding components
import RoleSelectionStep from '@/components/onboarding-universal/RoleSelectionStep';
import PersonalInfoStep from '@/components/onboarding-universal/PersonalInfoStep';
import CoreExperienceStep from '@/components/onboarding-universal/CoreExperienceStep';
import SkillsQualificationsStep from '@/components/onboarding-universal/SkillsQualificationsStep';
import PreviewLaunchStep from '@/components/onboarding-universal/PreviewLaunchStep';

interface OnboardingState {
  currentStep: number;
  userRole: string | null;
  cvData: any;
  isCompleted: boolean;
}

const steps = [
  { id: 'role', title: 'Role Selection', description: 'Choose your role' },
  { id: 'personal', title: 'Personal Info', description: 'Your details' },
  { id: 'experience', title: 'Experience', description: 'Work & Education' },
  { id: 'skills', title: 'Skills', description: 'Skills & Qualifications' },
  { id: 'preview', title: 'Preview', description: 'Review & Launch' }
];

export default function UniversalOnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [showTour, setShowTour] = useState(false);

  const [state, setState] = useState<OnboardingState>({
    currentStep: 0,
    userRole: null,
    cvData: {
      basics: {
        name: '',
        email: '',
        phone: '',
        location: { city: '', country: '' },
        website: '',
        linkedin: '',
        summary: ''
      },
      work: [],
      education: [],
      skills: [],
      projects: [],
      certificates: [],
      languages: []
    },
    isCompleted: false
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
  }, [session, status, router]);

  const handleRoleSelect = async (role: string) => {
    setIsLoading(true);
    try {
      // Update user role in database
      const response = await fetch('/api/user/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userRole: role })
      });

      if (response.ok) {
        setState(prev => ({ ...prev, userRole: role, currentStep: 1 }));
      } else {
        console.error('Failed to update user role');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (state.currentStep < steps.length - 1) {
      setState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
    }
  };

  const handleBack = () => {
    if (state.currentStep > 0) {
      setState(prev => ({ ...prev, currentStep: prev.currentStep - 1 }));
    }
  };

  const handleCVDataUpdate = (data: any) => {
    setState(prev => ({
      ...prev,
      cvData: { ...prev.cvData, ...data }
    }));
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      // Create Master CV
      const response = await fetch('/api/cv/create-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvData: state.cvData,
          isMaster: true
        })
      });

      if (response.ok) {
        setState(prev => ({ ...prev, isCompleted: true }));
        // Redirect to dashboard with tour
        router.push('/dashboard?tour=true');
      } else {
        console.error('Failed to create master CV');
      }
    } catch (error) {
      console.error('Error creating master CV:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (state.currentStep) {
      case 0:
        return <RoleSelectionStep onRoleSelect={handleRoleSelect} isLoading={isLoading} />;
      case 1:
        return <PersonalInfoStep 
          cvData={state.cvData} 
          onUpdate={handleCVDataUpdate} 
          onNext={handleNext} 
        />;
      case 2:
        return <CoreExperienceStep 
          cvData={state.cvData} 
          onUpdate={handleCVDataUpdate} 
          onNext={handleNext} 
          onBack={handleBack} 
        />;
      case 3:
        return <SkillsQualificationsStep 
          cvData={state.cvData} 
          onUpdate={handleCVDataUpdate} 
          onNext={handleNext} 
          onBack={handleBack} 
        />;
      case 4:
        return <PreviewLaunchStep 
          cvData={state.cvData} 
          onComplete={handleComplete} 
          onBack={handleBack} 
          isLoading={isLoading} 
        />;
      default:
        return <RoleSelectionStep onRoleSelect={handleRoleSelect} isLoading={isLoading} />;
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/20 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-white">
                  <span className="text-lime-400">CV</span>Circle
                </h1>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              {/* User Menu */}
              <div className="relative">
                <button className="flex items-center space-x-2 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                  <User size={20} />
                  <span className="hidden sm:block">{session.user?.name || session.user?.email}</span>
                </button>
              </div>

              {/* Logout */}
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Timeline */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center space-x-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <motion.div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                  index === state.currentStep
                    ? 'border-lime-400 bg-lime-400/20 text-lime-400'
                    : index < state.currentStep
                    ? 'border-green-500 bg-green-500 text-white'
                    : 'border-white/30 bg-white/5 text-white/40'
                }`}
                animate={{
                  scale: index === state.currentStep ? 1.1 : 1,
                  boxShadow: index === state.currentStep ? '0 0 20px rgba(163, 230, 53, 0.3)' : 'none'
                }}
                transition={{ duration: 0.3 }}
              >
                {index < state.currentStep ? (
                  <CheckCircle size={20} />
                ) : (
                  <span className="text-sm font-semibold">{index + 1}</span>
                )}
              </motion.div>
              
              {index < steps.length - 1 && (
                <div className={`w-8 h-0.5 mx-2 transition-colors duration-300 ${
                  index < state.currentStep ? 'bg-green-500' : 'bg-white/20'
                }`} />
              )}
            </div>
          ))}
        </div>
        
        {/* Step Title */}
        <motion.div
          key={state.currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center mt-4"
        >
          <h2 className="text-xl font-semibold text-white">
            {steps[state.currentStep].title}
          </h2>
          <p className="text-white/60 text-sm">
            {steps[state.currentStep].description}
          </p>
        </motion.div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={state.currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
