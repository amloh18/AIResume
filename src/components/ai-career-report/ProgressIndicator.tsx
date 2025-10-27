'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

interface ProgressIndicatorProps {
  currentStep: 1 | 2 | 3;
  completedSteps: number[];
}

export default function ProgressIndicator({ currentStep, completedSteps }: ProgressIndicatorProps) {
  const steps = [
    { number: 1, title: 'Choose Path', description: 'Upload CV or start manually' },
    { number: 2, title: 'Build CV', description: 'Review and edit your information' },
    { number: 3, title: 'AI Analysis', description: 'Get career insights' }
  ];

  return (
    <div className="flex items-center justify-center gap-4">
      {steps.map((step, index) => {
        const isActive = step.number === currentStep;
        const isCompleted = completedSteps.includes(step.number);
        const isPast = step.number < currentStep;

        return (
          <div key={step.number} className="flex items-center">
            <motion.div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                isActive
                  ? 'bg-lime-400 text-black shadow-lg'
                  : isCompleted || isPast
                  ? 'bg-green-500 text-white'
                  : 'bg-white/10 text-white/40'
              }`}
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.2 }}
            >
              {isCompleted || isPast ? (
                <CheckCircle size={16} />
              ) : (
                step.number
              )}
            </motion.div>
            
            {index < steps.length - 1 && (
              <motion.div
                className={`w-8 h-1 transition-all duration-300 ${
                  isCompleted || isPast ? 'bg-green-500' : 'bg-white/10'
                }`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: isCompleted || isPast ? 1 : 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
