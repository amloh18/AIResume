'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Settings, 
  Download, 
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  Target,
  TrendingUp,
  Brain,
  Crown,
  Home,
  Bell,
  LogOut,
  Edit3,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { CVDataStructure } from '@/types/cv';
import { Job } from '@/lib/stores/jobStore';
import { useUserPlan } from '@/lib/hooks/useUserPlan';
import { useJobStore } from '@/lib/stores/jobStore';
import { useTemplateStore } from '@/lib/stores/templateStore';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AIEnhancedFormField from './AIEnhancedFormField';
import EnhancedFormSection, { 
  PersonalInfoSection, 
  WorkExperienceSection, 
  SkillsSection,
  ProjectsSection,
  LanguagesSection,
  CertificationsSection
} from './EnhancedFormSection';
import DesignPanel from './DesignPanel';
import TemplatePanel from './TemplatePanel';
import UpgradeModal from '@/components/ui/UpgradeModal';
import PreviewPanel from './PreviewPanel';
import JobSelector from './JobSelector';
import CVSelector from './CVSelector';
import AICoverLetterGenerator from './AICoverLetterGenerator';
import ATSScoreAnalyzer from './ATSScoreAnalyzer';
import { AIAssistantService } from '@/lib/services/aiAssistantService';
import Toast from '@/components/ui/Toast';

interface EnhancedStudioLayoutProps {
  cvData: CVDataStructure | null;
  onUpdateField: (path: string, value: any) => void;
  onAddSection: (sectionType: keyof CVDataStructure, item?: any) => void;
  onRemoveSection: (sectionType: keyof CVDataStructure, id: string) => void;
  template: any;
  jobData: Job | null;
  selectedJobId: string | null;
  onJobSelection: (jobId: string | null) => void;
  cvId: string | null;
  userId: string;
  documentTitle: string;
  onTitleUpdate: (title: string) => void;
  saveStatus: 'saved' | 'saving' | 'error';
  onManualSave: () => void;
  onExport: (format: 'pdf' | 'docx' | 'json') => void;
  documentType?: 'cv' | 'cover-letter';
  onDocumentTypeChange?: (type: 'cv' | 'cover-letter') => void;
}

