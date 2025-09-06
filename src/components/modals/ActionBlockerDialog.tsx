'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';

interface ActionBlockerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  actionRequired?: string;
  onAction?: () => void;
  actionLabel?: string;
}

const ActionBlockerDialog: React.FC<ActionBlockerDialogProps> = ({
  isOpen,
  onClose,
  title,
  message,
  actionRequired,
  onAction,
  actionLabel = 'Continue'
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 w-full max-w-md"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-orange-400" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-500 dark:text-white/60 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="mb-6">
              <p className="text-gray-700 dark:text-white/80 text-sm leading-relaxed mb-4">
                {message}
              </p>
              
              {actionRequired && (
                <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-lime-500 dark:text-lime-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Required Action:</span>
                  </div>
                  <p className="text-gray-600 dark:text-white/60 text-sm">{actionRequired}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-white rounded-lg transition-colors"
              >
                Got it
              </button>
              
              {onAction && (
                <button
                  onClick={() => {
                    onAction();
                    onClose();
                  }}
                  className="flex-1 px-4 py-2 bg-lime-500 hover:bg-lime-600 text-black font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {actionLabel}
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ActionBlockerDialog;
