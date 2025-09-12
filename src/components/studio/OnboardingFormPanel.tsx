'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Briefcase, 
  GraduationCap, 
  Zap, 
  Rocket, 
  Award, 
  Globe, 
  Plus,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ArrowLeft,
  Palette,
  FileText,
  Settings,
  Upload
} from 'lucide-react';
import { CVDataStructure, CVDesignSettings, CVSession } from '@/types/cv';
import { CVSessionService } from '@/lib/services/cvSessionService';
import PersonalInfoStep from '@/components/onboarding/PersonalInfoStep';
import ExperienceStep from '@/components/onboarding/ExperienceStep';
import EducationStep from '@/components/onboarding/EducationStep';
import ParseToolSection from './ParseToolSection';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import LoadingAnimation from '@/components/ui/LoadingAnimation';
import { useTemplateStore } from '@/lib/stores/templateStore';
import AIEnhancedField from '@/components/ui/AIEnhancedField';
import { useTheme } from '@/lib/contexts/ThemeContext';

interface OnboardingFormPanelProps {
  cvData: CVDataStructure | null;
  onUpdateField: (path: string, value: any) => void;
  onAddSection: (sectionType: keyof CVDataStructure, item?: any) => void;
  onRemoveSection: (sectionType: keyof CVDataStructure, id: string) => void;
  isCollapsed: boolean;
  onTogglePanel: () => void;
  pagePadding?: { top: number; bottom: number };
  setPagePadding?: (padding: { top: number; bottom: number }) => void;
  onSaveDesignSettings?: (settings: CVDesignSettings) => void;
  onSaveTemplate?: (templateId: string, templateName: string) => void;
  designSettings?: CVDesignSettings;
  selectedTemplate?: any;
  cvId?: string;
  userId?: string;
  onSessionUpdate?: (session: CVSession) => void;
}

// Sortable Section Icon Component
const SortableSectionIcon = ({ section, isActive, onClick }: { 
  section: any; 
  isActive: boolean; 
  onClick: () => void;
}) => {
  const { theme } = useTheme();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = section.icon;

  const handleClick = (e: React.MouseEvent) => {
    // Prevent click when dragging
    if (isDragging) {
      e.preventDefault();
      return;
    }
    onClick();
  };

  return (
    <div className="relative">
      <button
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={handleClick}
        className={`p-2 rounded-lg transition-all duration-200 cursor-grab active:cursor-grabbing hover:scale-105 ${
          isActive
            ? 'bg-lime-600 text-white shadow-lg'
            : theme === 'dark'
            ? 'text-gray-300 hover:text-white hover:bg-gray-700'
            : 'text-gray-600 hover:text-lime-600 hover:bg-lime-100'
        } ${isDragging ? 'z-50' : ''}`}
        title={`${section.label} (Drag to reorder)`}
      >
        <Icon size={18} />
      </button>
      {isDragging && (
        <div className="absolute inset-0 bg-lime-600/20 rounded-lg border-2 border-lime-400 border-dashed"></div>
      )}
    </div>
  );
};

