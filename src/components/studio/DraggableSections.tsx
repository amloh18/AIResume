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
  Minus,
  TrendingUp
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
    <div className="space-y-6">
      {/* Global Controls */}
      <div className="bg-white/90 dark:bg-[#141810] border border-gray-200/60 dark:border-white/10 rounded-lg p-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-lime-500 to-lime-600 rounded-md">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                CV Sections
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Organize and customize your CV structure
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <GripVertical className="w-3 h-3" />
                <span>Drag to reorder</span>
              </div>
              <div className="flex items-center gap-1">
                <ChevronDown className="w-3 h-3" />
                <span>Click to expand</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                <span>Toggle visibility</span>
              </div>
            </div>
            <motion.button
              onClick={onToggleAllSections}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                allCollapsed 
                  ? 'bg-lime-600 hover:bg-lime-700 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {allCollapsed ? (
                <>
                  <Plus className="w-3 h-3" />
                  Expand All
                </>
              ) : (
                <>
                  <Minus className="w-3 h-3" />
                  Collapse All
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>


      {/* Draggable Sections */}
      <div className="space-y-4">
        {sections.map((section, index) => (
          <motion.div
            key={section.id}
            className={`group relative bg-white/90 dark:bg-[#141810] border-2 transition-all duration-300 rounded-xl shadow-lg hover:shadow-xl ${
              draggedSection === section.id 
                ? 'border-lime-400 shadow-2xl scale-105 bg-lime-50/50 dark:bg-lime-900/20' 
                : section.isExpanded
                ? 'border-lime-500 shadow-xl bg-lime-50/30 dark:bg-lime-900/10'
                : section.isVisible
                ? 'border-gray-200 dark:border-gray-700 hover:border-lime-300 dark:hover:border-lime-600 hover:bg-lime-50/20 dark:hover:bg-lime-900/10'
                : 'border-gray-200 dark:border-gray-700 opacity-60'
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
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Drag Handle */}
                  <div className="cursor-grab active:cursor-grabbing p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <GripVertical className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  </div>
                  
                  {/* Section Icon */}
                  <div className={`p-3 rounded-xl shadow-md transition-all duration-200 ${
                    section.isVisible 
                      ? 'bg-gradient-to-br from-lime-500 to-lime-600 shadow-lime-200 dark:shadow-lime-900/50' 
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    <section.icon className={`w-5 h-5 ${
                      section.isVisible 
                        ? 'text-white' 
                        : 'text-gray-400 dark:text-gray-500'
                    }`} />
                  </div>
                  
                  {/* Section Title */}
                  <div>
                    <h4 className={`text-lg font-bold ${
                      section.isVisible 
                        ? 'text-gray-900 dark:text-white' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {section.title}
                    </h4>
                    <p className={`text-sm ${
                      section.isVisible 
                        ? 'text-gray-600 dark:text-gray-400' 
                        : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {section.isExpanded ? 'Expanded' : 'Collapsed'} • {section.isVisible ? 'Visible' : 'Hidden'}
                    </p>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2">
                  {/* Visibility Toggle */}
                  <motion.button
                    onClick={() => onSectionVisibilityToggle(section.id)}
                    className={`p-2.5 rounded-lg transition-all duration-200 ${
                      section.isVisible
                        ? 'bg-lime-100 dark:bg-lime-900/30 text-lime-600 dark:text-lime-400 hover:bg-lime-200 dark:hover:bg-lime-900/50 shadow-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
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
                    className={`p-2.5 rounded-lg transition-all duration-200 ${
                      section.isExpanded
                        ? 'bg-lime-100 dark:bg-lime-900/30 text-lime-600 dark:text-lime-400 hover:bg-lime-200 dark:hover:bg-lime-900/50 shadow-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
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
                  <div className="px-6 pb-6 border-t border-gray-200/60 dark:border-gray-700/60 pt-6 bg-gray-50/50 dark:bg-gray-900/50">
                    {section.component}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Section Order Preview */}
      <div className="bg-gradient-to-r from-purple-50/90 to-pink-50/90 dark:from-purple-900/20 dark:to-pink-900/20 backdrop-blur-xl border border-purple-200/60 dark:border-purple-700/60 rounded-xl p-6 shadow-lg shadow-purple-200/50 dark:shadow-purple-900/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-md">
            <Eye className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white">
              Preview Order
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              See how your CV sections will appear
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {sections
            .filter(section => section.isVisible)
            .map((section, index) => (
              <motion.div
                key={section.id}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-md transition-all duration-200 ${
                  index === 0 
                    ? 'bg-gradient-to-r from-lime-500 to-lime-600 text-white shadow-lime-200 dark:shadow-lime-900/50'
                    : 'bg-white/80 dark:bg-[#141810] text-gray-700 dark:text-white border border-gray-200 dark:border-white/10'
                }`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
              >
                <section.icon className="w-4 h-4" />
                <span>{section.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  index === 0 
                    ? 'bg-white/20 text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                  #{index + 1}
                </span>
              </motion.div>
            ))}
        </div>
        {sections.filter(section => section.isVisible).length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <EyeOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No sections visible</p>
            <p className="text-xs">Toggle visibility to see sections in preview</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DraggableSections;