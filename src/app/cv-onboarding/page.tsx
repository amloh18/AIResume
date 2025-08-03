'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Home, User, CheckCircle, Users, X, Eye } from 'lucide-react';
import CVUpload from '@/components/cv-parser/CVUpload';
import InteractiveCVForm from '@/components/cv-parser/InteractiveCVForm';
import RegistrationModal from '@/components/auth/RegistrationModal';
import RoleSelection from '@/components/auth/RoleSelection';

type OnboardingStep = 'upload' | 'form' | 'registration' | 'role' | 'complete';

const CVOnboardingPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('upload');
  const [cvData, setCvData] = useState<any>(null);
  const [formData, setFormData] = useState<any>(null);
  const [showRegistration, setShowRegistration] = useState(false);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<'student' | 'professional' | 'recruiter' | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Save progress to localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem('cvOnboardingProgress');
    if (savedProgress) {
      const progress = JSON.parse(savedProgress);
      setCvData(progress.cvData || null);
      setFormData(progress.formData || null);
      setCurrentStep(progress.step || 'upload');
      
      setSelectedRole(progress.selectedRole || null);
      
      // If the saved step is 'registration', show the registration modal
      if (progress.step === 'registration') {
        setShowRegistration(true);
      }
      
      // If the saved step is 'role', show the role selection modal
      if (progress.step === 'role') {
        setShowRoleSelection(true);
      }
    }
  }, []);

  const saveProgress = (step: OnboardingStep, data?: any) => {
    const progress = {
      step,
      cvData: data?.cvData || cvData,
      formData: data?.formData || formData,
      selectedRole: data?.selectedRole || selectedRole,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('cvOnboardingProgress', JSON.stringify(progress));
  };

  const handleCVParsed = (parsedData: any) => {
    console.log('CVOnboarding: handleCVParsed called with:', parsedData);
    setCvData(parsedData);
    setCurrentStep('form');
    saveProgress('form', { cvData: parsedData });
  };

  const handleFormSave = (formData: any) => {
    setFormData(formData);
    setShowRoleSelection(true);
    saveProgress('role', { cvData, formData });
  };

  const handleRoleSelect = (role: 'student' | 'professional' | 'recruiter') => {
    setSelectedRole(role);
    setShowRoleSelection(false);
    setShowRegistration(true);
    saveProgress('registration', { cvData, formData, selectedRole: role });
  };

  const handleRegistration = async (userData: any) => {
    setUserData(userData);
    
    try {
      // Register user first
      const userResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: selectedRole || 'user'
        }),
      });

      if (userResponse.ok) {
        const userResult = await userResponse.json();
        console.log('User registered:', userResult);
        
        // Save CV to MongoDB with the actual user ID
        const cvResponse = await fetch('/api/cvs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userResult.data.user._id,
            title: `${userData.firstName} ${userData.lastName}'s CV`,
            template: 'modern',
            sections: formData
          }),
        });

        if (cvResponse.ok) {
          const cvResult = await cvResponse.json();
          console.log('CV saved:', cvResult);
        }
        
        // Clear progress from localStorage
        localStorage.removeItem('cvOnboardingProgress');
        
        // Close registration modal
        setShowRegistration(false);
        
        // Set completion step
        setCurrentStep('complete');
        
        // Auto-redirect to dashboard after 3 seconds
        setTimeout(() => {
          setIsRedirecting(true);
          setTimeout(() => {
            // Set flag for dashboard welcome animation
            sessionStorage.setItem('fromOnboarding', 'true');
            // Store user data for login
            localStorage.setItem('user', JSON.stringify(userResult.data.user));
            window.location.href = '/dashboard';
          }, 1000); // 1 second loading animation
        }, 3000); // 3 seconds on completion screen
      } else {
        const errorResult = await userResponse.json();
        console.error('Registration failed:', errorResult);
        
        // Handle specific errors
        if (userResponse.status === 409) {
          // Email already exists
          throw new Error('Email already exists. Please use a different email or try logging in.');
        } else {
          throw new Error(errorResult.message || 'Registration failed. Please try again.');
        }
      }
    } catch (error: any) {
      console.error('Error during registration:', error);
      // Re-throw error to be handled by RegistrationModal
      throw error;
    }
  };

  const handleStepClick = (stepId: OnboardingStep) => {
    // Only allow navigation to completed steps or current step
    const stepIndex = steps.findIndex(s => s.id === stepId);
    const currentStepIndex = steps.findIndex(s => s.id === currentStep);
    
    if (stepIndex <= currentStepIndex) {
      setCurrentStep(stepId);
      
      // Handle modal states
      if (stepId === 'role') {
        setShowRoleSelection(true);
      } else if (stepId === 'registration') {
        setShowRegistration(true);
      } else {
        setShowRoleSelection(false);
        setShowRegistration(false);
      }
    }
  };

  const handleStartOver = () => {
    localStorage.removeItem('cvOnboardingProgress');
    setCvData(null);
    setFormData(null);
    setSelectedRole(null);
    setCurrentStep('upload');
    setShowRegistration(false);
    setShowRoleSelection(false);
  };

  const handlePreview = () => {
    // Navigate to CV studio with current data
    if (formData) {
      // Store data temporarily for CV studio
      sessionStorage.setItem('previewCVData', JSON.stringify(formData));
      window.open('/cv-studio', '_blank');
    }
  };

  const steps = [
    { id: 'upload', title: 'Upload CV', icon: User },
    { id: 'form', title: 'Edit CV', icon: CheckCircle },
    { id: 'role', title: 'Choose Role', icon: Users },
    { id: 'registration', title: 'Create Account', icon: User },
    { id: 'complete', title: 'Complete', icon: CheckCircle }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <motion.a
                href="/"
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-300 group"
                whileHover={{ 
                  scale: 1.1,
                  rotateY: 15,
                  rotateX: 15,
                  boxShadow: "0 20px 40px rgba(255,255,255,0.1)"
                }}
                whileTap={{ scale: 0.95 }}
              >
                <X size={20} className="text-white/60 group-hover:text-white transition-colors" />
              </motion.a>
              
              {currentStep !== 'upload' && (
                <motion.button
                  onClick={handleStartOver}
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-lg shadow-red-500/25"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Start Over
                </motion.button>
              )}
            </div>

            {/* Progress Steps */}
            <div className="hidden md:flex items-center gap-4">
              {steps.map((step, index) => {
                const stepIndex = steps.findIndex(s => s.id === step.id);
                const currentStepIndex = steps.findIndex(s => s.id === currentStep);
                const isCompleted = stepIndex < currentStepIndex;
                const isCurrent = currentStep === step.id;
                const isClickable = stepIndex <= currentStepIndex;
                
                return (
                  <div key={step.id} className="flex items-center gap-2">
                    <motion.button
                      onClick={() => isClickable && handleStepClick(step.id as OnboardingStep)}
                      disabled={!isClickable}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
                        isCurrent
                          ? 'bg-lime-400 text-black'
                          : isCompleted
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 cursor-pointer'
                          : 'bg-white/10 text-white/40'
                      } ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                      whileHover={isClickable ? { scale: 1.05 } : {}}
                      whileTap={isClickable ? { scale: 0.95 } : {}}
                    >
                      <step.icon size={16} />
                      <span className="text-sm font-medium">{step.title}</span>
                    </motion.button>
                    
                    {/* Preview button after Edit CV step */}
                    {step.id === 'form' && formData && (
                      <motion.button
                        onClick={handlePreview}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-500/30 transition-all"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Eye size={16} />
                        <span className="text-sm font-medium">Preview</span>
                      </motion.button>
                    )}
                    
                    {index < steps.length - 1 && (
                      <div className="w-8 h-px bg-white/20" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative">
        <AnimatePresence mode="wait">
          {currentStep === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-h-screen flex items-center justify-center"
            >
              <CVUpload
                onCVParsed={handleCVParsed}
                onClose={() => window.history.back()}
              />
            </motion.div>
          )}

          {currentStep === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {console.log('CVOnboarding: Rendering form with cvData:', cvData)}
              <InteractiveCVForm
                initialData={cvData}
                onSave={handleFormSave}
                key={JSON.stringify(cvData)} // Force re-render when cvData changes
              />
            </motion.div>
          )}

          {currentStep === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-h-screen flex items-center justify-center"
            >
              <div className="text-center space-y-8">
                <motion.div
                  className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 15, stiffness: 300 }}
                >
                  <CheckCircle size={64} className="text-white" />
                </motion.div>
                
                <div>
                  <h1 className="text-4xl font-bold text-white mb-4">
                    Welcome to CVCircle!
                  </h1>
                  <p className="text-xl text-white/60 mb-8">
                    Your CV has been created and your account is ready to use.
                  </p>
                  {isRedirecting && (
                    <motion.div
                      className="mt-6 p-4 bg-gradient-to-r from-lime-400/10 to-blue-400/10 border border-lime-400/20 rounded-xl"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="flex items-center justify-center gap-3">
                        <motion.div
                          className="w-6 h-6 border-2 border-lime-400 border-t-transparent rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        <span className="text-lime-400 font-medium">Redirecting to your dashboard...</span>
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <motion.button
                    onClick={() => {
                      setIsRedirecting(true);
                      sessionStorage.setItem('fromOnboarding', 'true');
                      setTimeout(() => {
                        window.location.href = '/dashboard';
                      }, 500);
                    }}
                    className="px-8 py-4 bg-gradient-to-r from-lime-400 to-lime-500 text-black font-semibold rounded-xl hover:from-lime-300 hover:to-lime-400 transition-all duration-300 shadow-2xl shadow-lime-400/25"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={isRedirecting}
                  >
                    {isRedirecting ? 'Redirecting...' : 'Go to Dashboard Now'}
                  </motion.button>
                  
                  <motion.a
                    href="/"
                    className="px-8 py-4 bg-white/10 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-300"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Back to Home
                  </motion.a>
                </div>

                <div className="mt-12 p-6 bg-white/5 border border-white/10 rounded-2xl max-w-md mx-auto">
                  <h3 className="text-white font-semibold mb-3">What's Next?</h3>
                  <ul className="space-y-2 text-white/60 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-lime-400" />
                      Customize your CV with different templates
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-lime-400" />
                      Track your job applications
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-lime-400" />
                      Create cover letters for specific positions
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-lime-400" />
                      Share your CV with potential employers
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Role Selection Modal */}
      <RoleSelection
        isOpen={showRoleSelection}
        onRoleSelect={handleRoleSelect}
        onBack={() => {
          setShowRoleSelection(false);
          setCurrentStep('form');
        }}
      />

      {/* Registration Modal */}
      <RegistrationModal
        isOpen={showRegistration}
        onClose={() => setShowRegistration(false)}
        onRegister={handleRegistration}
        cvData={formData}
        selectedRole={selectedRole || undefined}
      />
    </div>
  );
};

export default CVOnboardingPage; 