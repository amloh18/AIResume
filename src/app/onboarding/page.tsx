'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles, CheckCircle, LogOut, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { OnboardingProvider, useOnboarding } from '@/contexts/OnboardingContext';
import RoleSelection from '@/components/onboarding/RoleSelection';
import SignupModal from '@/components/onboarding/AuthModal';
import LoginModal from '@/components/auth/LoginModal';
import CVUpload from '@/components/cv-parser/CVUpload';
import InteractiveCVForm from '@/components/cv-parser/InteractiveCVForm';
import CompletionStep from '@/components/onboarding/CompletionStep';
import PersonalInfoStep from '@/components/onboarding/PersonalInfoStep';
import ExperienceStep from '@/components/onboarding/ExperienceStep';
import EducationStep from '@/components/onboarding/EducationStep';
import { SkeletonText, Skeleton } from '@/components/ui/SkeletonLoader';
import ErrorDialog from '@/components/ui/ErrorDialog';
import { validateAndGetMongoDBUserId } from '@/lib/utils/userIdUtils';

const OnboardingContent: React.FC = () => {
  const { state, dispatch, nextStep, prevStep } = useOnboarding();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingCVs, setIsCheckingCVs] = useState(false);
  const [errorDialog, setErrorDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    showRetry?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: ''
  });
  const router = useRouter();
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const stepParam = searchParams.get('step');

  useEffect(() => {
    // Prevent multiple CV checks
    if (isCheckingCVs) return;
    
    console.log('🔍 useEffect - session?.user:', session?.user);
    console.log('🔍 useEffect - localStorage user:', typeof window !== 'undefined' ? localStorage.getItem('user') : 'N/A');
    console.log('🔍 useEffect - needsCVSetup:', typeof window !== 'undefined' ? sessionStorage.getItem('needsCVSetup') : 'N/A');
    console.log('🔍 useEffect - stepParam:', stepParam);
    console.log('🔍 useEffect - state.currentStep:', state.currentStep);
    
    // Check if user is already authenticated and needs CV setup
    if (session?.user) {
      dispatch({ type: 'SET_AUTHENTICATED', payload: true });
      dispatch({ type: 'SET_USER_DATA', payload: session.user });
      
      // Set a default role for authenticated users (they can change this later)
      dispatch({ type: 'SET_SELECTED_ROLE', payload: { 
        id: 'professional', 
        title: 'Professional',
        description: 'Experienced professional',
        icon: 'briefcase',
        color: 'blue'
      }});
      
      // Check if user already has CVs before proceeding
      const checkExistingCVs = async () => {
        if (isCheckingCVs) return;
        setIsCheckingCVs(true);
        
        try {
          const response = await fetch(`/api/cvs?userId=${session.user.id}`);
          const result = await response.json();
          
          if (result.success && result.data.cvs && result.data.cvs.length > 0) {
            // User has CVs, redirect to dashboard
            console.log('✅ User already has CVs, redirecting to dashboard');
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('needsCVSetup');
              sessionStorage.removeItem('fromOnboarding');
            }
            router.push('/dashboard');
            return;
          }
          
          // Skip to Personal Information step (step 2) if user is already authenticated
          // or if step parameter is provided
          if (state.currentStep === 0 && stepParam === '2') {
            console.log('✅ NextAuth user - moving to step 2 due to stepParam');
            dispatch({ type: 'SET_CURRENT_STEP', payload: 2 });
          }
        } catch (error) {
          console.error('Error checking existing CVs:', error);
          // Continue with onboarding if we can't check
        } finally {
          setIsCheckingCVs(false);
        }
      };
      
      checkExistingCVs();
    } else {
      // Check for Firebase user data in localStorage (only on client side)
      if (typeof window !== 'undefined') {
        const userData = localStorage.getItem('user');
        const needsCVSetup = sessionStorage.getItem('needsCVSetup');
        
        console.log('Onboarding page - userData:', userData);
        console.log('Onboarding page - needsCVSetup:', needsCVSetup);
        
        if (userData) {
          try {
            const parsedUser = JSON.parse(userData);
            console.log('Onboarding page - parsed user:', parsedUser);
            
            dispatch({ type: 'SET_AUTHENTICATED', payload: true });
            dispatch({ type: 'SET_USER_DATA', payload: parsedUser });
            
            // Set a default role for authenticated users (they can change this later)
            dispatch({ type: 'SET_SELECTED_ROLE', payload: { 
              id: 'professional', 
              title: 'Professional',
              description: 'Experienced professional',
              icon: 'briefcase',
              color: 'blue'
            }});
            
            // Check if user already has CVs before proceeding
            const checkExistingCVs = async () => {
              if (isCheckingCVs) return;
              setIsCheckingCVs(true);
              
              try {
                const response = await fetch(`/api/cvs?userId=${parsedUser.id}`);
                const result = await response.json();
                
                if (result.success && result.data.cvs && result.data.cvs.length > 0) {
                  // User has CVs, redirect to dashboard
                  console.log('✅ Firebase user already has CVs, redirecting to dashboard');
                  if (typeof window !== 'undefined') {
                    sessionStorage.removeItem('needsCVSetup');
                    sessionStorage.removeItem('fromOnboarding');
                  }
                  router.push('/dashboard');
                  return;
                }
                
                // Skip to CV setup step (step 2) if user is already authenticated
                // or if step parameter is provided
                if (state.currentStep === 0 && stepParam === '2') {
                  console.log('✅ Firebase user - moving to step 2 due to stepParam');
                  dispatch({ type: 'SET_CURRENT_STEP', payload: 2 });
                }
              } catch (error) {
                console.error('Error checking existing CVs:', error);
                // Continue with onboarding if we can't check
              } finally {
                setIsCheckingCVs(false);
              }
            };
            
            checkExistingCVs();
          } catch (error) {
            console.error('Error parsing user data:', error);
          }
        } else {
          console.log('Onboarding page - no user data or needsCVSetup flag');
        }
      }
    }
  }, [session, dispatch, state.currentStep, stepParam, isCheckingCVs]); // Added isCheckingCVs to dependencies

  const handleRoleSelect = (role: any) => {
    dispatch({ type: 'SET_SELECTED_ROLE', payload: role });
    setShowAuthModal(true);
  };

  const handleSwitchToLogin = () => {
    setShowAuthModal(false);
    setShowLoginModal(true);
  };

  const handleSwitchToSignup = () => {
    setShowLoginModal(false);
    setShowAuthModal(true);
  };

  const handleErrorDialogClose = () => {
    setErrorDialog(prev => ({ ...prev, isOpen: false }));
  };

  const handleRetry = () => {
    setErrorDialog(prev => ({ ...prev, isOpen: false }));
    handleComplete();
  };

  const handleAuthSuccess = async (userData: any) => {
    dispatch({ type: 'SET_AUTHENTICATED', payload: true });
    dispatch({ type: 'SET_USER_DATA', payload: userData });
    setShowAuthModal(false);
    setShowLoginModal(false);
    
    // Check if user has CVs before deciding where to route
    try {
      console.log('🔍 Checking CVs for user:', userData.id);
      const response = await fetch(`/api/cvs?userId=${userData.id}`);
      const result = await response.json();
      console.log('🔍 CV check result:', result);
      
      if (result.success && result.data.cvs && result.data.cvs.length > 0) {
        // User has CVs, redirect to dashboard
        console.log('✅ User has CVs, redirecting to dashboard');
        router.push('/dashboard');
      } else {
        // New user, continue with onboarding
        console.log('🆕 New user, continuing with onboarding');
        // Set flag for new user CV setup (only on client side)
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('needsCVSetup', 'true');
        }
        nextStep();
      }
    } catch (error) {
      console.log('Error checking CVs, continuing with onboarding:', error);
      // If we can't check CVs, continue with onboarding
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('needsCVSetup', 'true');
      }
      nextStep();
    }
  };

  const handleLoginSuccess = async (userData: any) => {
    dispatch({ type: 'SET_AUTHENTICATED', payload: true });
    dispatch({ type: 'SET_USER_DATA', payload: userData });
    setShowAuthModal(false);
    setShowLoginModal(false);
    
    // Check if user has CVs before deciding where to route
    try {
      console.log('🔍 Checking CVs for user:', userData.id);
      const response = await fetch(`/api/cvs?userId=${userData.id}`);
      const result = await response.json();
      console.log('🔍 CV check result:', result);
      
      if (result.success && result.data.cvs && result.data.cvs.length > 0) {
        // User has CVs, redirect to dashboard
        console.log('✅ User has CVs, redirecting to dashboard');
        router.push('/dashboard');
      } else {
        // New user, continue with onboarding
        console.log('🆕 New user, continuing with onboarding');
        // Set flag for new user CV setup (only on client side)
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('needsCVSetup', 'true');
        }
        nextStep();
      }
    } catch (error) {
      console.log('Error checking CVs, continuing with onboarding:', error);
      // If we can't check CVs, continue with onboarding
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('needsCVSetup', 'true');
      }
      nextStep();
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    
    try {
      // Get user ID from session or state or localStorage
      let userId = session?.user?.id || state.userData?.id;
      
      // If no userId from session/state, try localStorage (only on client side)
      if (!userId && typeof window !== 'undefined') {
        const userData = localStorage.getItem('user');
        console.log('🔍 Raw localStorage userData:', userData);
        if (userData) {
          try {
            const parsedUser = JSON.parse(userData);
            console.log('🔍 Parsed user data:', parsedUser);
            userId = parsedUser.id;
            console.log('🔍 Extracted userId from localStorage:', userId);
          } catch (error) {
            console.error('Error parsing user data:', error);
          }
        }
      }
      
      console.log('🔍 Session user:', session?.user);
      console.log('🔍 State userData:', state.userData);
      console.log('🔍 Selected userId:', userId);
      console.log('🔍 userId type:', typeof userId);
      console.log('🔍 userId length:', userId?.toString().length);
      console.log('🔍 userId value:', JSON.stringify(userId));
      
      // Ensure user is authenticated
      if (!userId) {
        throw new Error('User must be authenticated to create a CV. Please log in or sign up first.');
      }
      
      // Validate and get MongoDB user ID (handles both MongoDB ObjectId and Google OAuth ID)
      try {
        userId = await validateAndGetMongoDBUserId(userId);
        console.log('✅ Validated and converted user ID:', userId);
      } catch (error) {
        console.error('❌ User ID validation failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Provide more specific error messages based on the error
        if (errorMessage.includes('Failed to fetch user data from server')) {
          throw new Error('Authentication session expired. Please log in again.');
        } else if (errorMessage.includes('Invalid user ID format')) {
          throw new Error('Authentication error. Please try logging in again.');
        } else {
          throw new Error(`Authentication error: ${errorMessage}`);
        }
      }
      
      const requestData = {
        userId: userId, // This is now the correct MongoDB user ID
        title: `${session?.user?.firstName || state.userData?.firstName || 'User'} ${session?.user?.lastName || state.userData?.lastName || ''}'s CV`.trim(),
        cvData: state.cvData, // Fixed: was 'sections', should be 'cvData'
        type: 'cv'
      };
      
      console.log('🚀 Sending CV creation request:', requestData);
      
      // Save CV data to database
      const response = await fetch('/api/cvs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const htmlText = await response.text();
        console.error('❌ Non-JSON response received:', htmlText.substring(0, 500));
        throw new Error(`Server returned HTML instead of JSON. Response: ${htmlText.substring(0, 200)}...`);
      }

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('✅ CV saved successfully:', result);
        
        // Set completion flag for dashboard (only on client side)
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('fromOnboarding', 'true');
          sessionStorage.setItem('cvId', result.data.cv.id);
          
          // Clear the CV setup flag
          sessionStorage.removeItem('needsCVSetup');
          
          console.log('✅ Onboarding - Set fromOnboarding flag to true');
          console.log('✅ Onboarding - Set cvId:', result.data.cv.id);
          console.log('✅ Onboarding - Cleared needsCVSetup flag');
        }
        
        console.log('🚀 Redirecting to dashboard...');
        
        // Use Next.js router for navigation
        console.log('🚀 Navigating to dashboard with Next.js router...');
        router.push('/dashboard');
      } else {
        console.error('API Error:', result);
        throw new Error(result.message || 'Failed to save CV');
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      
      // Show error dialog instead of browser alert
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setErrorDialog({
        isOpen: true,
        title: 'Failed to Save CV',
        message: `${errorMessage}\n\nPlease check your internet connection and try again.`,
        showRetry: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    // Show skeleton loading if checking CVs
    if (isCheckingCVs) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-start pt-20 px-4">
          <div className="w-full max-w-4xl flex flex-col items-center">
            <div className="text-center mb-12">
              <Skeleton variant="text" height={40} width="400px" className="mx-auto mb-4" />
              <Skeleton variant="text" height={20} width="300px" className="mx-auto" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
              <Skeleton variant="rounded" height="150px" />
              <Skeleton variant="rounded" height="150px" />
              <Skeleton variant="rounded" height="150px" />
            </div>
            <div className="mt-8 w-full max-w-2xl">
              <Skeleton variant="rounded" height="60px" />
            </div>
          </div>
        </div>
      );
    }
    
    // Check if user is authenticated (either NextAuth session or Firebase localStorage)
    const isAuthenticated = session?.user || (typeof window !== 'undefined' && localStorage.getItem('user'));
    
    console.log('🔍 renderStep - isAuthenticated:', isAuthenticated);
    console.log('🔍 renderStep - state.currentStep:', state.currentStep);
    console.log('🔍 renderStep - session?.user:', session?.user);
    console.log('🔍 renderStep - localStorage user:', typeof window !== 'undefined' ? localStorage.getItem('user') : 'N/A');
    
    // If user is authenticated and on step 0, skip role selection and start from personal info
    if (isAuthenticated && state.currentStep === 0) {
      console.log('✅ renderStep - User authenticated on step 0, showing PersonalInfoStep');
      return <PersonalInfoStep onNext={nextStep} />;
    }
    
    // If user is authenticated and on step 2, show personal info (skip role selection)
    if (isAuthenticated && state.currentStep === 2) {
      console.log('✅ renderStep - User authenticated on step 2, showing PersonalInfoStep');
      return <PersonalInfoStep onNext={nextStep} />;
    }
    
    switch (state.currentStep) {
      case 0:
        return <RoleSelection onRoleSelect={handleRoleSelect} />;
      case 1:
        return <PersonalInfoStep onNext={nextStep} />;
      case 2:
        return <PersonalInfoStep onNext={nextStep} />; // Step 2 is Personal Information
      case 3:
        return <ExperienceStep onNext={nextStep} onBack={prevStep} />;
      case 4:
        return <EducationStep onNext={nextStep} onBack={prevStep} />;
      case 5:
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
            {/* Left side - Back button and Logo grouped together */}
            <div className="flex items-center gap-6">
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
                </motion.button>
              )}



              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold">
                  <span className="text-lime-400">CV</span>
                  <span className="text-white">CIRCLE</span>
                </div>
              </div>
            </div>

            {/* Progress Steps - Desktop */}
            <div className="hidden md:flex items-center gap-4">
              {(session?.user ? state.steps.slice(2) : state.steps).map((step, index) => (
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
                    {step.isCompleted ? <CheckCircle size={16} /> : (session?.user ? index + 1 : index + 1)}
                  </div>
                  {index < (session?.user ? state.steps.slice(2).length - 1 : state.steps.length - 1) && (
                    <div
                      className={`w-8 h-1 transition-all duration-300 ${
                        step.isCompleted ? 'bg-green-500' : 'bg-white/10'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Progress Steps - Mobile */}
            <div className="md:hidden flex items-center gap-2">
              {(session?.user ? state.steps.slice(2) : state.steps).map((step, index) => (
                <div key={step.id} className="flex items-center gap-1">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                      step.isActive
                        ? 'bg-lime-400 text-black shadow-lg'
                        : step.isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-white/10 text-white/40'
                    }`}
                  >
                    {step.isCompleted ? <CheckCircle size={12} /> : (session?.user ? index + 1 : index + 1)}
                  </div>
                  {index < (session?.user ? state.steps.slice(2).length - 1 : state.steps.length - 1) && (
                    <div
                      className={`w-4 h-0.5 transition-all duration-300 ${
                        step.isCompleted ? 'bg-green-500' : 'bg-white/10'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              {/* Close Button - Show when in import mode */}
              {searchParams.get('mode') === 'import' && (
                <motion.button
                  onClick={() => {
                    // Clear any onboarding flags and redirect to dashboard
                    if (typeof window !== 'undefined') {
                      sessionStorage.removeItem('needsCVSetup');
                      sessionStorage.removeItem('fromOnboarding');
                    }
                    router.push('/dashboard');
                  }}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white transition-all duration-300 px-3 md:px-4 py-2 rounded-lg border border-white/20"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ x: 5, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X size={16} />
                  <span className="hidden sm:inline text-sm font-medium">Close</span>
                </motion.button>
              )}

              {/* Logout Button - Only show for authenticated users */}
              {(session?.user || (typeof window !== 'undefined' && localStorage.getItem('user'))) && (
                <motion.button
                  onClick={async () => {
                    try {
                      // Check if user is from Firebase (has user data in localStorage)
                      if (typeof window !== 'undefined') {
                        const userData = localStorage.getItem('user');
                        if (userData) {
                          // Firebase user - sign out from Firebase
                          await firebaseSignOut(auth);
                          localStorage.removeItem('user');
                          sessionStorage.removeItem('needsCVSetup');
                          window.location.href = '/';
                        } else {
                          // NextAuth user - sign out from NextAuth
                          signOut({ callbackUrl: '/' });
                        }
                      } else {
                        // NextAuth user - sign out from NextAuth
                        signOut({ callbackUrl: '/' });
                      }
                    } catch (error) {
                      console.error('Logout error:', error);
                      // Fallback - clear storage and redirect
                      if (typeof window !== 'undefined') {
                        localStorage.removeItem('user');
                        sessionStorage.removeItem('needsCVSetup');
                        window.location.href = '/';
                      }
                    }
                  }}
                  className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white transition-all duration-300 px-3 md:px-4 py-2 rounded-lg shadow-lg hover:shadow-red-500/25"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ x: 5, scale: 1.05, boxShadow: "0 10px 25px -5px rgba(239, 68, 68, 0.4)" }}
                  whileTap={{ scale: 0.95 }}
                >
                  <LogOut size={16} />
                  <span className="hidden sm:inline text-sm font-medium">Logout</span>
                </motion.button>
              )}
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

      {/* Auth Modals - Only show for non-authenticated users */}
      {!session?.user && !(typeof window !== 'undefined' && localStorage.getItem('user')) && (
        <>
          <SignupModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            onSuccess={handleAuthSuccess}
            selectedRole={state.selectedRole?.id}
            onSwitchToLogin={handleSwitchToLogin}
          />
          
          <LoginModal
            isOpen={showLoginModal}
            onClose={() => setShowLoginModal(false)}
            onSwitchToRegister={handleSwitchToSignup}
            onLogin={handleLoginSuccess}
          />
        </>
      )}

      {/* Error Dialog */}
      <ErrorDialog
        isOpen={errorDialog.isOpen}
        onClose={handleErrorDialogClose}
        title={errorDialog.title}
        message={errorDialog.message}
        onRetry={handleRetry}
        showRetry={errorDialog.showRetry}
        type="error"
      />
    </div>
  );
};

const OnboardingPage: React.FC = () => {
  return (
    <OnboardingProvider>
      <Suspense fallback={
        <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
          <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
            <div className="text-center mb-8">
              <Skeleton variant="text" height={32} width="300px" className="mx-auto mb-4" />
              <Skeleton variant="text" height={16} width="200px" className="mx-auto" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Skeleton variant="rounded" height="200px" />
              <Skeleton variant="rounded" height="200px" />
              <Skeleton variant="rounded" height="200px" />
            </div>
          </div>
        </div>
      }>
        <OnboardingContent />
      </Suspense>
    </OnboardingProvider>
  );
};

export default OnboardingPage;
