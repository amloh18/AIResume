import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import CVBuilderProAdapter from '@/components/cv-builder-pro/CVBuilderProAdapter';
import CoverLetterPreview from '@/components/cv-preview/CoverLetterPreview';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ITemplate } from '@/types/template';

interface DocumentPreviewSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: 'cv' | 'coverLetter';
  documentData: any; // CV data or Cover Letter content
  cvData?: any; // Required for Cover Letter Preview
  jobData?: any; // Required for Cover Letter Preview
  template?: ITemplate | null;
}

export default function DocumentPreviewSidebar({
  isOpen,
  onClose,
  documentType,
  documentData,
  cvData,
  jobData,
  template,
}: DocumentPreviewSidebarProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 h-screen bg-white dark:bg-[#141810] shadow-2xl z-[9999] flex flex-col w-full md:w-[60vw] lg:w-[50vw]"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {documentType === 'cv' ? 'CV Preview' : 'Cover Letter Preview'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-600 dark:text-white/60" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50 dark:bg-[#1a201a]">
          <div className="max-w-4xl mx-auto bg-white dark:bg-white rounded-lg shadow-sm overflow-hidden min-h-full">
            {documentType === 'cv' ? (
              <CVBuilderProAdapter
                cvData={documentData as UnifiedCVDataStructure}
                template={template || null}
                theme="light"
                readOnly={true}
              />
            ) : (
              <CoverLetterPreview
                content={documentData?.content || ''}
                cvData={cvData || {}}
                jobData={jobData || {}}
                selectedCVData={cvData || {}}
              />
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
