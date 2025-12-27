'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Download as DownloadIcon, Lock } from 'lucide-react';
import { CVJourneyLookupService } from '@/lib/services/cvJourneyLookupService';
import { useSession } from 'next-auth/react';
import { getPlanLimits } from '@/lib/utils/subscription-helpers';

export type DocumentType = 'cv' | 'coverLetter' | 'cvAndCoverLetter' | 'all';
export type FormatType = 'pdf' | 'docx' | 'doc';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: (documentType: DocumentType, format: FormatType) => void;
  hasCV?: boolean;
  hasCoverLetter?: boolean;
  isDownloading?: boolean;
  cvId?: string;
  coverLetterId?: string;
  userId?: string;
}

const DownloadModal: React.FC<DownloadModalProps> = ({
  isOpen,
  onClose,
  onDownload,
  hasCV = true,
  hasCoverLetter = false,
  isDownloading = false,
  cvId,
  coverLetterId,
  userId
}) => {
  const { data: session } = useSession();
  const [selectedDocument, setSelectedDocument] = useState<DocumentType>('cv');
  const [selectedFormat, setSelectedFormat] = useState<FormatType>('pdf');
  const [journeyInfo, setJourneyInfo] = useState<{
    hasCV: boolean;
    hasCoverLetter: boolean;
    journeyId?: string;
  }>({
    hasCV: hasCV,
    hasCoverLetter: hasCoverLetter
  });
  const [loadingJourney, setLoadingJourney] = useState(false);

  // Check user's plan for DOCX export access
  const userPlanKey = (session?.user as { currentPlanKey?: string })?.currentPlanKey || 'free';
  const canExportDocx = getPlanLimits(userPlanKey).docxExport;

  // Fetch journey info when modal opens
  useEffect(() => {
    const fetchJourneyInfo = async () => {
      if (!isOpen) return;

      const effectiveUserId = userId || session?.user?.id;
      if (!effectiveUserId) {
        // Use provided hasCV/hasCoverLetter if no userId
        setJourneyInfo({ hasCV, hasCoverLetter });
        return;
      }

      setLoadingJourney(true);
      try {
        let journeyData = null;

        // Try to find journey by CV ID
        if (cvId) {
          journeyData = await CVJourneyLookupService.findJourneyByCVId(cvId, effectiveUserId);
        }

        // Try to find journey by Cover Letter ID if not found
        if (!journeyData && coverLetterId) {
          journeyData = await CVJourneyLookupService.findJourneyByCoverLetterId(coverLetterId, effectiveUserId);
        }

        if (journeyData) {
          // Journey found - use journey data to determine available documents
          setJourneyInfo({
            hasCV: !!journeyData.cvId,
            hasCoverLetter: !!journeyData.coverLetterId,
            journeyId: journeyData.journeyId
          });
        } else {
          // No journey found - use direct document availability
          setJourneyInfo({
            hasCV: hasCV || !!cvId,
            hasCoverLetter: hasCoverLetter || !!coverLetterId
          });
        }
      } catch (error) {
        console.error('Error fetching journey info:', error);
        // Fallback to provided values
        setJourneyInfo({
          hasCV: hasCV || !!cvId,
          hasCoverLetter: hasCoverLetter || !!coverLetterId
        });
      } finally {
        setLoadingJourney(false);
      }
    };

    fetchJourneyInfo();
  }, [isOpen, cvId, coverLetterId, userId, session?.user?.id, hasCV, hasCoverLetter]);

  const handleDownload = () => {
    onDownload(selectedDocument, selectedFormat);
  };

  const documentOptions = [
    { value: 'cv' as DocumentType, label: 'CV', disabled: !journeyInfo.hasCV },
    { value: 'coverLetter' as DocumentType, label: 'Cover Letter', disabled: !journeyInfo.hasCoverLetter },
    { value: 'cvAndCoverLetter' as DocumentType, label: 'CV & Cover Letter (Separate Files)', disabled: !journeyInfo.hasCV || !journeyInfo.hasCoverLetter },
    { value: 'all' as DocumentType, label: 'Download All (ZIP)', disabled: !journeyInfo.hasCV || !journeyInfo.hasCoverLetter }
  ];

  const formatOptions: FormatType[] = ['pdf', 'docx', 'doc'];

  const getFormatLabel = (format: FormatType) => {
    return format.toUpperCase();
  };

  const getDownloadButtonText = () => {
    if (selectedDocument === 'all') {
      return 'Download ZIP';
    }
    return `Download ${getFormatLabel(selectedFormat)}`;
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/70 z-[60]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl shadow-sm w-[90%] max-w-md max-h-[85vh] overflow-hidden flex flex-col relative"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
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
                    <DownloadIcon className="w-5 h-5 text-black" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Download Your Documents
                  </h2>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Select the files and format you'd like to download.
                </p>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto min-h-0 px-8">
                {/* Section 1: Choose Document(s) */}
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">
                    1. Choose Document(s)
                    {loadingJourney && (
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(Loading linked documents...)</span>
                    )}
                  </h3>
                  <div className="space-y-4">
                    {documentOptions.map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${selectedDocument === option.value
                            ? 'border-[#80FF00] bg-gray-50 dark:bg-[#313a28]'
                            : 'bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                          } ${option.disabled
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                          }`}
                      >
                        <input
                          type="radio"
                          name="document"
                          value={option.value}
                          checked={selectedDocument === option.value}
                          onChange={() => !option.disabled && setSelectedDocument(option.value)}
                          disabled={option.disabled}
                          className="w-4 h-4 text-[#80FF00] border-gray-300 focus:ring-[#80FF00] focus:ring-2"
                        />
                        <span className={`text-sm flex-1 ${selectedDocument === option.value
                            ? 'text-[#80FF00] font-bold'
                            : 'text-gray-600 dark:text-gray-400'
                          }`}>
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Section 2: Choose Format */}
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">
                    2. Choose Format
                  </h3>
                  <div className="flex gap-2">
                    {formatOptions.map((format) => {
                      const isDocxFormat = format === 'docx' || format === 'doc';
                      const isLocked = isDocxFormat && !canExportDocx;
                      const isDisabled = isDownloading || selectedDocument === 'all' || isLocked;

                      return (
                        <button
                          key={format}
                          onClick={() => !isLocked && setSelectedFormat(format)}
                          disabled={isDisabled}
                          title={isLocked ? `${format.toUpperCase()} export requires Pro` : undefined}
                          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedFormat === format && !isLocked
                              ? 'bg-[#80FF00] text-black border-2 border-[#80FF00] font-bold'
                              : 'bg-gray-50 dark:bg-[#313a28] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                            } ${isDisabled
                              ? 'opacity-50 cursor-not-allowed'
                              : 'cursor-pointer'
                            }`}
                        >
                          <span className="flex items-center justify-center gap-1">
                            {isLocked && <Lock className="w-3 h-3" />}
                            {getFormatLabel(format)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedDocument === 'all' && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      ZIP format is automatically used for Download All
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 p-8 pt-4 border-t border-gray-200 dark:border-white/10 flex-shrink-0">
                <button
                  onClick={onClose}
                  disabled={isDownloading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-[#313a28]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDownload}
                  disabled={isDownloading || loadingJourney || documentOptions.find(opt => opt.value === selectedDocument)?.disabled}
                  className="px-4 py-2 text-sm font-medium text-black bg-[#80FF00] rounded-lg hover:bg-[#70FF00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-bold"
                >
                  {isDownloading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" />
                      <span>Downloading...</span>
                    </>
                  ) : (
                    <>
                      <DownloadIcon size={16} />
                      <span>{getDownloadButtonText()}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // Use portal to render modal at document body level to avoid overflow clipping
  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};

export default DownloadModal;

