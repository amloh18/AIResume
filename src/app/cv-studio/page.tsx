'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Save, 
  Download, 
  Eye, 
  Settings, 
  Sparkles,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText,
  Briefcase,
  Palette,
  Layers,
  ChevronDown,
  Star,
  Copy,
  Trash2,
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  MoreVertical,
  Lightbulb,
  Target,
  TrendingUp
} from 'lucide-react';
import CVStudioEditor from '@/components/cv-studio/CVStudioEditor';
import CVStudioSidebar from '@/components/cv-studio/CVStudioSidebar';
import CVStudioToolbar from '@/components/cv-studio/CVStudioToolbar';
import CVStudioHeader from '@/components/cv-studio/CVStudioHeader';
import CVAIAssistant from '@/components/cv-studio/CVAIAssistant';

interface CVStudioProps {}

const CVStudio: React.FC<CVStudioProps> = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'templates' | 'customize' | 'snippets'>('templates');
  const [zoom, setZoom] = useState(1);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [selectedCV, setSelectedCV] = useState<string | null>(null);
  const [linkedJob, setLinkedJob] = useState<any>(null);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(2);
  const [currentContent, setCurrentContent] = useState<string>('');
  const [currentSection, setCurrentSection] = useState<string>('general');
  const [userId, setUserId] = useState<string>('');

  // Handle URL parameters for CV editing
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const cvId = urlParams.get('cv');
    
    // Get user ID from localStorage or use test user
    const userData = localStorage.getItem('user');
    const currentUserId = userData ? JSON.parse(userData).id || JSON.parse(userData)._id : '6889b151d17daa1eaee91a5c';
    setUserId(currentUserId);
    
    if (cvId) {
      // Editing existing CV
      setSelectedCV(cvId);
      console.log('Loading CV with ID:', cvId);
    }
  }, []);

  const handleSave = useCallback(() => {
    // Save logic here
    setHasUnsavedChanges(false);
  }, []);

  const handleExport = useCallback((format: 'pdf' | 'json') => {
    // Export logic here
    console.log(`Exporting as ${format}`);
  }, []);

  const handleAIAssist = useCallback((action: 'rewrite' | 'optimize' | 'suggest') => {
    // AI assistance logic here
    console.log(`AI assist: ${action}`);
    setShowAIAssistant(true);
  }, []);

  const handleApplyAISuggestion = useCallback((suggestion: any) => {
    // Apply AI suggestion logic here
    console.log('Applying AI suggestion:', suggestion);
    // Here you would update the CV content with the AI suggestion
    setCurrentContent(suggestion.content);
  }, []);

  const handleGenerateContent = useCallback((type: string, content: string) => {
    // Generate content logic here
    console.log('Generated content:', type, content);
    setCurrentContent(content);
    // Here you would update the specific section of the CV with the generated content
  }, []);

  const handleAutoFit = useCallback(() => {
    setZoom(1);
  }, []);

  const handleUndo = useCallback(() => {
    // Undo logic here
    console.log('Undo action');
  }, []);

  const handleRedo = useCallback(() => {
    // Redo logic here
    console.log('Redo action');
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleContentChange = useCallback((content: string, section?: string) => {
    setCurrentContent(content);
    if (section) {
      setCurrentSection(section);
    }
  }, []);

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      {/* Header - Highest z-index */}
      <div className="relative z-50">
        <CVStudioHeader
          selectedCV={selectedCV}
          linkedJob={linkedJob}
          onCVChange={setSelectedCV}
          onJobChange={setLinkedJob}
          onAIAssist={handleAIAssist}
          hasUnsavedChanges={hasUnsavedChanges}
          onSave={handleSave}
        />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Sidebar - High z-index but below header */}
        <div className="relative z-40">
          <CVStudioSidebar
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            userCVs={[]} // This will be loaded by the header component
            linkedJobs={[]} // This will be loaded by the header component
          />
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col relative z-20">
          {/* Toolbar - High z-index but below header */}
          <div className="relative z-30">
            <CVStudioToolbar
              zoom={zoom}
              onZoomChange={setZoom}
              isPreviewMode={isPreviewMode}
              onPreviewToggle={() => setIsPreviewMode(!isPreviewMode)}
              onExport={handleExport}
              aiSuggestions={aiSuggestions}
              canUndo={true}
              canRedo={true}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onAutoFit={handleAutoFit}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>

          {/* Editor Canvas */}
          <div className="flex-1 relative overflow-hidden">
            <CVStudioEditor
              zoom={zoom}
              isPreviewMode={isPreviewMode}
              selectedCV={selectedCV}
              linkedJob={linkedJob}
              onDataChange={() => setHasUnsavedChanges(true)}
              currentPage={currentPage}
              onPageChange={handlePageChange}
              totalPages={totalPages}
              onContentChange={handleContentChange}
              userId={userId}
              cvId={selectedCV || undefined}
            />
          </div>
        </div>

        {/* Right Sidebar - AI Assistant Only */}
        <AnimatePresence>
          {showAIAssistant && (
            <motion.aside
              className="w-96 bg-white shadow-2xl border-l border-gray-200 flex flex-col relative z-50"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 384, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {/* Close Button */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">AI Assistant</h3>
                <button
                  onClick={() => {
                    setShowAIAssistant(false);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                <CVAIAssistant
                  onApplySuggestion={handleApplyAISuggestion}
                  onGenerateContent={handleGenerateContent}
                  currentSection={currentSection}
                  currentContent={currentContent}
                  availableJobs={[]} // This will be loaded by the header component
                  onClose={() => setShowAIAssistant(false)}
                />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* AI Suggestions Indicator */}
      {aiSuggestions.length > 0 && (
        <motion.div
          className="fixed bottom-6 right-6 z-[70]"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
        >
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-2xl shadow-2xl backdrop-blur-xl border border-white/20">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium">
                {aiSuggestions.length} new AI suggestions available
              </span>
              <button 
                className="ml-2 p-1 hover:bg-white/20 rounded-lg transition-colors"
                onClick={() => setShowAIAssistant(true)}
              >
                <Sparkles size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Template Selection Prompt - Removed since we have templates in sidebar */}
    </div>
  );
};

export default CVStudio; 