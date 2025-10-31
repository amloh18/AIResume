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
  previousStructureSectionIndex = -1
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [localActiveSection, setLocalActiveSection] = useState<'template' | 'design' | 'ai-report' | 'structure'>(activeSection);

  useEffect(() => {
    setLocalActiveSection(activeSection);
  }, [activeSection]);

  const mainSections: SidebarSection[] = [
    { id: 'template', title: 'Template', icon: Layout },
    { id: 'design', title: 'Design', icon: Palette },
    { id: 'ai-report', title: 'AI Report', icon: BarChart3 },
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
    <div className="flex h-full gap-4">
      {/* Sidebar - with margin and rounded corners */}
      <div
        className="p-2 flex-shrink-0 flex flex-col"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ height: 'calc(100vh - 5rem - 4rem - 2rem)' }}
      >
        <motion.div
          className="bg-[#222B22] rounded-2xl border border-white/10 flex-1 flex flex-col shadow-xl overflow-hidden min-h-0"
          animate={{ width: isHovered ? 240 : 80 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          {/* Main Sections Navigation */}
          <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-0">
            {mainSections.map((section) => {
              const IconComponent = section.icon;
              const isActive = localActiveSection === section.id;

              return (
                <motion.button
                  key={section.id}
                  onClick={() => handleSectionClick(section.id as any)}
                  className={`w-full flex items-center ${isHovered ? 'justify-start' : 'justify-center'} gap-2 md:gap-3 px-2 md:px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#80FF00] to-[#70e600] text-black shadow-lg'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  title={section.title}
                >
                  <IconComponent size={18} className="flex-shrink-0" />
                  <motion.span 
                    className="font-medium text-xs md:text-sm"
                    animate={{ opacity: isHovered ? 1 : 0, width: isHovered ? 'auto' : 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
                  >
                    {section.title}
                  </motion.span>
                </motion.button>
              );
            })}

            {/* Structure Sub-sections (only shown when Structure is active) */}
            {localActiveSection === 'structure' && cvSections.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="space-y-1">
                  {cvSections.map((section) => {
                    const IconComponent = getSectionIcon(section.id);
                    const isActive = activeStructureSection === section.id;

                    return (
                      <motion.button
                        key={section.id}
                        onClick={() => handleStructureSubSectionClick(section.id)}
                        className={`w-full flex items-center ${isHovered ? 'justify-start' : 'justify-center'} gap-2 md:gap-3 px-2 md:px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
                          isActive
                            ? 'bg-[#80FF00]/20 text-[#80FF00]'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        title={getSectionTitle(section.id)}
                      >
                        <IconComponent size={16} className="flex-shrink-0" />
                        <motion.span 
                          className="font-medium text-xs"
                          animate={{ opacity: isHovered ? 1 : 0, width: isHovered ? 'auto' : 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
                        >
                          {getSectionTitle(section.id)}
                        </motion.span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Add Section Button (only shown when Structure is active) */}
          {localActiveSection === 'structure' && onAddSection && (
            <div className="p-2 border-t border-white/10">
              <motion.button
                onClick={onAddSection}
                className={`w-full flex items-center ${isHovered ? 'justify-start' : 'justify-center'} gap-2 md:gap-3 px-2 md:px-4 py-3 text-[#80FF00] hover:text-[#70e600] transition-colors rounded-xl hover:bg-white/5`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                title="Add New Section"
              >
                <Plus size={18} className="flex-shrink-0" />
                <motion.span 
                  className="font-medium text-xs md:text-sm"
                  animate={{ opacity: isHovered ? 1 : 0, width: isHovered ? 'auto' : 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
                >
                  Add Section
                </motion.span>
              </motion.button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Main Content Area with Slide Animation */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${localActiveSection}-${activeStructureSection || ''}`}
            className="h-full overflow-y-auto"
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
