'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Bold, 
  Italic, 
  List, 
  Hash, 
  Maximize2, 
  Minimize2, 
  Eye, 
  EyeOff,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight
} from 'lucide-react';
import { getThemeClasses } from '@/lib/utils/themeUtils';

interface ProfessionalTextFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  rows?: number;
  maxLength?: number;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  showFullToolbar?: boolean;
  fieldId?: string;
}

const ProfessionalTextField: React.FC<ProfessionalTextFieldProps> = ({
  value,
  onChange,
  placeholder = '',
  label,
  rows = 3,
  maxLength,
  required = false,
  disabled = false,
  className = '',
  showFullToolbar = true,
  fieldId = 'text-field'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const themeClasses = getThemeClasses;

  // Text statistics utility
  const getTextStats = (text: string) => {
    const characters = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text.split('\n').length;
    return { characters, words, lines };
  };

  const stats = getTextStats(value);

  // Formatting functions
  const applyFormatting = (format: string) => {
    const textarea = document.getElementById(`${fieldId}-textarea`) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    let formattedText = '';
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      case 'bullet':
        formattedText = `• ${selectedText}`;
        break;
      case 'number':
        formattedText = `1. ${selectedText}`;
        break;
      default:
        formattedText = selectedText;
    }

    const newValue = value.substring(0, start) + formattedText + value.substring(end);
    onChange(newValue);
  };

  const toggleExpansion = () => {
    setIsExpanded(!isExpanded);
  };

  const togglePreview = () => {
    setShowPreview(!showPreview);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Label and Controls */}
      {label && (
        <div className="flex items-center justify-between">
          <label className={`${themeClasses.text.primary} font-semibold text-sm`}>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="flex items-center gap-2">
            {/* Text Statistics */}
            <div className={`flex items-center gap-3 text-xs ${themeClasses.text.muted}`}>
              <span>{stats.words} words, {stats.characters} chars</span>
              {maxLength && (
                <span className={stats.characters > maxLength * 0.9 ? 'text-orange-500' : ''}>
                  {stats.characters}/{maxLength}
                </span>
              )}
            </div>
            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              <motion.button
                onClick={togglePreview}
                className={`p-2 ${themeClasses.background.hover} rounded-lg transition-colors`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={showPreview ? 'Hide Preview' : 'Show Preview'}
                disabled={disabled}
              >
                {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </motion.button>
              <motion.button
                onClick={toggleExpansion}
                className={`p-2 ${themeClasses.background.hover} rounded-lg transition-colors`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={isExpanded ? 'Minimize' : 'Maximize'}
                disabled={disabled}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </motion.button>
            </div>
          </div>
        </div>
      )}

      {/* Formatting Toolbar */}
      {showFullToolbar && (
        <div className={`flex items-center gap-2 p-2 ${themeClasses.background.secondary} rounded-lg border`}>
          <div className="flex items-center gap-1">
            <motion.button
              onClick={() => applyFormatting('bold')}
              className={`p-1.5 ${themeClasses.background.hover} rounded-lg transition-colors`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Bold"
              disabled={disabled}
            >
              <Bold className="w-3 h-3" />
            </motion.button>
            <motion.button
              onClick={() => applyFormatting('italic')}
              className={`p-1.5 ${themeClasses.background.hover} rounded-lg transition-colors`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Italic"
              disabled={disabled}
            >
              <Italic className="w-3 h-3" />
            </motion.button>
            <motion.button
              onClick={() => applyFormatting('bullet')}
              className={`p-1.5 ${themeClasses.background.hover} rounded-lg transition-colors`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Bullet List"
              disabled={disabled}
            >
              <List className="w-3 h-3" />
            </motion.button>
            <motion.button
              onClick={() => applyFormatting('number')}
              className={`p-1.5 ${themeClasses.background.hover} rounded-lg transition-colors`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Numbered List"
              disabled={disabled}
            >
              <Hash className="w-3 h-3" />
            </motion.button>
          </div>
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-2" />
          <div className="flex items-center gap-1">
            <motion.button
              className={`p-1.5 ${themeClasses.background.hover} rounded-lg transition-colors`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Align Left"
              disabled={disabled}
            >
              <AlignLeft className="w-3 h-3" />
            </motion.button>
            <motion.button
              className={`p-1.5 ${themeClasses.background.hover} rounded-lg transition-colors`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Align Center"
              disabled={disabled}
            >
              <AlignCenter className="w-3 h-3" />
            </motion.button>
            <motion.button
              className={`p-1.5 ${themeClasses.background.hover} rounded-lg transition-colors`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Align Right"
              disabled={disabled}
            >
              <AlignRight className="w-3 h-3" />
            </motion.button>
          </div>
        </div>
      )}

      {/* Text Area Container */}
      <div className="relative">
        {showPreview ? (
          <div className={`w-full px-3 py-2 ${themeClasses.background.secondary} rounded-lg text-sm border min-h-24 max-h-64 overflow-y-auto`}>
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-sans">{value || 'No content to preview'}</pre>
            </div>
          </div>
        ) : (
          <textarea
            id={`${fieldId}-textarea`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={isExpanded ? Math.max(rows * 2, 8) : rows}
            maxLength={maxLength}
            required={required}
            disabled={disabled}
            className={`w-full px-3 py-2 ${themeClasses.input.base} ${themeClasses.input.focus} rounded-lg text-sm transition-all duration-200 resize-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
        )}
      </div>

      {/* Help Text */}
      <div className={`text-xs ${themeClasses.text.muted} flex items-center gap-2`}>
        <Type className="w-3 h-3" />
        <span>Use formatting tools above to style your text. Supports markdown formatting.</span>
      </div>
    </div>
  );
};

export default ProfessionalTextField;