const EnhancedStudioLayout: React.FC<EnhancedStudioLayoutProps> = ({
  cvData,
  onUpdateField,
  onAddSection,
  onRemoveSection,
  template,
  jobData,
  selectedJobId,
  onJobSelection,
  cvId,
  userId,
  documentTitle,
  onTitleUpdate,
  saveStatus,
  onManualSave,
  onExport,
  documentType = 'cv',
  onDocumentTypeChange
}) => {
  const { hasAI } = useUserPlan();
  const { currentJob } = useJobStore();
  const { selectedTemplate } = useTemplateStore();
  const { theme } = useTheme();
  const router = useRouter();
  
  // Layout state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [activeTab, setActiveTab] = useState<'structure' | 'design' | 'template'>('structure');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basics', 'work', 'skills', 'projects', 'languages', 'certificates']));
  
  // Cover letter state
  const [selectedCVId, setSelectedCVId] = useState<string | null>(null);
  const [selectedCVData, setSelectedCVData] = useState<any>(null);
  
  // Preview state
  const [previewZoom, setPreviewZoom] = useState(1);
  const [previewPaperSize, setPreviewPaperSize] = useState<'A4' | 'Letter'>('A4');
  const [previewPagePadding, setPreviewPagePadding] = useState({ top: 32, bottom: 32 });
  
  // Design settings state
  const [designSettings, setDesignSettings] = useState({
    fontFamily: 'Inter',
    headerFontSize: 24,
    bodyFontSize: 14,
    sectionFontSize: 18,
    lineSpacing: 1.2,
    letterSpacing: 0,
    sectionSpacing: 16,
    colorScheme: 'professional',
    alignment: 'left' as 'left' | 'center' | 'right',
    pagePadding: { top: 32, bottom: 32, left: 32, right: 32 }
  });
  
  // Template state
  const [selectedTemplateItem, setSelectedTemplateItem] = useState<any>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalData, setUpgradeModalData] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

  // AI state
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [isCalculatingATS, setIsCalculatingATS] = useState(false);

  // Handle upgrade modal events
  useEffect(() => {
    const handleShowUpgradeModal = (event: CustomEvent) => {
      setUpgradeModalData(event.detail);
      setShowUpgradeModal(true);
    };

    window.addEventListener('showUpgradeModal', handleShowUpgradeModal as EventListener);
    return () => {
      window.removeEventListener('showUpgradeModal', handleShowUpgradeModal as EventListener);
    };
  }, []);

  // Calculate ATS score when job or CV data changes
  useEffect(() => {
    if (hasAI && cvData && jobData) {
      calculateATSScore();
    }
  }, [hasAI, cvData, jobData]);

  const calculateATSScore = async () => {
    if (!cvData || !jobData) return;
    
    setIsCalculatingATS(true);
    try {
      const analysis = await AIAssistantService.calculateATSScore(cvData, jobData);
      setAtsScore(analysis.score);
    } catch (error) {
      console.error('Error calculating ATS score:', error);
    } finally {
      setIsCalculatingATS(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const displayToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleAddWorkExperience = () => {
    onAddSection('work', {
      name: '',
      position: '',
      url: '',
      startDate: '',
      endDate: '',
      summary: '',
      highlights: []
    });
  };

  const handleRemoveWorkExperience = (index: number) => {
    if (cvData?.work && cvData.work[index]) {
      const work = cvData.work[index];
      const id = work.name || work.position || index.toString();
      onRemoveSection('work', id);
    }
  };

  const handleAddSkillCategory = () => {
    onAddSection('skills', {
      name: '',
      level: '',
      keywords: []
    });
  };

  const handleRemoveSkillCategory = (index: number) => {
    if (cvData?.skills && cvData.skills[index]) {
      const skill = cvData.skills[index];
      const id = skill.name || index.toString();
      onRemoveSection('skills', id);
    }
  };

  const handleAddProject = () => {
    onAddSection('projects', {
      name: '',
      description: '',
      technologies: [],
      url: '',
      role: ''
    });
  };

  const handleRemoveProject = (index: number) => {
    if (cvData?.projects && cvData.projects[index]) {
      const project = cvData.projects[index];
      const id = project.name || index.toString();
      onRemoveSection('projects', id);
    }
  };

  const handleAddLanguage = () => {
    onAddSection('languages', {
      language: '',
      fluency: ''
    });
  };

  const handleRemoveLanguage = (index: number) => {
    if (cvData?.languages && cvData.languages[index]) {
      const language = cvData.languages[index];
      const id = language.language || index.toString();
      onRemoveSection('languages', id);
    }
  };

  const handleAddCertification = () => {
    onAddSection('certificates', {
      name: '',
      issuer: '',
      date: '',
      expiryDate: '',
      description: ''
    });
  };

  const handleRemoveCertification = (index: number) => {
    if (cvData?.certificates && cvData.certificates[index]) {
      const cert = cvData.certificates[index];
      const id = cert.name || index.toString();
      onRemoveSection('certificates', id);
    }
  };

  const handleLogout = async () => {
    try {
      console.log('🔍 Starting studio logout process...');
      
      // Clear localStorage
      localStorage.removeItem('user');
      console.log('✅ Cleared localStorage');
      
      // Clear sessionStorage
      sessionStorage.clear();
      console.log('✅ Cleared sessionStorage');
      
      // Check if user is from Firebase (has user data in localStorage)
      const userData = localStorage.getItem('user');
      if (userData) {
        console.log('🔍 Firebase user detected, signing out from Firebase...');
        // Firebase user - sign out from Firebase
        try {
          const { signOut: signOutFirebase } = await import('firebase/auth');
          const { auth } = await import('@/lib/firebase');
          await signOutFirebase(auth);
          console.log('✅ Signed out from Firebase');
        } catch (error) {
          console.error('❌ Error signing out from Firebase:', error);
        }
      }
      
      // Sign out from NextAuth
      console.log('🔍 Signing out from NextAuth...');
      await signOut({ 
        redirect: true,
        callbackUrl: '/'
      });
      console.log('✅ Signed out from NextAuth');
      
    } catch (error) {
      console.error('❌ Error during studio logout:', error);
      // Fallback - clear storage and redirect
      localStorage.removeItem('user');
      sessionStorage.clear();
      window.location.href = '/';
    }
  };

  const handleTitleEdit = () => {
    setIsEditingTitle(true);
  };

  const handleTitleSave = (newTitle: string) => {
    onTitleUpdate(newTitle);
    setIsEditingTitle(false);
  };

  const handleDesignSettingsChange = (newSettings: any) => {
    setDesignSettings(newSettings);
    // Here you would typically save the settings to the backend
    console.log('Design settings updated:', newSettings);
  };



  const handleCVSelection = async (cvId: string | null) => {
    console.log('🔍 handleCVSelection - cvId:', cvId);
    setSelectedCVId(cvId);
    if (cvId) {
      try {
        const response = await fetch(`/api/cvs/${cvId}?userId=${userId}`);
        if (response.ok) {
          const cvData = await response.json();
          console.log('🔍 handleCVSelection - fetched CV data:', cvData);
          setSelectedCVData(cvData);
          // Auto-fill personal information from selected CV
          if (cvData.cvData?.basics) {
            const basics = cvData.cvData.basics;
            // Copy all basic information fields
            Object.keys(basics).forEach(key => {
              if (basics[key] !== undefined && basics[key] !== null) {
                onUpdateField(`basics.${key}`, basics[key]);
              }
            });
          }
        }
      } catch (err) {
        console.error('Error loading CV data:', err);
      }
    } else {
      setSelectedCVData(null);
    }
  };

  const handleAIGenerate = (content: string) => {
    onUpdateField('basics.summary', content);
  };

  const handleDesignReset = () => {
    const defaultSettings = {
      headerFontSize: 24,
      bodyFontSize: 14,
      sectionFontSize: 18,
      lineSpacing: 1.2,
      letterSpacing: 0,
      sectionSpacing: 16,
      colorScheme: 'professional',
      alignment: 'left' as 'left' | 'center' | 'right',
      pagePadding: { top: 32, bottom: 32, left: 32, right: 32 }
    };
    setDesignSettings(defaultSettings);
  };

  const handleTemplateSelect = (template: any) => {
    setSelectedTemplateItem(template);
    // Here you would typically update the CV template
    console.log('Template selected:', template);
  };

  const handleTemplatePreview = (template: any) => {
    // Here you would typically show a preview modal
    console.log('Preview template:', template);
  };

  return (
    <div className="h-screen flex flex-col bg-[#f8fafe] dark:bg-gray-900 overflow-hidden">
      {/* Toast Notifications */}
      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
        duration={3000}
      />

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature={upgradeModalData?.feature}
        description={upgradeModalData?.description}
        benefits={upgradeModalData?.benefits}
      />

      {/* Top Bar - Fixed Header */}
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-b border-lime-200/50 dark:border-gray-700 px-6 py-4 shadow-xl z-50 sticky top-0">
        <div className="flex items-center justify-between">
          {/* Left side - Logo, Studio indicator, and CV title */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Dashboard"
            >
              <Home className="h-5 w-5" />
            </button>
            
            <div className="flex items-center space-x-2">
              <div className="text-lg font-bold">
                <span className="text-lime-600">CV</span>
                <span className="text-gray-700">CIRCLE</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-sm text-gray-500">•</span>
                <span className="text-sm font-medium text-gray-700">Studio</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {isEditingTitle ? (
                <input
                  type="text"
                  value={documentTitle}
                  onChange={(e) => handleTitleSave(e.target.value)}
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyPress={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                  className="text-lg font-semibold text-gray-900 bg-transparent border-b border-lime-500 outline-none px-1 py-0.5"
                  placeholder="Untitled CV"
                  autoFocus
                />
              ) : (
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-semibold text-gray-900">{documentTitle}</span>
                  <button
                    onClick={handleTitleEdit}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Center - Document Type Switcher and ATS score */}
          <div className="flex items-center space-x-4">
            {/* Document Type Switcher */}
            {onDocumentTypeChange && (
              <div className="flex items-center space-x-2">
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => onDocumentTypeChange('cv')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      documentType === 'cv'
                        ? 'bg-lime-600 text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    CV
                  </button>
                  <button
                    onClick={() => onDocumentTypeChange('cover-letter')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      documentType === 'cover-letter'
                        ? 'bg-lime-600 text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    Cover Letter
                  </button>
                </div>
              </div>
            )}
            
            {/* ATS Score Display */}
            {hasAI && jobData && documentType === 'cv' && (
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-lime-100 rounded-lg">
                <Target className="h-4 w-4 text-lime-600" />
                <span className="text-sm font-medium text-lime-700">
                  {isCalculatingATS ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-lime-600" />
                  ) : atsScore !== null ? (
                    `ATS: ${atsScore}%`
                  ) : (
                    'Calculating...'
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Right side - Controls, theme toggle, notifications, and logout */}
          <div className="flex items-center space-x-3">
            {/* Zoom Controls */}
            <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => {
                  const newZoom = Math.max(0.25, previewZoom - 0.25);
                  setPreviewZoom(newZoom);
                }}
                className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors rounded"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              
              <span className="text-xs text-gray-600 dark:text-gray-300 min-w-[2.5rem] text-center">
                {Math.round(previewZoom * 100)}%
              </span>
              
              <button
                onClick={() => {
                  const newZoom = Math.min(2, previewZoom + 0.25);
                  setPreviewZoom(newZoom);
                }}
                className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors rounded"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>

            {/* Paper Size Toggle */}
            <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setPreviewPaperSize('A4')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  previewPaperSize === 'A4'
                    ? 'bg-lime-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                A4
              </button>
              <button
                onClick={() => setPreviewPaperSize('Letter')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  previewPaperSize === 'Letter'
                    ? 'bg-lime-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                Letter
              </button>
            </div>

            <button
              onClick={onManualSave}
              disabled={saveStatus === 'saving'}
              className="px-3 py-1.5 bg-lime-600 text-white rounded-lg hover:bg-lime-700 transition-colors text-sm font-medium disabled:opacity-50 min-w-[80px] flex items-center justify-center"
            >
              {saveStatus === 'saving' ? (
                <div className="flex items-center space-x-1">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                  <span>Saving...</span>
                </div>
              ) : saveStatus === 'saved' ? (
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-green-400 rounded-full" />
                  <span>Saved</span>
                </div>
              ) : (
                <span>Save</span>
              )}
            </button>
            
            
            <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors relative">
              <Bell className="h-5 w-5" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
            </button>
            
            <button
              onClick={handleLogout}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel - Form (50% width for tablets and desktops) */}
        <div className="w-full md:w-1/2 lg:w-1/2 flex-shrink-0 relative bg-[#f8fafe] dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="h-full overflow-y-auto">
            <div className="h-full overflow-y-auto">
              <div className="p-4 space-y-6">
                {/* Tab Navigation */}
                <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  {(documentType === 'cover-letter' ? [
                    { id: 'structure', label: 'Content', icon: TrendingUp },
                    { id: 'design', label: 'Design', icon: Settings },
                    { id: 'template', label: 'Template', icon: Eye }
                  ] : [
                    { id: 'structure', label: 'Structure', icon: TrendingUp },
                    { id: 'design', label: 'Design', icon: Settings },
                    { id: 'template', label: 'Template', icon: Eye }
                  ]).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`
                        flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
                        ${activeTab === tab.id 
                          ? 'bg-white dark:bg-gray-600 text-lime-600 dark:text-lime-400 shadow-sm' 
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                        }
                      `}
                    >
                      <tab.icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Structure Tab */}
                {activeTab === 'structure' && (
                  <div className="space-y-4">
                    {documentType === 'cover-letter' ? (
                      <>
                        {/* ATS Score Analyzer for Cover Letter */}
                        {hasAI && jobData && selectedCVData && (
                          <div className="mb-6">
                            <ATSScoreAnalyzer
                              cvData={selectedCVData.cvData}
                              jobData={jobData}
                              onScoreUpdate={setAtsScore}
                              onRestructure={(restructuredContent) => {
                                console.log('Restructured CV content for cover letter:', restructuredContent);
                                setToastMessage('CV content restructured successfully!');
                                setToastType('success');
                                setShowToast(true);
                              }}
                              onUpdateField={onUpdateField}
                            />
                          </div>
                        )}

                        {/* CV Selection */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select CV</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Choose the CV this cover letter will be based on</p>
                          <CVSelector
                            selectedCVId={selectedCVId}
                            onCVSelect={handleCVSelection}
                            userId={userId}
                          />
                        </div>

                        {/* Personal Information (Auto-filled from CV) */}
                        {(() => {
                          console.log('🔍 Cover Letter Mode - selectedCVData:', selectedCVData);
                          return selectedCVData && (
                          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
                            <div className="p-4">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Personal Information</h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Auto-filled from selected CV</p>
                              <PersonalInfoSection
                                data={selectedCVData.cvData?.basics || {}}
                                onUpdate={(path, value) => onUpdateField(`basics.${path}`, value)}
                                cvData={selectedCVData.cvData}
                                jobData={jobData}
                                isExpanded={true}
                                onToggle={() => {}}
                                atsScore={atsScore}
                                selectedJobId={selectedJobId}
                                onJobSelection={onJobSelection}
                                userId={userId}
                              />
                            </div>
                          </div>
                        );
                        })()}

                        {/* AI Cover Letter Generator */}
                        <div className="mb-6">
                          <AICoverLetterGenerator
                            onGenerate={handleAIGenerate}
                            cvData={selectedCVData}
                            jobData={currentJob || jobData}
                            disabled={!selectedCVId || !selectedJobId}
                          />
                        </div>

                        {/* Cover Letter Content */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                          <div className="p-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cover Letter Content</h3>
                            <textarea
                              className="w-full h-64 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                              placeholder="Write your cover letter content here or use AI to generate it..."
                              value={cvData?.basics?.summary || ''}
                              onChange={(e) => onUpdateField('basics.summary', e.target.value)}
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* ATS Score Analyzer */}
                        {hasAI && jobData && (
                          <div className="mb-6">
                            <ATSScoreAnalyzer
                              cvData={cvData}
                              jobData={jobData}
                              onScoreUpdate={setAtsScore}
                              onRestructure={(restructuredContent) => {
                                // Handle restructured content
                                console.log('Restructured content:', restructuredContent);
                                setToastMessage('CV content restructured successfully!');
                                setToastType('success');
                                setShowToast(true);
                              }}
                              onUpdateField={onUpdateField}
                            />
                          </div>
                        )}

                        {/* Personal Information */}
                        <PersonalInfoSection
                          data={cvData?.basics || {}}
                          onUpdate={(path, value) => onUpdateField(`basics.${path}`, value)}
                          cvData={cvData}
                          jobData={jobData}
                          isExpanded={expandedSections.has('basics')}
                          onToggle={() => toggleSection('basics')}
                          atsScore={atsScore}
                          selectedJobId={selectedJobId}
                          onJobSelection={onJobSelection}
                          userId={userId}
                        />

                        {/* Work Experience */}
                        <WorkExperienceSection
                          data={cvData?.work || []}
                          onUpdate={onUpdateField}
                          onAdd={handleAddWorkExperience}
                          onRemove={handleRemoveWorkExperience}
                          cvData={cvData}
                          jobData={jobData}
                          isExpanded={expandedSections.has('work')}
                          onToggle={() => toggleSection('work')}
                        />

                        {/* Skills */}
                        <SkillsSection
                          data={cvData?.skills || []}
                          onUpdate={onUpdateField}
                          onAdd={handleAddSkillCategory}
                          onRemove={handleRemoveSkillCategory}
                          cvData={cvData}
                          jobData={jobData}
                          isExpanded={expandedSections.has('skills')}
                          onToggle={() => toggleSection('skills')}
                        />

                        {/* Projects */}
                        <ProjectsSection
                          data={cvData?.projects || []}
                          onUpdate={onUpdateField}
                          onAdd={handleAddProject}
                          onRemove={handleRemoveProject}
                          cvData={cvData}
                          jobData={jobData}
                          isExpanded={expandedSections.has('projects')}
                          onToggle={() => toggleSection('projects')}
                        />

                        {/* Languages */}
                        <LanguagesSection
                          data={cvData?.languages || []}
                          onUpdate={onUpdateField}
                          onAdd={handleAddLanguage}
                          onRemove={handleRemoveLanguage}
                          cvData={cvData}
                          jobData={jobData}
                          isExpanded={expandedSections.has('languages')}
                          onToggle={() => toggleSection('languages')}
                        />

                        {/* Certifications */}
                        <CertificationsSection
                          data={cvData?.certificates || []}
                          onUpdate={onUpdateField}
                          onAdd={handleAddCertification}
                          onRemove={handleRemoveCertification}
                          cvData={cvData}
                          jobData={jobData}
                          isExpanded={expandedSections.has('certificates')}
                          onToggle={() => toggleSection('certificates')}
                        />
                      </>
                    )}

                    {/* AI Features Promo */}
                    {!hasAI && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-r from-lime-50 to-lime-100 border border-lime-200 rounded-lg p-3"
                      >
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="p-2 bg-lime-100 rounded-lg">
                            <Brain className="h-5 w-5 text-lime-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">Unlock AI Assistant</h3>
                            <p className="text-sm text-gray-600">Get intelligent suggestions for your CV</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowUpgradeModal(true)}
                          className="w-full bg-lime-600 text-white py-1.5 px-3 rounded-lg text-sm font-medium hover:bg-lime-700 transition-colors flex items-center justify-center space-x-2"
                        >
                          <Crown className="h-4 w-4" />
                          <span>Upgrade to PRO</span>
                        </button>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Design Tab */}
                {activeTab === 'design' && (
                  <DesignPanel
                    settings={designSettings}
                    onSettingsChange={handleDesignSettingsChange}
                    onReset={handleDesignReset}
                  />
                )}

                {/* Template Tab */}
                {activeTab === 'template' && (
                  <TemplatePanel
                    selectedTemplate={selectedTemplateItem}
                    onTemplateSelect={handleTemplateSelect}
                    onPreviewTemplate={handleTemplatePreview}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - CV Preview (55% width with no padding) */}
        <div className="flex-1 bg-[#f8fafe] dark:bg-gray-900 relative">
          <PreviewPanel
            cvData={cvData}
            template={template}
            jobData={jobData}
            zoom={previewZoom}
            setZoom={setPreviewZoom}
            paperSize={previewPaperSize}
            setPaperSize={setPreviewPaperSize}
            documentType={documentType}
            sectionOrder={['basics', 'experience', 'education', 'skills', 'projects', 'certificates', 'languages']}
            pagePadding={previewPagePadding}
            setPagePadding={setPreviewPagePadding}
          />
        </div>
      </div>
    </div>
  );
};

export default EnhancedStudioLayout;
