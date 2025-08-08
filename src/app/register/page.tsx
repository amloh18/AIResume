'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import RegistrationModal from '@/components/auth/RegistrationModal';
import RoleSelection from '@/components/auth/RoleSelection';
import CVUpload from '@/components/cv-parser/CVUpload';
import { ArrowLeft, Sparkles, Upload } from 'lucide-react';

type RegistrationStep = 'role' | 'registration' | 'upload' | 'form' | 'loading' | 'complete';

const RegisterPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('role');
  const [selectedRole, setSelectedRole] = useState<'student' | 'professional' | 'recruiter' | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [cvData, setCvData] = useState<any>(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [formData, setFormData] = useState<any>({
    personalInfo: {
      firstName: userData?.firstName || '',
      lastName: userData?.lastName || '',
      email: userData?.email || '',
      phone: '',
      location: '',
      website: '',
      linkedin: '',
      github: '',
      summary: ''
    },
    education: [],
    experience: [],
    skills: [],
    projects: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const sections = [
    { id: 'personal', title: 'Personal Info', icon: 'User', color: 'from-blue-400 to-blue-600' },
    { id: 'education', title: 'Education', icon: 'GraduationCap', color: 'from-green-400 to-green-600' },
    { id: 'experience', title: 'Experience', icon: 'Briefcase', color: 'from-purple-400 to-purple-600' },
    { id: 'skills', title: 'Skills', icon: 'Star', color: 'from-yellow-400 to-yellow-600' },
    { id: 'projects', title: 'Projects', icon: 'Globe', color: 'from-red-400 to-red-600' }
  ];

  // Save progress to localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem('registrationProgress');
    if (savedProgress) {
      const progress = JSON.parse(savedProgress);
      setSelectedRole(progress.selectedRole || null);
      setUserData(progress.userData || null);
      setCvData(progress.cvData || null);
      setFormData(progress.formData || formData);
      setCurrentStep(progress.step || 'role');
    }
  }, []);

  // Update form data when userData changes
  useEffect(() => {
    if (userData) {
      setFormData(prev => ({
        ...prev,
        personalInfo: {
          ...prev.personalInfo,
          firstName: userData.firstName || prev.personalInfo.firstName,
          lastName: userData.lastName || prev.personalInfo.lastName,
          email: userData.email || prev.personalInfo.email
        }
      }));
    }
  }, [userData]);

  const saveProgress = (step: RegistrationStep, data?: any) => {
    const progress = {
      step,
      selectedRole: data?.selectedRole || selectedRole,
      userData: data?.userData || userData,
      cvData: data?.cvData || cvData,
      formData: data?.formData || formData,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('registrationProgress', JSON.stringify(progress));
  };

  const handleRoleSelect = (role: 'student' | 'professional' | 'recruiter') => {
    setSelectedRole(role);
    setCurrentStep('registration');
    saveProgress('registration', { selectedRole: role });
  };

  const handleRegistration = async (userData: any) => {
    setUserData(userData);
    setCurrentStep('upload');
    saveProgress('upload', { userData });
  };

  const handleCVParsed = (parsedData: any) => {
    console.log('RegisterPage: handleCVParsed called with:', parsedData);
    setCvData(parsedData);
    setCurrentStep('form');
    saveProgress('form', { cvData: parsedData });
  };

  const handleSkipUpload = () => {
    setCurrentStep('form');
    saveProgress('form');
  };

  const handleFormComplete = async () => {
    setCurrentStep('loading');
    setIsLoading(true);
    saveProgress('loading');

    try {
      // Register user with role
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
        
        // Create initial CV with form data
        const cvResponse = await fetch('/api/cvs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userResult.data.user._id,
            title: `${userData.firstName} ${userData.lastName}'s CV`,
            sections: formData
          }),
        });

        if (cvResponse.ok) {
          const cvResult = await cvResponse.json();
          console.log('CV created:', cvResult);
        }
        
        // Clear progress from localStorage
        localStorage.removeItem('registrationProgress');
        
        // Set completion step
        setCurrentStep('complete');
        
        // Auto-redirect to dashboard after 3 seconds
        setTimeout(() => {
          // Set flag for dashboard welcome animation
          sessionStorage.setItem('fromRegistration', 'true');
          // Store user data for login
          localStorage.setItem('user', JSON.stringify(userResult.data.user));
          window.location.href = '/dashboard';
        }, 3000);
      } else {
        const errorResult = await userResponse.json();
        console.error('Registration failed:', errorResult);
        throw new Error(errorResult.message || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      // Handle error - could show error modal or go back to registration step
      setCurrentStep('registration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'registration':
        setCurrentStep('role');
        break;
      case 'upload':
        setCurrentStep('registration');
        break;
      case 'form':
        setCurrentStep('upload');
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0">
                <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-lime-400/10 rounded-full blur-3xl gpu-accelerated"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.4, 0.2],
            x: [0, 20, 0],
            y: [0, -15, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{ willChange: 'transform, opacity' }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl gpu-accelerated"
          animate={{
            scale: [1.1, 1, 1.1],
            opacity: [0.3, 0.5, 0.3],
            x: [0, -20, 0],
            y: [0, 20, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3
          }}
          style={{ willChange: 'transform, opacity' }}
        />
      </div>

      {/* Back Button */}
      <motion.button
        onClick={() => router.push('/')}
        className="absolute top-8 left-8 flex items-center gap-2 text-white/60 hover:text-white transition-colors z-10"
        whileHover={{ x: -5 }}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
      >
        <ArrowLeft size={20} />
        Back to Home
      </motion.button>

      {/* Progress Indicator */}
      <div className="absolute top-8 right-8 z-10">
        <div className="flex items-center gap-2 text-white/60">
          <div className="flex items-center gap-1">
            {['role', 'registration', 'upload', 'form', 'complete'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                    currentStep === step
                      ? 'bg-lime-400 text-black'
                      : ['role', 'registration', 'upload', 'form', 'complete'].indexOf(currentStep) > index
                      ? 'bg-green-500 text-white'
                      : 'bg-white/10 text-white/40'
                  }`}
                >
                  {index + 1}
                </div>
                {index < 4 && (
                  <div
                    className={`w-8 h-1 transition-all duration-300 ${
                      ['role', 'registration', 'upload', 'form', 'complete'].indexOf(currentStep) > index
                        ? 'bg-green-500'
                        : 'bg-white/10'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-4xl">
        <AnimatePresence mode="wait">
          {currentStep === 'role' && (
            <motion.div
              key="role"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{ willChange: 'transform, opacity' }}
            >
              <RoleSelection
                onRoleSelect={handleRoleSelect}
                isOpen={true}
              />
            </motion.div>
          )}

          {currentStep === 'registration' && (
            <motion.div
              key="registration"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{ willChange: 'transform, opacity' }}
            >
              <RegistrationModal
                isOpen={true}
                onClose={() => router.push('/')}
                onRegister={handleRegistration}
                selectedRole={selectedRole || undefined}
              />
            </motion.div>
          )}

          {currentStep === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="text-center space-y-8"
              style={{ willChange: 'transform, opacity' }}
            >
              <div className="space-y-6">
                <div className="text-center space-y-4">
                  <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-lime-400/20 to-lime-500/20 flex items-center justify-center">
                    <Upload size={48} className="text-lime-400" />
                  </div>
                  <h3 className="text-3xl font-bold text-white">Upload Your CV</h3>
                  <p className="text-white/60 text-lg">Upload your existing CV to automatically fill in the form, or start from scratch</p>
                </div>
                
                <CVUpload
                  onCVParsed={handleCVParsed}
                  onClose={() => {}}
                />
                
                <div className="text-center">
                  <button
                    onClick={handleSkipUpload}
                    className="text-lime-400 hover:text-lime-300 transition-colors text-lg"
                  >
                    Or start from scratch →
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="text-center space-y-8"
              style={{ willChange: 'transform, opacity' }}
            >
              <div className="space-y-6">
                <div className="text-center space-y-4">
                  <h3 className="text-3xl font-bold text-white">Complete Your CV</h3>
                  <p className="text-white/60 text-lg">Fill in your CV details to create your professional profile</p>
                </div>
                
                {/* Simple form for now - you can expand this */}
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                    <h4 className="text-xl font-bold text-white mb-4">Personal Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">First Name</label>
                        <input
                          type="text"
                          value={formData.personalInfo.firstName}
                          onChange={(e) => setFormData({
                            ...formData,
                            personalInfo: { ...formData.personalInfo, firstName: e.target.value }
                          })}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300"
                          placeholder="Enter your first name"
                        />
                      </div>
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">Last Name</label>
                        <input
                          type="text"
                          value={formData.personalInfo.lastName}
                          onChange={(e) => setFormData({
                            ...formData,
                            personalInfo: { ...formData.personalInfo, lastName: e.target.value }
                          })}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300"
                          placeholder="Enter your last name"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-white/80 text-sm font-medium mb-2">Professional Summary</label>
                      <textarea
                        value={formData.personalInfo.summary}
                        onChange={(e) => setFormData({
                          ...formData,
                          personalInfo: { ...formData.personalInfo, summary: e.target.value }
                        })}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/50 transition-all duration-300 resize-none"
                        rows={4}
                        placeholder="Tell us about your background, experience, and career goals..."
                      />
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <button
                      onClick={handleFormComplete}
                      className="bg-gradient-to-r from-lime-400 to-lime-500 text-black px-8 py-4 rounded-xl font-semibold text-lg hover:from-lime-300 hover:to-lime-400 transition-all duration-300 shadow-2xl shadow-lime-400/25"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Complete Setup
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="text-center space-y-8"
              style={{ willChange: 'transform, opacity' }}
            >
              <motion.div
                className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-lime-400 to-lime-500 flex items-center justify-center loading-spinner"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                style={{ willChange: 'transform' }}
              >
                <Sparkles size={48} className="text-black" />
              </motion.div>
              
              <div>
                <h2 className="text-3xl font-bold text-white mb-4">Setting up your account...</h2>
                <p className="text-white/60 text-lg">Creating your profile and preparing your dashboard</p>
              </div>
              
              <div className="flex items-center justify-center gap-2">
                <motion.div
                  className="w-2 h-2 bg-lime-400 rounded-full"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                />
                <motion.div
                  className="w-2 h-2 bg-lime-400 rounded-full"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div
                  className="w-2 h-2 bg-lime-400 rounded-full"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                />
              </div>
            </motion.div>
          )}

          {currentStep === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="text-center space-y-8"
              style={{ willChange: 'transform, opacity' }}
            >
              <motion.div
                className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, type: "spring" }}
              >
                <Sparkles size={48} className="text-white" />
              </motion.div>
              
              <div>
                <h2 className="text-3xl font-bold text-white mb-4">Welcome to CVCircle!</h2>
                <p className="text-white/60 text-lg">Your account has been created successfully. Redirecting to dashboard...</p>
              </div>
              
              <div className="flex items-center justify-center gap-2">
                <motion.div
                  className="w-2 h-2 bg-lime-400 rounded-full"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                />
                <motion.div
                  className="w-2 h-2 bg-lime-400 rounded-full"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div
                  className="w-2 h-2 bg-lime-400 rounded-full"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RegisterPage; 