'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Palette, 
  Type, 
  Layout, 
  Spacing,
  RotateCcw
} from 'lucide-react';
import { getThemeClasses } from '@/lib/utils/themeUtils';

interface DesignContentProps {
  onSettingsChange?: (settings: any) => void;
}

const DesignContent: React.FC<DesignContentProps> = ({
  onSettingsChange
}) => {
  const themeClasses = getThemeClasses;
  
  const [designSettings, setDesignSettings] = useState({
    fontFamily: 'Inter',
    headerFontSize: 24,
    bodyFontSize: 14,
    sectionFontSize: 18,
    lineSpacing: 1.2,
    letterSpacing: 0,
    sectionSpacing: 16,
    colorScheme: 'professional',
    alignment: 'left' as 'left' | 'center' | 'right',
    pagePadding: { top: 32, bottom: 32, left: 32, right: 32 }
  });

  const handleSettingChange = (key: string, value: any) => {
    const newSettings = { ...designSettings, [key]: value };
    setDesignSettings(newSettings);
    if (onSettingsChange) {
      onSettingsChange(newSettings);
    }
  };

  const handleReset = () => {
    const defaultSettings = {
      fontFamily: 'Inter',
      headerFontSize: 24,
      bodyFontSize: 14,
      sectionFontSize: 18,
      lineSpacing: 1.2,
      letterSpacing: 0,
      sectionSpacing: 16,
      colorScheme: 'professional',
      alignment: 'left' as 'left' | 'center' | 'right',
      pagePadding: { top: 32, bottom: 32, left: 32, right: 32 }
    };
    setDesignSettings(defaultSettings);
    if (onSettingsChange) {
      onSettingsChange(defaultSettings);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
            <Palette className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className={`text-lg font-semibold ${themeClasses.text.primary}`}>
            Design Settings
          </h3>
        </div>
        <motion.button
          onClick={handleReset}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm ${themeClasses.button.secondary} rounded-lg`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </motion.button>
      </div>

      {/* Typography Section */}
      <div className={`${themeClasses.card.base} rounded-lg border p-4`}>
        <div className="flex items-center gap-2 mb-4">
          <Type className="w-4 h-4 text-blue-600" />
          <h4 className={`font-medium ${themeClasses.text.primary}`}>Typography</h4>
        </div>
        
        <div className="space-y-4">
          {/* Font Family */}
          <div>
            <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-2`}>
              Font Family
            </label>
            <select
              value={designSettings.fontFamily}
              onChange={(e) => handleSettingChange('fontFamily', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${themeClasses.input.base} ${themeClasses.input.focus}`}
            >
              <option value="Inter">Inter</option>
              <option value="Roboto">Roboto</option>
              <option value="Open Sans">Open Sans</option>
              <option value="Lato">Lato</option>
              <option value="Montserrat">Montserrat</option>
              <option value="Source Sans Pro">Source Sans Pro</option>
            </select>
          </div>

          {/* Font Sizes */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={`block text-xs font-medium ${themeClasses.text.secondary} mb-1`}>
                Header Size
              </label>
              <input
                type="range"
                min="18"
                max="32"
                value={designSettings.headerFontSize}
                onChange={(e) => handleSettingChange('headerFontSize', parseInt(e.target.value))}
                className="w-full accent-lime-500"
              />
              <span className="text-xs text-gray-500">{designSettings.headerFontSize}px</span>
            </div>
            <div>
              <label className={`block text-xs font-medium ${themeClasses.text.secondary} mb-1`}>
                Body Size
              </label>
              <input
                type="range"
                min="10"
                max="18"
                value={designSettings.bodyFontSize}
                onChange={(e) => handleSettingChange('bodyFontSize', parseInt(e.target.value))}
                className="w-full accent-lime-500"
              />
              <span className="text-xs text-gray-500">{designSettings.bodyFontSize}px</span>
            </div>
            <div>
              <label className={`block text-xs font-medium ${themeClasses.text.secondary} mb-1`}>
                Section Size
              </label>
              <input
                type="range"
                min="14"
                max="24"
                value={designSettings.sectionFontSize}
                onChange={(e) => handleSettingChange('sectionFontSize', parseInt(e.target.value))}
                className="w-full accent-lime-500"
              />
              <span className="text-xs text-gray-500">{designSettings.sectionFontSize}px</span>
            </div>
          </div>
        </div>
      </div>

      {/* Layout Section */}
      <div className={`${themeClasses.card.base} rounded-lg border p-4`}>
        <div className="flex items-center gap-2 mb-4">
          <Layout className="w-4 h-4 text-green-600" />
          <h4 className={`font-medium ${themeClasses.text.primary}`}>Layout</h4>
        </div>
        
        <div className="space-y-4">
          {/* Alignment */}
          <div>
            <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-2`}>
              Text Alignment for CV Header
            </label>
            <p className="text-xs text-gray-500 mb-2">Affects basics section only (excluding professional summary)</p>
            <div className="flex gap-2">
              {['left', 'center', 'right'].map((align) => (
                <button
                  key={align}
                  onClick={() => handleSettingChange('alignment', align)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    designSettings.alignment === align
                      ? 'bg-lime-100 border-lime-300 text-lime-700 dark:bg-lime-900/20 dark:border-lime-600 dark:text-lime-400'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {align.charAt(0).toUpperCase() + align.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Spacing */}
          <div>
            <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-2`}>
              Line Spacing
            </label>
            <input
              type="range"
              min="1"
              max="2"
              step="0.1"
              value={designSettings.lineSpacing}
              onChange={(e) => handleSettingChange('lineSpacing', parseFloat(e.target.value))}
              className="w-full accent-lime-500"
            />
            <span className="text-xs text-gray-500">{designSettings.lineSpacing}x</span>
          </div>
        </div>
      </div>

      {/* Color Scheme Section */}
      <div className={`${themeClasses.card.base} rounded-lg border p-4`}>
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-4 h-4 text-purple-600" />
          <h4 className={`font-medium ${themeClasses.text.primary}`}>Color Scheme</h4>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'black-black', name: 'Black/Black', colors: ['#000000', '#000000'] },
            { id: 'black-grey', name: 'Black/Dark Grey', colors: ['#000000', '#374151'] },
            { id: 'blue-black', name: 'Blue/Black', colors: ['#2563eb', '#000000'] },
            { id: 'green-black', name: 'Green/Black', colors: ['#16a34a', '#000000'] }
          ].map((scheme) => (
            <button
              key={scheme.id}
              onClick={() => handleSettingChange('colorScheme', scheme.id)}
              className={`p-3 rounded-lg border transition-colors ${
                designSettings.colorScheme === scheme.id
                  ? 'border-lime-300 bg-lime-50 dark:border-lime-600 dark:bg-lime-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="flex gap-1">
                  {scheme.colors.map((color, i) => (
                    <div
                      key={i}
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">{scheme.name}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DesignContent;