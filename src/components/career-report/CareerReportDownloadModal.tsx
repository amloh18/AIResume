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
  const [downloadingFormat, setDownloadingFormat] = useState<ReportFormatType | null>(null);

  const handleDirectDownload = (format: ReportFormatType) => {
    setDownloadingFormat(format);
    onDownload(format);
    // Reset state after a delay or rely on parent to handle close/completion
    setTimeout(() => setDownloadingFormat(null), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            className="bg-[#161616] rounded-3xl shadow-2xl w-[90%] max-w-md overflow-hidden"
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - Lime Green Card */}
            <div className="mx-5 mt-5 mb-6">
              <div className="bg-[#80FF00] rounded-2xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-black/10 rounded-xl flex items-center justify-center shrink-0">
                  <Download className="w-6 h-6 text-black" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-black leading-tight">
                    Career Report
                  </h3>
                  <p className="text-sm font-medium text-black/70 truncate">
                    Download your analysis
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 flex items-center justify-center hover:bg-black/10 rounded-xl transition-colors shrink-0"
                >
                  <X className="w-6 h-6 text-black" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-5 pb-6 space-y-4">
              {/* Section Label */}
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em]">
                  SELECT FORMAT
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* PDF Button */}
                <button
                  onClick={() => handleDirectDownload('pdf')}
                  disabled={isDownloading}
                  className={`group relative flex flex-col items-center justify-center gap-4 p-6 rounded-3xl transition-all duration-300 ${!isDownloading
                    ? 'bg-[#222] hover:bg-[#2A2A2A] hover:shadow-2xl hover:shadow-black/50 active:scale-[0.98]'
                    : 'bg-[#222] opacity-50 cursor-not-allowed'
                    }`}
                >
                  <FileText
                    className={`w-8 h-8 transition-colors duration-300 ${isDownloading ? 'text-gray-500' : 'text-[#80FF00] group-hover:drop-shadow-[0_0_8px_rgba(128,255,0,0.5)]'}`}
                    strokeWidth={1.5}
                  />
                  <div className="text-center space-y-1">
                    <span className="block text-base font-bold text-gray-100">PDF Report</span>
                    <span className="block text-xs font-medium text-gray-500 group-hover:text-gray-400 transition-colors">Best for printing</span>
                  </div>
                  {downloadingFormat === 'pdf' && (
                    <div className="absolute inset-0 bg-[#0D0D0D]/80 backdrop-blur-sm rounded-3xl flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-[#80FF00] border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </button>

                {/* HTML Button */}
                <button
                  onClick={() => handleDirectDownload('html')}
                  disabled={isDownloading}
                  className={`group relative flex flex-col items-center justify-center gap-4 p-6 rounded-3xl transition-all duration-300 ${!isDownloading
                    ? 'bg-[#222] hover:bg-[#2A2A2A] hover:shadow-2xl hover:shadow-black/50 active:scale-[0.98]'
                    : 'bg-[#222] opacity-50 cursor-not-allowed'
                    }`}
                >
                  <FileText
                    className={`w-8 h-8 transition-colors duration-300 ${isDownloading ? 'text-gray-500' : 'text-[#80FF00] group-hover:drop-shadow-[0_0_8px_rgba(128,255,0,0.5)]'}`}
                    strokeWidth={1.5}
                  />
                  <div className="text-center space-y-1">
                    <span className="block text-base font-bold text-gray-100">HTML Report</span>
                    <span className="block text-xs font-medium text-gray-500 group-hover:text-gray-400 transition-colors">View in browser</span>
                  </div>
                  {downloadingFormat === 'html' && (
                    <div className="absolute inset-0 bg-[#0D0D0D]/80 backdrop-blur-sm rounded-3xl flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-[#80FF00] border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </button>
              </div>

              {/* Info Note */}
              <div className="p-4 bg-[#222] rounded-2xl flex gap-3">
                <div className="w-1 bg-[#80FF00] rounded-full shrink-0" />
                <p className="text-xs text-gray-400 leading-relaxed">
                  <strong className="text-gray-200">Note:</strong> The downloaded report is generated in a third-person professional format, making it ideal for sharing with mentors, coaches, or recruiters.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CareerReportDownloadModal;
