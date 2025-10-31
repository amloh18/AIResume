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
  Star,
  X
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
      {/* Controls - Removed dropdown header */}
      <div className="flex items-center justify-end mb-6">
        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => setIsOrderingMode(!isOrderingMode)}
            className={`px-6 py-2 text-sm rounded-full transition-colors ${
              isOrderingMode 
                ? 'bg-green-600 text-white' 
                : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <GripVertical className="w-4 h-4 inline mr-2" />
            {isOrderingMode ? 'Exit Ordering' : 'Rearrange Sections'}
          </motion.button>
          
          <motion.button
            onClick={onToggleAllSections}
            className="px-6 py-2 text-sm bg-green-600/20 text-green-400 rounded-full hover:bg-green-600/30 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <X className="w-4 h-4 inline mr-2" />
            {allCollapsed ? 'Expand All' : 'Collapse All'}
          </motion.button>
        </div>
      </div>

      {/* Main Panel Container */}
      <div className="rounded-xl">

        {/* Ordering Mode */}
        {isOrderingMode ? (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Drag to Reorder Sections
            </h3>
            <div className="space-y-3">
              {sections.map((section, index) => (
                <motion.div
                  key={section.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/5 cursor-move hover:bg-white/10 transition-colors ${
                    draggedIndex === index ? 'opacity-50' : ''
                  }`}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <GripVertical className="w-4 h-4 text-white/60" />
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      {React.createElement(getSectionIcon(section.id), { className: "w-4 h-4 text-white" })}
                    </div>
                    <span className="text-sm font-medium text-white">
                      {section.title}
                    </span>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => onSectionVisibilityToggle(section.id)}
                      className={`p-1 transition-colors ${
                        section.visible 
                          ? 'text-[#80FF00]' 
                          : 'text-white/60'
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
          /* Normal Sections View - AI Career Report Style */
          <div className="space-y-6">
            {sections.map((section, index) => (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`bg-white/5 rounded-2xl border border-white/10 transition-all duration-300 ${
                  section.isDisabled ? 'opacity-60' : ''
                }`}
              >
                {/* Section Header */}
                <div 
                  className={`flex items-center justify-between p-6 transition-colors ${
                    section.isDisabled 
                      ? 'cursor-not-allowed opacity-60' 
                      : 'cursor-pointer hover:bg-white/5'
                  }`}
                  onClick={() => !section.isDisabled && onSectionToggle(section.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                        {React.createElement(getSectionIcon(section.id), { 
                          className: `w-5 h-5 text-white` 
                        })}
                      </div>
                      <h3 className="text-xl font-semibold text-white">{section.title}</h3>
                      {section.isDisabled && (
                        <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded">
                          No data
                        </span>
                      )}
                    </div>
                    
                    {!section.isDisabled && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSectionVisibilityToggle(section.id);
                          }}
                          className={`p-2 transition-colors ${
                            section.visible 
                              ? 'text-[#80FF00]' 
                              : 'text-white/60'
                          }`}
                        >
                          {section.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {!section.isDisabled && (
                    <button className="text-white/60 hover:text-white transition-colors">
                      {section.expanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  )}
                </div>
                
                {/* Section Content */}
                {section.expanded && !section.isDisabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="px-6 pb-6"
                  >
                    <div className="pt-4">
                      {section.component}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CVSectionsAndOrdering;
