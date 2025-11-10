'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, ArrowRight, Sparkles, X, Eye, Save } from 'lucide-react';
import { useAICareerReport } from '@/contexts/AICareerReportContext';

interface ChoosePathStepProps {
  onNext: () => void;
}

// Parsing progress messages component with random interval display
const ParsingProgressMessages: React.FC = () => {
  const [visibleMessages, setVisibleMessages] = useState<Set<number>>(new Set());
  const messages = [
    'Extracting text from your document...',
    'Analyzing work experience and education...',
    'Identifying skills and achievements...',
    'Structuring your data for analysis...'
  ];

  useEffect(() => {
    // Show messages at random intervals
    const intervals: NodeJS.Timeout[] = [];
    
    messages.forEach((_, index) => {
      // Random delay between 0.5s and 2.5s for each message
      const delay = 500 + Math.random() * 2000;
      
      const timeout = setTimeout(() => {
        setVisibleMessages(prev => new Set([...prev, index]));
      }, delay);
      
      intervals.push(timeout);
    });

    return () => {
      intervals.forEach(interval => clearTimeout(interval));
    };
  }, []);

  return (
    <div className="p-6 bg-[#80FF00]/10 border border-[#80FF00]/30 rounded-xl text-[#80FF00] backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#80FF00]"></div>
          <span className="font-medium text-lg">Processing your CV...</span>
        </div>
        
        {/* Processing Steps - Show messages at random intervals */}
        <div className="w-full space-y-3 mt-4">
          {messages.map((message, index) => (
            <AnimatePresence key={index}>
              {visibleMessages.has(index) && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-3 text-sm"
                >
                  <div className="w-2 h-2 rounded-full bg-[#80FF00] animate-pulse"></div>
                  <span className="text-white/80">{message}</span>
                </motion.div>
              )}
            </AnimatePresence>
          ))}
        </div>
        
        <p className="text-white/50 text-xs mt-2">This usually takes 5-10 seconds</p>
      </div>
    </div>
  );
};

