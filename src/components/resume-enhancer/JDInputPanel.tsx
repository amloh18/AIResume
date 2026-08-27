'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  X,
  Briefcase,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';

interface JDInputPanelProps {
  /** Called when JD is submitted and validated */
  onSubmit?: (jdText: string) => void;
  /** Called when user cancels/clears JD input */
  onCancel?: () => void;
  /** Whether to show as a modal/overlay */
  isModal?: boolean;
  /** Initial JD text (for editing) */
  initialText?: string;
  /** Minimum word count required */
  minWords?: number;
  /** Show the "This will create a Journey CV" indicator */
  showJourneyIndicator?: boolean;
}

const MIN_WORD_COUNT = 50;
const OPTIMAL_WORD_COUNT = 150;

export default function JDInputPanel({
  onSubmit,
  onCancel,
  isModal = false,
  initialText = '',
  minWords = MIN_WORD_COUNT,
  showJourneyIndicator = true
}: JDInputPanelProps) {
  const { state, setJdText, clearJdText } = useResumeEnhancer();
  const [localText, setLocalText] = useState(initialText || state.jdText);
  const [isValidating, setIsValidating] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [validationType, setValidationType] = useState<'error' | 'warning' | 'success' | null>(null);

  // Calculate word count
  const wordCount = localText.trim().split(/\s+/).filter(Boolean).length;
  const isTooShort = wordCount > 0 && wordCount < minWords;
  const isOptimal = wordCount >= OPTIMAL_WORD_COUNT;
  const isValid = wordCount >= minWords;

  // Sync with context on mount
  useEffect(() => {
    if (state.jdText && !localText) {
      setLocalText(state.jdText);
    }
  }, [state.jdText]);

  // Validate JD content
  const validateJD = () => {
    setIsValidating(true);

    // Check word count
    if (wordCount < minWords) {
      setValidationMessage(`Job description is too short. Please add at least ${minWords} words for accurate ATS optimization.`);
      setValidationType('error');
      setIsValidating(false);
      return false;
    }

    // Check for common issues
    if (wordCount < OPTIMAL_WORD_COUNT) {
      setValidationMessage(`JD is short (${wordCount} words). More detail will improve keyword matching.`);
      setValidationType('warning');
    } else {
      setValidationMessage('Job description looks good!');
      setValidationType('success');
    }

    setIsValidating(false);
    return true;
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setLocalText(text);

    // Clear validation on edit
    if (validationMessage) {
      setValidationMessage(null);
      setValidationType(null);
    }
  };

  const handleSubmit = () => {
    if (!validateJD()) return;

    // Update context
    setJdText(localText);

    // Call parent callback
    onSubmit?.(localText);
  };

  const handleClear = () => {
    setLocalText('');
    clearJdText();
    setValidationMessage(null);
    setValidationType(null);
    onCancel?.();
  };

  const getWordCountColor = () => {
    if (wordCount === 0) return 'text-[color:var(--text-tertiary)]';
    if (isTooShort) return 'text-red-500';
    if (isOptimal) return 'text-green-500';
    return 'text-yellow-500';
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-lime-500/20 dark:bg-[#013f2e]/15 rounded-xl">
            <Briefcase className="w-5 h-5 text-lime-600 dark:text-[#013f2e]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Paste Job Description
            </h3>
            <p className="text-sm text-gray-600 dark:text-white/70">
              We'll analyze and tailor your CV to match
            </p>
          </div>
        </div>
        {isModal && onCancel && (
          <button
            onClick={handleClear}
            className="p-2 hover:bg-[var(--hover-bg)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[color:var(--text-secondary)]" />
          </button>
        )}
      </div>

      {/* Journey CV Indicator */}
      {showJourneyIndicator && wordCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-lime-50 dark:bg-[#232f1c] border border-lime-200 dark:border-lime-500/30 rounded-xl"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-lime-600 dark:text-[#013f2e]" />
            <span className="text-sm text-gray-700 dark:text-white/90">
              Your CV will be tailored specifically for this job with keyword optimization and ATS scoring.
            </span>
          </div>
        </motion.div>
      )}

      {/* Textarea */}
      <div className="flex-1 relative">
        <textarea
          value={localText}
          onChange={handleTextChange}
          placeholder="Paste the full job description here...&#10;&#10;Include job title, responsibilities, requirements, and qualifications for best results."
          className="w-full h-full min-h-[200px] p-4 bg-white dark:bg-[#232f1c] border border-gray-300 dark:border-white/20 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/50 resize-none focus:outline-none focus:ring-2 focus:ring-lime-500/50 dark:focus:ring-[#013f2e]/30 focus:border-lime-500 dark:focus:border-[#013f2e]/50"
        />

        {/* Word count badge */}
        <div className={`absolute bottom-3 right-3 text-xs ${getWordCountColor()}`}>
          {wordCount} words
          {wordCount > 0 && wordCount < minWords && (
            <span className="ml-1">({minWords - wordCount} more needed)</span>
          )}
        </div>
      </div>

      {/* Validation Message */}
      <AnimatePresence>
        {validationMessage && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className={`mt-3 p-3 rounded-lg flex items-start gap-2 ${validationType === 'error'
              ? 'bg-red-500/10 text-red-500'
              : validationType === 'warning'
                ? 'bg-yellow-500/10 text-yellow-600'
                : 'bg-green-500/10 text-green-500'
              }`}
          >
            {validationType === 'error' && <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
            {validationType === 'warning' && <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
            {validationType === 'success' && <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />}
            <span className="text-sm">{validationMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
        <button
          onClick={handleClear}
          className="px-4 py-2 text-sm text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          Clear
        </button>

        <button
          onClick={handleSubmit}
          disabled={!isValid || isValidating}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg ${isValid
            ? 'bg-lime-500 dark:bg-[#013f2e] text-white hover:bg-lime-600 dark:hover:bg-[#02523c]'
            : 'bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-white/40 cursor-not-allowed'
            }`}
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={(e) => e.target === e.currentTarget && onCancel?.()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-2xl max-h-[80vh] bg-white dark:bg-[#141810] border-2 border-gray-200 dark:border-lime-500/40 rounded-2xl shadow-2xl p-6 overflow-auto"
        >
          {content}
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="w-full p-6 bg-[var(--bg-secondary)] rounded-xl">
      {content}
    </div>
  );
}

