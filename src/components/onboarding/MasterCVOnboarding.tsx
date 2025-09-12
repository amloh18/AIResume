'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Briefcase, 
  GraduationCap, 
  Award, 
  Eye, 
  Check,
  ArrowRight,
  Save,
  LogOut,
  Sparkles,
  Mail,
  Phone,
  MapPin,
  Globe,
  Linkedin,
  Github,
  Calendar,
  Plus,
  Edit,
  Trash2,
  X
} from 'lucide-react';
import WelcomeModal from './WelcomeModal';
import PersonalInfoStep from './steps/PersonalInfoStep';
import ExperienceStep from './steps/ExperienceStep';
import SkillsStep from './steps/SkillsStep';
import PreviewStep from './steps/PreviewStep';

interface MasterCVData {
  // Personal Information
  fullName: string;
  professionalTitle: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  website: string;
  linkedin: string;
  github: string;
  
  // Experience
  workExperience: Array<{
    id: string;
    jobTitle: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    description: string;
  }>;
  
  education: Array<{
    id: string;
    degree: string;
    institution: string;
    location: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    description: string;
  }>;
  
  projects: Array<{
    id: string;
    name: string;
    description: string;
    technologies: string;
    url: string;
    startDate: string;
    endDate: string;
  }>;
  
  // Skills & Achievements
  skills: string[];
  languages: Array<{
    id: string;
    language: string;
    proficiency: 'Native' | 'Fluent' | 'Conversational' | 'Basic';
  }>;
  achievements: string;
  interests: string[];
}

interface MasterCVOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: MasterCVData) => void;
}

const MasterCVOnboarding: React.FC<MasterCVOnboardingProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState('');
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState<MasterCVData>({
    fullName: '',
    professionalTitle: '',
    email: '',
    phone: '',
    location: '',
    summary: '',
    website: '',
    linkedin: '',
    github: '',
    workExperience: [],
    education: [],
    projects: [],
    skills: [],
    languages: [],
    achievements: '',
    interests: []
  });

  const steps = [
    {
      id: 1,
      title: 'Personal Information',
      icon: User,
      description: 'Basic contact and professional details'
    },
    {
      id: 2,
      title: 'Experience & Education',
      icon: Briefcase,
      description: 'Work history and academic background'
    },
    {
      id: 3,
      title: 'Skills & Accomplishments',
      icon: Award,
      description: 'Skills, languages, and achievements'
    },
    {
      id: 4,
      title: 'Preview & Finalize',
      icon: Eye,
      description: 'Review and complete your profile'
    }
  ];

  const handleRoleSelected = (role: string) => {
    setSelectedRole(role);
    setFormData(prev => ({ ...prev, professionalTitle: role }));
    setShowWelcomeModal(false);
  };

  const handleStepComplete = (stepData: Partial<MasterCVData>) => {
    setFormData(prev => ({ ...prev, ...stepData }));
    
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinalSubmit();
    }
  };

  const handleFinalSubmit = async () => {
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Call the completion handler
      onComplete(formData);
      
      // Show success animation
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Error saving Master CV:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveAndExit = () => {
    // Save current progress and exit
    onClose();
  };

  const getStepStatus = (stepId: number) => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'active';
    return 'upcoming';
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <PersonalInfoStep
            data={formData}
            onNext={handleStepComplete}
            onPrevious={handlePreviousStep}
            isFirstStep={true}
          />
        );
      case 2:
        return (
          <ExperienceStep
            data={formData}
            onNext={handleStepComplete}
            onPrevious={handlePreviousStep}
          />
        );
      case 3:
        return (
          <SkillsStep
            data={formData}
            onNext={handleStepComplete}
            onPrevious={handlePreviousStep}
          />
        );
      case 4:
        return (
          <PreviewStep
            data={formData}
            onComplete={handleFinalSubmit}
            onPrevious={handlePreviousStep}
            isLoading={isLoading}
          />
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900">
      {/* Welcome Modal */}
      <WelcomeModal
        isOpen={showWelcomeModal}
        onClose={() => {
          setShowWelcomeModal(false);
          onClose();
        }}
        onRoleSelected={handleRoleSelected}
      />

      {/* Main Onboarding Layout */}
      <AnimatePresence>
        {!showWelcomeModal && (
          <motion.div
            className="h-screen flex"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Left Column - Navigation Stepper (25%) */}
            <div className="w-1/4 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                      CVCircle
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Your Master Profile
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress Indicator */}
              <div className="flex-1 p-6">
                <div className="space-y-6">
                  {steps.map((step, index) => {
                    const status = getStepStatus(step.id);
                    const Icon = step.icon;
                    
                    return (
                      <motion.div
                        key={step.id}
                        className="flex items-start gap-4"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        {/* Progress Line */}
                        {index < steps.length - 1 && (
                          <div className="absolute left-7 top-8 w-0.5 h-12 bg-gray-200 dark:bg-gray-700">
                            <motion.div
                              className="w-full bg-gradient-to-b from-blue-500 to-purple-600"
                              initial={{ height: 0 }}
                              animate={{ 
                                height: status === 'completed' ? '100%' : 
                                        status === 'active' ? '50%' : '0%'
                              }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                        )}

                        {/* Step Icon */}
                        <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          status === 'completed' 
                            ? 'bg-green-500 text-white' 
                            : status === 'active'
                            ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        }`}>
                          {status === 'completed' ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                        </div>

                        {/* Step Content */}
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-sm font-medium transition-colors ${
                            status === 'active' 
                              ? 'text-gray-900 dark:text-white' 
                              : status === 'completed'
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {step.id}. {step.title}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {step.description}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleSaveAndExit}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <Save className="h-4 w-4" />
                  Save & Exit
                </button>
              </div>
            </div>

            {/* Right Column - Content Form (75%) */}
            <div className="flex-1 bg-white dark:bg-gray-900 overflow-hidden">
              <div className="h-full flex flex-col">
                {/* Content Area */}
                <div className="flex-1 overflow-y-auto">
                  <div className="max-w-4xl mx-auto p-8">
                    {renderStepContent()}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MasterCVOnboarding;
