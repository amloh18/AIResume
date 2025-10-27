'use client';

import React, { useEffect, Suspense, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AICareerReportProvider, useAICareerReport } from '@/contexts/AICareerReportContext';
import ChoosePathStep from '@/components/ai-career-report/ChoosePathStep';
import MasterCVBuilderStep from '@/components/ai-career-report/MasterCVBuilderStep';
import AICareerReportStep from '@/components/ai-career-report/AICareerReportStep';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles, Eye, Save, CheckCircle, LogOut } from 'lucide-react';

// Main Content Component
function AICareerReportContent() {
  const { state, dispatch, nextStep, prevStep } = useAICareerReport();
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const stepParam = searchParams.get('step');
  const modeParam = searchParams.get('mode');
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);

  // Handle URL parameters and authentication
  useEffect(() => {
    // Handle step parameter
    if (stepParam) {
      const step = parseInt(stepParam);
      if (step >= 1 && step <= 3) {
        dispatch({ type: 'SET_CURRENT_STEP', payload: step as 1 | 2 | 3 });
      }
    }

    // Handle mode parameter (guide mode)
    if (modeParam === 'guide') {
      // If user has existing Master CV, jump to Step 3
      // Otherwise, start from Step 1
      dispatch({ type: 'SET_CURRENT_STEP', payload: 1 });
    }
  }, [stepParam, modeParam, dispatch]);

  // Log authentication status for debugging
  useEffect(() => {
    console.log('🔐 Auth status:', {
      currentStep: state.currentStep,
      sessionStatus: status,
      hasSession: !!session?.user,
      sessionUser: session?.user
    });
  }, [session, status, state.currentStep]);

  // Show saved indicator when data is saved (only for steps 1 and 2)
  useEffect(() => {
    if (state.currentStep <= 2) {
      setShowSavedIndicator(true);
      const timer = setTimeout(() => {
        setShowSavedIndicator(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state.cvData, state.currentStep]);


  const renderStep = () => {
    switch (state.currentStep) {
      case 1:
        return <ChoosePathStep onNext={nextStep} />;
      case 2:
        return <MasterCVBuilderStep onNext={nextStep} onBack={prevStep} />;
      case 3:
        return <AICareerReportStep onComplete={() => router.push('/dashboard')} onBack={prevStep} session={session} />;
      default:
        return <ChoosePathStep onNext={nextStep} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#1A261A]">
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
            {/* Left side - Back button, Logo, and Step Information */}
            <div className="flex items-center gap-6">
              {/* Back Button */}
              {state.currentStep > 1 && (
                <motion.button
                  onClick={prevStep}
                  className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ x: -5 }}
                >
                  <ArrowLeft size={20} />
                </motion.button>
              )}

              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold">
                  <span className="text-lime-400">CV</span>
                  <span className="text-white">CIRCLE</span>
                </div>
                <div className="text-sm text-white/60 bg-lime-400/20 px-2 py-1 rounded-full">
                  AI Career Guide
                </div>
              </div>

              {/* Step Information - Inline after logo */}
              <div className="flex items-center gap-4 ml-8">
                <div className="h-8 w-px bg-white/20"></div>
                <div className="flex flex-col">
                  {state.currentStep === 1 && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center">
                        <div className="text-[#80FF00] font-bold text-sm">Step 1 of 3</div>
                      </div>
                      <div className="flex flex-col">
                        <div className="text-lg font-bold text-white">Create Your CV</div>
                        <div className="text-white/70 text-xs">Choose how you'd like to start.</div>
                      </div>
                    </div>
                  )}
                  {state.currentStep === 2 && (
                    <>
                      <div className="text-[#80FF00] font-bold text-sm">Step 2 of 3</div>
                      <div className="text-lg font-bold text-white">Details Sections</div>
                      <div className="text-white/70 text-xs">Review and edit your CV sections.</div>
                    </>
                  )}
                  {state.currentStep === 3 && (
                    <>
                      <div className="text-[#80FF00] font-bold text-sm">Step 3 of 3</div>
                      <div className="text-lg font-bold text-white">Your Career Report</div>
                      <div className="text-white/70 text-xs">AI-powered analysis and career insights.</div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right side - Authentication buttons */}
            <div className="flex items-center gap-4">
              {/* Data Saved Indicator */}
              {showSavedIndicator && state.currentStep <= 2 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-2 px-3 py-2 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-sm"
                >
                  <CheckCircle size={14} />
                  Data Saved
                </motion.div>
              )}
              
              {/* Authentication buttons */}
              {session?.user ? (
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="flex items-center gap-2 px-4 py-2 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              ) : state.currentStep === 3 && (
                <button
                  onClick={() => router.push(`/sign-in?callbackUrl=${encodeURIComponent('/ai-career-report?step=3')}`)}
                  className="bg-[#80FF00] text-black px-4 py-2 rounded-lg font-medium transition-colors hover:bg-[#70e600]"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {state.currentStep === 1 ? (
          <div className="flex items-center justify-center min-h-[calc(100vh-5rem)] p-4">
            <div className="w-full max-w-6xl">
              <motion.div
                key={state.currentStep}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                {renderStep()}
              </motion.div>
            </div>
          </div>
        ) : state.currentStep === 2 ? (
          <div className="h-[calc(100vh-5rem)]">
            <motion.div
              key={state.currentStep}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {renderStep()}
            </motion.div>
          </div>
        ) : (
          <div className="min-h-[calc(100vh-5rem)] p-4">
            <motion.div
              key={state.currentStep}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {renderStep()}
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

// Client-side wrapper
export default function AICareerReportClient() {
  return (
    <AICareerReportProvider>
      <Suspense fallback={
        <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white/60">Loading AI Career Guide...</p>
          </div>
        </div>
      }>
        <AICareerReportContent />
      </Suspense>
    </AICareerReportProvider>
  );
}
