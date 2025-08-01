'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2,
  Plus,
  FileText,
  Briefcase,
  GraduationCap,
  Code,
  Award,
  Users,
  Globe,
  Heart,
  Music,
  Settings,
  Save,
  Download,
  Eye,
  EyeOff,
  Undo,
  Redo,
  Sparkles,
  ChevronDown
} from 'lucide-react';

interface EnhancedToolbarProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onAutoFit: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onAddSection: (sectionType: string) => void;
  isPreviewMode: boolean;
  onPreviewToggle: () => void;
  onSave: () => void;
  onExport: (format: 'pdf' | 'json') => void;
  hasUnsavedChanges: boolean;
}

const EnhancedToolbar: React.FC<EnhancedToolbarProps> = ({
  zoom,
  onZoomChange,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onAutoFit,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  currentPage,
  totalPages,
  onPageChange,
  onAddSection,
  isPreviewMode,
  onPreviewToggle,
  onSave,
  onExport,
  hasUnsavedChanges
}) => {
  const [showZoomDropdown, setShowZoomDropdown] = useState(false);
  const [showAddSectionDropdown, setShowAddSectionDropdown] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  const zoomLevels = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3];
  const sectionTypes = [
    { id: 'summary', label: 'Professional Summary', icon: FileText, color: 'text-blue-600' },
    { id: 'experience', label: 'Work Experience', icon: Briefcase, color: 'text-green-600' },
    { id: 'education', label: 'Education', icon: GraduationCap, color: 'text-purple-600' },
    { id: 'skills', label: 'Skills', icon: Code, color: 'text-orange-600' },
    { id: 'certifications', label: 'Certifications', icon: Award, color: 'text-red-600' },
    { id: 'leadership', label: 'Leadership', icon: Users, color: 'text-indigo-600' },
    { id: 'projects', label: 'Projects', icon: Globe, color: 'text-teal-600' },
    { id: 'volunteer', label: 'Volunteer', icon: Heart, color: 'text-pink-600' },
    { id: 'interests', label: 'Interests', icon: Music, color: 'text-yellow-600' }
  ];

  const formatZoom = (zoom: number) => {
    return `${Math.round(zoom * 100)}%`;
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setShowZoomDropdown(false);
        setShowAddSectionDropdown(false);
        setShowExportDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-white/95 backdrop-blur-xl border-b border-gray-200 px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Left Section - Zoom Controls */}
        <div className="flex items-center gap-3">
          {/* Zoom Controls */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={onZoomOut}
              disabled={zoom <= 0.25}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            
            <div className="relative dropdown-container">
              <button
                onClick={() => setShowZoomDropdown(!showZoomDropdown)}
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-white rounded-md transition-colors min-w-[80px] flex items-center justify-between"
                title="Zoom Level"
              >
                {formatZoom(zoom)}
                <ChevronDown className="w-3 h-3 ml-1" />
              </button>
              
              <AnimatePresence>
                {showZoomDropdown && (
                  <motion.div
                    className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[120px]"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {zoomLevels.map((level) => (
                      <button
                        key={level}
                        onClick={() => {
                          onZoomChange(level);
                          setShowZoomDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                          zoom === level ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                        }`}
                      >
                        {formatZoom(level)}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <button
              onClick={onZoomIn}
              disabled={zoom >= 3}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            
            <button
              onClick={onZoomReset}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-white rounded-md transition-colors"
              title="Reset Zoom"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            
            <button
              onClick={onAutoFit}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-white rounded-md transition-colors"
              title="Fit to Screen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-300" />

          {/* Add Section Button */}
          <div className="relative dropdown-container">
            <button
              onClick={() => setShowAddSectionDropdown(!showAddSectionDropdown)}
              className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all font-medium text-sm"
              title="Add Section"
            >
              <Plus className="w-4 h-4" />
              Add Section
            </button>
            
            <AnimatePresence>
              {showAddSectionDropdown && (
                <motion.div
                  className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {sectionTypes.map((section) => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        onClick={() => {
                          onAddSection(section.id);
                          setShowAddSectionDropdown(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Icon className={`w-4 h-4 ${section.color}`} />
                        {section.label}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Center Section - Page Navigation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Previous Page"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <span className="px-3 py-2 text-sm font-medium text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Next Page"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Undo"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Redo"
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-300" />

          {/* Preview Toggle */}
          <button
            onClick={onPreviewToggle}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all font-medium text-sm ${
              isPreviewMode
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title={isPreviewMode ? 'Exit Preview' : 'Preview Mode'}
          >
            {isPreviewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {isPreviewMode ? 'Exit Preview' : 'Preview'}
          </button>

          {/* Save Button */}
          <button
            onClick={onSave}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all font-medium text-sm ${
              hasUnsavedChanges
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Save CV"
          >
            <Save className="w-4 h-4" />
            {hasUnsavedChanges ? 'Save*' : 'Saved'}
          </button>

          {/* Export Dropdown */}
          <div className="relative dropdown-container">
            <button
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-medium text-sm shadow-lg"
              title="Export CV"
            >
              <Download className="w-4 h-4" />
              Export
              <ChevronDown className="w-3 h-3" />
            </button>
            
            <AnimatePresence>
              {showExportDropdown && (
                <motion.div
                  className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[140px]"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    onClick={() => {
                      onExport('pdf');
                      setShowExportDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Export as PDF
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      onExport('json');
                      setShowExportDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Export as JSON
                    </div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Auto-save Indicator */}
      {hasUnsavedChanges && (
        <motion.div
          className="absolute top-full left-0 right-0 bg-orange-50 border-t border-orange-200 px-4 py-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <div className="flex items-center justify-center gap-2 text-sm text-orange-700">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            <span>Auto-saving...</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default EnhancedToolbar; 