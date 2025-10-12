'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User,
  Briefcase,
  GraduationCap,
  Code,
  FolderOpen,
  Award,
  Globe,
  GripVertical,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Settings,
  Heart,
  BookOpen,
  Users,
  Star
} from 'lucide-react';
import { getThemeClasses } from '@/lib/utils/themeUtils';

interface Section {
  id: string;
  title: string;
  icon: any;
  visible: boolean;
  expanded: boolean;
  component: React.ReactNode;
  hasData: boolean;
  isDisabled: boolean;
}

interface CVSectionsAndOrderingProps {
  sections: Section[];
  onSectionToggle: (sectionId: string) => void;
  onSectionVisibilityToggle: (sectionId: string) => void;
  onSectionReorder: (newSections: Section[]) => void;
  allCollapsed: boolean;
  onToggleAllSections: () => void;
  onUpdateDocument?: (data: any) => void;
}

const CVSectionsAndOrdering: React.FC<CVSectionsAndOrderingProps> = ({
  sections,
  onSectionToggle,
  onSectionVisibilityToggle,
  onSectionReorder,
  allCollapsed,
  onToggleAllSections,
  onUpdateDocument
}) => {
  const themeClasses = getThemeClasses;
  const [isOrderingMode, setIsOrderingMode] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newSections = [...sections];
    const draggedSection = newSections[draggedIndex];
    newSections.splice(draggedIndex, 1);
    newSections.splice(dropIndex, 0, draggedSection);
    
    onSectionReorder(newSections);
    setDraggedIndex(null);
  };

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
    return icons[sectionId] || User;
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

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-lime-100 dark:bg-lime-900/20 rounded-lg">
            <Settings className="w-5 h-5 text-lime-600 dark:text-lime-400" />
          </div>
          <div>
            <h2 className={`text-lg font-semibold ${themeClasses.text.primary}`}>
              CV Sections & Ordering
            </h2>
            <p className={`text-sm ${themeClasses.text.secondary}`}>
              Manage your CV sections and their display order
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <motion.button
            onClick={() => setIsOrderingMode(!isOrderingMode)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              isOrderingMode 
                ? 'bg-lime-100 dark:bg-lime-900/20 text-lime-700 dark:text-lime-300' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isOrderingMode ? 'Exit Ordering' : 'Reorder Sections'}
          </motion.button>
          
          <motion.button
            onClick={onToggleAllSections}
            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {allCollapsed ? 'Expand All' : 'Collapse All'}
          </motion.button>
        </div>
      </div>

      {/* Ordering Mode */}
      {isOrderingMode ? (
        <div className={`${themeClasses.card.base} rounded-lg p-4`}>
          <h3 className={`text-md font-semibold ${themeClasses.text.primary} mb-4`}>
            Drag to Reorder Sections
          </h3>
          <div className="space-y-2">
            {sections.map((section, index) => (
              <motion.div
                key={section.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                className={`flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-move hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  draggedIndex === index ? 'opacity-50' : ''
                }`}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <GripVertical className="w-4 h-4 text-gray-400" />
                <div className="flex items-center gap-2">
                  {React.createElement(getSectionIcon(section.id), { className: "w-4 h-4 text-gray-600 dark:text-gray-400" })}
                  <span className={`text-sm font-medium ${themeClasses.text.primary}`}>
                    {section.title}
                  </span>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => onSectionVisibilityToggle(section.id)}
                    className={`p-1 rounded transition-colors ${
                      section.visible 
                        ? 'text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/20' 
                        : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {section.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        /* Normal Sections View */
        <div className="space-y-4">
          {sections.map((section, index) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={`${themeClasses.card.base} rounded-lg overflow-hidden ${
                section.isDisabled ? 'opacity-60' : ''
              }`}
            >
              {/* Section Header */}
              <div 
                className={`flex items-center justify-between p-4 transition-colors ${
                  section.isDisabled 
                    ? 'cursor-not-allowed opacity-60' 
                    : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
                onClick={() => !section.isDisabled && onSectionToggle(section.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {React.createElement(getSectionIcon(section.id), { 
                      className: `w-5 h-5 ${
                        section.isDisabled 
                          ? 'text-gray-400 dark:text-gray-500' 
                          : 'text-lime-600 dark:text-lime-400'
                      }` 
                    })}
                    <span className={`font-semibold ${
                      section.isDisabled 
                        ? 'text-gray-400 dark:text-gray-500' 
                        : themeClasses.text.primary
                    }`}>
                      {section.title}
                    </span>
                    {section.isDisabled && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        No data
                      </span>
                    )}
                  </div>
                  
                  {!section.isDisabled && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSectionVisibilityToggle(section.id);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          section.visible 
                            ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20' 
                            : 'text-gray-400 bg-gray-100 dark:bg-gray-700'
                        }`}
                      >
                        {section.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </div>
                
                {!section.isDisabled && (
                  <motion.button
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {section.expanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    )}
                  </motion.button>
                )}
              </div>

              {/* Section Content */}
              {section.expanded && !section.isDisabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="border-t border-gray-200 dark:border-gray-700"
                >
                  {section.component}
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CVSectionsAndOrdering;
