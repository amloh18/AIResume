'use client';

import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Edit, 
  Download, 
  Share2, 
  RefreshCw,
  ChevronDown,
  MoreVertical,
  BarChart3
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import FullCareerReport, { CareerAnalysis } from '@/components/career-report/FullCareerReport';
import { useUserData, getUserDisplayName } from '@/lib/hooks/useUserData';

interface CVDocument {
  id: string;
  title: string;
  cvData?: any;
  metadata?: {
    isMaster?: boolean;
    aiAnalysis?: CareerAnalysis;
    [key: string]: any;
  };
  isMaster?: boolean;
  [key: string]: any; // Allow additional CV properties
}

interface CareerReportSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCV: CVDocument | null;
  allCVs?: CVDocument[];
  userId: string;
  onCVSelect?: (cv: CVDocument) => void;
}

const CareerReportSidebar: React.FC<CareerReportSidebarProps> = ({
  isOpen,
  onClose,
  selectedCV,
  allCVs = [],
  userId,
  onCVSelect
}) => {
  const router = useRouter();
  const { userData } = useUserData();
  const [showCVDropdown, setShowCVDropdown] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 768);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCVDropdown(false);
      }
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false);
      }
    };

    if (showCVDropdown || showActionsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCVDropdown, showActionsMenu]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === 'Escape') {
        onClose();
      }
      // Cmd/Ctrl + E to edit CV
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        handleEditCV();
      }
      // Cmd/Ctrl + D to download
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        handleDownload();
      }
      // Cmd/Ctrl + K to open CV selector
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCVDropdown(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Track window width for responsive sidebar
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Calculate sidebar width
  const sidebarWidth = useMemo(() => {
    return windowWidth >= 768 ? '50vw' : '100%';
  }, [windowWidth]);

  // Swipe gesture handling for mobile
  useEffect(() => {
    if (!isOpen || !sidebarRef.current) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;

      const touchEndX = e.touches[0].clientX;
      const touchEndY = e.touches[0].clientY;
      const deltaX = touchEndX - touchStartX.current;
      const deltaY = touchEndY - touchStartY.current;

      // Only handle horizontal swipes (swipe left to close)
      if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX < -50) {
        onClose();
        touchStartX.current = null;
        touchStartY.current = null;
      }
    };

    const sidebar = sidebarRef.current;
    sidebar.addEventListener('touchstart', handleTouchStart);
    sidebar.addEventListener('touchmove', handleTouchMove);

    return () => {
      sidebar.removeEventListener('touchstart', handleTouchStart);
      sidebar.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isOpen, onClose]);

  const handleEditCV = () => {
    if (!selectedCV) return;
    
    // Find the journey associated with this CV
    const associatedJourney = null; // TODO: Get from context if needed
    
    if (associatedJourney) {
      router.push(`/studio?journeyId=${associatedJourney}&documentType=cv&mode=cvedit`);
    } else {
      router.push(`/studio?cvId=${selectedCV.id}`);
    }
    onClose();
  };

  const handleDownload = () => {
    // Download functionality - TODO: Implement direct download without page navigation
    console.log('Download report for CV:', selectedCV?.id);
    // For now, this functionality is available through the FullCareerReport component
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    console.log('Share report');
  };

  const handleRefresh = () => {
    // TODO: Implement refresh functionality
    console.log('Refresh analysis');
    window.location.reload();
  };

  const handleCVSelect = (cv: CVDocument) => {
    if (onCVSelect) {
      onCVSelect(cv);
    }
    setShowCVDropdown(false);
  };

  // Don't render if not open
  if (!isOpen) return null;

  // Show loading state if CV is being fetched
  if (!selectedCV) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed bg-black/50 backdrop-blur-sm z-40"
              style={{
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100vh'
              }}
              onClick={onClose}
            />

            {/* Sidebar with Loading State */}
            <motion.div
              ref={sidebarRef}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-16 h-[calc(100vh-4rem)] bg-white dark:bg-[#141810] shadow-2xl z-50 flex flex-col"
              style={{
                width: sidebarWidth
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] sticky top-0 z-10">
                <div className="flex items-center gap-3 flex-1">
                  <BarChart3 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-gray-900 dark:text-white font-semibold">Career Report</span>
                </div>
                <motion.button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a2015] rounded-lg transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </motion.button>
              </div>

              {/* Loading Content */}
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-[#80FF00] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Loading career report...</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed bg-black/50 backdrop-blur-sm z-40"
            style={{
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh'
            }}
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.div
            ref={sidebarRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-16 h-[calc(100vh-4rem)] bg-white dark:bg-[#141810] shadow-2xl z-50 flex flex-col"
            style={{
              width: sidebarWidth
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] sticky top-0 z-10">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* CV Selector */}
                <div className="relative flex-1 min-w-0" ref={dropdownRef}>
                  <button
                    onClick={() => setShowCVDropdown(!showCVDropdown)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-[#1a2015] border border-gray-200 dark:border-white/10 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-[#1f2a1a] transition-colors w-full text-left min-w-0"
                  >
                    <BarChart3 className="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                    <span className="text-gray-900 dark:text-white truncate flex-1 min-w-0">
                      {selectedCV.title}
                    </span>
                    {selectedCV.metadata?.isMaster || selectedCV.isMaster ? (
                      <span className="px-2 py-0.5 bg-[#80FF00]/20 text-[#80FF00] rounded text-small flex-shrink-0">
                        Master
                      </span>
                    ) : null}
                    <ChevronDown className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform flex-shrink-0 ${showCVDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showCVDropdown && allCVs.length > 0 && (
                    <div className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                      {allCVs.map((cv) => (
                        <button
                          key={cv.id}
                          onClick={() => handleCVSelect(cv)}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#1a2015] transition-colors ${
                            selectedCV?.id === cv.id ? 'bg-gray-50 dark:bg-[#313a28]' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <span className="font-medium text-gray-900 dark:text-white truncate flex-1 min-w-0">{cv.title}</span>
                            {cv.metadata?.isMaster || cv.isMaster ? (
                              <span className="px-2 py-0.5 bg-[#80FF00]/20 text-[#80FF00] rounded text-small flex-shrink-0">
                                Master
                              </span>
                            ) : null}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 ml-2">
                {/* Edit CV Button - Prominent */}
                <motion.button
                  onClick={handleEditCV}
                  className="flex items-center gap-2 px-4 py-2 bg-[rgb(129,255,0)] hover:bg-[rgb(110,230,0)] text-black rounded-lg font-semibold transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Edit CV (Cmd/Ctrl + E)"
                >
                  <Edit className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit CV</span>
                </motion.button>

                {/* More Actions Menu */}
                <div className="relative" ref={actionsMenuRef}>
                  <motion.button
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a2015] rounded-lg transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </motion.button>

                  {showActionsMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-lg shadow-lg z-50">
                      <button
                        onClick={() => {
                          handleDownload();
                          setShowActionsMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#1a2015] transition-colors flex items-center gap-2"
                      >
                        <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <span className="text-gray-900 dark:text-white">Download Report</span>
                      </button>
                      <button
                        onClick={() => {
                          handleShare();
                          setShowActionsMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#1a2015] transition-colors flex items-center gap-2"
                      >
                        <Share2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <span className="text-gray-900 dark:text-white">Share Report</span>
                      </button>
                      <button
                        onClick={() => {
                          handleRefresh();
                          setShowActionsMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#1a2015] transition-colors flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <span className="text-gray-900 dark:text-white">Refresh Analysis</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Close Button */}
                <motion.button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a2015] rounded-lg transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <FullCareerReport
                cvId={selectedCV.id}
                cvData={selectedCV.cvData}
                userId={userId}
                selectedCV={selectedCV}
                allCVs={allCVs}
                onEditCV={handleEditCV}
                onClose={onClose}
                onCVSelect={onCVSelect}
                compact={true}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default memo(CareerReportSidebar);