export default function ChoosePathStep({ onNext }: ChoosePathStepProps) {
  const { state, dispatch } = useAICareerReport();
  const [selectedOption, setSelectedOption] = useState<'upload' | 'manual' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    dispatch({ type: 'SET_UPLOADING', payload: true });
    dispatch({ type: 'SET_UPLOAD_ERROR', payload: null });

    try {
      // Use the same parsing logic as Master CV onboarding
      const formData = new FormData();
      formData.append('file', file);
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch('/api/cv/parse', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('CV parsing failed with response:', errorText);
        
        // Check if response is HTML (error page)
        if (errorText.trim().startsWith('<!DOCTYPE') || errorText.trim().startsWith('<html')) {
          throw new Error(`Server error: ${response.status} ${response.statusText}. Please try again later.`);
        }
        
        // Try to parse as JSON
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || 'Failed to parse CV');
        } catch (parseError) {
          // If it's not JSON, provide a generic error with more context
          throw new Error(`Failed to parse CV. Server returned: ${response.status} ${response.statusText}`);
        }
      }
      
      const result = await response.json();
      
      if (result.basics) {
        // Check if the parsing failed and error message is in basics.summary
        const errorMessagePattern = /Unable to extract text from this PDF/i;
        if (result.basics.summary && errorMessagePattern.test(result.basics.summary)) {
          // Extract the error message and show it in step 1
          const errorMessage = result.basics.summary.replace(/⚠️\s*/, '').trim();
          dispatch({ type: 'SET_UPLOAD_ERROR', payload: errorMessage });
          return;
        }
        
        // Use the same normalization logic as Master CV onboarding
        const normalizedResult = {
          ...result,
          work: normalizeWorkDates(result.work || []),
          education: normalizeEducationDates(result.education || []),
          projects: normalizeProjectDates(result.projects || [])
        };
        
        console.log('✅ ChoosePathStep - CV parsed successfully');
        console.log('📅 Work dates normalized:', normalizedResult.work);
        console.log('📅 Education dates normalized:', normalizedResult.education);
        console.log('📅 Project dates normalized:', normalizedResult.projects);
        
        // Update the AI Career Report context with normalized data
        dispatch({ type: 'SET_CV_DATA', payload: normalizedResult });
        dispatch({ type: 'SET_UPLOADED_FILE', payload: file });
        dispatch({ type: 'SET_COMPLETED_STEP', payload: 1 });
        
        // Auto-advance to Step 2
        setTimeout(() => {
          onNext();
        }, 1000);
      } else {
        dispatch({ type: 'SET_UPLOAD_ERROR', payload: 'Failed to parse CV data' });
      }
    } catch (error) {
      console.error('CV parsing error:', error);
      
      let errorMessage = 'An error occurred while parsing the CV';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out. Please try again with a smaller file.';
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('Server error')) {
          errorMessage = error.message;
        } else {
          errorMessage = error.message;
        }
      }
      
      dispatch({ type: 'SET_UPLOAD_ERROR', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_UPLOADING', payload: false });
    }
  };

  // Date normalization functions from Master CV onboarding
  const normalizeWorkDates = (work: any[]) => {
    return work.map(item => ({
      ...item,
      startDate: asMonth(item.startDate),
      endDate: asMonth(item.endDate)
    }));
  };

  const normalizeEducationDates = (education: any[]) => {
    return education.map(item => ({
      ...item,
      startDate: asMonth(item.startDate),
      endDate: asMonth(item.endDate)
    }));
  };

  const normalizeProjectDates = (projects: any[]) => {
    return projects.map(item => ({
      ...item,
      startDate: asMonth(item.startDate),
      endDate: asMonth(item.endDate)
    }));
  };

  const asMonth = (value: any): string => {
    if (!value || typeof value !== 'string') {
      return '';
    }
    const trimmed = value.trim();
    
    // Accept YYYY-MM, YYYY-MM-DD, YYYY
    const yyyyMm = trimmed.match(/^\d{4}-(0[1-9]|1[0-2])$/);
    if (yyyyMm) {
      return yyyyMm[0];
    }
    const yyyyMmDd = trimmed.match(/^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);
    if (yyyyMmDd) {
      const result = `${yyyyMmDd[1]}-${yyyyMmDd[2]}`;
      return result;
    }
    const yyyy = trimmed.match(/^(\d{4})$/);
    if (yyyy) {
      const result = `${yyyy[1]}-01`;
      return result;
    }
    
    // Try to parse other common date formats
    try {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const result = `${year}-${month}`;
        return result;
      }
    } catch (error) {
    }
    
    return '';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleManualStart = () => {
    dispatch({ type: 'SET_COMPLETED_STEP', payload: 1 });
    onNext();
  };

  // Handle click outside to collapse upload card
  const handleClickOutside = (e: React.MouseEvent) => {
    if (selectedOption === 'upload' && !state.isUploading) {
      const target = e.target as HTMLElement;
      // Check if click is outside the upload card
      if (!target.closest('.upload-card-container')) {
        setSelectedOption(null);
      }
    }
  };

  return (
    <div 
      className="h-screen bg-[#1A201A] flex items-center justify-center p-4 pt-4 lg:pt-8 overflow-hidden"
      onClick={handleClickOutside}
    >
      <div className="w-full max-w-7xl h-full flex flex-col justify-center">
        {/* Header Section */}
        <div className="text-center mb-4 lg:mb-8">
          
          {/* Step Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-4 lg:mb-6"
          >
            <div className="text-[#80FF00] font-bold text-lg mb-2">Step 1 of 3</div>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 lg:mb-6"
          >
            Choose Your Path to Success
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg lg:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed"
          >
            Get personalized career insights and recommendations tailored to your experience level and goals.
          </motion.p>
        </div>

        {/* Main Content Cards */}
        <div className={`grid gap-8 max-w-5xl mx-auto transition-all duration-500 ${
          selectedOption === 'upload' ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'
        }`}>
          {/* Upload CV Card */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ 
              opacity: 1, 
              x: 0
            }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className={`upload-card-container relative bg-[#263326] rounded-2xl p-8 transition-all duration-500 ${
              selectedOption === 'upload' ? 'ring-2 ring-[#80FF00] shadow-2xl shadow-[#80FF00]/20 lg:col-span-2' : 'hover:shadow-xl hover:shadow-black/20'
            }`}
            whileHover={selectedOption !== 'upload' ? { scale: 1.02, y: -5 } : {}}
            whileTap={{ scale: 0.98 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 rounded-2xl bg-[#80FF00]/5 opacity-50"></div>
            
            <div className="relative z-10">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-[#80FF00] to-[#70e600] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#80FF00]/30">
                  <Upload className="h-10 w-10 text-black" />
                </div>
                
                <h3 className="text-3xl font-bold text-white mb-4">Upload Your CV</h3>
                <p className="text-white/70 text-lg leading-relaxed mb-8">
                  Have an existing CV? Upload it and we'll analyze your experience to provide personalized career insights.
                </p>
              </div>

              {selectedOption !== 'upload' ? (
                <button
                  onClick={() => setSelectedOption('upload')}
                  className="w-full bg-gradient-to-r from-[#80FF00] to-[#70e600] text-black px-8 py-4 rounded-xl font-semibold text-lg hover:from-[#70e600] hover:to-[#60d600] transition-all duration-300 shadow-lg shadow-[#80FF00]/30 hover:shadow-xl hover:shadow-[#80FF00]/40"
                >
                  Choose File
                </button>
              ) : (
                <div className="space-y-6">
                  {/* Only show drag & drop section when not uploading */}
                  {!state.isUploading && (
                    <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center bg-white/5 backdrop-blur-sm">
                      <Upload className="h-16 w-16 text-white/40 mx-auto mb-4" />
                      <h4 className="text-xl font-semibold text-white mb-2">Drag & drop your file here</h4>
                      <p className="text-white/50 mb-4">or</p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[#80FF00] font-bold text-lg underline hover:text-[#70e600] transition-colors"
                      >
                        browse files
                      </button>
                      <p className="text-white/50 text-sm mt-4">PDF, DOC, DOCX up to 10MB</p>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {state.uploadError && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-center backdrop-blur-sm">
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2">
                          <X className="h-5 w-5" />
                          <span className="font-medium">Upload Error</span>
                        </div>
                        <div className="text-sm text-left whitespace-pre-line mt-2">
                          {state.uploadError}
                        </div>
                      </div>
                    </div>
                  )}

                  {state.isUploading && (
                    <ParsingProgressMessages />
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* Start from Scratch Card */}
          <AnimatePresence>
            {selectedOption !== 'upload' && (
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ 
                  opacity: 1,
                  x: 0,
                  scale: 1
                }}
                exit={{ 
                  opacity: 0,
                  x: 50,
                  scale: 0.8,
                  transition: { duration: 0.4 }
                }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className={`relative bg-[#263326] rounded-2xl p-8 transition-all duration-500 ${
                  selectedOption === 'manual' ? 'ring-2 ring-[#80FF00] shadow-2xl shadow-[#80FF00]/20' : 'hover:shadow-xl hover:shadow-black/20'
                }`}
                whileHover={{ scale: 1.02, y: -5 }}
                whileTap={{ scale: 0.98 }}
              >
            {/* Background Pattern */}
            <div className="absolute inset-0 rounded-2xl bg-[#80FF00]/5 opacity-50"></div>
            
            <div className="relative z-10">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-[#80FF00] to-[#70e600] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#80FF00]/30">
                  <FileText className="h-10 w-10 text-black" />
                </div>
                
                <h3 className="text-3xl font-bold text-white mb-4">Start Fresh</h3>
                <p className="text-white/70 text-lg leading-relaxed mb-8">
                  Don't have a CV yet? No problem! We'll guide you through creating one from scratch with our smart builder.
                </p>
              </div>

              <button
                onClick={handleManualStart}
                className="w-full bg-gradient-to-r from-[#80FF00] to-[#70e600] text-black px-8 py-4 rounded-xl font-semibold text-lg hover:from-[#70e600] hover:to-[#60d600] transition-all duration-300 shadow-lg shadow-[#80FF00]/30 hover:shadow-xl hover:shadow-[#80FF00]/40 flex items-center justify-center gap-3"
              >
                Create Manually
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Info - Only show when both cards are visible */}
        {selectedOption !== 'upload' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-center mt-8 lg:mt-12"
          >
            <p className="text-white/50 text-sm">
              Both options will lead to the same comprehensive AI career analysis
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
