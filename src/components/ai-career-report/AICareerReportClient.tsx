'use client';

import React, { useEffect, Suspense, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AICareerReportProvider, useAICareerReport } from '@/contexts/AICareerReportContext';
import ChoosePathStep from '@/components/ai-career-report/ChoosePathStep';
import ChooseTemplateStep from '@/components/ai-career-report/ChooseTemplateStep';
import MasterCVBuilderStep from '@/components/ai-career-report/MasterCVBuilderStep';
import CVPreviewSidePanel from '@/components/ai-career-report/CVPreviewSidePanel';
import CareerReportSidePanel from '@/components/ai-career-report/CareerReportSidePanel';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { ArrowLeft, Sparkles, Eye, Save, CheckCircle, LogOut, FileText } from 'lucide-react';

// Main Content Component
function AICareerReportContent() {
  const { state, dispatch, nextStep, prevStep } = useAICareerReport();
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const stepParam = searchParams.get('step');
  const modeParam = searchParams.get('mode');
  const jobIdParam = searchParams.get('jobId');
  const editMasterParam = searchParams.get('editMaster') === 'true';
  const masterCVIdParam = searchParams.get('masterCVId');
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showReport, setShowReport] = useState(false);

  // Sync URL with current step to maintain state on refresh
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentUrl = new URL(window.location.href);
    const urlStep = currentUrl.searchParams.get('step');
    const currentStepStr = state.currentStep.toString();

    // Only update URL if it doesn't match current step (avoid infinite loops)
    if (urlStep !== currentStepStr) {
      currentUrl.searchParams.set('step', currentStepStr);
      // Use replaceState to avoid adding to history
      window.history.replaceState({}, '', currentUrl.toString());
    }
  }, [state.currentStep]);

  // Handle URL parameters and authentication (only on initial load)
  useEffect(() => {
    // Check if we have saved data with a step and CV data
    const savedData = localStorage.getItem('ai-career-report-data');
    let savedStep: number | null = null;
    let hasSavedCvData = false;

    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.currentStep && parsed.cvData) {
          savedStep = parsed.currentStep;
          // Check if we have actual CV data (not just empty structure)
          hasSavedCvData = !!(
            parsed.cvData.basics?.name ||
            parsed.cvData.basics?.email ||
            parsed.cvData.work?.length > 0 ||
            parsed.cvData.education?.length > 0 ||
            parsed.cvData.projects?.length > 0
          );
        }
      } catch (e) {
        console.warn('Failed to parse saved data:', e);
      }
    }

    console.log('🔍 URL parameter handling:', {
      stepParam,
      savedStep,
      currentStep: state.currentStep,
      hasSavedCvData,
      hasCvData: !!(state.cvData.work?.length || state.cvData.education?.length)
    });

    // Flow Detection: Determine which flow user is in
    // Flow 3 (Edit Master): editMaster=true param present
    // Flow 1/2 (New Master CV): No editMaster param

    // Priority: Flow 3 (editMaster) > URL step param > Saved step (if has data) > Mode param > Default
    if (editMasterParam) {
      // Flow 3: Master CV Edit - start at step 3 (skip step 1 and 2)
      // Context already handles this, but ensure it's set correctly
      if (state.currentStep !== 3) {
        console.log('📍 Flow 3 detected: Setting step to 3 (Master CV Edit)');
        dispatch({ type: 'SET_CURRENT_STEP', payload: 3 });
      }
    } else if (stepParam) {
      // URL explicitly specifies step - use it only if different from current
      const step = parseInt(stepParam);
      if (step >= 1 && step <= 3 && step !== state.currentStep) {
        console.log(`📍 Setting step from URL: ${step}`);
        dispatch({ type: 'SET_CURRENT_STEP', payload: step as 1 | 2 | 3 });
      }
    } else if (savedStep && hasSavedCvData) {
      // No URL param but we have saved step with data - ensure it's set
      // The context already loaded it, but double-check
      if (savedStep !== state.currentStep) {
        console.log(`📍 Restoring saved step: ${savedStep}`);
        dispatch({ type: 'SET_CURRENT_STEP', payload: savedStep as 1 | 2 | 3 });
      }
    } else if (modeParam === 'guide' && !hasSavedCvData) {
      // No saved data and guide mode - start at step 1
      console.log('📍 Starting in guide mode at step 1');
      dispatch({ type: 'SET_CURRENT_STEP', payload: 1 });
    }
    // Otherwise, keep the step from initial state (which loads from localStorage)

    // Handle job ID parameter
    if (jobIdParam) {
      dispatch({ type: 'SET_JOB_ID', payload: jobIdParam });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

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

  // Show saved indicator when data is saved (only for steps 1, 2, and 3)
  useEffect(() => {
    if (state.currentStep <= 3) {
      setShowSavedIndicator(true);
      const timer = setTimeout(() => {
        setShowSavedIndicator(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state.cvData, state.currentStep]);

  // CRITICAL SECURITY: Prevent unauthenticated users from accessing dashboard
  // This guards against browser navigation, errors, and race conditions
  useEffect(() => {
    // Don't check if session is still loading
    if (status === 'loading') {
      return;
    }

    // Check on mount if we're on dashboard without auth
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/dashboard')) {
        // CRITICAL: Check both status and session object
        if (status !== 'authenticated' || !session?.user?.id) {
          console.warn('🚫 Security: Unauthenticated user on dashboard, redirecting to home', {
            status,
            hasSession: !!session,
            hasUserId: !!session?.user?.id
          });
          router.replace('/');
        }
      }
    }

    // Handle browser back/forward navigation
    const handlePopState = () => {
      // Use setTimeout to check after navigation completes
      setTimeout(() => {
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/dashboard')) {
          // CRITICAL: Check both status and session object
          if (status !== 'authenticated' || !session?.user?.id) {
            console.warn('🚫 Security: Unauthenticated user attempted to access dashboard via browser navigation', {
              status,
              hasSession: !!session,
              hasUserId: !!session?.user?.id
            });
            router.replace('/');
          }
        }
      }, 0);
    };

    window.addEventListener('popstate', handlePopState);

    // Periodic security check to catch any edge cases
    const securityCheckInterval = setInterval(() => {
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/dashboard')) {
          if (status !== 'authenticated' || !session?.user?.id) {
            console.warn('🚫 Security: Periodic check detected unauthenticated user on dashboard');
            router.replace('/');
          }
        }
      }
    }, 2000); // Check every 2 seconds

    return () => {
      window.removeEventListener('popstate', handlePopState);
      clearInterval(securityCheckInterval);
    };
  }, [session, status, router]);


  // Safe back handler that checks authentication
  const handleSafeBack = () => {
    // Flow 3 (Edit Master): Don't allow going back to step 1 or 2
    if (editMasterParam && state.currentStep === 3) {
      // In Flow 3, step 3 is the first step, so back should go to dashboard
      router.push('/dashboard');
      return;
    }

    if (state.currentStep > 1) {
      prevStep();
    } else {
      // If on step 1 and user presses back, redirect based on auth status
      // CRITICAL SECURITY: Never redirect to dashboard if session is not fully authenticated
      if (status === 'authenticated' && session?.user?.id) {
        router.push('/dashboard');
      } else {
        router.push('/');
      }
    }
  };

  // Safe complete handler that checks authentication
  const handleSafeComplete = () => {
    // CRITICAL SECURITY: Never redirect to dashboard if session is not fully authenticated
    // Check both session status and user object to prevent race conditions
    if (status === 'loading') {
      console.warn('🚫 Security: Session still loading, cannot redirect to dashboard');
      router.push('/');
      return;
    }

    if (status === 'authenticated' && session?.user?.id) {
      // Double-check: Verify session is actually authenticated before redirecting
      console.log('✅ Safe redirect to dashboard - user authenticated:', session.user.id);
      router.push('/dashboard');
    } else {
      // Unauthenticated users should NEVER access dashboard
      // Redirect to landing page or sign-in
      console.warn('🚫 Security: Unauthenticated user attempted dashboard redirect, redirecting to home');
      router.push('/');
    }
  };

  const renderStep = () => {
    switch (state.currentStep) {
      case 1:
        return <ChoosePathStep onNext={nextStep} />;
      case 2:
        return <ChooseTemplateStep onNext={nextStep} onBack={handleSafeBack} />;
      case 3:
        return <MasterCVBuilderStep onNext={nextStep} onBack={handleSafeBack} />;
      default:
        return <ChoosePathStep onNext={nextStep} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#1A201A]">

      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#1A261A] border-b border-white/10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 tablet:px-6 desktop:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Left side - Back button, Logo, and Step Information */}
            <div className="flex items-center gap-6">
              {/* Back Button */}
              {state.currentStep > 1 && (
                <motion.button
                  onClick={handleSafeBack}
                  className="flex items-center gap-2 text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ x: -5 }}
                >
                  <ArrowLeft size={20} />
                </motion.button>
              )}
              {/* Back to Home for Step 1 */}
              {state.currentStep === 1 && (
                <motion.button
                  onClick={() => {
                    // CRITICAL SECURITY: Never redirect to dashboard if session is not fully authenticated
                    if (status === 'authenticated' && session?.user?.id) {
                      router.push('/dashboard');
                    } else {
                      router.push('/');
                    }
                  }}
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
                <Image
                  src="/images/logo.png"
                  alt="CV Circle Logo"
                  width={40}
                  height={40}
                  className="object-contain rounded-lg"
                  priority
                  quality={85}
                  sizes="40px"
                />
                <div className="text-2xl font-bold">
                  <span className="text-lime-400">CV</span>
                  <span className="text-white">Circle</span>
                </div>
                <div className="text-sm text-white bg-lime-400/20 px-2 py-1 rounded-full">
                  Master CV
                </div>
              </div>

              {/* Step Information - Inline after logo */}
              <div className="flex items-center gap-4 ml-8">
                <div className="flex flex-col">
                </div>
              </div>
            </div>

            {/* Right side - Authentication buttons */}
            <div className="flex items-center gap-4">
              {/* Data Saved Indicator */}
              {showSavedIndicator && state.currentStep <= 3 && (
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

              {/* Report, CV Preview and Authentication buttons */}
              <div className="flex items-center gap-4">
                {/* Preview Button - Visible to all users on Step 3 */}
                {state.currentStep === 3 && (
                  <button
                    onClick={() => setShowPreview(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#80FF00] text-black rounded-lg font-medium transition-colors hover:bg-[#70e600]"
                  >
                    <Eye size={16} />
                    Preview
                  </button>
                )}

                {session?.user ? (
                  <>
                    {state.currentStep === 3 && (
                      <button
                        onClick={() => setShowReport(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                      >
                        <FileText size={16} />
                        Report
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
                ) : null}
              </div>
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
          <div className="min-h-[calc(100vh-5rem)]">
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
        ) : state.currentStep === 3 ? (
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
        ) : null}
      </div>

      {/* CV Preview Side Panel */}
      <CVPreviewSidePanel
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        cvData={state.cvData}
      />

      {/* Career Report Side Panel */}
      <CareerReportSidePanel
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        onComplete={handleSafeComplete}
        onBack={handleSafeBack}
        session={session}
      />
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
            <p className="text-white">Loading Master CV...</p>
          </div>
        </div>
      }>
        <AICareerReportContent />
      </Suspense>
    </AICareerReportProvider>
  );
}
