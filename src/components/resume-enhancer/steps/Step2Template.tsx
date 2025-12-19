'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import TemplateSelector from '@/components/studio/TemplateSelector';
import { ITemplate } from '@/types/template';

interface Step2TemplateProps {
  onComplete: () => void;
}

export default function Step2Template({ onComplete }: Step2TemplateProps) {
  const { state, setTemplate } = useResumeEnhancer();

  const handleTemplateSelect = (template: ITemplate) => {
    setTemplate(template);
    // Auto-proceed to next step after selection
    setTimeout(() => {
      onComplete();
    }, 500);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl font-bold text-[color:var(--text-primary)] mb-4">
          Choose Your Template
        </h2>
        <p className="text-lg text-[color:var(--text-secondary)]">
          Select a professional template that best suits your style
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <TemplateSelector
          selectedTemplate={state.selectedTemplate}
          onTemplateSelect={handleTemplateSelect}
          cvData={state.cvData}
        />
      </motion.div>

      {state.selectedTemplate && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-[color:var(--text-secondary)] mb-4">
            Selected: <span className="font-semibold text-[color:var(--text-primary)]">{state.selectedTemplate.name}</span>
          </p>
          <button
            onClick={onComplete}
            className="px-8 py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-black rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105"
          >
            Continue with This Template
          </button>
        </motion.div>
      )}
    </div>
  );
}

