import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, CheckCircle, Download, AlertTriangle } from 'lucide-react';

interface MoveToAppliedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  journey: {
    jobTitle: string;
    company: string;
    id: string;
  };
  fileSizeEstimates?: {
    cv: number;
    coverLetter: number;
    jobDescription: number;
    total: number;
  };
  isLoading?: boolean;
}

const MoveToAppliedModal: React.FC<MoveToAppliedModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  journey,
  fileSizeEstimates,
  isLoading = false
}) => {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Error completing journey:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  // Use portal to render at document root to avoid z-index issues
  const modalContent = (
    <AnimatePresence>
      <div 
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4" 
        style={{ pointerEvents: 'auto' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Move to Applied
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Complete this journey
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              disabled={isLoading || isConfirming}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Journey Details */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                {journey.jobTitle}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {journey.company}
              </p>
            </div>

            {/* File Size Estimates */}
            {fileSizeEstimates && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Download Files
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">CV (PDF)</span>
                    <span className="font-medium">{formatFileSize(fileSizeEstimates.cv)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Cover Letter (PDF)</span>
                    <span className="font-medium">{formatFileSize(fileSizeEstimates.coverLetter)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Job Description (PDF)</span>
                    <span className="font-medium">{formatFileSize(fileSizeEstimates.jobDescription)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-2">
                    <span className="font-medium text-gray-900 dark:text-white">Total (ZIP)</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {formatFileSize(fileSizeEstimates.total)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Warning */}
            <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  This will mark the job as "Applied"
                </p>
                <p className="text-amber-700 dark:text-amber-300 mt-1">
                  The journey will be completed and moved to your completed journeys list.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors font-medium"
              disabled={isLoading || isConfirming}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading || isConfirming}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
            >
              {isLoading || isConfirming ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {isConfirming ? 'Completing...' : 'Loading...'}
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Confirm & Move to Applied
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  // Render using portal to ensure it appears above all other modals
  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  
  return null;
};

export default MoveToAppliedModal;
