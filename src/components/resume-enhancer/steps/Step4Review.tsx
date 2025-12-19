'use client';

import React, { useState } from 'react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { AlertCircle, Eye, Palette, X } from 'lucide-react';
import CVPreview from '@/components/studio/CVPreview';
import TemplateSelector from '@/components/studio/TemplateSelector';
import { ITemplate } from '@/types/template';
import { motion, AnimatePresence } from 'framer-motion';

export default function Step4Review() {
  const { state, setTemplate } = useResumeEnhancer();
  const [zoom, setZoom] = useState(1);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const calculateCompletionPercentage = () => {
    let filledSections = 0;
    const totalSections = 8;

    if (state.cvData.basics?.name && state.cvData.basics?.email) filledSections++;
    if (state.cvData.work && state.cvData.work.length > 0) filledSections++;
    if (state.cvData.education && state.cvData.education.length > 0) filledSections++;
    if (state.cvData.skills && state.cvData.skills.length > 0) filledSections++;
    if (state.cvData.projects && state.cvData.projects.length > 0) filledSections++;
    if (state.cvData.certificates && state.cvData.certificates.length > 0) filledSections++;
    if (state.cvData.languages && state.cvData.languages.length > 0) filledSections++;
    if (state.cvData.volunteer && state.cvData.volunteer.length > 0) filledSections++;

    return Math.round((filledSections / totalSections) * 100);
  };

  const completionPercentage = calculateCompletionPercentage();

  const handleTemplateSelect = (template: ITemplate) => {
    setTemplate(template);
    setShowTemplateModal(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Split View: Info Left, Preview Right */}
      <div className="flex-1 flex gap-3 overflow-hidden">
        {/* Left Panel - Info (50%) */}
        <div className="w-1/2 flex flex-col bg-[var(--bg-secondary)] rounded-xl overflow-hidden shadow-sm shadow-black/10 dark:shadow-black/30">
          <div className="p-4">
            <h2 className="text-lg font-bold text-[color:var(--text-primary)] mb-1">
              Review Your Resume
            </h2>
            <p className="text-xs text-[color:var(--text-secondary)]">
              Take a final look before saving to your dashboard
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Completion Badge */}
            <div className="bg-[var(--bg-tertiary)] rounded-lg p-4 text-center shadow-sm shadow-black/10 dark:shadow-black/30">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--accent-primary)] text-black font-bold text-xl mb-2 shadow-lg">
                {completionPercentage}%
              </div>
              <p className="text-xs text-[color:var(--text-secondary)]">Complete</p>
            </div>

            {/* CV Info */}
            <div className="space-y-3">
              <div className="bg-[var(--bg-tertiary)] rounded-lg p-3 shadow-sm shadow-black/10 dark:shadow-black/30">
                <p className="text-xs text-[color:var(--text-tertiary)] mb-1">CV Type</p>
                <p className="font-semibold text-[color:var(--text-primary)] capitalize text-sm">
                  {state.cvType}
                </p>
              </div>
              <div className="bg-[var(--bg-tertiary)] rounded-lg p-3 shadow-sm shadow-black/10 dark:shadow-black/30">
                <p className="text-xs text-[color:var(--text-tertiary)] mb-1">Template</p>
                <p className="font-semibold text-[color:var(--text-primary)] text-sm">
                  {state.selectedTemplate?.name || 'None'}
                </p>
              </div>
              <div className="bg-[var(--bg-tertiary)] rounded-lg p-3 shadow-sm shadow-black/10 dark:shadow-black/30">
                <p className="text-xs text-[color:var(--text-tertiary)] mb-1">Target Role</p>
                <p className="font-semibold text-[color:var(--text-primary)] text-sm">
                  {state.targetRole || 'Not specified'}
                </p>
              </div>
              <div className="bg-[var(--bg-tertiary)] rounded-lg p-3 shadow-sm shadow-black/10 dark:shadow-black/30">
                <p className="text-xs text-[color:var(--text-tertiary)] mb-1">Seniority</p>
                <p className="font-semibold text-[color:var(--text-primary)] capitalize text-sm">
                  {state.seniorityLevel || 'Not specified'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Preview (50%) */}
        <div className="w-1/2 flex flex-col bg-[var(--bg-secondary)] rounded-xl overflow-hidden shadow-sm shadow-black/10 dark:shadow-black/30">
          {/* Preview Header with Controls */}
          <div className="p-3 bg-[var(--bg-secondary)] flex items-center justify-between">
            <h3 className="text-base font-bold text-[color:var(--text-primary)]">Preview</h3>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowTemplateModal(true)}
                className="px-3 py-1.5 bg-[var(--bg-tertiary)] hover:bg-[var(--hover-bg)] text-[color:var(--text-primary)] rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 hover:scale-105 shadow-sm shadow-black/10 dark:shadow-black/30"
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Template</span>
              </button>
              <div className="h-6 w-px bg-black/10 dark:bg-white/10" />
              <div className="flex items-center space-x-2 text-xs text-[color:var(--text-secondary)]">
                <Eye className="w-3.5 h-3.5" />
                <span>Zoom: {Math.round(zoom * 100)}%</span>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                  className="px-2 py-1 bg-[var(--bg-tertiary)] hover:bg-[var(--hover-bg)] text-[color:var(--text-primary)] rounded text-xs shadow-sm shadow-black/10 dark:shadow-black/30"
                >
                  -
                </button>
                <button
                  onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                  className="px-2 py-1 bg-[var(--bg-tertiary)] hover:bg-[var(--hover-bg)] text-[color:var(--text-primary)] rounded text-xs shadow-sm shadow-black/10 dark:shadow-black/30"
                >
                  +
                </button>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
          {state.selectedTemplate ? (
            <CVPreview
              cvData={state.cvData}
              template={state.selectedTemplate}
              jobData={state.jobData}
              zoom={zoom}
              setZoom={setZoom}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-[color:var(--text-tertiary)] mx-auto mb-3" />
                <p className="text-sm text-[color:var(--text-secondary)]">
                  No template selected. Please go back and select a template.
                </p>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Template Selector Modal */}
      <AnimatePresence>
        {showTemplateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowTemplateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--bg-secondary)] rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h2 className="text-xl font-bold text-[color:var(--text-primary)]">
                  Select Template
                </h2>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-[color:var(--text-primary)]" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <TemplateSelector
                  selectedTemplate={state.selectedTemplate}
                  onTemplateSelect={handleTemplateSelect}
                  cvData={state.cvData}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

