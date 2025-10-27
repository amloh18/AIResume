'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Download,
  Save,
  X,
  Edit3,
  Home,
  Menu,
  User,
  FileText,
  File
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getStudioLayoutClasses } from '@/lib/utils/themeUtils';
import { useSession } from 'next-auth/react';
import UserAvatar from '@/components/ui/UserAvatar';


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
  const { data: session } = useSession();
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(documentTitle);
  const [isMobile, setIsMobile] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const layoutClasses = getStudioLayoutClasses();

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 1024);
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

  // Update tempTitle when documentTitle changes
  useEffect(() => {
    setTempTitle(documentTitle);
  }, [documentTitle]);

  // Export menu now uses hover, so no click outside handler needed


  const handleBackToDashboard = () => {
    // Prevent multiple clicks
    if (isNavigating) return;
    
    setIsNavigating(true);
    
    try {
      console.log('🏠 Navigating to application tracker...');
      // Route to application tracker instead of general dashboard
      // Use replace to avoid back button issues and ensure immediate navigation
      router.replace('/dashboard/application-tracker');
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback: try direct navigation
      window.location.href = '/dashboard/application-tracker';
    } finally {
      // Reset navigation state after a short delay
      setTimeout(() => setIsNavigating(false), 1000);
    }
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
    <div className="min-h-screen">
      {/* Main Studio Container */}
      <div className="h-screen overflow-hidden flex flex-col">

        {/* Header - Different for Mobile vs Desktop */}
        {isMobile ? (
          /* Mobile Header */
          <motion.div
            className="bg-white/95 dark:bg-[#141810] border-b border-gray-200/50 dark:border-white/10 shadow-lg p-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between">
              {/* Left Section - Hamburger Menu + Logo */}
              <div className="flex items-center gap-3">
                <motion.button
                  onClick={() => setMobileMenuOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Menu size={20} strokeWidth={1.5} />
                </motion.button>

                {/* CV Circle Logo / Studio */}
                <div className="flex items-center space-x-2">
                  <div className="text-lg font-bold">
                    <span className="text-lime-600 dark:text-lime-400">CV</span>
                    <span className="text-gray-700 dark:text-gray-300">CIRCLE</span>
                  </div>
                  <div className="text-gray-400 text-sm">/</div>
                  <div className="text-sm font-semibold text-lime-700 dark:text-lime-300">Studio</div>
                </div>
              </div>

              {/* Center Section - Document Title with Edit */}
              <div className="flex-1 flex items-center justify-center px-4">
                <div className="flex items-center gap-2 max-w-xs">
                  {isEditingTitle ? (
                    <input
                      type="text"
                      value={tempTitle}
                      onChange={(e) => setTempTitle(e.target.value)}
                      onBlur={() => {
                        onTitleUpdate?.(tempTitle);
                        setIsEditingTitle(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onTitleUpdate?.(tempTitle);
                          setIsEditingTitle(false);
                        } else if (e.key === 'Escape') {
                          setTempTitle(documentTitle);
                          setIsEditingTitle(false);
                        }
                      }}
                      className="text-sm font-medium bg-transparent border-b border-lime-500 outline-none px-2 py-1 text-gray-700 dark:text-gray-300 text-center w-full"
                      placeholder="Untitled CV"
                      autoFocus
                    />
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">{documentTitle}</span>
                      {onTitleUpdate && (
                        <button
                          onClick={() => {
                            setTempTitle(documentTitle);
                            setIsEditingTitle(true);
                          }}
                          className="p-1 text-gray-400 hover:text-lime-600 dark:hover:text-lime-400 transition-colors rounded flex-shrink-0"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Section - Save Button + Notifications + User */}
              <div className="flex items-center gap-2">
                {/* Save Button */}
                <motion.button
                  onClick={onSave}
                  disabled={saveStatus === 'saving'}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                    saveStatus === 'saving' 
                      ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                      : saveStatus === 'error'
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {saveStatus === 'saving' ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border border-yellow-600 border-t-transparent" />
                      <Save size={16} />
                    </>
                  ) : saveStatus === 'error' ? (
                    <>
                      <div className="h-2 w-2 bg-red-600 rounded-full" />
                      <Save size={16} />
                    </>
                  ) : (
                    <>
                      <div className="h-2 w-2 bg-green-600 rounded-full" />
                      <Save size={16} />
                    </>
                  )}
                </motion.button>


                {/* User Avatar */}
                <UserAvatar 
                  user={{
                    name: session?.user?.name || 'User',
                    email: session?.user?.email || 'user@example.com',
                    profilePhoto: session?.user?.image,
                    isEmailVerified: true,
                    subscription: {
                      planName: 'Free Plan',
                      status: 'active'
                    }
                  }}
                />
              </div>
            </div>
          </motion.div>
        ) : (
          /* Desktop Floating Header Panel */
          <motion.div
            className="mx-4 mt-4 bg-white/95 dark:bg-[#141810] border border-gray-200/50 dark:border-white/10 shadow-lg rounded-2xl p-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between">
              {/* Left Section */}
              <div className="flex items-center gap-4">
                <motion.button
                  onClick={handleBackToDashboard}
                  disabled={isNavigating}
                  className={`flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ${
                    isNavigating ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  whileHover={!isNavigating ? { scale: 1.02 } : {}}
                  whileTap={!isNavigating ? { scale: 0.98 } : {}}
                >
                  <Home size={18} strokeWidth={1.5} />
                  {isNavigating && <span className="text-xs">...</span>}
                </motion.button>

                {/* CV Circle Logo / Studio */}
                <div className="flex items-center space-x-3">
                  <div className="text-2xl font-bold">
                    <span className="text-lime-600 dark:text-lime-400">CV</span>
                    <span className="text-gray-700 dark:text-gray-300">CIRCLE</span>
                  </div>
                  <div className="text-gray-400 text-xl">/</div>
                  <div className="text-xl font-semibold text-lime-700 dark:text-lime-300">Studio</div>
                </div>

                {/* Document Title */}
                <div className="flex items-center gap-3">
                  {isEditingTitle ? (
                    <input
                      type="text"
                      value={tempTitle}
                      onChange={(e) => setTempTitle(e.target.value)}
                      onBlur={() => {
                        onTitleUpdate?.(tempTitle);
                        setIsEditingTitle(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onTitleUpdate?.(tempTitle);
                          setIsEditingTitle(false);
                        } else if (e.key === 'Escape') {
                          setTempTitle(documentTitle);
                          setIsEditingTitle(false);
                        }
                      }}
                      className="text-sm font-medium bg-transparent border-b border-lime-500 outline-none px-2 py-1 text-gray-700 dark:text-gray-300"
                      placeholder="Untitled CV"
                      autoFocus
                    />
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{documentTitle}</span>
                      {onTitleUpdate && (
                        <button
                          onClick={() => {
                            setTempTitle(documentTitle);
                            setIsEditingTitle(true);
                          }}
                          className="p-1 text-gray-400 hover:text-lime-600 dark:hover:text-lime-400 transition-colors rounded"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                  <button
                    onClick={onSave}
                    disabled={saveStatus === 'saving'}
                    className={`text-xs px-3 py-1 rounded-full font-medium transition-all duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                      saveStatus === 'saving' 
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                        : saveStatus === 'error'
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                    title={saveStatus === 'saving' ? 'Saving...' : saveStatus === 'error' ? 'Save failed - Click to retry' : 'Click to save'}
                  >
                    {saveStatus === 'saving' ? (
                      <div className="flex items-center gap-1">
                        <div className="animate-spin rounded-full h-3 w-3 border border-yellow-600 border-t-transparent" />
                        <span>Saving</span>
                      </div>
                    ) : saveStatus === 'error' ? (
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 bg-red-600 rounded-full" />
                        <span>Save Failed</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 bg-green-600 rounded-full" />
                        <span>Saved</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* Center Section */}
              <div className="flex-1 flex items-center justify-center">
                {headerContent}
              </div>

              {/* Right Section */}
              <div className="flex items-center gap-3">
                {/* Export Menu - Expanding Inline Towards Left on Hover */}
                  {onDownload && (
                  <div className="relative group" data-export-menu>
                    <motion.div
                      className="flex items-center bg-green-500 hover:bg-green-600 text-white rounded-full overflow-hidden transition-all duration-300"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onMouseEnter={() => setExportMenuOpen(true)}
                      onMouseLeave={() => setExportMenuOpen(false)}
                    >
                      {/* Main Export Button */}
                      <motion.button
                        className="flex items-center gap-2 px-4 py-2 hover:bg-green-600 transition-colors"
                    >
                      <Download size={16} />
                      <span className="hidden sm:inline">Export</span>
                    </motion.button>
                      
                      {/* Expanded Options */}
                      <AnimatePresence>
                        {exportMenuOpen && (
                          <>
                            {/* Divider */}
                            <motion.div 
                              className="w-px h-6 bg-green-400/50"
                              initial={{ opacity: 0, scaleX: 0 }}
                              animate={{ opacity: 1, scaleX: 1 }}
                              exit={{ opacity: 0, scaleX: 0 }}
                              transition={{ duration: 0.2 }}
                            />
                            
                            {/* PDF Export */}
                            <motion.button
                              onClick={() => {
                                onDownload();
                                setExportMenuOpen(false);
                              }}
                              className="flex items-center gap-2 px-4 py-2 hover:bg-green-600 transition-colors"
                              initial={{ opacity: 0, x: -20, scale: 0.8 }}
                              animate={{ opacity: 1, x: 0, scale: 1 }}
                              exit={{ opacity: 0, x: -20, scale: 0.8 }}
                              transition={{ duration: 0.3, ease: "easeOut" }}
                              title="Export as PDF"
                            >
                              <FileText size={16} />
                              <span className="hidden sm:inline">PDF</span>
                            </motion.button>
                            
                            {/* Divider */}
                            <motion.div 
                              className="w-px h-6 bg-green-400/50"
                              initial={{ opacity: 0, scaleX: 0 }}
                              animate={{ opacity: 1, scaleX: 1 }}
                              exit={{ opacity: 0, scaleX: 0 }}
                              transition={{ duration: 0.2, delay: 0.1 }}
                            />
                            
                            {/* DOCX Export */}
                            <motion.button
                              onClick={() => {
                                console.log('DOCX export clicked');
                                setExportMenuOpen(false);
                              }}
                              className="flex items-center gap-2 px-4 py-2 hover:bg-green-600 transition-colors"
                              initial={{ opacity: 0, x: -20, scale: 0.8 }}
                              animate={{ opacity: 1, x: 0, scale: 1 }}
                              exit={{ opacity: 0, x: -20, scale: 0.8 }}
                              transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
                              title="Export as DOCX"
                            >
                              <File size={16} />
                              <span className="hidden sm:inline">DOCX</span>
                            </motion.button>
                            
                            {/* Divider */}
                            <motion.div 
                              className="w-px h-6 bg-green-400/50"
                              initial={{ opacity: 0, scaleX: 0 }}
                              animate={{ opacity: 1, scaleX: 1 }}
                              exit={{ opacity: 0, scaleX: 0 }}
                              transition={{ duration: 0.2, delay: 0.2 }}
                            />
                            
                            {/* Full Journey Download */}
                            <motion.button
                              onClick={() => {
                                setExportMenuOpen(false);
                              }}
                              className="flex items-center gap-2 px-4 py-2 hover:bg-green-600 transition-colors"
                              initial={{ opacity: 0, x: -20, scale: 0.8 }}
                              animate={{ opacity: 1, x: 0, scale: 1 }}
                              exit={{ opacity: 0, x: -20, scale: 0.8 }}
                              transition={{ duration: 0.3, delay: 0.2, ease: "easeOut" }}
                              title="Download complete journey (CV and cover letter as PDF)"
                            >
                              <Download size={16} />
                              <span className="hidden sm:inline">Full Journey</span>
                            </motion.button>
                          </>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </div>
                )}

                {/* User Avatar */}
                <UserAvatar 
                  user={{
                    name: session?.user?.name || 'User',
                    email: session?.user?.email || 'user@example.com',
                    profilePhoto: session?.user?.image,
                    isEmailVerified: true,
                    subscription: {
                      planName: 'Free Plan',
                      status: 'active'
                    }
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Main Content Area - Different Layout for Mobile vs Desktop */}
        {isMobile ? (
          /* Mobile Layout: Right Panel First, Then Left Panel Below */
          <div className="flex-1 flex flex-col min-h-0 p-4 gap-4">
            {/* Right Panel - Full Width */}
            <div className="flex-shrink-0 h-1/2 overflow-hidden scrollbar-hide">
              {rightPanel}
            </div>

            {/* Left Panel - Full Width Below */}
            <div className="flex-shrink-0 h-1/2 overflow-hidden scrollbar-hide">
              {leftPanel}
            </div>
          </div>
        ) : (
          /* Desktop Layout - 50/50 Split */
          <div className="flex-1 flex gap-4 min-h-0 p-4 pr-8">
            {/* Left Panel - 50% width */}
            <motion.div
              className={`${layoutClasses.leftPanel} w-1/2 flex-shrink-0 overflow-hidden scrollbar-hide`}
              layout
              transition={{ duration: 0.3 }}
            >
              {leftPanel}
            </motion.div>

            {/* Right Panel - 50% width */}
            <AnimatePresence>
              {rightPanelOpen && rightPanel && (
                <motion.div
                  className="w-1/2 flex-shrink-0 overflow-hidden scrollbar-hide"
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
        )}
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
              className="absolute top-16 left-4 right-4 bg-white/95 dark:bg-[#141810] border border-gray-200/50 dark:border-white/10 rounded-2xl shadow-xl p-6"
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
                
                <button
                  onClick={() => {
                    handleBackToDashboard();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Home size={18} />
                  <span>Back to Dashboard</span>
                </button>

                {onDownload && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Export Options</div>
                    
                  <button
                    onClick={() => {
                      onDownload();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Export as PDF"
                    >
                      <FileText size={18} className="text-red-500" />
                      <span>Export as PDF</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        // Handle DOCX export
                        console.log('DOCX export clicked');
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Export as DOCX"
                    >
                      <File size={18} className="text-blue-500" />
                      <span>Export as DOCX</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        // Handle full journey download
                        console.log('Full journey download clicked');
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Download complete journey (CV and cover letter as PDF)"
                    >
                      <Download size={18} className="text-green-500" />
                      <span>Full Journey Download</span>
                  </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FloatingStudioLayout;