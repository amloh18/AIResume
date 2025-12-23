'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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

interface CVSection {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  visible?: boolean;
  type?: string; // Structure type (e.g., 'work_experience', 'personal_header')
}

interface ResumeEnhancerSidebarProps {
  cvSections: CVSection[];
  activeSection?: string;
  onSectionClick?: (sectionId: string) => void;
  onAddSection?: () => void;
  onDeleteSection?: (sectionId: string) => void;
  onSectionReorder?: (sectionIds: string[]) => void;
}

// Sortable section item component
function SortableSectionItem({
  section,
  isActive,
  isPersonalHeader,
  onSectionClick,
  onDeleteSection,
  getSectionIcon,
  getSectionTitle,
  confirmingDelete,
  setConfirmingDelete,
  isHovered,
}: {
  section: CVSection;
  isActive: boolean;
  isPersonalHeader: boolean;
  onSectionClick: (sectionId: string) => void;
  onDeleteSection?: (sectionId: string) => void;
  getSectionIcon: (sectionId: string) => React.ComponentType<any>;
  getSectionTitle: (sectionId: string) => string;
  confirmingDelete: string | null;
  setConfirmingDelete: (sectionId: string | null) => void;
  isHovered: boolean;
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
        onClick={() => onSectionClick(section.id)}
        className={`flex-1 flex items-center rounded-lg transition-all duration-200 text-sm ${
          isActive
            ? isHovered
            ? 'bg-[#80FF00]/20 text-[#80FF00]'
              : 'bg-[#80FF00]/30 text-[#80FF00]'
            : isPersonalHeader
            ? 'text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
            : 'text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 cursor-move'
        } ${isHovered ? 'justify-start gap-2 tablet:gap-3 px-2 tablet:px-3 py-2' : 'justify-center px-0 py-2'}`}
        whileHover={!isPersonalHeader ? { scale: 1.02 } : {}}
        whileTap={{ scale: 0.98 }}
        title={getSectionTitle(section.id)}
      >
        {React.createElement(IconComponent, { size: 16 })}
        <motion.span 
          className="font-medium text-xs whitespace-nowrap"
          initial={false}
          animate={{
            opacity: isHovered ? 1 : 0,
            width: isHovered ? 'auto' : 0,
            marginLeft: isHovered ? 0 : 0,
          }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          style={{ overflow: 'hidden', display: isHovered ? 'inline' : 'none' }}
        >
          {isConfirming ? 'Confirm' : getSectionTitle(section.id)}
        </motion.span>
      </motion.button>
      
      {/* Delete button - only visible when expanded and not personal_header */}
      {isHovered && !isPersonalHeader && onDeleteSection && (
        <div className="relative overflow-hidden">
          <button
            onClick={handleDeleteClick}
            className={`relative p-1.5 rounded transition-all duration-300 overflow-hidden ${
              isConfirming
                ? 'bg-red-500/30 text-red-400'
                : 'hover:bg-red-500/20 text-gray-400 dark:text-white/40 hover:text-red-400'
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

const ResumeEnhancerSidebar: React.FC<ResumeEnhancerSidebarProps> = ({
  cvSections = [],
  activeSection,
  onSectionClick,
  onAddSection,
  onDeleteSection,
  onSectionReorder,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const confirmationTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
  const handleSectionClick = (sectionId: string) => {
    if (confirmingDelete) {
      setConfirmingDelete(null);
      if (confirmationTimeoutRef.current) {
        clearTimeout(confirmationTimeoutRef.current);
      }
    }
    onSectionClick?.(sectionId);
  };

  const getSectionIcon = (sectionId: string) => {
    const icons: Record<string, any> = {
      personal: User,
      personal_header: User,
      work: Briefcase,
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
    return icons[sectionId] || User;
  };

  const getSectionTitle = (sectionId: string) => {
    const titles: Record<string, string> = {
      personal: 'Personal Information',
      personal_header: 'Personal Information',
      work: 'Work Experience',
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

  return (
    <motion.div 
      className="flex-shrink-0 overflow-hidden h-full"
      initial={false}
      animate={{
        width: isHovered ? 320 : 80, // 320px expanded, 80px collapsed
      }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <div
        className="bg-white dark:bg-[#141810] rounded-2xl h-full flex flex-col shadow-xl overflow-hidden p-1.5 tablet:p-3"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* CV Sections List */}
        <div className="flex-1 p-1.5 tablet:p-3 space-y-2 overflow-y-auto min-h-0 overscroll-contain">
          {cvSections.length > 0 && (
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
                    const isActive = activeSection === section.id;
                    const isPersonalHeader = section.id === 'personal' || section.id === 'personal_header';

                    return (
                      <SortableSectionItem
                        key={section.id}
                        section={section}
                        isActive={isActive}
                        isPersonalHeader={isPersonalHeader}
                        onSectionClick={handleSectionClick}
                        onDeleteSection={onDeleteSection}
                        getSectionIcon={getSectionIcon}
                        getSectionTitle={getSectionTitle}
                        confirmingDelete={confirmingDelete}
                        setConfirmingDelete={setConfirmingDelete}
                        isHovered={isHovered}
                      />
                    );
                  })}
                </div>
              </SortableContext>
              <DragOverlay>
                {activeId ? (
                  <div className="flex items-center gap-1 opacity-50">
                    <div className="flex-1 flex items-center justify-start gap-2 tablet:gap-3 px-2 tablet:px-3 py-2 rounded-lg bg-[#80FF00]/20 text-[#80FF00]">
                      {React.createElement(getSectionIcon(activeId), { size: 16 })}
                      <span className="font-medium text-xs">
                        {getSectionTitle(activeId)}
                      </span>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>

        {/* Add Section Button */}
        {onAddSection && (
          <div className="p-1.5 tablet:p-3 border-t border-gray-200 dark:border-white/10">
            <button 
              onClick={onAddSection}
              className={`w-full flex items-center text-[#80FF00] hover:text-[#70e600] transition-colors rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 ${
                isHovered ? 'justify-start gap-2 tablet:gap-3 px-2 tablet:px-4 py-3' : 'justify-center px-0 py-3'
              }`}
              title="Add New Section"
            >
              <Plus size={18} />
              {isHovered && (
                <motion.span 
                  className="font-medium text-xs tablet:text-sm whitespace-nowrap"
                  initial={{ opacity: 0, width: 0, marginLeft: -8 }}
                  animate={{ opacity: 1, width: 'auto', marginLeft: 0 }}
                  exit={{ opacity: 0, width: 0, marginLeft: -8 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  style={{ overflow: 'hidden' }}
                >
                  Add New Section
                </motion.span>
              )}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ResumeEnhancerSidebar;

