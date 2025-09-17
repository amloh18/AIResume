'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { getThemeClasses } from '@/lib/utils/themeUtils';

interface CVParserSectionProps {
  onParsedData: (data: any) => void;
  userId: string;
  isLoading?: boolean;
}

const CVParserSection: React.FC<CVParserSectionProps> = ({
  onParsedData,
  userId,
  isLoading = false
}) => {
  const themeClasses = getThemeClasses;
  const [isDragOver, setIsDragOver] = useState(false);
  const [parseStatus, setParseStatus] = useState<'idle' | 'parsing' | 'success' | 'error'>('idle');
  const [parseResult, setParseResult] = useState<any>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return;

    setParseStatus('parsing');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);

      const response = await fetch('/api/cv/parse', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to parse CV');
      }

      const result = await response.json();
      setParseResult(result);
      setParseStatus('success');
      
      // Pass parsed data to parent
      if (onParsedData) {
        onParsedData(result.parsedData);
      }
    } catch (error) {
      console.error('CV parsing error:', error);
      setParseStatus('error');
    }
  }, [userId, onParsedData]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    
    if (file && (file.type === 'application/pdf' || file.type.includes('document'))) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const getStatusIcon = () => {
    switch (parseStatus) {
      case 'parsing':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-600" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Upload className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (parseStatus) {
      case 'parsing':
        return 'Parsing your CV...';
      case 'success':
        return 'CV parsed successfully!';
      case 'error':
        return 'Failed to parse CV. Please try again.';
      default:
        return 'Upload your existing CV to auto-fill information';
    }
  };

  return (
    <div className={`${themeClasses.card.base} rounded-lg border ${themeClasses.border.primary} overflow-hidden`}>
      {/* Header - Compact */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className={`text-base font-semibold ${themeClasses.text.primary}`}>
              CV Parser
            </h3>
            <p className={`text-xs ${themeClasses.text.tertiary}`}>
              Upload existing CV to auto-fill
            </p>
          </div>
        </div>
      </div>

      {/* Upload Area - Compact */}
      <div className="p-4">
        <div
          className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all duration-200 ${
            isDragOver
              ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/10'
              : parseStatus === 'success'
              ? 'border-green-400 bg-green-50 dark:bg-green-900/10'
              : parseStatus === 'error'
              ? 'border-red-400 bg-red-50 dark:bg-red-900/10'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
        >
          <input
            type="file"
            accept=".pdf,.doc,.docx,.rtf"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={parseStatus === 'parsing'}
          />
          
          <div className="space-y-3">
            <div className="flex justify-center">
              {getStatusIcon()}
            </div>
            
            <div>
              <p className={`text-sm font-medium ${themeClasses.text.primary}`}>
                {getStatusText()}
              </p>
              {parseStatus === 'idle' && (
                <p className={`text-xs ${themeClasses.text.tertiary} mt-1`}>
                  Drag and drop or click to browse
                </p>
              )}
            </div>

            {parseStatus === 'idle' && (
              <div className="flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span>PDF</span>
                <span>•</span>
                <span>DOC</span>
                <span>•</span>
                <span>DOCX</span>
              </div>
            )}

            {parseStatus === 'success' && parseResult && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                  Extracted Information:
                </h4>
                <div className="text-xs text-green-700 dark:text-green-300 space-y-1">
                  {parseResult.extractedFields?.map((field: string, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3" />
                      <span>{field}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {parseStatus === 'error' && (
              <div className="mt-4">
                <motion.button
                  onClick={() => setParseStatus('idle')}
                  className={`px-4 py-2 text-sm ${themeClasses.button.secondary} rounded-lg transition-colors`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Try Again
                </motion.button>
              </div>
            )}
          </div>
        </div>

        {/* Tips */}
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <h4 className={`text-sm font-medium ${themeClasses.text.primary} mb-2`}>
            💡 Parser Tips
          </h4>
          <ul className={`text-sm ${themeClasses.text.secondary} space-y-1`}>
            <li>• Use a well-formatted CV for best results</li>
            <li>• Ensure text is selectable (not scanned images)</li>
            <li>• Review and edit parsed information</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CVParserSection;