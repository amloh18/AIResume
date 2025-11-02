'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layout,
  Palette,
  BarChart3,
  FileText,
  Eye,
  Target,
  User,
  Briefcase,
  GraduationCap,
  Code,
  FolderOpen,
  Award,
  Globe,
  Heart,
  Star,
  BookOpen,
  Users,
  Plus,
  X
} from 'lucide-react';

interface SidebarSection {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
}

interface CVSection {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  visible?: boolean;
}

interface SidebarStudioPanelProps {
  // Main sections content
  templateContent?: React.ReactNode;
  designContent?: React.ReactNode;
  aiReportContent?: React.ReactNode;
  structureContent?: React.ReactNode;
  
  // Structure section props
  cvSections?: CVSection[];
  activeStructureSection?: string;
  onStructureSectionClick?: (sectionId: string) => void;
  onAddSection?: () => void;
  
  // Active main section
  activeSection?: 'template' | 'design' | 'ai-report' | 'structure';
  onSectionChange?: (section: 'template' | 'design' | 'ai-report' | 'structure') => void;
  
  // Animation props for structure sections
  previousStructureSectionIndex?: number;
  
  // Document type to hide AI Report for cover letters
  documentType?: 'cv' | 'cover-letter';
}

const SidebarStudioPanel: React.FC<SidebarStudioPanelProps> = ({
  templateContent,
  designContent,
  aiReportContent,
  structureContent,
  cvSections = [],
  activeStructureSection,
  onStructureSectionClick,
  onAddSection,
  activeSection = 'structure',
  onSectionChange,
  previousStructureSectionIndex = -1,
  documentType = 'cv'
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [localActiveSection, setLocalActiveSection] = useState<'template' | 'design' | 'ai-report' | 'structure'>(activeSection);

  useEffect(() => {
    setLocalActiveSection(activeSection);
  }, [activeSection]);

  // Filter out AI Report for cover letter mode
  const mainSections: SidebarSection[] = [
    { id: 'template', title: 'Template', icon: Layout },
    { id: 'design', title: 'Design', icon: Palette },
    ...(documentType === 'cv' ? [{ id: 'ai-report', title: 'AI Report', icon: BarChart3 }] : []),
    { id: 'structure', title: 'Structure', icon: FileText }
  ];

  const getSectionIcon = (sectionId: string) => {
    const icons: Record<string, any> = {
      personal_header: User,
      work_experience: Briefcase,
      education: GraduationCap,
      skills: Code,
      projects: FolderOpen,
      certificates: Award,
      languages: Globe,
      volunteer: Heart,
      awards: Star,
      publications: BookOpen,
      interests: Users,
      references: Users
    };
    return icons[sectionId] || FileText;
  };

  const getSectionTitle = (sectionId: string) => {
    const titles: Record<string, string> = {
      personal_header: 'Personal Information',
      work_experience: 'Work Experience',
      education: 'Education',
      skills: 'Skills',
      projects: 'Projects',
      certificates: 'Certificates',
      languages: 'Languages',
      volunteer: 'Volunteer Experience',
      awards: 'Awards & Recognition',
      publications: 'Publications',
      interests: 'Interests',
      references: 'References'
    };
    return titles[sectionId] || sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
  };

  const handleSectionClick = (sectionId: 'template' | 'design' | 'ai-report' | 'structure') => {
    setLocalActiveSection(sectionId);
    onSectionChange?.(sectionId);
  };

  const handleStructureSubSectionClick = (sectionId: string) => {
    onStructureSectionClick?.(sectionId);
  };

  // Get animation direction for structure section changes
  const getStructureAnimationDirection = () => {
    if (!activeStructureSection || previousStructureSectionIndex === -1) return 0;
    const currentIndex = cvSections.findIndex(s => s.id === activeStructureSection);
    if (currentIndex === -1 || previousStructureSectionIndex === -1) return 0;
    
    // If moving down (higher index), slide up from bottom (positive y)
    // If moving up (lower index), slide down from top (negative y)
    return currentIndex > previousStructureSectionIndex ? 20 : -20;
  };

  const renderMainContent = () => {
    switch (localActiveSection) {
      case 'template':
        return templateContent;
      case 'design':
        return designContent;
      case 'ai-report':
        return aiReportContent;
      case 'structure':
        return structureContent;
      default:
        return structureContent;
    }
  };

  return (
    <div className="flex h-full bg-[#1A201A]">
      {/* Sticky Sidebar - Matching MasterCVBuilderStep theme */}
      <div className="w-20 md:w-80 flex-shrink-0 p-2 md:p-4">
      <div
          className="bg-[#222B22] rounded-2xl border border-white/10 h-full flex flex-col shadow-xl overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        >
          {/* Main Sections Navigation */}
          <div className="flex-1 p-2 md:p-4 space-y-2 overflow-y-auto min-h-0">
            {mainSections.map((section) => {
              const IconComponent = section.icon;
              const isActive = localActiveSection === section.id;

              return (
                <motion.button
                  key={section.id}
                  onClick={() => handleSectionClick(section.id as any)}
                  className={`w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-2 md:px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#80FF00] to-[#70e600] text-black shadow-lg'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  title={section.title}
                >
                  {React.createElement(IconComponent, { size: 18 })}
                  <span className="font-medium text-xs md:text-sm hidden md:block">{section.title}</span>
                </motion.button>
              );
            })}

            {/* Structure Sub-sections (only shown when Structure is active) */}
            {localActiveSection === 'structure' && cvSections.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="space-y-2">
                  {cvSections.map((section) => {
                    const IconComponent = getSectionIcon(section.id);
                    const isActive = activeStructureSection === section.id;

                    return (
                      <motion.button
                        key={section.id}
                        onClick={() => handleStructureSubSectionClick(section.id)}
                        className={`w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-2 md:px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
                          isActive
                            ? 'bg-[#80FF00]/20 text-[#80FF00]'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        title={getSectionTitle(section.id)}
                      >
                        {React.createElement(IconComponent, { size: 16 })}
                        <span className="font-medium text-xs hidden md:block">{getSectionTitle(section.id)}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Add Section Button (only shown when Structure is active) */}
          {localActiveSection === 'structure' && onAddSection && (
            <div className="p-2 md:p-4 border-t border-white/10">
              <button 
                onClick={onAddSection}
                className="w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-2 md:px-4 py-3 text-[#80FF00] hover:text-[#70e600] transition-colors rounded-xl hover:bg-white/5"
                title="Add New Section"
              >
                <Plus size={18} />
                <span className="font-medium text-xs md:text-sm hidden md:block">Add New Section</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area - Matching MasterCVBuilderStep */}
      <div className={`flex-1 overflow-y-auto h-full bg-[#1A201A] ${localActiveSection === 'structure' ? '-mt-2 -ml-4 -mb-4' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${localActiveSection}-${activeStructureSection || ''}`}
            className="h-full w-full"
            initial={{ 
              opacity: 0, 
              y: localActiveSection === 'structure' && activeStructureSection 
                ? getStructureAnimationDirection() 
                : 20 
            }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ 
              opacity: 0, 
              y: localActiveSection === 'structure' && activeStructureSection
                ? -getStructureAnimationDirection()
                : -20 
            }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {renderMainContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SidebarStudioPanel;
