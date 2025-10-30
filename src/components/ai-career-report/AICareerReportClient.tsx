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
  const jobIdParam = searchParams.get('jobId');
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

    // Handle job ID parameter
    if (jobIdParam) {
      dispatch({ type: 'SET_JOB_ID', payload: jobIdParam });
    }
  }, [stepParam, modeParam, jobIdParam, dispatch]);

  // Log authentication status for debugging
  useEffect(() => {
    console.log('🔐 Auth status:', {
      currentStep: state.currentStep,
      sessionStatus: status,
      hasSession: !!session?.user,
      sessionUser: session?.user
    });
  }, [session, status, state.currentStep]);

  // Load job data when jobId is available
  useEffect(() => {
    const loadJobData = async () => {
      if (!state.jobId || !session?.user?.id) return;

      dispatch({ type: 'SET_LOADING_JOB', payload: true });
      dispatch({ type: 'SET_JOB_ERROR', payload: null });

      try {
        console.log('🔍 Loading job data for ID:', state.jobId);
        
        const response = await fetch(`/api/jobs/${state.jobId}?userId=${session.user.id}`);
        const result = await response.json();

        if (result.success && result.data) {
          console.log('✅ Job data loaded successfully:', result.data);
          dispatch({ type: 'SET_JOB_DATA', payload: result.data });
        } else {
          console.warn('⚠️ Job data not found or error:', result.error);
          dispatch({ type: 'SET_JOB_ERROR', payload: result.error || 'Job not found' });
        }
      } catch (error) {
        console.error('❌ Error loading job data:', error);
        dispatch({ type: 'SET_JOB_ERROR', payload: 'Failed to load job data' });
      } finally {
        dispatch({ type: 'SET_LOADING_JOB', payload: false });
      }
    };

    loadJobData();
  }, [state.jobId, session?.user?.id, dispatch]);

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
    <div className="min-h-screen bg-[#1A201A]">

      {/* Header */}
      <div className="relative z-10 bg-[#1A261A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Left side - Back button, Logo, and Step Information */}
            <div className="flex items-center gap-6">
              {/* Back Button */}
              {state.currentStep > 1 && (
                <motion.button
                  onClick={prevStep}
                  className="flex items-center gap-2 text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-colors"
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
                  <span className="text-white">CV</span>
                  <span className="text-white">CIRCLE</span>
                </div>
                <div className="text-sm text-white bg-lime-400/20 px-2 py-1 rounded-full">
                  AI Career Guide
                </div>
              </div>

              {/* Step Information - Inline after logo */}
              <div className="flex items-center gap-4 ml-8">
                <div className="flex flex-col">
                  {state.currentStep === 3 && (
                    <>
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
              
              {/* CV Preview and Authentication buttons */}
              {session?.user ? (
                <>
                  {(state.currentStep === 2 || state.currentStep === 3) && (
                    <button
                      onClick={() => setShowPreview(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#80FF00] text-black rounded-lg font-medium transition-colors hover:bg-[#70e600]"
                    >
                      <Eye size={16} />
                      CV Preview
                    </button>
                  )}
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-[5px] transition-colors"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </>
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
        <div className="min-h-screen bg-[#1A201A] flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white">Loading AI Career Guide...</p>
          </div>
        </div>
      }>
        <AICareerReportContent />
      </Suspense>
    </AICareerReportProvider>
  );
}
