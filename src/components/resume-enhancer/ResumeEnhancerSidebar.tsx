'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
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
  X,
  Trophy,
  FileText,
  ZoomIn,
  ZoomOut,
  Eye,
  Shuffle
} from 'lucide-react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { getAddableCVSections } from '@/lib/selectors/cv-section-selectors';

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
  onAddSection?: (sectionId: string) => void;
  onDeleteSection?: (sectionId: string) => void;
  onSectionReorder?: (sectionIds: string[]) => void;
  // Preview controls
  totalPages?: number;
  zoomLevel?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  pageFormat?: 'a4' | 'letter';
  onPageFormatChange?: (format: 'a4' | 'letter') => void;
  layoutType?: 'one-column' | 'two-column';
  onAutoArrange?: () => void;
}

// Core sections that cannot be deleted - these are essential CV sections
// Include all aliases for section IDs used across the app
const CORE_SECTIONS = ['personal', 'personal_header', 'summary', 'work', 'work_experience', 'education', 'skills'];

// Sortable section item component
function SortableSectionItem({
  section,
  isActive,
  isPersonalHeader,
  isCoreSection,
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
  isCoreSection: boolean;
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
        className={`flex-1 flex items-center rounded-lg transition-all duration-200 text-sm ${isActive
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

      {/* Delete button - only visible when expanded and not a core section */}
      {isHovered && !isCoreSection && onDeleteSection && (
        <div className="relative overflow-hidden">
          <button
            onClick={handleDeleteClick}
            className={`relative p-1.5 rounded transition-all duration-300 overflow-hidden ${isConfirming
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
  // Preview controls
  totalPages = 1,
  zoomLevel = 1,
  onZoomIn,
  onZoomOut,
  pageFormat = 'a4',
  onPageFormatChange,
  layoutType,
  onAutoArrange,
}) => {
  const { state } = useResumeEnhancer();
  const [isHovered, setIsHovered] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const confirmationTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const addSectionDragControls = useDragControls();

  // Get addable sections from selector
  const addableSections = useMemo(() => {
    return getAddableCVSections(state.cvData);
  }, [state.cvData]);

  // Map icon names to components
  const getIconComponent = (iconName: string) => {
    const iconMap: Record<string, React.ComponentType<any>> = {
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
      Trophy,
      FileText
    };
    return iconMap[iconName] || User;
  };

  // Handle adding a section - modal stays open until user closes it
  const handleAddSectionClick = (sectionId: string) => {
    // Don't close modal - let user add multiple sections
    // Modal only closes when user clicks the X button
    if (onAddSection) {
      onAddSection(sectionId);
    }
  };

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
        {/* Preview Controls - Below sections list */}
        <div className="px-1.5 tablet:px-3 py-2 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between text-xs text-[color:var(--text-secondary)]">
            {/* Page format toggle */}
            <div className="flex items-center gap-2">
              <Eye className="w-3 h-3" />
              <div className="flex items-center bg-[var(--bg-tertiary)] rounded-full p-0.5">
                <button
                  onClick={() => onPageFormatChange?.('a4')}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${pageFormat === 'a4'
                    ? 'bg-lime-500/20 text-lime-600 dark:text-lime-400'
                    : 'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]'
                    }`}
                >
                  A4
                </button>
                <button
                  onClick={() => onPageFormatChange?.('letter')}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${pageFormat === 'letter'
                    ? 'bg-lime-500/20 text-lime-600 dark:text-lime-400'
                    : 'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]'
                    }`}
                >
                  Letter
                </button>
              </div>
              <span className="text-[color:var(--text-muted)]">•</span>
              <span>{totalPages} {totalPages > 1 ? 'Pages' : 'Page'}</span>
            </div>
            {/* Zoom controls */}
            <div className="flex items-center gap-2">
              <span className="text-[10px]">{Math.round(zoomLevel * 100)}%</span>
              <div className="flex space-x-1">
                <button
                  onClick={onZoomOut}
                  className="p-1 bg-[var(--bg-tertiary)] hover:bg-[var(--hover-bg)] text-[color:var(--text-primary)] rounded text-xs"
                  title="Zoom out"
                >
                  <ZoomOut className="w-3 h-3" />
                </button>
                <button
                  onClick={onZoomIn}
                  className="p-1 bg-[var(--bg-tertiary)] hover:bg-[var(--hover-bg)] text-[color:var(--text-primary)] rounded text-xs"
                  title="Zoom in"
                >
                  <ZoomIn className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
          {/* Auto-Arrange button for two-column templates */}
          {layoutType === 'two-column' && onAutoArrange && (
            <div className="px-1.5 tablet:px-3 pb-2">
              <button
                onClick={onAutoArrange}
                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[var(--bg-tertiary)] hover:bg-[var(--hover-bg)] text-[color:var(--text-primary)] rounded text-xs font-medium transition-all duration-200 hover:-translate-y-0.5"
                title="Automatically balance sections across columns"
              >
                <Shuffle className="w-3 h-3" />
                <span>Auto-Arrange</span>
              </button>
            </div>
          )}
        </div>

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
                    const isCoreSection = CORE_SECTIONS.includes(section.id);

                    return (
                      <SortableSectionItem
                        key={section.id}
                        section={section}
                        isActive={isActive}
                        isPersonalHeader={isPersonalHeader}
                        isCoreSection={isCoreSection}
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
              onClick={() => setShowAddSectionModal(true)}
              className={`w-full flex items-center text-[#80FF00] hover:text-[#70e600] transition-colors rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 ${isHovered ? 'justify-start gap-2 tablet:gap-3 px-2 tablet:px-4 py-3' : 'justify-center px-0 py-3'
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

        {/* Floating Add Section Panel - Draggable like FloatingFormEditor */}
        <AnimatePresence>
          {showAddSectionModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 pointer-events-none"
            >
              {/* Transparent backdrop - no close on click, only X button closes */}
              <div
                className="absolute inset-0 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              />

              {/* Floating Panel */}
              <motion.div
                drag
                dragListener={false}
                dragMomentum={false}
                dragControls={addSectionDragControls}
                initial={{ opacity: 0, scale: 0.95, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95, x: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{
                  position: 'fixed',
                  top: 120,
                  right: 80,
                  maxHeight: 'calc(100vh - 150px)',
                  minHeight: '300px'
                }}
                className="w-full max-w-md bg-[#1a1a1a]/95 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-2xl flex flex-col pointer-events-auto overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Draggable Header */}
                <div
                  className="flex items-center justify-between px-5 py-4 border-b border-white/10 cursor-move"
                  onPointerDown={(e) => addSectionDragControls.start(e)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#80FF00]/20 to-[#80FF00]/5 flex items-center justify-center">
                      <Plus className="w-4 h-4 text-[#80FF00]" />
                    </div>
                    <h2 className="text-lg font-semibold text-white">Add New Section</h2>
                  </div>
                  <button
                    onClick={() => setShowAddSectionModal(false)}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Section Grid */}
                <div className="flex-1 overflow-y-auto overscroll-contain p-5">
                  {addableSections.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {addableSections.map((section) => {
                        const IconComponent = getIconComponent(section.iconName);
                        return (
                          <motion.button
                            key={section.id}
                            onClick={() => handleAddSectionClick(section.id)}
                            className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#80FF00]/50 transition-all duration-200 group"
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#80FF00]/20 to-[#80FF00]/5 flex items-center justify-center group-hover:from-[#80FF00]/30 group-hover:to-[#80FF00]/10 transition-colors">
                              <IconComponent className="w-6 h-6 text-[#80FF00]" />
                            </div>
                            <span className="text-sm font-medium text-white/80 text-center group-hover:text-white transition-colors">
                              {section.label}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                        <Award className="w-8 h-8 text-white/40" />
                      </div>
                      <p className="text-white/60">All sections have been added to your CV!</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default ResumeEnhancerSidebar;

