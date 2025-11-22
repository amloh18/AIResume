'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText } from 'lucide-react';
import { useAICareerReport } from '@/contexts/AICareerReportContext';
import AICareerReportStep from './AICareerReportStep';

interface CareerReportSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  onBack?: () => void;
  session?: any;
}

export default function CareerReportSidePanel({ 
  isOpen, 
  onClose, 
  onComplete,
  onBack,
  session 
}: CareerReportSidePanelProps) {
  // Track window width for responsive sidebar (matching JobSidebar)
  const [windowWidth, setWindowWidth] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 768);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate sidebar width (matching JobSidebar)
  const sidebarWidth = React.useMemo(() => {
    return windowWidth >= 768 ? '50vw' : '100%';
  }, [windowWidth]);

  // Handle keyboard shortcuts
  React.useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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

          {/* Side Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-screen bg-white dark:bg-[#141810] shadow-2xl z-50 flex flex-col"
            style={{ width: sidebarWidth }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 tablet:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 sticky top-0 bg-white dark:bg-[#141810] z-10">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Career Report</h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5 tablet:w-6 tablet:h-6 text-gray-500" />
              </button>
            </div>

            {/* Report Content - Reuse AICareerReportStep but without the step header */}
            <div className="flex-1 overflow-y-auto min-h-0 bg-[#1A201A]">
              <AICareerReportStep 
                onComplete={onComplete || (() => {})} 
                onBack={onBack || onClose}
                session={session}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

