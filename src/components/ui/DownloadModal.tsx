'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, FileText, Download as DownloadIcon, Crown, Package } from 'lucide-react';
import { CVJourneyLookupService } from '@/lib/services/cvJourneyLookupService';
import { useSession } from 'next-auth/react';
import { getPlanLimits } from '@/lib/utils/subscription-helpers';
import { useUserData } from '@/lib/hooks/useUserData';

export type DocumentType = 'cv' | 'coverLetter' | 'cvAndCoverLetter' | 'all';
export type FormatType = 'pdf' | 'docx';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: (documentType: DocumentType, format: FormatType) => void;
  onPaywallRequired?: () => void;
  hasCV?: boolean;
  hasCoverLetter?: boolean;
  isDownloading?: boolean;
  cvId?: string;
  coverLetterId?: string;
  userId?: string;
  cvType?: 'master' | 'standalone' | 'journey'; // CV type to control which buttons to show
}

const DownloadModal: React.FC<DownloadModalProps> = ({
  isOpen,
  onClose,
  onDownload,
  onPaywallRequired,
  hasCV = true,
  hasCoverLetter = false,
  isDownloading = false,
  cvId,
  coverLetterId,
  userId,
  cvType = 'journey' // Default to journey to show all buttons
}) => {
  const { data: session } = useSession();
  const { userData } = useUserData();

  const [journeyInfo, setJourneyInfo] = useState<{
    hasCV: boolean;
    hasCoverLetter: boolean;
    journeyId?: string;
  }>({
    hasCV: hasCV,
    hasCoverLetter: hasCoverLetter
  });
  const [loadingJourney, setLoadingJourney] = useState(false);
  const [downloadingItem, setDownloadingItem] = useState<string | null>(null);

  // Check user's plan for DOCX export access
  const userPlanKey = userData?.currentPlanKey ||
    userData?.subscription?.planKey ||
    (session?.user as { currentPlanKey?: string })?.currentPlanKey ||
    'free';

  const canExportDocx = getPlanLimits(userPlanKey).docxExport;

  // Determine if we should show cover letter and package options
  // Only show for journey CVs, not for master or standalone
  const showCoverLetterOptions = cvType === 'journey';

  // Fetch journey info when modal opens
  useEffect(() => {
    const fetchJourneyInfo = async () => {
      if (!isOpen) return;

      const effectiveUserId = userId || session?.user?.id;
      if (!effectiveUserId) {
        setJourneyInfo({ hasCV, hasCoverLetter });
        return;
      }

      setLoadingJourney(true);
      try {
        let journeyData = null;

        if (cvId) {
          journeyData = await CVJourneyLookupService.findJourneyByCVId(cvId, effectiveUserId);
        }

        if (!journeyData && coverLetterId) {
          journeyData = await CVJourneyLookupService.findJourneyByCoverLetterId(coverLetterId, effectiveUserId);
        }

        if (journeyData) {
          setJourneyInfo({
            hasCV: !!journeyData.cvId,
            hasCoverLetter: !!journeyData.coverLetterId,
            journeyId: journeyData.journeyId
          });
        } else {
          setJourneyInfo({
            hasCV: hasCV || !!cvId,
            hasCoverLetter: hasCoverLetter || !!coverLetterId
          });
        }
      } catch (error) {
        console.error('Error fetching journey info:', error);
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

  const handleDirectDownload = (docType: DocumentType, format: FormatType, itemKey: string) => {
    setDownloadingItem(itemKey);
    onDownload(docType, format);
    setTimeout(() => setDownloadingItem(null), 2000);
  };

  const handleDocxClick = (docType: DocumentType, itemKey: string) => {
    if (!canExportDocx) {
      onPaywallRequired?.();
    } else {
      handleDirectDownload(docType, 'docx', itemKey);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-[#161616] rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
      >
        {/* Header - Neon Green Card */}
        <div className="mx-5 mt-5 mb-6">
          <div className="bg-[#80FF00] rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-black/10 rounded-xl flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-black" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-black leading-tight">
                Documents
              </h3>
              <p className="text-sm font-medium text-black/70 truncate">
                {loadingJourney ? 'Loading...' : 'Download CVs & Reports'}
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
        <div className="px-5 pb-5 space-y-4">
          {/* Section Label */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em]">
              FORMATS
            </span>
          </div>

          {/* 2x2 Grid of Options */}
          <div className="grid grid-cols-2 gap-3">
            {/* CV PDF Card */}
            <button
              onClick={() => handleDirectDownload('cv', 'pdf', 'cv-pdf')}
              disabled={!journeyInfo.hasCV || isDownloading}
              className={`group relative flex flex-col items-center justify-center gap-4 p-6 rounded-3xl transition-all duration-300 ${!journeyInfo.hasCV
                ? 'opacity-40 cursor-not-allowed bg-[#222]'
                : 'bg-[#222] hover:bg-[#2A2A2A] hover:shadow-2xl hover:shadow-black/50 active:scale-[0.98]'
                }`}
            >
              <FileText
                className={`w-8 h-8 transition-colors duration-300 ${journeyInfo.hasCV ? 'text-[#80FF00] group-hover:drop-shadow-[0_0_8px_rgba(128,255,0,0.5)]' : 'text-gray-700'}`}
                strokeWidth={1.5}
              />
              <div className="text-center space-y-1">
                <span className="block text-base font-bold text-gray-100">CV</span>
                <span className="block text-xs font-medium text-gray-500 group-hover:text-gray-400 transition-colors">PDF Format</span>
              </div>
              {downloadingItem === 'cv-pdf' && (
                <div className="absolute inset-0 bg-[#0D0D0D]/80 backdrop-blur-sm rounded-3xl flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-[#80FF00] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </button>

            {/* Cover Letter PDF Card - Only show for journey CVs */}
            {showCoverLetterOptions && (
              <button
                onClick={() => handleDirectDownload('coverLetter', 'pdf', 'cl-pdf')}
                disabled={!journeyInfo.hasCoverLetter || isDownloading}
                className={`group relative flex flex-col items-center justify-center gap-4 p-6 rounded-3xl transition-all duration-300 ${!journeyInfo.hasCoverLetter
                  ? 'opacity-40 cursor-not-allowed bg-[#222]'
                  : 'bg-[#222] hover:bg-[#2A2A2A] hover:shadow-2xl hover:shadow-black/50 active:scale-[0.98]'
                  }`}
              >
                <DownloadIcon
                  className={`w-8 h-8 transition-colors duration-300 ${journeyInfo.hasCoverLetter ? 'text-[#80FF00] group-hover:drop-shadow-[0_0_8px_rgba(128,255,0,0.5)]' : 'text-gray-700'}`}
                  strokeWidth={1.5}
                />
                <div className="text-center space-y-1">
                  <span className="block text-base font-bold text-gray-100">Cover Letter</span>
                  <span className="block text-xs font-medium text-gray-500 group-hover:text-gray-400 transition-colors">PDF Format</span>
                </div>
                {downloadingItem === 'cl-pdf' && (
                  <div className="absolute inset-0 bg-[#0D0D0D]/80 backdrop-blur-sm rounded-3xl flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-[#80FF00] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </button>
            )}

            {/* CV DOCX Card */}
            <button
              onClick={() => handleDocxClick('cv', 'cv-docx')}
              disabled={!journeyInfo.hasCV || isDownloading}
              className={`group relative flex flex-col items-center justify-center gap-4 p-6 rounded-3xl transition-all duration-300 ${!journeyInfo.hasCV
                ? 'opacity-40 cursor-not-allowed bg-[#222]'
                : !canExportDocx
                  ? 'bg-[#222] hover:bg-[#2A2A2A] active:scale-[0.98]'
                  : 'bg-[#222] hover:bg-[#2A2A2A] hover:shadow-2xl hover:shadow-black/50 active:scale-[0.98]'
                }`}
            >
              {!canExportDocx ? (
                <Crown className="w-8 h-8 text-amber-500 group-hover:drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] transition-all" strokeWidth={1.5} />
              ) : (
                <FileText
                  className={`w-8 h-8 transition-colors duration-300 ${journeyInfo.hasCV ? 'text-[#80FF00] group-hover:drop-shadow-[0_0_8px_rgba(128,255,0,0.5)]' : 'text-gray-700'}`}
                  strokeWidth={1.5}
                />
              )}
              <div className="text-center space-y-1">
                <span className="block text-base font-bold text-gray-100">CV</span>
                <span className="block text-xs font-medium text-gray-500 group-hover:text-gray-400 transition-colors">Word (DOCX)</span>
              </div>
              {!canExportDocx && journeyInfo.hasCV && (
                <span className="absolute top-4 right-4 text-[10px] bg-amber-500/10 text-amber-500 px-2 py-1 rounded-full font-bold tracking-wide border border-amber-500/20">PRO</span>
              )}
              {downloadingItem === 'cv-docx' && (
                <div className="absolute inset-0 bg-[#0D0D0D]/80 backdrop-blur-sm rounded-3xl flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-[#80FF00] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </button>

            {/* Cover Letter DOCX Card - Only show for journey CVs */}
            {showCoverLetterOptions && (
              <button
                onClick={() => handleDocxClick('coverLetter', 'cl-docx')}
                disabled={!journeyInfo.hasCoverLetter || isDownloading}
                className={`group relative flex flex-col items-center justify-center gap-4 p-6 rounded-3xl transition-all duration-300 ${!journeyInfo.hasCoverLetter
                  ? 'opacity-40 cursor-not-allowed bg-[#222]'
                  : !canExportDocx
                    ? 'bg-[#222] hover:bg-[#2A2A2A] active:scale-[0.98]'
                    : 'bg-[#222] hover:bg-[#2A2A2A] hover:shadow-2xl hover:shadow-black/50 active:scale-[0.98]'
                  }`}
              >
                {!canExportDocx ? (
                  <Crown className="w-8 h-8 text-amber-500 group-hover:drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] transition-all" strokeWidth={1.5} />
                ) : (
                  <DownloadIcon
                    className={`w-8 h-8 transition-colors duration-300 ${journeyInfo.hasCoverLetter ? 'text-[#80FF00] group-hover:drop-shadow-[0_0_8px_rgba(128,255,0,0.5)]' : 'text-gray-700'}`}
                    strokeWidth={1.5}
                  />
                )}
                <div className="text-center space-y-1">
                  <span className="block text-base font-bold text-gray-100">Cover Letter</span>
                  <span className="block text-xs font-medium text-gray-500 group-hover:text-gray-400 transition-colors">Word (DOCX)</span>
                </div>
                {!canExportDocx && journeyInfo.hasCoverLetter && (
                  <span className="absolute top-4 right-4 text-[10px] bg-amber-500/10 text-amber-500 px-2 py-1 rounded-full font-bold tracking-wide border border-amber-500/20">PRO</span>
                )}
                {downloadingItem === 'cl-docx' && (
                  <div className="absolute inset-0 bg-[#0D0D0D]/80 backdrop-blur-sm rounded-3xl flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-[#80FF00] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </button>
            )}
          </div>

          {/* Download Complete Package (ZIP) - Only show for journey CVs */}
          {showCoverLetterOptions && (
            <>
              <button
                onClick={() => handleDirectDownload('all', 'pdf', 'bundle')}
                disabled={(!journeyInfo.hasCV && !journeyInfo.hasCoverLetter) || isDownloading}
                className={`relative w-full flex items-center justify-center gap-3 px-5 py-4 rounded-2xl font-semibold text-sm transition-all ${(!journeyInfo.hasCV && !journeyInfo.hasCoverLetter)
                  ? 'opacity-40 cursor-not-allowed bg-[#222] text-gray-600'
                  : 'bg-[#80FF00] text-black hover:bg-[#99FF33] shadow-lg shadow-[#80FF00]/20 hover:shadow-xl hover:shadow-[#80FF00]/30 active:scale-[0.98]'
                  }`}
              >
                <Package className="w-5 h-5" />
                <span>
                  {downloadingItem === 'bundle' ? 'Preparing Download...' : 'Download Complete Package'}
                </span>
              </button>
              <p className="text-center text-xs text-gray-500">
                Includes CV, Cover Letter, and ATS Report (ZIP)
              </p>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );

  // Use portal to render modal at document body level
  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};

export default DownloadModal;
