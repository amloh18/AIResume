'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, ArrowRight, Building2, Users, Database, Mail, 
  Check, ArrowLeft, Loader2, ChevronRight, Sparkles, ChevronDown
} from 'lucide-react';
import { useSession } from 'next-auth/react';

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
        const b2bData = (session.user as any)?.b2b;
        const isB2B = !!b2bData?.tenantId;
        const isAdmin = session.user.role === 'admin' || session.user.role === 'superadmin';
        const isSetupComplete = !!b2bData?.setupComplete;
        
        console.log('🛡 Onboarding Auth Check:', { 
          isB2B, 
          isAdmin, 
          isSetupComplete, 
          tenantId: b2bData?.tenantId,
          role: session.user.role 
        });

        // Only redirect to dashboard if setup is REALLY complete
        if (isSetupComplete) {
          console.log('✅ Setup complete, redirecting to dashboard');
          router.push('/b2b/dashboard');
          return;
        }

        // If not B2B admin, they shouldn't be here, but let dashboard layout handle the bounce
        // to avoid client-side fighting
        if (!isB2B || !isAdmin) {
          console.log('⚠️ Not a B2B admin, dashboard layout will handle protection');
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
      icon: <Building2 className="w-8 h-8 text-[#80FF00]" />,
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
      icon: <Users className="w-8 h-8 text-[#80FF00]" />,
      fields: [
        { name: 'teamMembers', label: 'Number of Team Members', type: 'number', placeholder: 'How many team members?', required: true },
        { name: 'useCase', label: 'Primary Use Case', type: 'select', placeholder: 'What will you use CVCircle for?', required: true },
      ],
    },
    {
      id: 'integration',
      title: 'ATS Integration',
      description: 'Connect your existing applicant tracking system',
      icon: <Database className="w-8 h-8 text-[#80FF00]" />,
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

      // Force a hard reload to the dashboard to ensure fresh server-side session data
      window.location.href = '/b2b/dashboard';
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
          <div className="w-16 h-16 border-4 border-[#80FF00] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-[#0d1209] text-white selection:bg-[#80FF00] selection:text-black overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#80FF00]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 bg-black/20 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#80FF00]/10 border border-[#80FF00]/20 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-[#80FF00]" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter uppercase">Enterprise <span className="text-[#80FF00]">Setup</span></h1>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Active User: {user.firstName || 'Manager'}</p>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="text-[10px] font-black tracking-[0.2em] text-gray-500 hover:text-white uppercase transition-all"
            disabled={isLoading}
          >
            Skip Config
          </button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="relative z-10 bg-black/10 border-b border-white/5">
        <div className="max-w-5xl mx-auto px-8 py-4">
          <div className="flex items-center gap-6">
            {onboardingSteps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className={`flex items-center gap-3 transition-all ${
                    index === currentStep ? 'opacity-100 scale-105' : 'opacity-40 grayscale'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center text-xs font-black ${
                      index <= currentStep
                        ? 'border-[#80FF00] bg-[#80FF00] text-black shadow-[0_0_15px_rgba(128,255,0,0.3)]'
                        : 'border-white/10 text-white/40'
                    }`}
                  >
                    {index < currentStep ? <Check className="w-4 h-4" /> : index + 1}
                  </div>
                  <span className="text-[10px] font-black tracking-widest uppercase hidden sm:inline">
                    {step.title}
                  </span>
                </div>
                {index < onboardingSteps.length - 1 && (
                  <div className={`flex-1 h-0.5 rounded-full ${index < currentStep ? 'bg-[#80FF00]' : 'bg-white/5'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto w-full px-8 py-8 flex-1 overflow-hidden flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white/5 backdrop-blur-3xl rounded-[40px] border border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] p-8 md:p-12 max-h-full flex flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto pr-2 space-y-8 pb-6">
              {/* Step Header */}
              <div className="text-center mb-8">
                <div className="w-20 h-20 rounded-[30px] bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6 shadow-2xl">
                  {currentStepData.icon}
                </div>
                <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase mb-4">
                  {currentStepData.title}
                </h2>
                <p className="text-lg text-gray-500 font-medium max-w-2xl mx-auto leading-relaxed">
                  {currentStepData.description}
                </p>
              </div>

              {/* Form Fields */}
              {currentStepData.fields && (
                <div className="grid md:grid-cols-2 gap-8">
                  {currentStepData.fields.map((field) => (
                    <div key={field.name} className={field.name === 'atsSystem' ? 'md:col-span-2' : ''}>
                      <label className="block text-[10px] font-black tracking-[0.2em] text-gray-500 uppercase mb-3 ml-2">
                        {field.label}
                        {field.required && <span className="text-[#80FF00]"> *</span>}
                      </label>
                      {field.type === 'select' ? (
                        <div className="relative group">
                           <select
                            value={formData[field.name as keyof typeof formData] || ''}
                            onChange={(e) => handleInputChange(field.name, e.target.value)}
                            className="w-full px-6 py-5 rounded-3xl bg-white/5 border border-white/10 text-white font-bold focus:border-[#80FF00] focus:outline-none transition-all appearance-none cursor-pointer hover:bg-white/[0.08]"
                            disabled={isLoading}
                          >
                            <option value="" className="bg-[#0d1209]">{field.placeholder}</option>
                            {field.name === 'companySize' && sizeOptions.map((option) => (
                              <option key={option.value} value={option.value} className="bg-[#0d1209]">{option.label}</option>
                            ))}
                            {field.name === 'industry' && industryOptions.map((option) => (
                              <option key={option.value} value={option.value} className="bg-[#0d1209]">{option.label}</option>
                            ))}
                            {field.name === 'useCase' && useCaseOptions.map((option) => (
                              <option key={option.value} value={option.value} className="bg-[#0d1209]">{option.label}</option>
                            ))}
                            {field.name === 'atsSystem' && atsOptions.map((option) => (
                              <option key={option.value} value={option.value} className="bg-[#0d1209]">{option.label}</option>
                            ))}
                          </select>
                          <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                            <ChevronDown className="w-5 h-5" />
                          </div>
                        </div>
                      ) : (
                        <input
                          type={field.type}
                          value={formData[field.name as keyof typeof formData] || ''}
                          onChange={(e) => handleInputChange(field.name, e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full px-8 py-5 rounded-3xl bg-white/5 border border-white/10 text-white font-bold placeholder:text-gray-600 focus:border-[#80FF00] focus:outline-none transition-all hover:bg-white/[0.08]"
                          disabled={isLoading}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-white/5">
              <button
                onClick={handleBack}
                disabled={currentStep === 0 || isLoading}
                className={`flex items-center gap-3 px-10 py-5 rounded-full font-black text-xs tracking-widest uppercase transition-all duration-300 ${
                  currentStep === 0 || isLoading
                    ? 'opacity-20 cursor-not-allowed'
                    : 'bg-white/5 border border-white/10 text-white hover:bg-white hover:text-black'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                Previous Phase
              </button>

              <button
                onClick={handleNext}
                disabled={isLoading}
                className="group w-full sm:w-auto flex items-center justify-center gap-3 px-12 py-6 rounded-full bg-[#80FF00] text-black font-black text-sm tracking-widest uppercase hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_20px_40px_-10px_rgba(128,255,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : currentStep === onboardingSteps.length - 1 ? (
                  <>
                    INITIALIZE PLATFORM <Sparkles className="w-5 h-5" />
                  </>
                ) : (
                  <>
                    NEXT PHASE <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      <style jsx global>{`
        select option {
          background-color: #0d1209;
          color: white;
          padding: 1rem;
        }
      `}</style>
    </div>
  );
};

export default B2BOnboardingPage;
