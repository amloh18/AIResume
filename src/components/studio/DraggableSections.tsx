'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GripVertical, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  EyeOff,
  User,
  Briefcase,
  GraduationCap,
  Code,
  FolderOpen,
  Award,
  Globe,
  Plus,
  Minus
} from 'lucide-react';
import { getThemeClasses } from '@/lib/utils/themeUtils';

interface Section {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  isVisible: boolean;
  isExpanded: boolean;
  component: React.ReactNode;
}

interface DraggableSectionsProps {
  sections: Section[];
  onSectionToggle: (sectionId: string) => void;
  onSectionVisibilityToggle: (sectionId: string) => void;
  onSectionReorder: (sections: Section[]) => void;
  allCollapsed: boolean;
  onToggleAllSections: () => void;
}

const DraggableSections: React.FC<DraggableSectionsProps> = ({
  sections,
  onSectionToggle,
  onSectionVisibilityToggle,
  onSectionReorder,
  allCollapsed,
  onToggleAllSections
}) => {
  const themeClasses = getThemeClasses;
  const [draggedSection, setDraggedSection] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, sectionId: string) => {
    setDraggedSection(sectionId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault();
    
    if (!draggedSection || draggedSection === targetSectionId) {
      setDraggedSection(null);
      return;
    }

    const draggedIndex = sections.findIndex(s => s.id === draggedSection);
    const targetIndex = sections.findIndex(s => s.id === targetSectionId);
    
    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedSection(null);
      return;
    }

    const newSections = [...sections];
    const [draggedItem] = newSections.splice(draggedIndex, 1);
    newSections.splice(targetIndex, 0, draggedItem);
    
    onSectionReorder(newSections);
    setDraggedSection(null);
  };

  return (
    <div className="space-y-4">
      {/* Global Controls */}
      <div className={`${themeClasses.card.base} rounded-lg p-4 border ${themeClasses.border.primary}`}>
        <div className="flex items-center justify-between">
          <h3 className={`text-lg font-semibold ${themeClasses.text.primary}`}>
            CV Sections
          </h3>
          <div className="flex items-center gap-2">
            <motion.button
              onClick={onToggleAllSections}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm ${themeClasses.button.secondary} rounded-lg transition-colors`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {allCollapsed ? (
                <>
                  <Plus className="w-4 h-4" />
                  Expand All
                </>
              ) : (
                <>
                  <Minus className="w-4 h-4" />
                  Collapse All
                </>
              )}
            </motion.button>
          </div>
        </div>
        <p className={`text-sm ${themeClasses.text.tertiary} mt-1`}>
          Drag sections to reorder • Click to expand/collapse • Toggle visibility
        </p>
      </div>

      {/* Draggable Sections */}
      <div className="space-y-2">
        {sections.map((section, index) => (
          <motion.div
            key={section.id}
            className={`${themeClasses.card.base} rounded-lg border-2 transition-all duration-200 ${
              draggedSection === section.id 
                ? 'border-lime-400 shadow-lg scale-105' 
                : section.isExpanded
                ? 'border-lime-500 shadow-md'
                : section.isVisible
                ? 'border-gray-300 dark:border-gray-600 hover:border-lime-300 dark:hover:border-lime-600'
                : 'border-gray-200 dark:border-gray-700'
            } ${
              !section.isVisible ? 'opacity-60' : ''
            }`}
            draggable
            onDragStart={(e) => handleDragStart(e, section.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, section.id)}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            {/* Section Header */}
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Drag Handle */}
                  <div className="cursor-grab active:cursor-grabbing">
                    <GripVertical className={`w-4 h-4 ${themeClasses.text.tertiary}`} />
                  </div>
                  
                  {/* Section Icon */}
                  <div className={`p-2 rounded-lg ${
                    section.isVisible 
                      ? 'bg-lime-100 dark:bg-lime-900/20' 
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    <section.icon className={`w-4 h-4 ${
                      section.isVisible 
                        ? 'text-lime-600 dark:text-lime-400' 
                        : 'text-gray-400'
                    }`} />
                  </div>
                  
                  {/* Section Title */}
                  <div>
                    <h4 className={`font-medium ${themeClasses.text.primary}`}>
                      {section.title}
                    </h4>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2">
                  {/* Visibility Toggle */}
                  <motion.button
                    onClick={() => onSectionVisibilityToggle(section.id)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      section.isVisible
                        ? 'text-lime-600 dark:text-lime-400 hover:bg-lime-100 dark:hover:bg-lime-900/20'
                        : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title={section.isVisible ? 'Hide section' : 'Show section'}
                  >
                    {section.isVisible ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </motion.button>

                  {/* Expand/Collapse Toggle */}
                  <motion.button
                    onClick={() => onSectionToggle(section.id)}
                    className={`p-1.5 rounded-lg transition-colors ${themeClasses.text.tertiary} hover:bg-gray-100 dark:hover:bg-gray-700`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title={section.isExpanded ? 'Collapse section' : 'Expand section'}
                  >
                    {section.isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Section Content */}
            <AnimatePresence>
              {section.isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                    {section.component}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Section Order Preview */}
      <div className={`${themeClasses.card.base} rounded-lg p-4 border ${themeClasses.border.primary}`}>
        <h4 className={`text-sm font-medium ${themeClasses.text.primary} mb-3`}>
          Preview Order
        </h4>
        <div className="flex flex-wrap gap-2">
          {sections
            .filter(section => section.isVisible)
            .map((section, index) => (
              <div
                key={section.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                  index === 0 
                    ? 'bg-lime-100 dark:bg-lime-900/20 text-lime-700 dark:text-lime-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <section.icon className="w-3 h-3" />
                <span>{section.title}</span>
                <span className="text-gray-400">#{index + 1}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default DraggableSections;