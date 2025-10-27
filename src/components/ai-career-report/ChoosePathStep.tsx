'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, ArrowRight, Sparkles, X, Eye, Save } from 'lucide-react';
import { useAICareerReport } from '@/contexts/AICareerReportContext';

interface ChoosePathStepProps {
  onNext: () => void;
}

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
      
      const response = await fetch('/api/cv/parse', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to parse CV');
      }
      
      const result = await response.json();
      
      if (result.basics) {
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
      dispatch({ type: 'SET_UPLOAD_ERROR', payload: error instanceof Error ? error.message : 'An error occurred while parsing the CV' });
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

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-6xl">
          {/* Main Content */}
          <div className="text-center mb-8">
            <p className="text-white/80 text-lg">Choose how you'd like to start.</p>
          </div>

          {/* Main Content Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Upload CV Card */}
            <motion.div
              className={`bg-[#263326] rounded-xl p-8 transition-all duration-300 ${
                selectedOption === 'upload' ? 'ring-2 ring-[#80FF00]' : ''
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-[#80FF00] rounded-lg flex items-center justify-center mx-auto mb-6">
                  <Upload className="h-8 w-8 text-black" />
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-4">Upload CV</h3>
                <p className="text-white/80 mb-6">
                  Have a CV already? Upload it here and we'll parse the information to fill out the fields for you.
                </p>

                {selectedOption !== 'upload' ? (
                  <button
                    onClick={() => setSelectedOption('upload')}
                    className="bg-[#80FF00] text-black px-8 py-4 rounded-lg font-semibold text-lg hover:bg-[#70e600] transition-colors"
                  >
                    Choose File
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-white/40 rounded-lg p-8 text-center">
                      <Upload className="h-12 w-12 text-white/60 mx-auto mb-4" />
                      <h4 className="text-lg font-semibold text-white mb-2">Drag & drop your file here</h4>
                      <p className="text-white/60 mb-2">or</p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[#80FF00] font-bold underline hover:text-[#70e600] transition-colors"
                      >
                        browse files
                      </button>
                      <p className="text-white/60 text-sm mt-2">PDF, DOC, DOCX up to 10MB</p>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    {state.uploadError && (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <X className="h-4 w-4" />
                          {state.uploadError}
                        </div>
                      </div>
                    )}

                    {state.isUploading && (
                      <div className="p-4 bg-[#80FF00]/10 border border-[#80FF00]/20 rounded-lg text-[#80FF00] text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#80FF00]"></div>
                          Processing your CV...
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Start from Scratch Card */}
            <motion.div
              className={`bg-[#263326] rounded-xl p-8 transition-all duration-300 ${
                selectedOption === 'manual' ? 'ring-2 ring-[#80FF00]' : ''
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-[#80FF00] rounded-lg flex items-center justify-center mx-auto mb-6">
                  <FileText className="h-8 w-8 text-black" />
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-4">Start from Scratch</h3>
                <p className="text-white/80 mb-6">
                  Don't have a CV or want a fresh start? Fill out your information manually for a customized result.
                </p>

                <button
                  onClick={handleManualStart}
                  className="bg-[#80FF00] text-black px-8 py-4 rounded-lg font-semibold text-lg hover:bg-[#70e600] transition-colors flex items-center gap-3 mx-auto"
                >
                  Create Manually
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </motion.div>
          </div>
        </div>
    </div>
  );
}
