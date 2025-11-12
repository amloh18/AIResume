'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye } from 'lucide-react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ExecutiveProfessionalLayoutTemplate } from '@/lib/templates/custom-renderers/ExecutiveProfessionalLayoutTemplate';

interface CVPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  cvData: UnifiedCVDataStructure;
}

export default function CVPreviewModal({ isOpen, onClose, cvData }: CVPreviewModalProps) {
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
          className="bg-white rounded-xl w-[90%] max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <Eye className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-bold text-gray-900">CV Preview</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* CV Content - Using Executive Professional Template */}
          <div className="p-4 flex-1 overflow-y-auto min-h-0 bg-gray-50">
            <div className="max-w-4xl mx-auto bg-white shadow-sm">
              <ExecutiveProfessionalLayoutTemplate
                cvData={cvData}
                className="preview-mode"
              />
            </div>
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
