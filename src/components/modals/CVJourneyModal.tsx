'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Briefcase, 
  FileText, 
  Settings, 
  Mail, 
  Download,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { useJobJourney } from '@/contexts/JobJourneyContext';
import { useRouter } from 'next/navigation';

interface CVJourneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStep?: number;
}

const CVJourneyModal: React.FC<CVJourneyModalProps> = ({
  isOpen,
  onClose,
  initialStep = 1
}) => {
  const { state, updateCurrentStep, updateJourneyStatus } = useJobJourney();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(initialStep);

  useEffect(() => {
    setCurrentStep(initialStep);
  }, [initialStep]);

  const steps = [
    {
      id: 1,
      title: 'Add Job',
      description: 'Add a job to your tracker to get started',
      icon: Briefcase,
      color: 'blue',
      action: 'Add Job',
      route: '/dashboard/pipeline?action=add',
      completed: !!state.currentJobId && state.currentJobId !== 'temp',
      disabled: false
    },
    {
      id: 2,
      title: 'Create CV',
      description: 'Create or select a CV tailored for this job',
      icon: FileText,
      color: 'green',
      action: 'Create CV',
      route: `/studio?jobId=${state.currentJobId}&mode=cv-onboarding`,
      completed: !!state.cvId && state.cvId !== 'temp',
      disabled: !state.currentJobId || state.currentJobId === 'temp'
    },
    {
      id: 3,
      title: 'ATS Score',
      description: 'Check and optimize your CV for ATS systems',
      icon: Settings,
      color: 'purple',
      action: 'Check ATS',
      route: `/studio?jobId=${state.currentJobId}&cvId=${state.cvId}&mode=ats-edit`,
      completed: (state.atsScore !== null && state.atsScore > 0),
      disabled: !state.cvId || state.cvId === 'temp'
    },
    {
      id: 4,
      title: 'Cover Letter',
      description: 'Create a personalized cover letter',
      icon: Mail,
      color: 'orange',
      action: 'Create Cover Letter',
      route: `/studio?type=cover_letter&jobId=${state.currentJobId}&cvId=${state.cvId}&mode=cover-letter-edit`,
      completed: !!state.coverLetterId && state.coverLetterId !== 'temp',
      disabled: !state.atsScore || state.atsScore <= 0
    },
    {
      id: 5,
      title: 'Download & Apply',
      description: 'Download your application materials and apply',
      icon: Download,
      color: 'lime',
      action: 'Download',
      route: `/studio?cvId=${state.cvId}&coverLetterId=${state.coverLetterId}`,
      completed: state.journeyStatus === 'completed' && (state.atsScore !== null && state.atsScore > 0) && !!state.coverLetterId,
      disabled: !state.coverLetterId || state.coverLetterId === 'temp'
    }
  ];

  const handleStepClick = (step: any) => {
    if (step.disabled) return;
    
    setCurrentStep(step.id);
    updateCurrentStep(step.id);
  };

  const handleActionClick = async (step: any) => {
    if (step.disabled) return;
    
    // Special handling for download step
    if (step.id === 5) {
      await handleDownload();
      return;
    }
    
    onClose();
    router.push(step.route);
  };

  const handleDownload = async () => {
    if (!state.cvId) return;
    
    try {
      // Download CV as PDF
      const response = await fetch('/api/cv/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cvId: state.cvId,
          format: 'pdf',
          userId: 'current-user' // This should be passed from props or context
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'CV.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Mark journey as completed
        updateJourneyStatus('completed');
        onClose();
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const getStepStatus = (step: any) => {
    if (step.completed) return 'completed';
    if (step.disabled) return 'disabled';
    if (step.id === currentStep) return 'active';
    return 'pending';
  };

  const getColorClasses = (color: string, status: string) => {
    const colors = {
      blue: {
        completed: 'bg-blue-500 text-white',
        active: 'bg-blue-100 text-blue-700 border-blue-300',
        pending: 'bg-gray-100 text-gray-600 border-gray-300',
        disabled: 'bg-gray-50 text-gray-400 border-gray-200'
      },
      green: {
        completed: 'bg-green-500 text-white',
        active: 'bg-green-100 text-green-700 border-green-300',
        pending: 'bg-gray-100 text-gray-600 border-gray-300',
        disabled: 'bg-gray-50 text-gray-400 border-gray-200'
      },
      purple: {
        completed: 'bg-purple-500 text-white',
        active: 'bg-purple-100 text-purple-700 border-purple-300',
        pending: 'bg-gray-100 text-gray-600 border-gray-300',
        disabled: 'bg-gray-50 text-gray-400 border-gray-200'
      },
      orange: {
        completed: 'bg-orange-500 text-white',
        active: 'bg-orange-100 text-orange-700 border-orange-300',
        pending: 'bg-gray-100 text-gray-600 border-gray-300',
        disabled: 'bg-gray-50 text-gray-400 border-gray-200'
      },
      lime: {
        completed: 'bg-lime-500 text-white',
        active: 'bg-lime-100 text-lime-700 border-lime-300',
        pending: 'bg-gray-100 text-gray-600 border-gray-300',
        disabled: 'bg-gray-50 text-gray-400 border-gray-200'
      }
    };
    
    return colors[color as keyof typeof colors]?.[status as keyof typeof colors.blue] || colors.blue.pending;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        
        {/* Modal */}
        <motion.div
          className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                CV Journey
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Complete your job application step by step
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                {steps.map((step, index) => (
                  <React.Fragment key={step.id}>
                    <button
                      onClick={() => handleStepClick(step)}
                      className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                        getColorClasses(step.color, getStepStatus(step))
                      } ${step.disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-105'}`}
                      disabled={step.disabled}
                    >
                      {step.completed ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <step.icon className="w-6 h-6" />
                      )}
                    </button>
                    {index < steps.length - 1 && (
                      <div className={`flex-1 h-1 mx-2 rounded ${
                        steps[index + 1].completed || (currentStep > step.id) 
                          ? 'bg-lime-500' 
                          : 'bg-gray-200 dark:bg-gray-600'
                      }`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
              
              {/* Step Labels */}
              <div className="flex items-center justify-between">
                {steps.map((step) => (
                  <div key={step.id} className="text-center flex-1">
                    <p className={`text-xs font-medium ${
                      getStepStatus(step) === 'completed' 
                        ? 'text-lime-600' 
                        : getStepStatus(step) === 'active'
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {step.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Current Step Details */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
              {steps.map((step) => (
                step.id === currentStep && (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                  >
                    <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                      getColorClasses(step.color, getStepStatus(step))
                    }`}>
                      {step.completed ? (
                        <CheckCircle className="w-8 h-8" />
                      ) : (
                        <step.icon className="w-8 h-8" />
                      )}
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {step.title}
                    </h3>
                    
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      {step.description}
                    </p>

                    {step.completed ? (
                      <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">Completed</span>
                      </div>
                    ) : (
                      <motion.button
                        onClick={() => handleActionClick(step)}
                        disabled={step.disabled}
                        className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 mx-auto ${
                          step.disabled
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-lime-600 text-white hover:bg-lime-700 hover:scale-105'
                        }`}
                        whileHover={step.disabled ? {} : { scale: 1.05 }}
                        whileTap={step.disabled ? {} : { scale: 0.95 }}
                      >
                        {step.action}
                        <ArrowRight className="w-4 h-4" />
                      </motion.button>
                    )}
                  </motion.div>
                )
              ))}
            </div>

            {/* Journey Summary */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Briefcase className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {state.currentJobId ? 'Job Selected' : 'No Job Selected'}
                </p>
              </div>
              
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <FileText className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  {state.cvId ? 'CV Ready' : 'No CV'}
                </p>
              </div>
              
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <Settings className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                  {state.atsScore !== null ? `ATS: ${state.atsScore}%` : 'No ATS Score'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CVJourneyModal;