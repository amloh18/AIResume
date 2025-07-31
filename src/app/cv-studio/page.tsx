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

  // Zoom constraints
  const MIN_ZOOM = 0.25;
  const MAX_ZOOM = 3.0;
  const ZOOM_STEP = 0.25;

  // Styling state management
  const [styling, setStyling] = useState({
    fontFamily: 'Arial, sans-serif',
    bodyFontSize: 11, // 10-12pt body text
    sectionTitleFontSize: 15, // 14-16pt section headings
    nameFontSize: 20, // 18-22pt for name
    lineHeight: 1.0, // 1.0 line spacing
    margins: 96, // 1-inch margins (96px)
    sectionGap: 10,
    itemSpacing: 2,
    bulletSpacing: 4 // Space between bullet points
  });

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

  const handleExport = useCallback(async (format: 'pdf' | 'json') => {
    try {
      if (format === 'pdf') {
        // PDF export logic
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          // Get the CV content
          const cvContent = document.querySelector('.cv-content');
          if (cvContent) {
            printWindow.document.write(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>CV Export</title>
                  <style>
                    body { 
                      margin: 0; 
                      padding: 20px; 
                      font-family: Arial, sans-serif;
                      background: white;
                    }
                    .cv-page {
                      width: 794px;
                      height: 1123px;
                      margin: 0 auto;
                      background: white;
                      box-shadow: 0 0 10px rgba(0,0,0,0.1);
                      padding: 96px;
                      box-sizing: border-box;
                    }
                    @media print {
                      body { padding: 0; }
                      .cv-page { 
                        box-shadow: none; 
                        margin: 0;
                        page-break-after: always;
                      }
                    }
                  </style>
                </head>
                <body>
                  <div class="cv-page">
                    ${cvContent.innerHTML}
                  </div>
                </body>
              </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            
            // Wait for content to load then print
            setTimeout(() => {
              printWindow.print();
              printWindow.close();
            }, 500);
          }
        }
      } else if (format === 'json') {
        // JSON export logic
        const exportData = {
          cvData: {
            personal_info: {
              name: "LE HOANG NHI",
              contact0: "(44) 77 026 9598",
              contact1: "nhilhto@gmail.com",
              contact2: "www.linkedin.com/in/hoangnhile141000/",
              summary: "Ambitious MSc Finance graduate from the University of Edinburgh, with previous internships in financial services, fluent in English, French & Vietnamese. Strong skills in leveraging data analytics, performing statistical analysis and using AI to perform deep-dive research. Demonstrated excellent written, verbal skills through passion projects outside of academic & corporate experience. Seeking an entry-level opportunity in Finance."
            },
            education: {
              education_0_title: "Master of Science in Finance (Merit)",
              education_0_company: "The University of Edinburgh",
              education_0_duration: "Sep 2022 – Nov 2023",
              education_0_detail_0: "Dissertation (Grade: Distinction): \"Unpacking ESG-Financial Performance Relationship: A Banking-Sector Study\".",
              education_0_detail_1: "Relevant Modules: Financial Markets and Investment, Corporate Finance, Sustainable Finance, Blockchain Governance and Policy, Financial Statement Analysis.",
              education_1_title: "BSc in Law, Economics and Management (2.1)",
              education_1_company: "University of Lyon",
              education_1_duration: "Sep 2018 – June 2022",
              education_1_detail_0: "Relevant Modules: Macroeconomics, Mathematics for Quantitative Economics, Financial Analysis, Probability and Statistics.",
              education_1_detail_1: "Extra-curricular activities: Student Representative of the Faculty of Economics and Management.",
              education_2_title: "Bachelor of Business (International Business)",
              education_2_company: "RMIT University",
              education_2_duration: "Oct 2020 – Apr 2022",
              education_2_detail_0: "Relevant Modules: International Trade, Commercial Law, Business Statistics, Political Economy for International Business."
            },
            experience: {
              experience_0_title: "Global Trade and Customs Consultant Intern",
              experience_0_company: "Ernst & Young",
              experience_0_duration: "May 2024 – Aug 2024",
              experience_0_detail_0: "Provided strategic advisory services such as customs valuation optimisation, classification analysis for imported/exported goods, risk assessment and mitigation, to over 10 multinational clients.",
              experience_0_detail_1: "Enhanced client response accuracy by conducting in-depth research on customs laws, regulations, and precedent cases.",
              experience_0_detail_2: "Contributed to successful engagements for clients like Samsung Electronics and Louis Vuitton.",
              experience_1_title: "Insight Days",
              experience_1_company: "Bank of America",
              experience_1_duration: "May 2023",
              experience_1_detail_0: "Attended a 3-day summit hosted by BoA, presenting on the state of AI and ESG in the Banking & Finance industry.",
              experience_1_detail_1: "Received good feedback from BoA senior management.",
              experience_2_title: "Transfer Pricing Intern",
              experience_2_company: "Ernst & Young",
              experience_2_duration: "May 2020 – Aug 2020",
              experience_2_detail_0: "Compiled financial reports and devised key metrics like profitability and solvency ratios.",
              experience_2_detail_1: "Benchmarked pricing analysis for ~15 companies, calculating arm's length prices."
            },
            leadership: {
              leadership_0_title: "Social Media Manager",
              leadership_0_company: "Account with 210K followers (210K on TikTok, 12.5K on Instagram)",
              leadership_0_duration: "May 2020 – Present",
              leadership_0_detail_0: "Achieved 30M+ total views by creating content targeting students in UK, France & Scotland.",
              leadership_0_detail_1: "Used Advanced Analytics to review metrics and adapt strategy.",
              leadership_0_detail_2: "Conducted research across industries: fashion, beauty, F&B, education, directed videos, and achieved 100% deliverable success.",
              leadership_1_title: "Executive Secretary",
              leadership_1_company: "Association of Vietnamese Students in Lyon",
              leadership_1_duration: "Oct 2019 – Oct 2020",
              leadership_1_detail_0: "Organised major cultural and academic workshops.",
              leadership_1_detail_1: "Delivered 15%+ cost savings managing ~€5000 in budget."
            },
            project: {
              project_0_title: "Kellogg's Company Analysis using top-down approach / Equity Valuation",
              project_0_duration: "Feb 2023 – Apr 2023",
              project_0_detail_0: "Conducted a comprehensive equity valuation using DCF and P/E ratios.",
              project_0_detail_1: "Used Refinitiv & Damodaran data to forecast cash flows, WACC, and terminal value."
            },
            skills: {
              skills_detail_0: "Languages: Fluent in English, French, Vietnamese; proficient in Mandarin Chinese.",
              skills_detail_1: "IT: Microsoft Office Suite (Excel, Word, PowerPoint, Visio), Statistical analysis software (STATA17).",
              skills_detail_2: "Certificates: Finance Accelerator Simulator Experience (AmplifyME), Stock Valuation with Comparable Company Analysis (Coursera), Analysing Company Performance using Ratios (Coursera)."
            }
          },
          styling: styling,
          exportDate: new Date().toISOString(),
          version: "1.0"
        };
        
        // Create and download JSON file
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cv-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  }, [styling]);

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

  const handleZoomIn = useCallback(() => {
    setZoom(prev => {
      const newZoom = Math.min(prev + ZOOM_STEP, MAX_ZOOM);
      console.log('Zoom in:', prev, '->', newZoom);
      return newZoom;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => {
      const newZoom = Math.max(prev - ZOOM_STEP, MIN_ZOOM);
      console.log('Zoom out:', prev, '->', newZoom);
      return newZoom;
    });
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
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

  // Styling update handlers
  const handleStylingUpdate = useCallback((property: string, value: any) => {
    setStyling(prev => ({
      ...prev,
      [property]: value
    }));
    setHasUnsavedChanges(true);
  }, []);

  const handleFontFamilyChange = useCallback((fontFamily: string) => {
    handleStylingUpdate('fontFamily', fontFamily);
  }, [handleStylingUpdate]);

  const handleBodyFontSizeChange = useCallback((size: number) => {
    handleStylingUpdate('bodyFontSize', size);
  }, [handleStylingUpdate]);

  const handleSectionTitleFontSizeChange = useCallback((size: number) => {
    handleStylingUpdate('sectionTitleFontSize', size);
  }, [handleStylingUpdate]);

  const handleNameFontSizeChange = useCallback((size: number) => {
    handleStylingUpdate('nameFontSize', size);
  }, [handleStylingUpdate]);

  const handleLineHeightChange = useCallback((height: number) => {
    handleStylingUpdate('lineHeight', height);
  }, [handleStylingUpdate]);

  const handleMarginsChange = useCallback((margins: number) => {
    handleStylingUpdate('margins', margins);
  }, [handleStylingUpdate]);

  const handleSectionGapChange = useCallback((gap: number) => {
    handleStylingUpdate('sectionGap', gap);
  }, [handleStylingUpdate]);

  const handleItemSpacingChange = useCallback((spacing: number) => {
    handleStylingUpdate('itemSpacing', spacing);
  }, [handleStylingUpdate]);

  const handleBulletSpacingChange = useCallback((spacing: number) => {
    handleStylingUpdate('bulletSpacing', spacing);
  }, [handleStylingUpdate]);

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
          isPreviewMode={isPreviewMode}
          onPreviewToggle={() => setIsPreviewMode(!isPreviewMode)}
          onExport={handleExport}
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
            styling={styling}
            onFontFamilyChange={handleFontFamilyChange}
            onBodyFontSizeChange={handleBodyFontSizeChange}
            onSectionTitleFontSizeChange={handleSectionTitleFontSizeChange}
            onNameFontSizeChange={handleNameFontSizeChange}
            onLineHeightChange={handleLineHeightChange}
            onMarginsChange={handleMarginsChange}
            onSectionGapChange={handleSectionGapChange}
            onItemSpacingChange={handleItemSpacingChange}
            onBulletSpacingChange={handleBulletSpacingChange}
            onAutoFit={handleAutoFit}
          />
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col relative z-20">
          {/* Toolbar - High z-index but below header */}
          <div className="relative z-30">
            <CVStudioToolbar
              zoom={zoom}
              onZoomChange={setZoom}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onZoomReset={handleZoomReset}
              aiSuggestions={aiSuggestions}
              canUndo={true}
              canRedo={true}
              onUndo={handleUndo}
              onRedo={handleRedo}
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
              styling={styling}
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