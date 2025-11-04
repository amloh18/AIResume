'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  onDeleteSection?: (sectionId: string) => void;
  onSectionReorder?: (sectionIds: string[]) => void;
  
  // Active main section
  activeSection?: 'template' | 'design' | 'ai-report' | 'structure';
  onSectionChange?: (section: 'template' | 'design' | 'ai-report' | 'structure') => void;
  
  // Animation props for structure sections
  previousStructureSectionIndex?: number;
  
  // Document type to hide AI Report for cover letters
  documentType?: 'cv' | 'cover-letter';
}

// Sortable section item component
function SortableSectionItem({
  section,
  isActive,
  isPersonalHeader,
  onStructureSectionClick,
  onDeleteSection,
  getSectionIcon,
  getSectionTitle,
  confirmingDelete,
  setConfirmingDelete,
}: {
  section: CVSection;
  isActive: boolean;
  isPersonalHeader: boolean;
  onStructureSectionClick: (sectionId: string) => void;
  onDeleteSection?: (sectionId: string) => void;
  getSectionIcon: (sectionId: string) => React.ComponentType<any>;
  getSectionTitle: (sectionId: string) => string;
  confirmingDelete: string | null;
  setConfirmingDelete: (sectionId: string | null) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: section.id,
    disabled: isPersonalHeader, // Disable dragging for personal_header
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const IconComponent = getSectionIcon(section.id);
  const isConfirming = confirmingDelete === section.id;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isConfirming && onDeleteSection) {
      onDeleteSection(section.id);
      setConfirmingDelete(null);
    } else {
      setConfirmingDelete(section.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-1"
    >
      <motion.button
        {...(!isPersonalHeader ? { ...attributes, ...listeners } : {})}
        onClick={() => onStructureSectionClick(section.id)}
        className={`flex-1 flex items-center justify-center md:justify-start gap-2 md:gap-3 px-2 md:px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
          isActive
            ? 'bg-[#80FF00]/20 text-[#80FF00]'
            : isPersonalHeader
            ? 'text-white/60 hover:text-white hover:bg-white/5'
            : 'text-white/60 hover:text-white hover:bg-blue-500/20 cursor-move'
        }`}
        whileHover={!isPersonalHeader ? { scale: 1.02 } : {}}
        whileTap={{ scale: 0.98 }}
        title={getSectionTitle(section.id)}
      >
        {React.createElement(IconComponent, { size: 16 })}
        <span className="font-medium text-xs hidden md:block">
          {isConfirming ? 'Confirm' : getSectionTitle(section.id)}
        </span>
      </motion.button>
      
      {/* Delete button - always visible, except for personal_header */}
      {!isPersonalHeader && onDeleteSection && (
        <div className="relative overflow-hidden">
          <button
            onClick={handleDeleteClick}
            className={`relative p-1.5 rounded transition-all duration-300 overflow-hidden ${
              isConfirming
                ? 'bg-red-500/30 text-red-400'
                : 'hover:bg-red-500/20 text-white/40 hover:text-red-400'
            }`}
            title={isConfirming ? 'Click again to confirm deletion' : 'Delete section'}
          >
            {/* Red hover animation from left to right */}
            {isConfirming && (
              <motion.div
                className="absolute inset-0 bg-red-500/40"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{
                  duration: 0.5,
                  ease: 'easeInOut',
                  repeat: Infinity,
                  repeatDelay: 0.3,
                }}
              />
            )}
            <X size={14} className="relative z-10" />
          </button>
        </div>
      )}
    </div>
  );
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
  onDeleteSection,
  onSectionReorder,
  activeSection = 'structure',
  onSectionChange,
  previousStructureSectionIndex = -1,
  documentType = 'cv'
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [localActiveSection, setLocalActiveSection] = useState<'template' | 'design' | 'ai-report' | 'structure'>(activeSection);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const confirmationTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setLocalActiveSection(activeSection);
  }, [activeSection]);

  // Clear confirmation timeout on unmount or when confirmingDelete changes
  useEffect(() => {
    if (confirmationTimeoutRef.current) {
      clearTimeout(confirmationTimeoutRef.current);
    }
    
    if (confirmingDelete) {
      confirmationTimeoutRef.current = setTimeout(() => {
        setConfirmingDelete(null);
      }, 3000);
    }
    
    return () => {
      if (confirmationTimeoutRef.current) {
        clearTimeout(confirmationTimeoutRef.current);
      }
    };
  }, [confirmingDelete]);

  // Reset confirmation when clicking on a section
  const handleStructureSubSectionClick = (sectionId: string) => {
    if (confirmingDelete) {
      setConfirmingDelete(null);
      if (confirmationTimeoutRef.current) {
        clearTimeout(confirmationTimeoutRef.current);
      }
    }
    onStructureSectionClick?.(sectionId);
  };

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
    // Reset confirmation when switching main sections
    if (confirmingDelete) {
      setConfirmingDelete(null);
      if (confirmationTimeoutRef.current) {
        clearTimeout(confirmationTimeoutRef.current);
      }
    }
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

            {/* Structure Sub-sections (only shown when Structure is active and documentType is cv) */}
            {localActiveSection === 'structure' && documentType === 'cv' && cvSections.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={(event: DragStartEvent) => {
                    setActiveId(event.active.id as string);
                  }}
                  onDragEnd={(event: DragEndEvent) => {
                    const { active, over } = event;
                    setActiveId(null);

                    if (over && active.id !== over.id && onSectionReorder) {
                      const oldIndex = cvSections.findIndex((s) => s.id === active.id);
                      const newIndex = cvSections.findIndex((s) => s.id === over.id);
                      
                      const newSections = arrayMove(cvSections, oldIndex, newIndex);
                      const newSectionIds = newSections.map((s) => s.id);
                      onSectionReorder(newSectionIds);
                    }
                  }}
                >
                  <SortableContext
                    items={cvSections.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {cvSections.map((section) => {
                        const isActive = activeStructureSection === section.id;
                        const isPersonalHeader = section.id === 'personal_header';

                        return (
                          <SortableSectionItem
                            key={section.id}
                            section={section}
                            isActive={isActive}
                            isPersonalHeader={isPersonalHeader}
                            onStructureSectionClick={handleStructureSubSectionClick}
                            onDeleteSection={onDeleteSection}
                            getSectionIcon={getSectionIcon}
                            getSectionTitle={getSectionTitle}
                            confirmingDelete={confirmingDelete}
                            setConfirmingDelete={setConfirmingDelete}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                  <DragOverlay>
                    {activeId ? (
                      <div className="flex items-center gap-1 opacity-50">
                        <div className="flex-1 flex items-center justify-center md:justify-start gap-2 md:gap-3 px-2 md:px-3 py-2 rounded-lg bg-[#80FF00]/20 text-[#80FF00]">
                          {React.createElement(getSectionIcon(activeId), { size: 16 })}
                          <span className="font-medium text-xs hidden md:block">
                            {getSectionTitle(activeId)}
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </div>
            )}
          </div>

          {/* Add Section Button (only shown when Structure is active and documentType is cv) */}
          {localActiveSection === 'structure' && documentType === 'cv' && onAddSection && (
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
