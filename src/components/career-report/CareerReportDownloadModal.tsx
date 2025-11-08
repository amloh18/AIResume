'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, FileText } from 'lucide-react';

export type ReportFormatType = 'pdf' | 'html';

interface CareerReportDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: (format: ReportFormatType) => void;
  isDownloading?: boolean;
}

const CareerReportDownloadModal: React.FC<CareerReportDownloadModalProps> = ({
  isOpen,
  onClose,
  onDownload,
  isDownloading = false
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ReportFormatType>('pdf');

  const handleDownload = () => {
    onDownload(selectedFormat);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl shadow-sm w-[90%] max-w-md max-h-[85vh] overflow-hidden flex flex-col relative"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 z-10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              disabled={isDownloading}
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div className="p-8 pb-6 flex-shrink-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
                  <Download className="w-5 h-5 text-black" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Download Career Report
                </h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Select the format you'd like to download your career report in.
              </p>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto min-h-0 px-8">
              <div className="space-y-4 pb-4">
                {/* Format Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Select Format
                  </label>
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedFormat('pdf')}
                      disabled={isDownloading}
                      className={`w-full p-4 rounded-lg border-2 transition-all ${
                        selectedFormat === 'pdf'
                          ? 'border-[#80FF00] bg-[#80FF00]/10 dark:bg-[#80FF00]/20'
                          : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                      } ${isDownloading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded flex items-center justify-center ${
                          selectedFormat === 'pdf'
                            ? 'bg-[#80FF00]'
                            : 'bg-gray-100 dark:bg-[#232f1c]'
                        }`}>
                          <FileText className={`w-5 h-5 ${
                            selectedFormat === 'pdf' ? 'text-black' : 'text-gray-600 dark:text-gray-400'
                          }`} />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-semibold text-gray-900 dark:text-white">PDF</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Best for printing and sharing
                          </div>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setSelectedFormat('html')}
                      disabled={isDownloading}
                      className={`w-full p-4 rounded-lg border-2 transition-all ${
                        selectedFormat === 'html'
                          ? 'border-[#80FF00] bg-[#80FF00]/10 dark:bg-[#80FF00]/20'
                          : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                      } ${isDownloading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded flex items-center justify-center ${
                          selectedFormat === 'html'
                            ? 'bg-[#80FF00]'
                            : 'bg-gray-100 dark:bg-[#232f1c]'
                        }`}>
                          <FileText className={`w-5 h-5 ${
                            selectedFormat === 'html' ? 'text-black' : 'text-gray-600 dark:text-gray-400'
                          }`} />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-semibold text-gray-900 dark:text-white">HTML</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            View in browser or email
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Info Note */}
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    <strong>Note:</strong> The downloaded report will be in shareable format (third person) suitable for sending to mentors, coaches, or recruiters.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 p-8 pt-4 border-t border-gray-200 dark:border-white/10 flex-shrink-0">
              <button
                onClick={onClose}
                disabled={isDownloading}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#232f1c] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <motion.button
                onClick={handleDownload}
                disabled={isDownloading}
                className="px-6 py-2 bg-[rgb(129,255,0)] hover:bg-[rgb(110,230,0)] text-black rounded-md font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                whileHover={{ scale: isDownloading ? 1 : 1.05 }}
                whileTap={{ scale: isDownloading ? 1 : 0.95 }}
              >
                {isDownloading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CareerReportDownloadModal;