const OnboardingFormPanel: React.FC<OnboardingFormPanelProps> = ({
  cvData,
  onUpdateField,
  onAddSection,
  onRemoveSection,
  isCollapsed,
  onTogglePanel,
  pagePadding,
  setPagePadding,
  onSaveDesignSettings,
  onSaveTemplate,
  designSettings,
  selectedTemplate: initialSelectedTemplate,
  cvId,
  userId,
  onSessionUpdate
}) => {
  const [activeTab, setActiveTab] = useState<'structure' | 'design' | 'template'>('structure');
  const [activeSection, setActiveSection] = useState<'parse' | 'basics' | 'work' | 'education' | 'skills' | 'projects' | 'certificates' | 'languages'>('parse');
  const [sectionOrder, setSectionOrder] = useState([
    'parse',
    'basics',
    'work', 
    'education',
    'skills',
    'projects',
    'certificates',
    'languages'
  ]);
  const [panelWidth, setPanelWidth] = useState(600);
  const [isDragging, setIsDragging] = useState(false);

  // Design tab state - use passed settings or defaults
  const [headerFontSize, setHeaderFontSize] = useState(designSettings?.headerFontSize || 24);
  const [bodyFontSize, setBodyFontSize] = useState(designSettings?.bodyFontSize || 14);
  const [sectionFontSize, setSectionFontSize] = useState(designSettings?.sectionFontSize || 18);
  const [lineSpacing, setLineSpacing] = useState(designSettings?.lineSpacing || 1.2);
  const [selectedFont, setSelectedFont] = useState(designSettings?.fontFamily || 'Inter');
  const [letterSpacing, setLetterSpacing] = useState(designSettings?.letterSpacing || 0);
  const [sectionSpacing, setSectionSpacing] = useState(designSettings?.sectionSpacing || 16);
  const [colorScheme, setColorScheme] = useState(designSettings?.colorScheme || 'professional');
  
  // CV Session management
  const [currentSession, setCurrentSession] = useState<CVSession | null>(null);

  // Handle panel resizing
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const newWidth = e.clientX;
    const minWidth = 400;
    const maxWidth = 1000; // Increased max width
    
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setPanelWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  // Get templates from store
  const { templates, selectedTemplate, setSelectedTemplate } = useTemplateStore();
  const { theme } = useTheme();

  // Initialize CV Session
  useEffect(() => {
    if (cvId && userId && cvData && selectedTemplate) {
      // Try to load existing session
      let session = CVSessionService.loadSession(cvId, userId);
      
      if (!session) {
        // Create new session if none exists
        const designSettings: CVDesignSettings = {
          fontFamily: selectedFont,
          headerFontSize,
          bodyFontSize,
          sectionFontSize,
          lineSpacing,
          letterSpacing,
          sectionSpacing,
          pagePadding: pagePadding || { top: 32, bottom: 32 },
          colorScheme,
          templateId: selectedTemplate.id,
          templateName: selectedTemplate.name
        };
        
        session = CVSessionService.createSession(
          cvId,
          userId,
          cvData,
          selectedTemplate,
          designSettings
        );
      }
      
      setCurrentSession(session);
      onSessionUpdate?.(session);
    }
  }, [cvId, userId, cvData, selectedTemplate]);

  // Update session when design settings change
  const updateSessionWithDesignSettings = useCallback(() => {
    if (currentSession && cvData) {
      const designSettings: CVDesignSettings = {
        fontFamily: selectedFont,
        headerFontSize,
        bodyFontSize,
        sectionFontSize,
        lineSpacing,
        letterSpacing,
        sectionSpacing,
        pagePadding: pagePadding || { top: 32, bottom: 32 },
        colorScheme,
        templateId: selectedTemplate?.id,
        templateName: selectedTemplate?.name
      };
      
      const updatedSession = CVSessionService.updateSession(currentSession, {
        cvData,
        designSettings,
        layout: {
          sectionOrder,
          activeSection,
          panelWidth,
          isCollapsed
        }
      });
      
      setCurrentSession(updatedSession);
      onSessionUpdate?.(updatedSession);
      
      // Auto-save session
      CVSessionService.debouncedAutoSave(updatedSession);
    }
  }, [
    currentSession, cvData, selectedFont, headerFontSize, bodyFontSize, 
    sectionFontSize, lineSpacing, letterSpacing, sectionSpacing, 
    pagePadding, colorScheme, selectedTemplate, sectionOrder, 
    activeSection, panelWidth, isCollapsed, onSessionUpdate
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Debug logging
  console.log('🔍 OnboardingFormPanel received cvData:', cvData);
  console.log('🔍 cvData type:', typeof cvData);
  console.log('🔍 cvData.basics:', cvData?.basics);
  console.log('🔍 cvData.work:', cvData?.work);
  console.log('🔍 Active tab:', activeTab);
  console.log('🔍 Active section:', activeSection);
  console.log('🔍 Section order:', sectionOrder);

  // Monitor section order changes
  useEffect(() => {
    console.log('🔍 Section order updated:', sectionOrder);
  }, [sectionOrder]);

  // Function to calculate progress for each section
  const calculateSectionProgress = (sectionId: string): number => {
    if (!cvData) return 0;
    
    switch (sectionId) {
      case 'parse':
        // Parse is completed if CV data exists
        return cvData.basics ? 100 : 0;
      
      case 'basics':
        // Personal Info progress based on required fields
        const basics = cvData.basics;
        if (!basics) return 0;
        
        let basicsProgress = 0;
        if (basics.name) basicsProgress += 25;
        if (basics.email) basicsProgress += 25;
        if (basics.phone) basicsProgress += 25;
        if (basics.summary && basics.location?.city) basicsProgress += 25;
        return Math.min(basicsProgress, 100);
      
      case 'work':
        // Experience progress based on completeness
        const work = cvData.work;
        if (!work || work.length === 0) return 0;
        
        const firstWork = work[0];
        let workProgress = 0;
        if (firstWork.name) workProgress += 25;
        if (firstWork.position) workProgress += 25;
        if (firstWork.startDate) workProgress += 25;
        if (firstWork.summary) workProgress += 25;
        return Math.min(workProgress, 100);
      
      case 'education':
        // Education progress based on completeness
        const education = cvData.education;
        if (!education || education.length === 0) return 0;
        
        const firstEducation = education[0];
        let educationProgress = 0;
        if (firstEducation.institution) educationProgress += 25;
        if (firstEducation.studyType) educationProgress += 25;
        if (firstEducation.area) educationProgress += 25;
        if (firstEducation.startDate) educationProgress += 25;
        return Math.min(educationProgress, 100);
      
      case 'skills':
        // Skills progress based on number and completeness
        const skills = cvData.skills;
        if (!skills || skills.length === 0) return 0;
        
        let skillsProgress = 0;
        if (skills.length >= 1) skillsProgress += 25;
        if (skills.length >= 2) skillsProgress += 25;
        if (skills.length >= 3) skillsProgress += 25;
        if (skills.length >= 4) skillsProgress += 25;
        return Math.min(skillsProgress, 100);
      
      case 'projects':
        // Projects progress based on completeness
        const projects = cvData.projects;
        if (!projects || projects.length === 0) return 0;
        
        const firstProject = projects[0];
        let projectsProgress = 0;
        if (firstProject.name) projectsProgress += 25;
        if (firstProject.description) projectsProgress += 25;
        if (firstProject.startDate) projectsProgress += 25;
        if (firstProject.highlights && firstProject.highlights.length > 0) projectsProgress += 25;
        return Math.min(projectsProgress, 100);
      
      case 'certificates':
        // Certificates are optional - show progress but don't penalize
        const certificates = cvData.certificates;
        if (!certificates || certificates.length === 0) return 0;
        
        const firstCertificate = certificates[0];
        let certificatesProgress = 0;
        if (firstCertificate.name) certificatesProgress += 25;
        if (firstCertificate.issuer) certificatesProgress += 25;
        if (firstCertificate.date) certificatesProgress += 25;
        if (firstCertificate.url) certificatesProgress += 25;
        return Math.min(certificatesProgress, 100);
      
      case 'languages':
        // Languages are optional - show progress but don't penalize
        const languages = cvData.languages;
        if (!languages || languages.length === 0) return 0;
        
        let languagesProgress = 0;
        if (languages.length >= 1) languagesProgress += 25;
        if (languages.length >= 2) languagesProgress += 25;
        if (languages.length >= 3) languagesProgress += 25;
        if (languages.length >= 4) languagesProgress += 25;
        return Math.min(languagesProgress, 100);
      
      default:
        return 0;
    }
  };

  // Function to get progress color based on percentage
  const getProgressColor = (progress: number): string => {
    if (progress >= 100) return 'bg-lime-500';
    if (progress >= 75) return 'bg-lime-400';
    if (progress >= 50) return 'bg-lime-300';
    if (progress >= 25) return 'bg-lime-200';
    return 'bg-lime-100';
  };

  const sections = [
    { id: 'parse', label: 'Parse CV', icon: Upload },
    { id: 'basics', label: 'Personal Info', icon: User },
    { id: 'work', label: 'Experience', icon: Briefcase },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'skills', label: 'Skills', icon: Zap },
    { id: 'projects', label: 'Projects', icon: Rocket },
    { id: 'certificates', label: 'Certifications', icon: Award },
    { id: 'languages', label: 'Languages', icon: Globe },
  ];

  // Sort sections based on the order
  const orderedSections = sectionOrder.map(id => 
    sections.find(section => section.id === id)
  ).filter(Boolean);

  // Add scroll detection to update active section
  useEffect(() => {
    const handleScroll = () => {
      const container = document.querySelector('.overflow-y-auto');
      if (!container) return;

      const sections = orderedSections.filter(Boolean);
      const containerRect = container.getBoundingClientRect();
      const containerTop = containerRect.top;
      
      let closestSection = null;
      let minDistance = Infinity;
      
      for (const section of sections) {
        if (!section) continue;
        const sectionElement = document.getElementById(`section-${section.id}`);
        if (sectionElement) {
          const rect = sectionElement.getBoundingClientRect();
          const sectionTop = rect.top;
          const distance = Math.abs(sectionTop - containerTop);
          
          // Check if section is visible in viewport
          const isVisible = rect.top <= containerTop + 150 && rect.bottom >= containerTop + 50;
          
          if (isVisible && distance < minDistance) {
            minDistance = distance;
            closestSection = section;
          }
        }
      }
      
      if (closestSection && activeSection !== closestSection.id) {
        console.log('🔍 Auto-updating active section to:', closestSection.id);
        setActiveSection(closestSection.id as any);
      }
    };

    const container = document.querySelector('.overflow-y-auto');
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [orderedSections, activeSection]);

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    
    console.log('🔍 Drag end event:', { activeId: active?.id, overId: over?.id });

    if (active.id !== over.id) {
      console.log('🔍 Reordering sections:', { from: active.id, to: over.id });
      
      setSectionOrder((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        
        console.log('🔍 Current section order:', items);
        console.log('🔍 Indices:', { oldIndex, newIndex });
        
        if (oldIndex === -1 || newIndex === -1) {
          console.warn('Invalid section indices:', { oldIndex, newIndex, activeId: active.id, overId: over.id });
          return items;
        }
        
        const newOrder = arrayMove(items, oldIndex, newIndex);
        console.log('🔍 New section order:', newOrder);
        
        // Here you could also update the CV data structure to reflect the new order
        // For example, you might want to store the section order in the CV data
        if (cvData) {
          // You could add a sectionOrder field to the CV data structure
          // onUpdateField('sectionOrder', newOrder);
        }
        
        return newOrder;
      });
    }
  };

  const handleDragStart = (event: any) => {
    console.log('🔍 Drag start event:', event.active?.id || 'unknown');
  };

  // Create a mock onboarding context that works with the Studio's data
  const createMockOnboardingContext = () => ({
    state: {
      cvData: cvData || {
        basics: {
          name: '',
          label: '',
          image: '',
          email: '',
          phone: '',
          url: '',
          summary: '',
          location: {
            address: '',
            postalCode: '',
            city: '',
            countryCode: '',
            region: ''
          },
          profiles: []
        },
        work: [],
        volunteer: [],
        education: [],
        awards: [],
        certificates: [],
        publications: [],
        skills: [],
        languages: [],
        interests: [],
        references: [],
        projects: []
      }
    },
    dispatch: (action: any) => {
      if (action.type === 'UPDATE_CV_DATA') {
        // Convert the onboarding context update to Studio's updateField format
        Object.entries(action.payload).forEach(([section, value]) => {
          if (section === 'basics') {
            Object.entries(value as any).forEach(([field, fieldValue]) => {
              if (field === 'location') {
                Object.entries(fieldValue as any).forEach(([locField, locValue]) => {
                  onUpdateField(`basics.location.${locField}`, locValue);
                });
              } else {
                onUpdateField(`basics.${field}`, fieldValue);
              }
            });
          } else {
            onUpdateField(section, value);
          }
        });
      }
    }
  });

  const mockContext = createMockOnboardingContext();

  const renderSectionForSection = (sectionId: string) => {
    if (!cvData) {
      console.log('❌ No cvData available, showing loading state');
      return (
        <div className="p-4 text-gray-400">
          <div className="text-center">
            <LoadingAnimation progress={0.3} showProgressBar={false} />
            <p className="text-sm">Loading CV data...</p>
          </div>
        </div>
      );
    }

    // Validate that cvData has the expected structure
    if (!cvData.basics || typeof cvData.basics !== 'object') {
      console.error('❌ Invalid cvData structure:', cvData);
      return (
        <div className="p-4 text-red-400">
          <p className="text-sm">Error: Invalid CV data structure</p>
          <p className="text-xs mt-2">Please refresh the page or try again.</p>
          <pre className="text-xs mt-2 bg-gray-800 p-2 rounded overflow-auto">
            {JSON.stringify(cvData, null, 2)}
          </pre>
        </div>
      );
    }

    console.log(`✅ Rendering section: ${sectionId}`, cvData[sectionId as keyof CVDataStructure]);
    console.log(`✅ Available CV data keys:`, Object.keys(cvData));

    switch (sectionId) {
      case 'parse':
        return (
          <ParseToolSection
            onCVParsed={(parsedData) => {
              console.log('🔍 ParseTool - Received parsed data:', parsedData);
              // Update the CV data with parsed information
              if (parsedData.basics) {
                Object.entries(parsedData.basics).forEach(([key, value]) => {
                  onUpdateField(`basics.${key}`, value);
                });
              }
              if (parsedData.work) {
                parsedData.work.forEach((workItem: any, index: number) => {
                  onUpdateField(`work.${index}`, workItem);
                });
              }
              if (parsedData.education) {
                parsedData.education.forEach((eduItem: any, index: number) => {
                  onUpdateField(`education.${index}`, eduItem);
                });
              }
              if (parsedData.skills) {
                parsedData.skills.forEach((skillItem: any, index: number) => {
                  onUpdateField(`skills.${index}`, skillItem);
                });
              }
              // Switch to the next section after parsing
              setActiveSection('basics');
            }}
            isActive={true}
          />
        );
      case 'basics':
        return (
          <PersonalInfoStepContent 
            cvData={cvData}
            onUpdateField={onUpdateField}
            mockContext={mockContext}
          />
        );
      case 'work':
        return (
          <ExperienceStepContent 
            cvData={cvData}
            onUpdateField={onUpdateField}
            onAddSection={onAddSection}
            onRemoveSection={onRemoveSection}
            mockContext={mockContext}
          />
        );
      case 'education':
        return (
          <EducationStepContent 
            cvData={cvData}
            onUpdateField={onUpdateField}
            onAddSection={onAddSection}
            onRemoveSection={onRemoveSection}
            mockContext={mockContext}
          />
        );
      case 'skills':
        return (
          <SkillsStepContent 
            cvData={cvData}
            onUpdateField={onUpdateField}
            onAddSection={onAddSection}
            onRemoveSection={onRemoveSection}
            mockContext={mockContext}
          />
        );
      case 'projects':
        return (
          <ProjectsStepContent 
            cvData={cvData}
            onUpdateField={onUpdateField}
            onAddSection={onAddSection}
            onRemoveSection={onRemoveSection}
            mockContext={mockContext}
          />
        );
      case 'certificates':
        return (
          <CertificatesStepContent 
            cvData={cvData}
            onUpdateField={onUpdateField}
            onAddSection={onAddSection}
            onRemoveSection={onRemoveSection}
            mockContext={mockContext}
          />
        );
      case 'languages':
        return (
          <LanguagesStepContent 
            cvData={cvData}
            onUpdateField={onUpdateField}
            onAddSection={onAddSection}
            onRemoveSection={onRemoveSection}
            mockContext={mockContext}
          />
        );
      default:
        return (
          <div className="p-4 text-gray-400">
            <p className="text-sm">Section not found: {sectionId}</p>
          </div>
        );
    }
  };

  const getSectionDescription = (sectionId: string) => {
    switch (sectionId) {
      case 'parse':
        return 'Upload your CV file to parse and extract key information.';
      case 'basics':
        return 'Enter your personal information, including name, title, and contact details.';
      case 'work':
        return 'List your work experience, including positions, companies, and dates.';
      case 'education':
        return 'Add your educational background, degrees, and fields of study.';
      case 'skills':
        return 'List your skills and proficiency levels.';
      case 'projects':
        return 'Detail your notable projects, including descriptions and dates.';
      case 'certificates':
        return 'Add your certifications and their issuing authorities.';
      case 'languages':
        return 'List your fluency levels in different languages.';
      default:
        return '';
    }
  };

  const renderDesignTab = () => {
    const professionalFonts = [
      { name: 'Inter', value: 'Inter', preview: 'Inter' },
      { name: 'Roboto', value: 'Roboto', preview: 'Roboto' },
      { name: 'Open Sans', value: 'Open Sans', preview: 'Open Sans' },
      { name: 'Lato', value: 'Lato', preview: 'Lato' },
      { name: 'Poppins', value: 'Poppins', preview: 'Poppins' },
      { name: 'Source Sans Pro', value: 'Source Sans Pro', preview: 'Source Sans Pro' },
      { name: 'Nunito', value: 'Nunito', preview: 'Nunito' },
      { name: 'Work Sans', value: 'Work Sans', preview: 'Work Sans' }
    ];

    return (
      <div className={`p-6 space-y-6 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
        <h3 className={`text-lg font-semibold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Design Settings
        </h3>
        
        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column - Typography */}
          <div className="space-y-6">
            {/* Font Selection */}
            <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h4 className={`text-sm font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Typography
              </h4>
              
              <div className="space-y-4">
                {/* Font Family */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Font Family
                  </label>
                  <select
                    value={selectedFont}
                    onChange={(e) => {
                      setSelectedFont(e.target.value);
                      updateSessionWithDesignSettings();
                    }}
                    className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-lime-500 focus:ring-lime-500' 
                        : 'bg-white border-gray-300 text-gray-900 focus:border-lime-500 focus:ring-lime-500'
                    }`}
                  >
                    {professionalFonts.map((font) => (
                      <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                        {font.name}
                      </option>
                    ))}
                  </select>
                  <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Preview: <span style={{ fontFamily: selectedFont }}>{selectedFont}</span>
                  </div>
                </div>

                {/* Header Font Size */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Header Font Size
                  </label>
                  <input
                    type="range"
                    min="12"
                    max="48"
                    value={headerFontSize}
                    onChange={(e) => {
                      setHeaderFontSize(parseInt(e.target.value));
                      updateSessionWithDesignSettings();
                    }}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {headerFontSize}px
                  </div>
                </div>

                {/* Body Font Size */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Body Font Size
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="20"
                    value={bodyFontSize}
                    onChange={(e) => setBodyFontSize(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {bodyFontSize}px
                  </div>
                </div>

                {/* Section Title Font Size */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Section Title Font Size
                  </label>
                  <input
                    type="range"
                    min="14"
                    max="32"
                    value={sectionFontSize}
                    onChange={(e) => setSectionFontSize(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {sectionFontSize}px
                  </div>
                </div>
              </div>
            </div>

            {/* Spacing */}
            <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h4 className={`text-sm font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Spacing
              </h4>
              
              <div className="space-y-4">
                {/* Line Spacing */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Line Spacing
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="2"
                    step="0.1"
                    value={lineSpacing}
                    onChange={(e) => setLineSpacing(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {lineSpacing}
                  </div>
                </div>

                {/* Letter Spacing */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Letter Spacing
                  </label>
                  <input
                    type="range"
                    min="-2"
                    max="4"
                    step="0.5"
                    value={letterSpacing}
                    onChange={(e) => setLetterSpacing(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {letterSpacing}px
                  </div>
                </div>

                {/* Section Spacing */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Section Spacing
                  </label>
                  <input
                    type="range"
                    min="8"
                    max="32"
                    value={sectionSpacing}
                    onChange={(e) => setSectionSpacing(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {sectionSpacing}px
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Layout & Padding */}
          <div className="space-y-6">
            {/* Page Layout */}
            <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h4 className={`text-sm font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Page Layout
              </h4>
              
              <div className="space-y-4">
                {/* Page Padding Controls */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Top Padding
                  </label>
                  <input
                    type="range"
                    min="16"
                    max="64"
                    value={pagePadding?.top || 32}
                    onChange={(e) => setPagePadding?.({ 
                      top: parseInt(e.target.value), 
                      bottom: pagePadding?.bottom || 32 
                    })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {pagePadding?.top || 32}px
                  </div>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Bottom Padding
                  </label>
                  <input
                    type="range"
                    min="16"
                    max="64"
                    value={pagePadding?.bottom || 32}
                    onChange={(e) => setPagePadding?.({ 
                      top: pagePadding?.top || 32, 
                      bottom: parseInt(e.target.value) 
                    })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {pagePadding?.bottom || 32}px
                  </div>
                </div>
              </div>
            </div>

            {/* Color Scheme */}
            <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h4 className={`text-sm font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Color Scheme
              </h4>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <button className={`p-3 rounded-lg border-2 transition-all ${
                    theme === 'dark' 
                      ? 'border-lime-500 bg-lime-500/20 text-white' 
                      : 'border-lime-500 bg-lime-50 text-gray-900'
                  }`}>
                    <div className="text-xs font-medium mb-1">Professional</div>
                    <div className="text-xs opacity-70">Black & White</div>
                  </button>
                  
                  <button className={`p-3 rounded-lg border-2 transition-all ${
                    theme === 'dark' 
                      ? 'border-gray-600 bg-gray-700 text-gray-300 hover:border-lime-500' 
                      : 'border-gray-200 bg-white text-gray-700 hover:border-lime-500'
                  }`}>
                    <div className="text-xs font-medium mb-1">Modern</div>
                    <div className="text-xs opacity-70">Blue Accent</div>
                  </button>
                  
                  <button className={`p-3 rounded-lg border-2 transition-all ${
                    theme === 'dark' 
                      ? 'border-gray-600 bg-gray-700 text-gray-300 hover:border-lime-500' 
                      : 'border-gray-200 bg-white text-gray-700 hover:border-lime-500'
                  }`}>
                    <div className="text-xs font-medium mb-1">Creative</div>
                    <div className="text-xs opacity-70">Colorful</div>
                  </button>
                  
                  <button className={`p-3 rounded-lg border-2 transition-all ${
                    theme === 'dark' 
                      ? 'border-gray-600 bg-gray-700 text-gray-300 hover:border-lime-500' 
                      : 'border-gray-200 bg-white text-gray-700 hover:border-lime-500'
                  }`}>
                    <div className="text-xs font-medium mb-1">Minimal</div>
                    <div className="text-xs opacity-70">Clean Lines</div>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h4 className={`text-sm font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Quick Actions
              </h4>
              
              <div className="space-y-2">
                <button className={`w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                  theme === 'dark' 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>
                  Reset to Default
                </button>
                
                <button className={`w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                  theme === 'dark' 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>
                  Save as Preset
                </button>
                
                <button className={`w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                  theme === 'dark' 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>
                  Preview Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTemplateTab = () => {
    if (templates.length === 0) {
      return (
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Template</h3>
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400 text-sm">No templates available</p>
            <p className="text-gray-500 text-xs mt-2">Templates will be loaded from the database</p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Template</h3>
        <div className="grid grid-cols-2 gap-3">
          {templates.map((template) => (
            <div
              key={template.id}
              onClick={() => setSelectedTemplate(template)}
              className={`relative cursor-pointer rounded-lg border-2 transition-all ${
                selectedTemplate?.id === template.id
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-200 bg-gray-100 hover:border-gray-200'
              }`}
            >
              <div className="aspect-[3/4] bg-gray-200 rounded-t-lg flex items-center justify-center">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <div className="p-2">
                <p className="text-xs text-gray-700 text-center">{template.name}</p>
                <p className="text-xs text-gray-500 text-center mt-1">{template.category}</p>
              </div>
              {selectedTemplate?.id === template.id && (
                <div className="absolute top-1 right-1 w-3 h-3 bg-blue-500 rounded-full"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };



      return (
      <div className={`h-full flex flex-col ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>

      {/* Tab Navigation */}
      <div className={`flex border-b transition-colors ${
        theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
      }`}>
        {[
          { id: 'structure', label: 'Structure', icon: FileText },
          { id: 'design', label: 'Design', icon: Palette },
          { id: 'template', label: 'Template', icon: Settings }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? theme === 'dark'
                  ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                  : 'bg-white text-gray-900 border-b-2 border-blue-500'
                : theme === 'dark'
                ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Section Icons */}
        {activeTab === 'structure' && (
          <div className={`w-16 border-r transition-colors shadow-lg ${
            theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
          }`}>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={orderedSections.map(s => s?.id || '')} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col items-center justify-center h-full py-4 space-y-3">
                  {orderedSections.map((section) => (
                    section && (
                      <SortableSectionIcon
                        key={section.id}
                        section={section}
                        isActive={activeSection === section.id}
                        onClick={() => {
                          console.log('🔍 Section icon clicked:', section.id);
                          console.log('🔍 Previous active section:', activeSection);
                          setActiveSection(section.id as any);
                          console.log('🔍 New active section will be:', section.id);
                          
                          // Scroll to the section with better positioning
                          const sectionElement = document.getElementById(`section-${section.id}`);
                          const container = document.querySelector('.overflow-y-auto');
                          if (sectionElement && container) {
                            const containerRect = container.getBoundingClientRect();
                            const sectionRect = sectionElement.getBoundingClientRect();
                            const scrollTop = container.scrollTop;
                            const targetScrollTop = scrollTop + sectionRect.top - containerRect.top - 20; // 20px offset
                            
                            container.scrollTo({
                              top: targetScrollTop,
                              behavior: 'smooth'
                            });
                          }
                        }}
                      />
                    )
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {/* Right Content - Draggable Panel */}
        <div className="relative flex-1 flex overflow-hidden">
          {/* Main Content Panel */}
          <div 
            className={`transition-colors shadow-lg flex-shrink-0 ${
              theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
            }`}
            style={{ width: `${panelWidth}px`, minWidth: `${panelWidth}px` }}
          >
            <div className={`h-full overflow-y-auto transition-colors ${
              theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
            }`}>
          {activeTab === 'structure' && (
            <div className="space-y-6 p-6">
              {orderedSections.map((section, index) => (
                section && (
                  <div
                    key={section.id}
                    id={`section-${section.id}`}
                    className={`transition-all duration-300 rounded-lg shadow-sm border ${
                      activeSection === section.id 
                        ? theme === 'dark'
                          ? 'bg-gray-800 border-blue-500 shadow-blue-500/10' 
                          : 'bg-white border-lime-500 shadow-lime-500/10'
                        : theme === 'dark'
                        ? 'bg-gray-800 border-gray-700'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    {/* Section Header */}
                    <div className={`px-6 py-4 border-b transition-all duration-300 ${
                      activeSection === section.id 
                        ? theme === 'dark'
                          ? 'bg-gray-800 border-gray-600' 
                          : 'bg-lime-50 border-lime-200'
                        : theme === 'dark'
                        ? 'bg-gray-800 border-gray-700'
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg transition-colors duration-300 ${
                          activeSection === section.id 
                            ? theme === 'dark'
                              ? 'bg-blue-600 text-white'
                              : 'bg-lime-600 text-white'
                            : theme === 'dark'
                            ? 'bg-gray-700 text-gray-300'
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          <section.icon size={18} />
                        </div>
                        <div>
                          <h3 className={`text-base font-semibold transition-colors duration-300 ${
                            activeSection === section.id 
                              ? theme === 'dark' ? 'text-white' : 'text-gray-900'
                              : theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            {section.label}
                          </h3>
                                                     
                           {/* Progress Bar */}
                           <div className="mt-2">
                             <div className="flex items-center gap-2">
                               <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                 <div 
                                   className={`h-full rounded-full transition-all duration-300 ${getProgressColor(calculateSectionProgress(section.id))}`}
                                   style={{ width: `${calculateSectionProgress(section.id)}%` }}
                                 />
                               </div>
                               <span className={`text-xs font-medium ${
                                 theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                               }`}>
                                 {calculateSectionProgress(section.id)}%
                               </span>
                             </div>
                           </div>
                        </div>
                        {activeSection === section.id && (
                          <div className="ml-auto w-2 h-2 bg-lime-500 rounded-full animate-pulse"></div>
                        )}
                      </div>
                    </div>

                    {/* Section Content */}
                    <div className="px-6 py-6">
                      {renderSectionForSection(section.id)}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}

          {activeTab === 'design' && (
            <div className="p-6">
              {renderDesignTab()}
            </div>
          )}

                     {activeTab === 'template' && (
             <div className="p-6">
               {renderTemplateTab()}
             </div>
           )}
             </div>
           </div>

           {/* Resize Handle */}
           <div
             className={`w-1 cursor-col-resize transition-colors ${
               theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-300 hover:bg-gray-400'
             } ${isDragging ? 'bg-lime-500' : ''}`}
             onMouseDown={handleMouseDown}
           />
         </div>
       </div>
     </div>
   );
};

// Adapted PersonalInfoStep content for Studio
const PersonalInfoStepContent: React.FC<{
  cvData: CVDataStructure;
  onUpdateField: (path: string, value: any) => void;
  mockContext: any;
}> = ({ cvData, onUpdateField, mockContext }) => {
  // Debug logging
  console.log('🔍 PersonalInfoStepContent received cvData:', cvData);
  console.log('🔍 cvData.basics:', cvData.basics);
  console.log('🔍 cvData.basics.name:', cvData.basics?.name);
  console.log('🔍 cvData.basics.email:', cvData.basics?.email);

  const handleInputChange = (field: string, value: string) => {
    console.log(`🔍 Updating basics.${field} to:`, value);
    onUpdateField(`basics.${field}`, value);
  };

  const handleLocationChange = (field: string, value: string) => {
    console.log(`🔍 Updating basics.location.${field} to:`, value);
    onUpdateField(`basics.location.${field}`, value);
  };

  return (
    <div className="space-y-4">
              <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
          <input
            type="text"
            value={cvData.basics?.name || ''}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            placeholder="John Doe"
          />
        </div>

              <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Professional Title</label>
          <input
            type="text"
            value={cvData.basics?.label || ''}
            onChange={(e) => handleInputChange('label', e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            placeholder="Software Engineer"
          />
        </div>

              <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
          <input
            type="email"
            value={cvData.basics?.email || ''}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            placeholder="john@example.com"
          />
        </div>

              <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="tel"
            value={cvData.basics?.phone || ''}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            placeholder="+1 (555) 123-4567"
          />
        </div>

              <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
          <input
            type="text"
            value={cvData.basics?.location?.city || ''}
            onChange={(e) => handleLocationChange('city', e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            placeholder="San Francisco"
          />
        </div>

              <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">State/Region</label>
          <input
            type="text"
            value={cvData.basics?.location?.region || ''}
            onChange={(e) => handleLocationChange('region', e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            placeholder="California"
          />
        </div>

              <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Website</label>
          <input
            type="url"
            value={cvData.basics?.url || ''}
            onChange={(e) => handleInputChange('url', e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            placeholder="https://johndoe.com"
          />
        </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Professional Summary</label>
        <textarea
          value={cvData.basics?.summary || ''}
          onChange={(e) => handleInputChange('summary', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
          placeholder="Experienced software engineer with 5+ years..."
        />
      </div>
    </div>
  );
};

// Adapted ExperienceStep content for Studio
const ExperienceStepContent: React.FC<{
  cvData: CVDataStructure;
  onUpdateField: (path: string, value: any) => void;
  onAddSection: (sectionType: keyof CVDataStructure, item?: any) => void;
  onRemoveSection: (sectionType: keyof CVDataStructure, id: string) => void;
  mockContext: any;
}> = ({ cvData, onUpdateField, onAddSection, onRemoveSection, mockContext }) => {
  // Debug logging
  console.log('ExperienceStepContent received cvData:', cvData);
  console.log('cvData.work:', cvData.work);

  const addWorkExperience = () => {
    const newWork = {
      name: '',
      position: '',
      url: '',
      startDate: '',
      endDate: '',
      summary: '',
      highlights: ['']
    };
    console.log('Adding new work experience:', newWork);
    onAddSection('work', newWork);
  };

  const updateWorkExperience = (index: number, field: string, value: any) => {
    console.log(`Updating work[${index}].${field} to:`, value);
    const updatedWork = [...(cvData.work || [])];
    updatedWork[index] = { ...updatedWork[index], [field]: value };
    onUpdateField('work', updatedWork);
  };

  const removeWorkExperience = (index: number) => {
    console.log(`Removing work experience at index:`, index);
    const updatedWork = (cvData.work || []).filter((_, i) => i !== index);
    onUpdateField('work', updatedWork);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={addWorkExperience}
          className="flex items-center gap-2 px-3 py-1.5 bg-lime-600 text-white rounded-md hover:bg-lime-700 transition-colors shadow-sm"
        >
          <Plus size={14} />
          <span className="text-xs font-medium">Add Experience</span>
        </button>
      </div>

                      {(cvData.work || []).map((work, index) => (
          <div key={index} className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">Experience #{index + 1}</h4>
            <button
              onClick={() => removeWorkExperience(index)}
              className="text-red-600 hover:text-red-700 text-xs font-medium"
            >
              Remove
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Position</label>
              <input
                type="text"
                value={work.position || ''}
                onChange={(e) => updateWorkExperience(index, 'position', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                placeholder="Software Engineer"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Company</label>
              <input
                type="text"
                value={work.name || ''}
                onChange={(e) => updateWorkExperience(index, 'name', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                placeholder="Tech Company Inc."
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="text"
                  value={work.startDate || ''}
                  onChange={(e) => updateWorkExperience(index, 'startDate', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                  placeholder="Jan 2020"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="text"
                  value={work.endDate || ''}
                  onChange={(e) => updateWorkExperience(index, 'endDate', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                  placeholder="Present"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={work.summary || ''}
                onChange={(e) => updateWorkExperience(index, 'summary', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-gray-200 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe your role and achievements..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Key Achievements</label>
              <textarea
                value={work.highlights?.join('\n') || ''}
                onChange={(e) => updateWorkExperience(index, 'highlights', e.target.value.split('\n').filter(line => line.trim()))}
                rows={3}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="• Led a team of 5 developers...&#10;• Increased performance by 25%...&#10;• Implemented new features..."
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Adapted EducationStep content for Studio
const EducationStepContent: React.FC<{
  cvData: CVDataStructure;
  onUpdateField: (path: string, value: any) => void;
  onAddSection: (sectionType: keyof CVDataStructure, item?: any) => void;
  onRemoveSection: (sectionType: keyof CVDataStructure, id: string) => void;
  mockContext: any;
}> = ({ cvData, onUpdateField, onAddSection, onRemoveSection, mockContext }) => {
  const addEducation = () => {
    const newEducation = {
      institution: '',
      area: '',
      studyType: '',
      startDate: '',
      endDate: '',
      score: '',
      courses: []
    };
    onAddSection('education', newEducation);
  };

  const updateEducation = (index: number, field: string, value: any) => {
    const updatedEducation = [...(cvData.education || [])];
    updatedEducation[index] = { ...updatedEducation[index], [field]: value };
    onUpdateField('education', updatedEducation);
  };

  const removeEducation = (index: number) => {
    const updatedEducation = (cvData.education || []).filter((_, i) => i !== index);
    onUpdateField('education', updatedEducation);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={addEducation}
          className="flex items-center gap-2 px-3 py-2 bg-lime-600 text-white rounded-md hover:bg-lime-700 transition-colors"
        >
          <Plus size={16} />
          <span className="text-sm">Add Education</span>
        </button>
      </div>

      {(cvData.education || []).map((education, index) => (
        <div key={index} className="p-4 bg-gray-100 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Education #{index + 1}</h4>
            <button
              onClick={() => removeEducation(index)}
              className="text-red-400 hover:text-red-300"
            >
              Remove
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Institution</label>
              <input
                type="text"
                value={education.institution || ''}
                onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                className="w-full px-3 py-2 bg-gray-200 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="University of Technology"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Degree</label>
                <input
                  type="text"
                  value={education.studyType || ''}
                  onChange={(e) => updateEducation(index, 'studyType', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-200 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Bachelor's"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Field of Study</label>
                <input
                  type="text"
                  value={education.area || ''}
                  onChange={(e) => updateEducation(index, 'area', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-200 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Computer Science"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="text"
                  value={education.startDate || ''}
                  onChange={(e) => updateEducation(index, 'startDate', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-200 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="2018"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="text"
                  value={education.endDate || ''}
                  onChange={(e) => updateEducation(index, 'endDate', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-200 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="2022"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">GPA/Score</label>
              <input
                type="text"
                value={education.score || ''}
                onChange={(e) => updateEducation(index, 'score', e.target.value)}
                className="w-full px-3 py-2 bg-gray-200 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="3.8/4.0"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Adapted SkillsStep content for Studio
const SkillsStepContent: React.FC<{
  cvData: CVDataStructure;
  onUpdateField: (path: string, value: any) => void;
  onAddSection: (sectionType: keyof CVDataStructure, item?: any) => void;
  onRemoveSection: (sectionType: keyof CVDataStructure, id: string) => void;
  mockContext: any;
}> = ({ cvData, onUpdateField, onAddSection, onRemoveSection, mockContext }) => {
  const addSkill = () => {
    const newSkill = {
      name: '',
      level: 'Beginner',
      keywords: ['']
    };
    onAddSection('skills', newSkill);
  };

  const updateSkill = (index: number, field: string, value: any) => {
    const updatedSkills = [...(cvData.skills || [])];
    updatedSkills[index] = { ...updatedSkills[index], [field]: value };
    onUpdateField('skills', updatedSkills);
  };

  const removeSkill = (index: number) => {
    const updatedSkills = (cvData.skills || []).filter((_, i) => i !== index);
    onUpdateField('skills', updatedSkills);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={addSkill}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          <span className="text-sm">Add Skill</span>
        </button>
      </div>

      {(cvData.skills || []).map((skill, index) => (
        <div key={index} className="p-4 bg-gray-100 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Skill #{index + 1}</h4>
            <button
              onClick={() => removeSkill(index)}
              className="text-red-400 hover:text-red-300"
            >
              Remove
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Skill Name</label>
              <input
                type="text"
                value={skill.name || ''}
                onChange={(e) => updateSkill(index, 'name', e.target.value)}
                className="w-full px-3 py-2 bg-gray-200 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="JavaScript"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Level</label>
              <select
                value={skill.level || 'Beginner'}
                onChange={(e) => updateSkill(index, 'level', e.target.value)}
                className="w-full px-3 py-2 bg-gray-200 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Expert">Expert</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Keywords</label>
              <input
                type="text"
                value={skill.keywords.join(', ') || ''}
                onChange={(e) => updateSkill(index, 'keywords', e.target.value.split(',').map(k => k.trim()))}
                className="w-full px-3 py-2 bg-gray-200 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="javascript, react, node.js"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Adapted ProjectsStep content for Studio
const ProjectsStepContent: React.FC<{
  cvData: CVDataStructure;
  onUpdateField: (path: string, value: any) => void;
  onAddSection: (sectionType: keyof CVDataStructure, item?: any) => void;
  onRemoveSection: (sectionType: keyof CVDataStructure, id: string) => void;
  mockContext: any;
}> = ({ cvData, onUpdateField, onAddSection, onRemoveSection, mockContext }) => {
  const addProject = () => {
    const newProject = {
      name: '',
      description: '',
      url: '',
      startDate: '',
      endDate: '',
      highlights: ['']
    };
    onAddSection('projects', newProject);
  };

  const updateProject = (index: number, field: string, value: any) => {
    const updatedProjects = [...(cvData.projects || [])];
    updatedProjects[index] = { ...updatedProjects[index], [field]: value };
    onUpdateField('projects', updatedProjects);
  };

  const removeProject = (index: number) => {
    const updatedProjects = (cvData.projects || []).filter((_, i) => i !== index);
    onUpdateField('projects', updatedProjects);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={addProject}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          <span className="text-sm">Add Project</span>
        </button>
      </div>

      {(cvData.projects || []).map((project, index) => (
        <div key={index} className="p-4 bg-gray-100 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Project #{index + 1}</h4>
            <button
              onClick={() => removeProject(index)}
              className="text-red-400 hover:text-red-300"
            >
              Remove
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Project Name</label>
              <input
                type="text"
                value={project.name || ''}
                onChange={(e) => updateProject(index, 'name', e.target.value)}
                className="w-full px-3 py-2 bg-gray-200 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="My Awesome App"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={project.description || ''}
                onChange={(e) => updateProject(index, 'description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-gray-200 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="A brief description of your project..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="text"
                  value={project.startDate || ''}
                  onChange={(e) => updateProject(index, 'startDate', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-200 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="2022"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="text"
                  value={project.endDate || ''}
                  onChange={(e) => updateProject(index, 'endDate', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-200 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Present"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Highlights</label>
              <textarea
                value={project.highlights.join('\n') || ''}
                onChange={(e) => updateProject(index, 'highlights', e.target.value.split('\n').filter(line => line.trim()))}
                rows={3}
                className="w-full px-3 py-2 bg-gray-200 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="• Implemented new feature&#10;• Improved performance by 30%&#10;• Added user authentication"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Adapted CertificatesStep content for Studio
const CertificatesStepContent: React.FC<{
  cvData: CVDataStructure;
  onUpdateField: (path: string, value: any) => void;
  onAddSection: (sectionType: keyof CVDataStructure, item?: any) => void;
  onRemoveSection: (sectionType: keyof CVDataStructure, id: string) => void;
  mockContext: any;
}> = ({ cvData, onUpdateField, onAddSection, onRemoveSection, mockContext }) => {
  const addCertificate = () => {
    const newCertificate = {
      name: '',
      date: '',
      issuer: '',
      url: ''
    };
    onAddSection('certificates', newCertificate);
  };

  const updateCertificate = (index: number, field: string, value: any) => {
    const updatedCertificates = [...(cvData.certificates || [])];
    updatedCertificates[index] = { ...updatedCertificates[index], [field]: value };
    onUpdateField('certificates', updatedCertificates);
  };

  const removeCertificate = (index: number) => {
    const updatedCertificates = (cvData.certificates || []).filter((_, i) => i !== index);
    onUpdateField('certificates', updatedCertificates);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={addCertificate}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          <span className="text-sm">Add Certificate</span>
        </button>
      </div>

      {(cvData.certificates || []).map((certificate, index) => (
        <div key={index} className="p-4 bg-gray-100 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Certificate #{index + 1}</h4>
            <button
              onClick={() => removeCertificate(index)}
              className="text-red-400 hover:text-red-300"
            >
              Remove
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Certificate Name</label>
              <input
                type="text"
                value={certificate.name || ''}
                onChange={(e) => updateCertificate(index, 'name', e.target.value)}
                className="w-full px-3 py-2 bg-gray-200 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="AWS Certified Developer"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Issuer</label>
              <input
                type="text"
                value={certificate.issuer || ''}
                onChange={(e) => updateCertificate(index, 'issuer', e.target.value)}
                className="w-full px-3 py-2 bg-gray-200 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Amazon Web Services"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
              <input
                type="text"
                value={certificate.date || ''}
                onChange={(e) => updateCertificate(index, 'date', e.target.value)}
                className="w-full px-3 py-2 bg-gray-200 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="2022-01-01"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">URL</label>
              <input
                type="url"
                value={certificate.url || ''}
                onChange={(e) => updateCertificate(index, 'url', e.target.value)}
                className="w-full px-3 py-2 bg-gray-200 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/credentials/ABC123XYZ"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Adapted LanguagesStep content for Studio
const LanguagesStepContent: React.FC<{
  cvData: CVDataStructure;
  onUpdateField: (path: string, value: any) => void;
  onAddSection: (sectionType: keyof CVDataStructure, item?: any) => void;
  onRemoveSection: (sectionType: keyof CVDataStructure, id: string) => void;
  mockContext: any;
}> = ({ cvData, onUpdateField, onAddSection, onRemoveSection, mockContext }) => {
  const addLanguage = () => {
    const newLanguage = {
      language: '',
      fluency: 'Beginner'
    };
    onAddSection('languages', newLanguage);
  };

  const updateLanguage = (index: number, field: string, value: any) => {
    const updatedLanguages = [...(cvData.languages || [])];
    updatedLanguages[index] = { ...updatedLanguages[index], [field]: value };
    onUpdateField('languages', updatedLanguages);
  };

  const removeLanguage = (index: number) => {
    const updatedLanguages = (cvData.languages || []).filter((_, i) => i !== index);
    onUpdateField('languages', updatedLanguages);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={addLanguage}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          <span className="text-sm">Add Language</span>
        </button>
      </div>

      {(cvData.languages || []).map((language, index) => (
        <div key={index} className="p-4 bg-gray-100 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Language #{index + 1}</h4>
            <button
              onClick={() => removeLanguage(index)}
              className="text-red-400 hover:text-red-300"
            >
              Remove
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Language</label>
              <input
                type="text"
                value={language.language || ''}
                onChange={(e) => updateLanguage(index, 'language', e.target.value)}
                className="w-full px-3 py-2 bg-gray-200 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="English"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fluency</label>
              <select
                value={language.fluency || 'Beginner'}
                onChange={(e) => updateLanguage(index, 'fluency', e.target.value)}
                className="w-full px-3 py-2 bg-gray-200 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Native">Native</option>
              </select>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default OnboardingFormPanel;
