'use client';

import React, { useState, useEffect } from 'react';
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
import { CVDataStructure } from '@/types/cv';
import PersonalInfoStep from '@/components/onboarding/PersonalInfoStep';
import ExperienceStep from '@/components/onboarding/ExperienceStep';
import EducationStep from '@/components/onboarding/EducationStep';
import ParseToolSection from './ParseToolSection';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface OnboardingFormPanelProps {
  cvData: CVDataStructure | null;
  onUpdateField: (path: string, value: any) => void;
  onAddSection: (sectionType: keyof CVDataStructure, item?: any) => void;
  onRemoveSection: (sectionType: keyof CVDataStructure, id: string) => void;
  isCollapsed: boolean;
  onTogglePanel: () => void;
}

// Sortable Section Icon Component
const SortableSectionIcon = ({ section, isActive, onClick }: { 
  section: any; 
  isActive: boolean; 
  onClick: () => void;
}) => {
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
            ? 'bg-blue-600 text-white shadow-lg'
            : 'text-gray-400 hover:text-white hover:bg-gray-700'
        } ${isDragging ? 'z-50' : ''}`}
        title={`${section.label} (Drag to reorder)`}
      >
        <Icon size={18} />
      </button>
      {isDragging && (
        <div className="absolute inset-0 bg-blue-600/20 rounded-lg border-2 border-blue-400 border-dashed"></div>
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
  onTogglePanel
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
    
    console.log('🔍 Drag end event:', { active, over });

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
    console.log('🔍 Drag start event:', event);
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
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



  const renderDesignTab = () => {
    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Design Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Header Font Size</label>
            <input
              type="range"
              min="12"
              max="48"
              defaultValue="24"
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="text-xs text-gray-400 mt-1">24px</div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Body Font Size</label>
            <input
              type="range"
              min="10"
              max="20"
              defaultValue="14"
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="text-xs text-gray-400 mt-1">14px</div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Section Title Font Size</label>
            <input
              type="range"
              min="14"
              max="32"
              defaultValue="18"
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="text-xs text-gray-400 mt-1">18px</div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Line Spacing</label>
            <input
              type="range"
              min="1"
              max="2"
              step="0.1"
              defaultValue="1.2"
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="text-xs text-gray-400 mt-1">1.2</div>
          </div>
        </div>
      </div>
    );
  };

  const renderTemplateTab = () => {
    const templates = [
      { id: '1', name: 'Modern Professional', image: '/api/templates/1/image', selected: true },
      { id: '2', name: 'Classic Elegant', image: '/api/templates/2/image', selected: false },
      { id: '3', name: 'Creative Portfolio', image: '/api/templates/3/image', selected: false },
      { id: '4', name: 'Minimal Clean', image: '/api/templates/4/image', selected: false },
      { id: '5', name: 'Executive Summary', image: '/api/templates/5/image', selected: false },
      { id: '6', name: 'Tech Specialist', image: '/api/templates/6/image', selected: false },
    ];

    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Choose Template</h3>
        <div className="grid grid-cols-2 gap-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className={`relative cursor-pointer rounded-lg border-2 transition-all ${
                template.selected
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-600 bg-gray-800 hover:border-gray-500'
              }`}
            >
              <div className="aspect-[3/4] bg-gray-700 rounded-t-lg flex items-center justify-center">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <div className="p-2">
                <p className="text-xs text-gray-300 text-center">{template.name}</p>
              </div>
              {template.selected && (
                <div className="absolute top-1 right-1 w-3 h-3 bg-blue-500 rounded-full"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isCollapsed) {
    return (
      <div className="w-12 bg-gray-900 border-r border-gray-700 flex flex-col items-center py-4">
        <button
          onClick={onTogglePanel}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-[500px] bg-gray-900 border-r border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">CV Studio</h2>
          <button
            onClick={onTogglePanel}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('structure')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'structure'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Structure
        </button>
        <button
          onClick={() => setActiveTab('design')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'design'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Design
        </button>
        <button
          onClick={() => setActiveTab('template')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'template'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Template
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Section Icons (only for Structure tab) */}
        {activeTab === 'structure' && (
          <div className="w-12 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={orderedSections.map(s => s?.id).filter((id): id is string => Boolean(id))}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col items-center space-y-3">
                  {orderedSections.map((section, index) => (
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

        {/* Right Content - Continuous Sections */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'structure' && (
            <div className="space-y-0">
              {orderedSections.map((section, index) => (
                section && (
                  <div
                    key={section.id}
                    id={`section-${section.id}`}
                    className={`transition-all duration-300 ${
                      activeSection === section.id 
                        ? 'bg-gray-800/30 border-l-4 border-blue-500' 
                        : 'border-l-4 border-transparent'
                    }`}
                  >
                    {/* Section Header */}
                    <div className={`p-4 border-b border-gray-700 sticky top-0 z-10 transition-all duration-300 ${
                      activeSection === section.id 
                        ? 'bg-gray-800 border-blue-500/50' 
                        : 'bg-gray-900 border-gray-700'
                    }`}>
                      <div className="flex items-center gap-3">
                        <section.icon size={24} className={`transition-colors duration-300 ${
                          activeSection === section.id ? 'text-blue-400' : 'text-gray-400'
                        }`} />
                        <h3 className={`text-xl font-semibold transition-colors duration-300 ${
                          activeSection === section.id ? 'text-white' : 'text-gray-300'
                        }`}>
                          {section.label}
                        </h3>
                        {activeSection === section.id && (
                          <div className="ml-auto w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        )}
                      </div>
                    </div>

                    {/* Section Content */}
                    <div className="p-4">
                      {renderSectionForSection(section.id)}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
          
          {activeTab === 'design' && renderDesignTab()}
          {activeTab === 'template' && renderTemplateTab()}
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
        <label className="block text-sm font-medium text-gray-300 mb-1">Full Name *</label>
        <input
          type="text"
          value={cvData.basics?.name || ''}
          onChange={(e) => handleInputChange('name', e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="John Doe"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Professional Title</label>
        <input
          type="text"
          value={cvData.basics?.label || ''}
          onChange={(e) => handleInputChange('label', e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Software Engineer"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
        <input
          type="email"
          value={cvData.basics?.email || ''}
          onChange={(e) => handleInputChange('email', e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="john@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
        <input
          type="tel"
          value={cvData.basics?.phone || ''}
          onChange={(e) => handleInputChange('phone', e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="+1 (555) 123-4567"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">City</label>
        <input
          type="text"
          value={cvData.basics?.location?.city || ''}
          onChange={(e) => handleLocationChange('city', e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="San Francisco"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">State/Region</label>
        <input
          type="text"
          value={cvData.basics?.location?.region || ''}
          onChange={(e) => handleLocationChange('region', e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="California"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Website</label>
        <input
          type="url"
          value={cvData.basics?.url || ''}
          onChange={(e) => handleInputChange('url', e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://johndoe.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Professional Summary</label>
        <textarea
          value={cvData.basics?.summary || ''}
          onChange={(e) => handleInputChange('summary', e.target.value)}
          rows={4}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          <span className="text-sm">Add Experience</span>
        </button>
      </div>

      {(cvData.work || []).map((work, index) => (
        <div key={index} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-white">Experience #{index + 1}</h4>
            <button
              onClick={() => removeWorkExperience(index)}
              className="text-red-400 hover:text-red-300"
            >
              Remove
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Position</label>
              <input
                type="text"
                value={work.position || ''}
                onChange={(e) => updateWorkExperience(index, 'position', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Software Engineer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Company</label>
              <input
                type="text"
                value={work.name || ''}
                onChange={(e) => updateWorkExperience(index, 'name', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tech Company Inc."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
                <input
                  type="text"
                  value={work.startDate || ''}
                  onChange={(e) => updateWorkExperience(index, 'startDate', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Jan 2020"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">End Date</label>
                <input
                  type="text"
                  value={work.endDate || ''}
                  onChange={(e) => updateWorkExperience(index, 'endDate', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Present"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <textarea
                value={work.summary || ''}
                onChange={(e) => updateWorkExperience(index, 'summary', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe your role and achievements..."
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
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          <span className="text-sm">Add Education</span>
        </button>
      </div>

      {(cvData.education || []).map((education, index) => (
        <div key={index} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-white">Education #{index + 1}</h4>
            <button
              onClick={() => removeEducation(index)}
              className="text-red-400 hover:text-red-300"
            >
              Remove
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Institution</label>
              <input
                type="text"
                value={education.institution || ''}
                onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="University of Technology"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Degree</label>
                <input
                  type="text"
                  value={education.studyType || ''}
                  onChange={(e) => updateEducation(index, 'studyType', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Bachelor's"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Field of Study</label>
                <input
                  type="text"
                  value={education.area || ''}
                  onChange={(e) => updateEducation(index, 'area', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Computer Science"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
                <input
                  type="text"
                  value={education.startDate || ''}
                  onChange={(e) => updateEducation(index, 'startDate', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="2018"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">End Date</label>
                <input
                  type="text"
                  value={education.endDate || ''}
                  onChange={(e) => updateEducation(index, 'endDate', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="2022"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">GPA/Score</label>
              <input
                type="text"
                value={education.score || ''}
                onChange={(e) => updateEducation(index, 'score', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <div key={index} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-white">Skill #{index + 1}</h4>
            <button
              onClick={() => removeSkill(index)}
              className="text-red-400 hover:text-red-300"
            >
              Remove
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Skill Name</label>
              <input
                type="text"
                value={skill.name || ''}
                onChange={(e) => updateSkill(index, 'name', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="JavaScript"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Level</label>
              <select
                value={skill.level || 'Beginner'}
                onChange={(e) => updateSkill(index, 'level', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Expert">Expert</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Keywords</label>
              <input
                type="text"
                value={skill.keywords.join(', ') || ''}
                onChange={(e) => updateSkill(index, 'keywords', e.target.value.split(',').map(k => k.trim()))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <div key={index} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-white">Project #{index + 1}</h4>
            <button
              onClick={() => removeProject(index)}
              className="text-red-400 hover:text-red-300"
            >
              Remove
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Project Name</label>
              <input
                type="text"
                value={project.name || ''}
                onChange={(e) => updateProject(index, 'name', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="My Awesome App"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <textarea
                value={project.description || ''}
                onChange={(e) => updateProject(index, 'description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="A brief description of your project..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
                <input
                  type="text"
                  value={project.startDate || ''}
                  onChange={(e) => updateProject(index, 'startDate', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="2022"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">End Date</label>
                <input
                  type="text"
                  value={project.endDate || ''}
                  onChange={(e) => updateProject(index, 'endDate', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Present"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Highlights</label>
              <input
                type="text"
                value={project.highlights.join(', ') || ''}
                onChange={(e) => updateProject(index, 'highlights', e.target.value.split(',').map(h => h.trim()))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Implemented new feature, improved performance"
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
        <div key={index} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-white">Certificate #{index + 1}</h4>
            <button
              onClick={() => removeCertificate(index)}
              className="text-red-400 hover:text-red-300"
            >
              Remove
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Certificate Name</label>
              <input
                type="text"
                value={certificate.name || ''}
                onChange={(e) => updateCertificate(index, 'name', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="AWS Certified Developer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Issuer</label>
              <input
                type="text"
                value={certificate.issuer || ''}
                onChange={(e) => updateCertificate(index, 'issuer', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Amazon Web Services"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
              <input
                type="text"
                value={certificate.date || ''}
                onChange={(e) => updateCertificate(index, 'date', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="2022-01-01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">URL</label>
              <input
                type="url"
                value={certificate.url || ''}
                onChange={(e) => updateCertificate(index, 'url', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <div key={index} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-white">Language #{index + 1}</h4>
            <button
              onClick={() => removeLanguage(index)}
              className="text-red-400 hover:text-red-300"
            >
              Remove
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Language</label>
              <input
                type="text"
                value={language.language || ''}
                onChange={(e) => updateLanguage(index, 'language', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="English"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Fluency</label>
              <select
                value={language.fluency || 'Beginner'}
                onChange={(e) => updateLanguage(index, 'fluency', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
