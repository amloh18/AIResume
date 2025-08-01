'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Palette, 
  Sparkles, 
  Eye, 
  Download,
  CheckCircle
} from 'lucide-react';

interface CVStudioStepperProps {
  currentStep: 'template' | 'customize' | 'snippets' | 'preview' | 'export';
  onStepClick?: (step: 'template' | 'customize' | 'snippets' | 'preview' | 'export') => void;
}

const CVStudioStepper: React.FC<CVStudioStepperProps> = ({
  currentStep,
  onStepClick
}) => {
  const steps = [
    {
      id: 'template' as const,
      title: 'Choose Template',
      icon: FileText,
      description: 'Select your CV template'
    },
    {
      id: 'customize' as const,
      title: 'Customize',
      icon: Palette,
      description: 'Edit your content'
    },
    {
      id: 'snippets' as const,
      title: 'Snippets',
      icon: Sparkles,
      description: 'Add AI suggestions'
    },
    {
      id: 'preview' as const,
      title: 'Preview',
      icon: Eye,
      description: 'Review your CV'
    },
    {
      id: 'export' as const,
      title: 'Export',
      icon: Download,
      description: 'Download your CV'
    }
  ];

  const getStepStatus = (stepId: string) => {
    const stepIndex = steps.findIndex(step => step.id === stepId);
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 mb-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          const Icon = step.icon;
          
          return (
            <React.Fragment key={step.id}>
              <motion.div
                className={`flex items-center gap-3 cursor-pointer transition-all duration-300 ${
                  status === 'current' 
                    ? 'text-white' 
                    : status === 'completed' 
                    ? 'text-green-400' 
                    : 'text-gray-400 hover:text-gray-300'
                }`}
                onClick={() => onStepClick?.(step.id)}
                whileHover={{ scale: status !== 'upcoming' ? 1.05 : 1 }}
                whileTap={{ scale: status !== 'upcoming' ? 0.95 : 1 }}
              >
                <div className={`relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                  status === 'current'
                    ? 'border-white bg-white/20'
                    : status === 'completed'
                    ? 'border-green-400 bg-green-400/20'
                    : 'border-gray-400 bg-gray-400/20'
                }`}>
                  {status === 'completed' ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                
                <div className="hidden sm:block">
                  <div className={`font-medium text-sm ${
                    status === 'current' ? 'text-white' : 'text-gray-300'
                  }`}>
                    {step.title}
                  </div>
                  <div className="text-xs text-gray-400">
                    {step.description}
                  </div>
                </div>
              </motion.div>
              
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 transition-all duration-300 ${
                  status === 'completed' ? 'bg-green-400' : 'bg-gray-600'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default CVStudioStepper; 