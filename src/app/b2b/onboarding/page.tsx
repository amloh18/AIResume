'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, ArrowRight, Building2, Users, Database, Mail, Check, ArrowLeft } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { getConnection } from '@/lib/database';
import User from '@/models/User';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  fields?: {
    name: string;
    label: string;
    type: string;
    placeholder: string;
    required?: boolean;
  }[];
}

const B2BOnboardingPage = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [currentStep, setCurrentStep] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    companyName: '',
    companySize: '',
    industry: '',
    teamMembers: '',
    useCase: '',
  });

  // Check authentication and user role on mount
  useEffect(() => {
    const checkAuth = async () => {
      // Wait for session to load
      if (status === 'loading') {
        return;
      }

      if (status === 'unauthenticated') {
        router.push('/b2b/login');
        return;
      }

      if (status === 'authenticated' && session?.user) {
        // Check if user is B2B admin/owner
        const isB2B = !!(session.user as any)?.b2b?.tenantId;
        const isAdmin = session.user.role === 'admin' || session.user.role === 'superadmin';
        
        if (!isB2B || !isAdmin) {
          // Non-admin B2B users or non-B2B users should not access this page
          router.push('/b2b/dashboard');
          return;
        }

        // Check if setup is already complete
        if ((session.user as any)?.b2b?.setupComplete) {
          router.push('/b2b/dashboard');
          return;
        }

        setUser(session.user);
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, [status, session, router]);

  const onboardingSteps: OnboardingStep[] = [
    {
      id: 'company',
      title: 'Company Information',
      description: 'Tell us about your organization to customize your experience',
      icon: <Building2 className="w-8 h-8 text-[#88E03F]" />,
      fields: [
        { name: 'companyName', label: 'Company Name', type: 'text', placeholder: 'Enter your company name', required: true },
        { name: 'companySize', label: 'Company Size', type: 'select', placeholder: 'Select size', required: true },
        { name: 'industry', label: 'Industry', type: 'select', placeholder: 'Select industry', required: true },
      ],
    },
    {
      id: 'team',
      title: 'Team Setup',
      description: 'Add your team members and define their roles',
      icon: <Users className="w-8 h-8 text-[#88E03F]" />,
      fields: [
        { name: 'teamMembers', label: 'Number of Team Members', type: 'number', placeholder: 'How many team members?', required: true },
        { name: 'useCase', label: 'Primary Use Case', type: 'select', placeholder: 'What will you use CVCircle for?', required: true },
      ],
    },
    {
      id: 'integration',
      title: 'ATS Integration',
      description: 'Connect your existing applicant tracking system',
      icon: <Database className="w-8 h-8 text-[#88E03F]" />,
      fields: [
        { name: 'atsSystem', label: 'Current ATS', type: 'select', placeholder: 'Select your ATS', required: false },
        { name: 'integrationEmail', label: 'Integration Contact Email', type: 'email', placeholder: 'Email for integration setup', required: false },
      ],
    },
  ];

  const sizeOptions = [
    { value: '1-10', label: '1-10 employees' },
    { value: '11-50', label: '11-50 employees' },
    { value: '51-200', label: '51-200 employees' },
    { value: '201-500', label: '201-500 employees' },
    { value: '500+', label: '500+ employees' },
  ];

  const industryOptions = [
    { value: 'technology', label: 'Technology' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'finance', label: 'Finance' },
    { value: 'retail', label: 'Retail' },
    { value: 'manufacturing', label: 'Manufacturing' },
    { value: 'other', label: 'Other' },
  ];

  const useCaseOptions = [
    { value: 'hiring', label: 'Hiring & Recruitment' },
    { value: 'talent-pool', label: 'Building Talent Pool' },
    { value: 'onboarding', label: 'Employee Onboarding' },
    { value: 'performance', label: 'Performance Management' },
  ];

  const atsOptions = [
    { value: 'greenhouse', label: 'Greenhouse' },
    { value: 'lever', label: 'Lever' },
    { value: 'workday', label: 'Workday' },
    { value: 'bamboohr', label: 'BambooHR' },
    { value: 'other', label: 'Other' },
    { value: 'none', label: 'No ATS / Will set up later' },
  ];

  const handleInputChange = (fieldName: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleNext = async () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Complete onboarding
      await completeOnboarding();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = async () => {
    // Skip onboarding and go directly to dashboard
    await completeOnboarding(true);
  };

  const completeOnboarding = async (skipped = false) => {
    setIsLoading(true);
    try {
      // Send onboarding completion to backend
      const response = await fetch('/api/user/b2b-onboarding-complete', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to complete onboarding');
      }

      const result = await response.json();
      console.log('Onboarding completed:', result);

      // Redirect to dashboard
      router.push('/b2b/dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentStepData = onboardingSteps[currentStep];
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f3f2ee] dark:bg-[#1a230f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#88E03F] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f3f2ee] dark:bg-[#1a230f]">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-white/10 bg-white/50 dark:bg-[#1a230f]/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-none border-2 border-[#88E03F] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[#88E03F]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">B2B Setup</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Welcome, {user.firstName}</p>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors"
            disabled={isLoading}
          >
            Skip for now
          </button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white/50 dark:bg-[#1a230f]/50 border-b border-gray-200 dark:border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-2">
          <div className="flex items-center gap-4">
            {onboardingSteps.map((step, index) => (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => setCurrentStep(index)}
                  className={`flex items-center gap-2 transition-colors ${
                    index === currentStep
                      ? 'text-[#88E03F]'
                      : index < currentStep
                      ? 'text-gray-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                  disabled={isLoading}
                >
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${
                      index === currentStep
                        ? 'border-[#88E03F] bg-[#88E03F]/10 text-[#88E03F]'
                        : index < currentStep
                        ? 'border-gray-400 bg-gray-400 text-white'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {index < currentStep ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">
                    {step.title}
                  </span>
                </button>
                {index < onboardingSteps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 ${index < currentStep ? 'bg-[#88E03F]' : 'bg-gray-200 dark:bg-gray-700'}`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-2">
            <motion.div
              className="h-1 bg-[#88E03F] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-[#1a1a1a] rounded-none border border-gray-200 dark:border-white/10 p-8"
          >
            {/* Step Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-none border-2 border-[#88E03F] flex items-center justify-center mx-auto mb-4">
                {currentStepData.icon}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {currentStepData.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {currentStepData.description}
              </p>
            </div>

            {/* Form Fields */}
            {currentStepData.fields && (
              <div className="space-y-6 mb-8">
                {currentStepData.fields.map((field) => (
                  <div key={field.name}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {field.label}
                      {field.required && <span className="text-red-500"> *</span>}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={formData[field.name as keyof typeof formData] || ''}
                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                        className="w-full px-4 py-3 rounded-none border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white focus:border-[#88E03F] focus:outline-none transition-colors"
                        disabled={isLoading}
                      >
                        <option value="">{field.placeholder}</option>
                        {field.name === 'companySize' && sizeOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                        {field.name === 'industry' && industryOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                        {field.name === 'useCase' && useCaseOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                        {field.name === 'atsSystem' && atsOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={formData[field.name as keyof typeof formData] || ''}
                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-4 py-3 rounded-none border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white focus:border-[#88E03F] focus:outline-none transition-colors"
                        disabled={isLoading}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleBack}
                disabled={currentStep === 0 || isLoading}
                className={`flex items-center gap-2 px-6 py-3 rounded-none border-2 transition-all duration-200 ${
                  currentStep === 0 || isLoading
                    ? 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'border-gray-300 dark:border-white/10 text-gray-700 dark:text-white hover:border-[#88E03F] hover:text-[#88E03F]'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <button
                onClick={handleNext}
                disabled={isLoading}
                className="flex items-center gap-2 px-8 py-3 rounded-none border-2 border-[#88E03F] bg-[#88E03F] text-gray-900 hover:bg-[#88E03F]/90 hover:border-[#88E03F]/90 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : currentStep === onboardingSteps.length - 1 ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Complete Setup
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default B2BOnboardingPage;
