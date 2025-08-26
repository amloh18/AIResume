'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { AICVParser } from '@/lib/services/aiCVParser';

interface ParseToolSectionProps {
  onCVParsed: (data: any) => void;
  isActive: boolean;
}

const ParseToolSection: React.FC<ParseToolSectionProps> = ({ onCVParsed, isActive }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'parsing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadStatus('uploading');
    setErrorMessage('');
    setSuccessMessage('');

    try {
      console.log('🔍 ParseTool - Starting CV parsing for:', file.name);
      
      // Parse the CV using AI parser
      const result = await AICVParser.parseCV(file);
      
      if (result.success && result.data) {
        setUploadStatus('success');
        setSuccessMessage('CV parsed successfully! Data has been loaded.');
        
        // Pass the parsed data to the parent component
        onCVParsed(result.data);
        
        // Auto-hide success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage('');
          setUploadStatus('idle');
        }, 3000);
      } else {
        setUploadStatus('error');
        setErrorMessage(result.error || 'Failed to parse CV');
      }
    } catch (error) {
      console.error('❌ ParseTool - Error parsing CV:', error);
      setUploadStatus('error');
      setErrorMessage('An error occurred while parsing the CV');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-600/20 rounded-lg">
                <Upload size={20} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-medium">Parse Existing CV</h3>
                <p className="text-gray-400 text-sm">Upload your CV to auto-fill the form</p>
              </div>
            </div>

            {/* Upload Area */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={openFileDialog}
              className={`
                border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200
                ${uploadStatus === 'uploading' || uploadStatus === 'parsing'
                  ? 'border-blue-400 bg-blue-400/10'
                  : uploadStatus === 'success'
                  ? 'border-green-400 bg-green-400/10'
                  : uploadStatus === 'error'
                  ? 'border-red-400 bg-red-400/10'
                  : 'border-gray-600 hover:border-gray-500 hover:bg-gray-700/50'
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />

              <AnimatePresence mode="wait">
                {uploadStatus === 'idle' && (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3"
                  >
                    <div className="w-12 h-12 mx-auto bg-gray-700 rounded-lg flex items-center justify-center">
                      <FileText size={24} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Drop your CV here</p>
                      <p className="text-gray-400 text-sm">or click to browse</p>
                    </div>
                    <p className="text-gray-500 text-xs">Supports PDF, DOCX, DOC, TXT</p>
                  </motion.div>
                )}

                {uploadStatus === 'uploading' && (
                  <motion.div
                    key="uploading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3"
                  >
                    <div className="w-12 h-12 mx-auto bg-blue-600/20 rounded-lg flex items-center justify-center">
                      <Loader2 size={24} className="text-blue-400 animate-spin" />
                    </div>
                    <p className="text-blue-400 font-medium">Uploading...</p>
                  </motion.div>
                )}

                {uploadStatus === 'parsing' && (
                  <motion.div
                    key="parsing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3"
                  >
                    <div className="w-12 h-12 mx-auto bg-blue-600/20 rounded-lg flex items-center justify-center">
                      <Loader2 size={24} className="text-blue-400 animate-spin" />
                    </div>
                    <p className="text-blue-400 font-medium">Parsing CV...</p>
                    <p className="text-gray-400 text-sm">Extracting information with AI</p>
                  </motion.div>
                )}

                {uploadStatus === 'success' && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3"
                  >
                    <div className="w-12 h-12 mx-auto bg-green-600/20 rounded-lg flex items-center justify-center">
                      <CheckCircle size={24} className="text-green-400" />
                    </div>
                    <p className="text-green-400 font-medium">Success!</p>
                    <p className="text-gray-400 text-sm">CV parsed and loaded</p>
                  </motion.div>
                )}

                {uploadStatus === 'error' && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3"
                  >
                    <div className="w-12 h-12 mx-auto bg-red-600/20 rounded-lg flex items-center justify-center">
                      <AlertCircle size={24} className="text-red-400" />
                    </div>
                    <p className="text-red-400 font-medium">Error</p>
                    <p className="text-gray-400 text-sm">{errorMessage}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Success Message */}
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-3 p-3 bg-green-600/20 border border-green-600/30 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-400" />
                  <span className="text-green-400 text-sm">{successMessage}</span>
                </div>
              </motion.div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-3 p-3 bg-red-600/20 border border-red-600/30 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-400" />
                  <span className="text-red-400 text-sm">{errorMessage}</span>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ParseToolSection;
