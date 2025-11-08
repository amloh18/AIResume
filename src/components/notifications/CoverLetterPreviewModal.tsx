'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail } from 'lucide-react';
import CoverLetterPreview from '@/components/studio/CoverLetterPreview';

interface CoverLetterPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  coverLetterData: {
    title: string;
    content: string;
    metadata?: {
      targetCompany?: string;
      targetPosition?: string;
      [key: string]: any;
    };
  };
  cvData?: any;
  jobData?: any;
}

export default function CoverLetterPreviewModal({ 
  isOpen, 
  onClose, 
  coverLetterData,
  cvData,
  jobData
}: CoverLetterPreviewModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-[#141810] rounded-xl w-[90%] max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <Mail className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {coverLetterData.title || 'Cover Letter Preview'}
                </h3>
                {coverLetterData.metadata?.targetCompany && (
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    for {coverLetterData.metadata.targetCompany}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Cover Letter Content */}
            <div className="p-8 flex-1 overflow-y-auto min-h-0 bg-gray-50 dark:bg-[#1a201a]">
              <div className="max-w-4xl mx-auto bg-white dark:bg-[#141810] rounded-lg shadow-sm">
                <CoverLetterPreview
                  content={coverLetterData.content || ''}
                  cvData={cvData || {}}
                  jobData={jobData || {}}
                  selectedCVData={cvData || {}}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

