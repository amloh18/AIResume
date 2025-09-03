'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, User, Building, Calendar } from 'lucide-react';

interface CoverLetterPreviewProps {
  content: string;
  cvData: any;
  jobData: any;
  selectedCVData: any;
}

const CoverLetterPreview: React.FC<CoverLetterPreviewProps> = ({
  content,
  cvData,
  jobData,
  selectedCVData
}) => {
  const formatDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="h-full bg-white dark:bg-gray-900 p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Cover Letter Preview
              </h1>
            </div>
          </div>
          
          {/* Document Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">From</span>
              </div>
              <div className="text-sm text-gray-900 dark:text-white">
                {cvData?.basics?.name || 'Your Name'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {cvData?.basics?.email || 'your.email@example.com'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {cvData?.basics?.phone || '+1 (555) 123-4567'}
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Building className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">To</span>
              </div>
              <div className="text-sm text-gray-900 dark:text-white">
                Hiring Manager
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {jobData?.company || 'Company Name'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {jobData?.location || 'Company Location'}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 mb-4">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {formatDate()}
            </span>
          </div>
        </div>

        {/* Cover Letter Content */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8">
          {content ? (
            <div className="prose prose-gray dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-gray-900 dark:text-white leading-relaxed">
                {content}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Content Yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Start writing your cover letter or use AI to generate one.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Generated with Circle CV Studio</p>
        </div>
      </div>
    </div>
  );
};

export default CoverLetterPreview;
