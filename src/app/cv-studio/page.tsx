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
import CVStudioHeader from '@/components/cv-studio/CVStudioHeader';
import EnhancedTemplateSelector from '@/components/cv-studio/EnhancedTemplateSelector';
import AIAssistantPanel from '@/components/cv-studio/AIAssistantPanel';
import EnhancedToolbar from '@/components/cv-studio/EnhancedToolbar';
import OnboardingTips from '@/components/cv-studio/OnboardingTips';
import AutoSaveIndicator from '@/components/cv-studio/AutoSaveIndicator';

interface CVStudioProps {}

const CVStudio: React.FC<CVStudioProps> = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'templates' | 'customize' | 'snippets'>('templates');
  const [zoom, setZoom] = useState(1);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [selectedCV, setSelectedCV] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(true); // Open by default
  const [isAIAssistantCollapsed, setIsAIAssistantCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(2);
  const [currentContent, setCurrentContent] = useState<string>('');
  const [currentSection, setCurrentSection] = useState<string>('general');
  const [userId, setUserId] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'unsaved'>('saved');
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  
  // Content selection state for AI Assistant
  const [selectedContent, setSelectedContent] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedElementType, setSelectedElementType] = useState<string>('');
  const [cvData, setCvData] = useState<any>(null);
  const [selectedJob, setSelectedJob] = useState<any>(null);

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

  // Load jobs data
  const loadJobsData = async () => {
    // Removed job loading functionality
  };

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
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    }, 1000);
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
    console.log('Applying AI suggestion:', suggestion);
    setAiSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
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
    setSaveStatus('unsaved');
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

  const handleTemplateSelect = useCallback((template: any) => {
    setSelectedTemplate(template);
    console.log('Template selected:', template.name);
    setShowTemplateSelector(false);
    
    // Apply template to the CV editor
    if (template && template.styles) {
      // Update styling based on template
      handleStylingUpdate('fontFamily', template.styles.fontFamily || 'Arial, sans-serif');
      handleStylingUpdate('bodyFontSize', template.styles.baseFontSize || 11);
      handleStylingUpdate('sectionTitleFontSize', template.styles.sectionTitleFontSize || 15);
      handleStylingUpdate('nameFontSize', template.styles.nameFontSize || 20);
      handleStylingUpdate('lineHeight', template.styles.lineHeight || 1.0);
      handleStylingUpdate('margins', template.styles.paddingX || 96);
      handleStylingUpdate('sectionGap', template.styles.sectionGap || 10);
      handleStylingUpdate('itemSpacing', template.styles.itemSpacing || 2);
      handleStylingUpdate('bulletSpacing', template.styles.subsectionGap || 4);
      
      // Show success notification
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('saved'), 2000);
    }
  }, [handleStylingUpdate]);

  const handleApplySnippet = useCallback((snippet: any) => {
    console.log('Applying snippet:', snippet);
    // TODO: Implement snippet application logic
  }, []);

  const handleContentSelect = useCallback((content: string, section: string, elementType: string) => {
    console.log('Content selected:', { content, section, elementType });
    setSelectedContent(content);
    setSelectedSection(section);
    setSelectedElementType(elementType);
    setCurrentContent(content);
    setCurrentSection(section);
  }, []);

  const handleJobSelect = useCallback((job: any) => {
    console.log('Job selected:', job);
    setSelectedJob(job);
  }, []);

  const handleAddSection = useCallback((sectionType: string) => {
    console.log('Adding section:', sectionType);
    // Add section logic here
  }, []);

  const handleTemplateButtonClick = useCallback(() => {
    setShowTemplateSelector(true);
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
    // Save to localStorage that user has seen onboarding
    localStorage.setItem('cv-studio-onboarding-completed', 'true');
  }, []);

  // Check if user is first time and show onboarding
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('cv-studio-onboarding-completed');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      {/* Header - Highest z-index */}
      <div className="relative z-50">
        <CVStudioHeader
          selectedCV={selectedCV}
          linkedJob={null} // Removed linkedJob prop
          onCVChange={setSelectedCV}
          onJobChange={() => {}} // Removed onJobChange prop
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
            onTemplateSelect={handleTemplateSelect}
            onJobSelect={() => {}} // Removed onJobSelect prop
            selectedTemplate={selectedTemplate}
            styling={styling}
            onFontFamilyChange={(fontFamily) => setStyling(prev => ({ ...prev, fontFamily }))}
            onBodyFontSizeChange={(size) => setStyling(prev => ({ ...prev, bodyFontSize: size }))}
            onSectionTitleFontSizeChange={(size) => setStyling(prev => ({ ...prev, sectionTitleFontSize: size }))}
            onNameFontSizeChange={(size) => setStyling(prev => ({ ...prev, nameFontSize: size }))}
            onLineHeightChange={(height) => setStyling(prev => ({ ...prev, lineHeight: height }))}
            onMarginsChange={(margins) => setStyling(prev => ({ ...prev, margins }))}
            onSectionGapChange={(gap) => setStyling(prev => ({ ...prev, sectionGap: gap }))}
            onItemSpacingChange={(spacing) => setStyling(prev => ({ ...prev, itemSpacing: spacing }))}
            onBulletSpacingChange={(spacing) => setStyling(prev => ({ ...prev, bulletSpacing: spacing }))}
            onAutoFit={handleAutoFit}
            onApplySnippet={handleApplySnippet}
          />
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col relative z-20">
          {/* Toolbar - High z-index but below header */}
          <div className="relative z-30">
            <EnhancedToolbar
              zoom={zoom}
              onZoomChange={setZoom}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onZoomReset={handleZoomReset}
              onAutoFit={handleAutoFit}
              canUndo={true}
              canRedo={true}
              onUndo={handleUndo}
              onRedo={handleRedo}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              onAddSection={handleAddSection}
              isPreviewMode={isPreviewMode}
              onPreviewToggle={() => setIsPreviewMode(!isPreviewMode)}
              onSave={handleSave}
              onExport={handleExport}
              hasUnsavedChanges={hasUnsavedChanges}
            />
          </div>

          {/* Editor Canvas */}
          <div className="flex-1 relative overflow-hidden">
            <CVStudioEditor
              zoom={zoom}
              isPreviewMode={isPreviewMode}
              selectedCV={selectedCV}
              linkedJob={null} // Removed linkedJob prop
              onDataChange={() => setHasUnsavedChanges(true)}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              totalPages={totalPages}
              onContentChange={(content, section) => {
                setCurrentContent(content);
                if (section) setCurrentSection(section);
                // Handle CV data updates
                if (section === 'cv-data') {
                  try {
                    const parsedData = JSON.parse(content);
                    setCvData(parsedData);
                  } catch (error) {
                    console.error('Error parsing CV data:', error);
                  }
                }
              }}
              userId={userId}
              cvId={selectedCV || undefined}
              selectedTemplate={selectedTemplate}
              onContentSelect={handleContentSelect}
              selectedContent={selectedContent}
              selectedSection={selectedSection}
              styling={styling}
            />
          </div>
        </div>

        {/* Right Sidebar - Enhanced AI Assistant */}
        <AnimatePresence>
          {showAIAssistant && (
            <AIAssistantPanel
              onApplySuggestion={handleApplyAISuggestion}
              onGenerateContent={handleGenerateContent}
              onApplySnippet={handleApplySnippet}
              currentSection={currentSection}
              currentContent={currentContent}
              availableJobs={[
                {
                  id: '1',
                  title: 'Senior Software Engineer',
                  company: 'Tech Corp',
                  description: 'Leading development of scalable web applications using React, Node.js, and cloud technologies. Experience with microservices architecture, CI/CD pipelines, and agile methodologies required.',
                  status: 'active'
                },
                {
                  id: '2',
                  title: 'Full Stack Developer',
                  company: 'Startup Inc',
                  description: 'Building React/Node.js applications from scratch. Must have experience with MongoDB, AWS, and modern JavaScript frameworks. Knowledge of machine learning and data analysis is a plus.',
                  status: 'active'
                },
                {
                  id: '3',
                  title: 'Backend Engineer',
                  company: 'Enterprise Solutions',
                  description: 'Designing and implementing microservices architecture. Strong experience with Java, Spring Boot, Docker, and Kubernetes. Knowledge of financial systems and compliance is preferred.',
                  status: 'active'
                }
              ]}
              onClose={() => setShowAIAssistant(false)}
              isCollapsed={isAIAssistantCollapsed}
              onToggleCollapse={() => setIsAIAssistantCollapsed(!isAIAssistantCollapsed)}
              cvData={cvData}
              selectedJob={selectedJob}
              onJobSelect={handleJobSelect}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Template Selector Modal */}
      <AnimatePresence>
        {showTemplateSelector && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowTemplateSelector(false)}
          >
            <motion.div
              className="w-full max-w-4xl max-h-[80vh] overflow-hidden"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <EnhancedTemplateSelector
                onTemplateSelect={handleTemplateSelect}
                selectedTemplate={selectedTemplate}
                onClose={() => setShowTemplateSelector(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Onboarding Tips */}
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingTips
            isVisible={showOnboarding}
            onClose={() => setShowOnboarding(false)}
            onComplete={handleOnboardingComplete}
          />
        )}
      </AnimatePresence>

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

      {/* Auto-save Indicator */}
      <AutoSaveIndicator
        status={saveStatus}
        lastSaved={lastSaved}
      />

      {/* Template Selection Prompt - Removed since we have templates in sidebar */}
    </div>
  );
};

export default CVStudio; 