'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  X,
  Loader2,
  Sparkles,
  Eye,
  RefreshCw
} from 'lucide-react';
import { AICVParser } from '@/lib/services/aiCVParser';

interface CVParserButtonProps {
  onDataParsed: (parsedData: any) => void;
  className?: string;
}

const CVParserButton: React.FC<CVParserButtonProps> = ({ 
  onDataParsed, 
  className = '' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    setIsParsing(true);
    setError(null);
    setParsedData(null);
    setPreviewData(null);

    try {
      console.log('Starting CV parsing for file:', file.name);
      const result = await AICVParser.parseCV(file);
      
      if (result.success && result.data) {
        console.log('CV parsing successful:', result.data);
        setParsedData(result.data);
        
        // Create preview data for user review
        const preview = {
          name: result.data.basics?.name || 'Not found',
          email: result.data.basics?.email || 'Not found',
          phone: result.data.basics?.phone || 'Not found',
          title: result.data.basics?.label || 'Not found',
          summary: result.data.basics?.summary || 'Not found',
          workExperience: result.data.work?.length || 0,
          education: result.data.education?.length || 0,
          skills: result.data.skills?.length || 0
        };
        setPreviewData(preview);
      } else {
        setError(result.error || 'Failed to parse CV');
      }
    } catch (err) {
      console.error('CV parsing error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleApplyData = () => {
    if (parsedData) {
      onDataParsed(parsedData);
      setIsOpen(false);
      setParsedData(null);
      setPreviewData(null);
      setError(null);
    }
  };

  const handleReset = () => {
    setParsedData(null);
    setPreviewData(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl ${className}`}
      >
        <Upload className="w-4 h-4" />
        <span className="font-medium">Parse CV</span>
        <Sparkles className="w-4 h-4" />
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      CV Parser
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      Upload your CV to automatically fill the form fields
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                {!parsedData && !isParsing && (
                  <div className="space-y-6">
                    {/* Upload Area */}
                    <div
                      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                        isDragging
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                      }`}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                    >
                      <div className="space-y-4">
                        <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <Upload className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Drop your CV here
                          </h3>
                          <p className="text-gray-600 dark:text-gray-300 mb-4">
                            Or click to browse files
                          </p>
                          <button
                            onClick={openFileDialog}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Choose File
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Supports PDF, DOC, DOCX, RTF, and TXT files up to 10MB
                        </p>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                          What gets parsed:
                        </h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                          <li>• Personal information</li>
                          <li>• Work experience</li>
                          <li>• Education details</li>
                          <li>• Skills and competencies</li>
                          <li>• Professional summary</li>
                        </ul>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                          AI-powered extraction:
                        </h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                          <li>• Smart text recognition</li>
                          <li>• Structured data mapping</li>
                          <li>• Format validation</li>
                          <li>• Error correction</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Loading State */}
                {isParsing && (
                  <div className="text-center py-12">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4"
                    >
                      <Loader2 className="w-8 h-8 text-white" />
                    </motion.div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Parsing your CV...
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Our AI is extracting and structuring your information
                    </p>
                  </div>
                )}

                {/* Error State */}
                {error && (
                  <div className="text-center py-8">
                    <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                      <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Parsing Failed
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      {error}
                    </p>
                    <button
                      onClick={handleReset}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                )}

                {/* Preview Data */}
                {previewData && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        CV Parsed Successfully!
                      </h3>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                        Extracted Information Preview:
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Name:</span>
                          <span className="ml-2 text-gray-900 dark:text-white">{previewData.name}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Email:</span>
                          <span className="ml-2 text-gray-900 dark:text-white">{previewData.email}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Phone:</span>
                          <span className="ml-2 text-gray-900 dark:text-white">{previewData.phone}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Title:</span>
                          <span className="ml-2 text-gray-900 dark:text-white">{previewData.title}</span>
                        </div>
                        <div className="md:col-span-2">
                          <span className="font-medium text-gray-700 dark:text-gray-300">Summary:</span>
                          <p className="mt-1 text-gray-900 dark:text-white text-xs">
                            {previewData.summary.length > 100 
                              ? `${previewData.summary.substring(0, 100)}...` 
                              : previewData.summary}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                        Additional Sections Found:
                      </h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {previewData.workExperience}
                          </div>
                          <div className="text-blue-700 dark:text-blue-300">Work Experience</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {previewData.education}
                          </div>
                          <div className="text-blue-700 dark:text-blue-300">Education</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {previewData.skills}
                          </div>
                          <div className="text-blue-700 dark:text-blue-300">Skills</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {parsedData ? 'Review the extracted data and apply to your CV' : 'Upload a CV file to get started'}
                </div>
                <div className="flex items-center gap-3">
                  {parsedData && (
                    <button
                      onClick={handleReset}
                      className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Reset
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  {parsedData && (
                    <button
                      onClick={handleApplyData}
                      className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Apply to CV
                    </button>
                  )}
                </div>
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.rtf,.txt"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CVParserButton;
