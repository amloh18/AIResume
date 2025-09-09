'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Download,
  Save,
  X,
  Sun,
  Moon,
  Edit3
} from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import { getStudioLayoutClasses } from '@/lib/utils/themeUtils';


interface FloatingStudioLayoutProps {
  leftPanel?: React.ReactNode;
  rightPanel?: React.ReactNode;
  headerContent?: React.ReactNode;
  onSave?: () => void;
  onPreview?: () => void;
  onDownload?: () => void;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  documentTitle?: string;
  onTitleUpdate?: (title: string) => void;
}

const FloatingStudioLayout: React.FC<FloatingStudioLayoutProps> = ({
  leftPanel,
  rightPanel,
  headerContent,
  onSave,
  onPreview,
  onDownload,
  saveStatus = 'idle',
  documentTitle = 'Untitled Document',
  onTitleUpdate
}) => {
  const router = useRouter();
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const layoutClasses = getStudioLayoutClasses();

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 1024) {
        setRightPanelOpen(false);
      } else {
        setRightPanelOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  const getSaveStatusColor = () => {
    switch (saveStatus) {
      case 'saving': return 'text-yellow-500';
      case 'saved': return 'text-green-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500 dark:text-gray-400';
    }
  };

  const getSaveStatusText = () => {
    switch (saveStatus) {
      case 'saving': return 'Saving...';
      case 'saved': return 'Saved';
      case 'error': return 'Error saving';
      default: return 'All changes saved';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-black dark:to-gray-900">
      {/* Main Studio Container */}
      <div className="h-screen overflow-hidden flex flex-col">

        {/* Floating Header Panel */}
        <motion.div
          className="mx-4 mt-4 mb-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg rounded-2xl p-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between">
            {/* Left Section */}
            <div className="flex items-center gap-4">
              <motion.button
                onClick={handleBackToDashboard}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <ChevronLeft size={18} />
                <span className="hidden sm:inline">Dashboard</span>
              </motion.button>

              {/* CV Circle Logo / Studio */}
              <div className="flex items-center space-x-3">
                <div className="text-lg font-bold">
                  <span className="text-lime-600 dark:text-lime-400">CV</span>
                  <span className="text-gray-700 dark:text-gray-300">CIRCLE</span>
                </div>
                <div className="text-gray-400">/</div>
                <div className="px-2 py-1 bg-lime-100 dark:bg-lime-900/20 rounded-lg">
                  <span className="text-sm font-medium text-lime-700 dark:text-lime-300">Studio</span>
                </div>
              </div>

              {/* Document Title */}
              <div className="flex items-center gap-3">
                {isEditingTitle ? (
                  <input
                    type="text"
                    value={documentTitle}
                    onChange={(e) => onTitleUpdate && onTitleUpdate(e.target.value)}
                    onBlur={() => setIsEditingTitle(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                    className="text-xl font-bold bg-transparent border-b-2 border-lime-500 outline-none px-2 py-1 text-gray-900 dark:text-white"
                    placeholder="Untitled CV"
                    autoFocus
                  />
                ) : (
                  <div className="flex items-center space-x-2">
                    <div className="px-3 py-2 bg-gradient-to-r from-lime-50 to-green-50 dark:from-lime-900/20 dark:to-green-900/20 rounded-xl border border-lime-200 dark:border-lime-700">
                      <span className="text-xl font-bold text-lime-800 dark:text-lime-200">{documentTitle}</span>
                    </div>
                    {onTitleUpdate && (
                      <button
                        onClick={() => setIsEditingTitle(true)}
                        className="p-2 text-gray-400 hover:text-lime-600 dark:hover:text-lime-400 transition-colors rounded-lg hover:bg-lime-50 dark:hover:bg-lime-900/20"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
                <div className={`text-sm px-2 py-1 rounded-full ${getSaveStatusColor() === 'text-green-500' ? 'bg-green-100 text-green-700' : getSaveStatusColor() === 'text-yellow-500' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                  {getSaveStatusText()}
                </div>
              </div>
            </div>

            {/* Center Section */}
            <div className="flex-1 flex items-center justify-center">
              {headerContent}
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <motion.button
                onClick={toggleTheme}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Toggle theme"
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </motion.button>



              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {onSave && (
                  <motion.button
                    onClick={onSave}
                    disabled={saveStatus === 'saving'}
                    className="flex items-center gap-2 px-3 py-2 bg-lime-500 hover:bg-lime-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Save size={16} />
                    <span className="hidden sm:inline">Save</span>
                  </motion.button>
                )}



                {onDownload && (
                  <motion.button
                    onClick={onDownload}
                    className="flex items-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Download size={16} />
                    <span className="hidden sm:inline">Export</span>
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content Area - 50/50 Split Layout */}
        <div className="flex-1 flex gap-4 min-h-0 p-4">

          {/* Left Panel - 50% width */}
          <motion.div
            className={`${layoutClasses.leftPanel} w-1/2 flex-shrink-0 overflow-hidden`}
            layout
            transition={{ duration: 0.3 }}
          >
            {leftPanel}
          </motion.div>

          {/* Right Panel - 50% width */}
          <AnimatePresence>
            {rightPanelOpen && rightPanel && (
              <motion.div
                className={`${layoutClasses.rightPanel} w-1/2 flex-shrink-0 overflow-y-auto`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                {rightPanel}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
            <motion.div
              className="absolute top-16 left-4 right-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-xl p-6"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Studio Options</h3>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setRightPanelOpen(!rightPanelOpen);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ChevronLeft size={18} />
                  <span>{rightPanelOpen ? 'Hide' : 'Show'} Right Panel</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FloatingStudioLayout;