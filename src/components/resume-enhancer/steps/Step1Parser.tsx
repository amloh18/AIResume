'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, Edit3, CheckCircle2, Loader2 } from 'lucide-react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { sanitizeErrorMessage } from '@/lib/api/error-handler';

interface Step1ParserProps {
  onComplete: (cvData: UnifiedCVDataStructure) => void;
}

export default function Step1Parser({ onComplete }: Step1ParserProps) {
  const { state, dispatch } = useResumeEnhancer();
  const [parseMethod, setParseMethod] = useState<'upload' | 'manual' | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'parsing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [parsingStep, setParsingStep] = useState<string>('');
  const [currentParsingStepIndex, setCurrentParsingStepIndex] = useState<number>(-1);
  const [parsingSteps] = useState([
    { label: 'Extracting text...', progress: 20 },
    { label: 'Structuring sections...', progress: 40 },
    { label: 'Identifying personal info...', progress: 60 },
    { label: 'Parsing work experience...', progress: 75 },
    { label: 'Extracting education...', progress: 85 },
    { label: 'Finalizing structure...', progress: 95 }
  ]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus('uploading');
    setUploadProgress(0);
    setErrorMessage('');
    setCurrentParsingStepIndex(-1);

    let uploadInterval: NodeJS.Timeout | null = null;
    let parsingInterval: NodeJS.Timeout | null = null;

    try {
      // Simulate upload progress
      uploadInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 20) {
            if (uploadInterval) clearInterval(uploadInterval);
            return 20;
          }
          return prev + 5;
        });
      }, 50);

      // Wait a bit for upload, then start parsing
      setTimeout(() => {
        if (uploadInterval) clearInterval(uploadInterval);
        setUploadStatus('parsing');
        
        // Simulate parsing steps with progress
        let currentStepIndex = 0;
        setCurrentParsingStepIndex(0);
        parsingInterval = setInterval(() => {
          if (currentStepIndex < parsingSteps.length) {
            const step = parsingSteps[currentStepIndex];
            setParsingStep(step.label);
            setUploadProgress(step.progress);
            setCurrentParsingStepIndex(currentStepIndex);
            currentStepIndex++;
          } else {
            if (parsingInterval) clearInterval(parsingInterval);
            setCurrentParsingStepIndex(parsingSteps.length);
          }
        }, 400);
      }, 500);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/cv/parse', {
        method: 'POST',
        body: formData
      });

      // Clear intervals when API call completes
      if (uploadInterval) clearInterval(uploadInterval);
      if (parsingInterval) clearInterval(parsingInterval);

      if (!response.ok) {
        const errorData = await response.json();
        const rawError = errorData.error || 'Failed to parse CV';
        throw new Error(sanitizeErrorMessage(rawError, 'Failed to parse CV'));
      }

      const result = await response.json();
      
      setUploadProgress(100);
      setParsingStep('Complete!');
      setUploadStatus('success');

      // Update context with parsed data
      dispatch({ type: 'SET_CV_DATA', payload: result });

      // Wait a moment to show success, then complete
      setTimeout(() => {
        onComplete(result);
      }, 1000);

    } catch (error) {
      // Clear intervals on error
      if (uploadInterval) clearInterval(uploadInterval);
      if (parsingInterval) clearInterval(parsingInterval);
      
      console.error('CV parsing error:', error);
      setUploadStatus('error');
      setErrorMessage(sanitizeErrorMessage(error, 'Failed to parse CV'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleManualEntry = () => {
    // For manual entry, use default empty CV data
    // User will fill in forms in next steps
    dispatch({ type: 'SET_CV_DATA', payload: state.cvData });
    onComplete(state.cvData);
  };

  if (parseMethod === null) {
    return (
      <div className="flex items-center justify-center min-h-[500px] mt-8">
        <div className="w-full max-w-4xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-[color:var(--text-primary)] mb-4">
              Let's Build Your Resume
            </h2>
            <p className="text-lg text-[color:var(--text-secondary)]">
              Choose how you'd like to get started
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Upload Option */}
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              onClick={() => setParseMethod('upload')}
              className="group relative bg-[#141810] rounded-2xl p-8 shadow-lg shadow-black/10 dark:shadow-black/40 transition-all duration-300 hover:shadow-xl hover:shadow-black/20 dark:hover:shadow-black/50 hover:scale-105"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-[#80FF00]/15 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8 text-[#80FF00]" />
                </div>
                <h3 className="text-xl font-semibold text-[color:var(--text-primary)]">
                  Upload Existing Resume
                </h3>
                <p className="text-[color:var(--text-secondary)]">
                  Upload your current resume and we'll extract the information automatically
                </p>
                <div className="flex flex-wrap gap-2 justify-center pt-2">
                  <span className="text-xs px-3 py-1 bg-[var(--bg-tertiary)] rounded-full text-[color:var(--text-secondary)]">
                    PDF
                  </span>
                  <span className="text-xs px-3 py-1 bg-[var(--bg-tertiary)] rounded-full text-[color:var(--text-secondary)]">
                    DOCX
                  </span>
                  <span className="text-xs px-3 py-1 bg-[var(--bg-tertiary)] rounded-full text-[color:var(--text-secondary)]">
                    Image
                  </span>
                </div>
              </div>
            </motion.button>

            {/* Manual Entry Option */}
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => handleManualEntry()}
              className="group relative bg-[#141810] rounded-2xl p-8 shadow-lg shadow-black/10 dark:shadow-black/40 transition-all duration-300 hover:shadow-xl hover:shadow-black/20 dark:hover:shadow-black/50 hover:scale-105"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-[#80FF00]/15 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Edit3 className="w-8 h-8 text-[#80FF00]" />
                </div>
                <h3 className="text-xl font-semibold text-[color:var(--text-primary)]">
                  Start from Scratch
                </h3>
                <p className="text-[color:var(--text-secondary)]">
                  Build your resume from the ground up with our guided forms
                </p>
                <div className="flex items-center gap-2 justify-center pt-2">
                  <span className="text-xs px-3 py-1 bg-[color:var(--accent-primary)]/15 rounded-full text-[color:var(--accent-primary)]">
                    Recommended for fresh starts
                  </span>
                </div>
              </div>
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  if (parseMethod === 'upload') {
    return (
      <div className="flex items-center justify-center min-h-[500px] mt-8">
        <div className="w-full max-w-2xl px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#141810] rounded-2xl shadow-xl shadow-black/10 dark:shadow-black/40 p-12"
          >
            {uploadStatus === 'idle' && (
              <div className="text-center">
                <div className="w-20 h-20 bg-[#80FF00]/15 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-10 h-10 text-[#80FF00]" />
                </div>
                <h3 className="text-2xl font-bold text-[color:var(--text-primary)] mb-4">
                  Upload Your Resume
                </h3>
                <p className="text-[color:var(--text-secondary)] mb-8">
                  Drag and drop your file here or click to browse
                </p>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isUploading}
                  />
                  <span className="inline-block px-8 py-3 bg-[#80FF00] hover:bg-[#70e600] text-black rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105">
                    Choose File
                  </span>
                </label>
                <p className="text-sm text-[color:var(--text-tertiary)] mt-4">
                  Supports PDF, DOCX, and image files (max 10MB)
                </p>
                <button
                  onClick={() => setParseMethod(null)}
                  className="mt-6 text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
                >
                  ← Back to options
                </button>
              </div>
            )}

            {(uploadStatus === 'uploading' || uploadStatus === 'parsing') && (
              <div className="text-center">
                <div className="w-20 h-20 bg-[#80FF00]/15 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                  <FileText className="w-10 h-10 text-[#80FF00]" />
                </div>
                <h3 className="text-2xl font-bold text-[color:var(--text-primary)] mb-6">
                  {uploadStatus === 'uploading' ? 'Uploading...' : 'Parsing Your Resume...'}
                </h3>
                
                {uploadStatus === 'parsing' && (
                  <div className="mb-6">
                    <ul className="space-y-3 text-left max-w-md mx-auto">
                      {parsingSteps.map((step, index) => {
                        const isCompleted = index < currentParsingStepIndex;
                        const isCurrent = index === currentParsingStepIndex;
                        const isPending = index > currentParsingStepIndex;
                        
                        return (
                          <li
                            key={index}
                            className={`flex items-center gap-3 text-sm transition-colors ${
                              isCompleted
                                ? 'text-[#80FF00]'
                                : isCurrent
                                ? 'text-[#80FF00] font-medium'
                                : 'text-[color:var(--text-tertiary)]'
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-5 h-5 text-[#80FF00] flex-shrink-0" />
                            ) : isCurrent ? (
                              <Loader2 className="w-5 h-5 text-[#80FF00] flex-shrink-0 animate-spin" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-[color:var(--text-tertiary)] flex-shrink-0" />
                            )}
                            <span>{step.label}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                
                <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-2 mb-4 overflow-hidden">
                  <div
                    className="bg-[#80FF00] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-[color:var(--text-secondary)] text-sm">
                  {uploadProgress}% complete
                </p>
              </div>
            )}

            {uploadStatus === 'success' && (
              <div className="text-center">
                <div className="w-20 h-20 bg-[#80FF00]/15 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-10 h-10 text-[#80FF00]" />
                </div>
                <h3 className="text-2xl font-bold text-[color:var(--text-primary)] mb-4">
                  Successfully Parsed!
                </h3>
                <p className="text-[color:var(--text-secondary)]">
                  Moving to the next step...
                </p>
              </div>
            )}

            {uploadStatus === 'error' && (
              <div className="text-center">
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-10 h-10 text-red-400" />
                </div>
                <h3 className="text-2xl font-bold text-[color:var(--text-primary)] mb-4">
                  Upload Failed
                </h3>
                <p className="text-red-400 mb-6">
                  {errorMessage}
                </p>
                <button
                  onClick={() => {
                    setUploadStatus('idle');
                    setErrorMessage('');
                    setUploadProgress(0);
                  }}
                  className="px-6 py-2 bg-[#80FF00] hover:bg-[#70e600] text-black rounded-lg font-medium transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  return null;
}

