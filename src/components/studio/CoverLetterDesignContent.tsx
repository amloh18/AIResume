'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Palette,
  Type,
  Layout,
  RotateCcw,
  Ruler,
  AlignLeft,
  AlignCenter,
  AlignRight
} from 'lucide-react';

interface CoverLetterDesignContentProps {
  onSettingsChange?: (settings: any) => void;
  currentTemplate?: any;
  coverLetterData?: any;
}

const CoverLetterDesignContent: React.FC<CoverLetterDesignContentProps> = ({
  onSettingsChange,
  currentTemplate,
  coverLetterData
}) => {
  // Initialize design settings for cover letters
  const [designSettings, setDesignSettings] = useState({
    fontFamily: currentTemplate?.layout?.typography?.fontFamily || 'Times New Roman, serif',
    headerFontSize: parseInt(currentTemplate?.layout?.typography?.headerFontSize) || 16,
    bodyFontSize: parseInt(currentTemplate?.layout?.typography?.bodyFontSize) || 12,
    lineSpacing: parseFloat(currentTemplate?.layout?.spacing?.lineHeight) || 1.6,
    paragraphSpacing: parseInt(currentTemplate?.layout?.spacing?.paragraphSpacing) || 16,
    headerAlignment: currentTemplate?.layout?.headerAlignment || 'left' as 'left' | 'center' | 'right',
    datePosition: currentTemplate?.layout?.datePosition || 'right' as 'left' | 'right',
    primaryColor: currentTemplate?.layout?.styling?.primaryColor || '#000000',
    secondaryColor: currentTemplate?.layout?.styling?.secondaryColor || '#333333',
    margins: {
      top: parseInt(currentTemplate?.layout?.spacing?.margins?.top) || 40,
      bottom: parseInt(currentTemplate?.layout?.spacing?.margins?.bottom) || 40,
      left: parseInt(currentTemplate?.layout?.spacing?.margins?.left) || 40,
      right: parseInt(currentTemplate?.layout?.spacing?.margins?.right) || 40,
    }
  });

  // Sync settings when template changes
  useEffect(() => {
    if (currentTemplate?.layout) {
      setDesignSettings(prev => ({
        ...prev,
        fontFamily: currentTemplate.layout.typography?.fontFamily || prev.fontFamily,
        headerFontSize: parseInt(currentTemplate.layout.typography?.headerFontSize) || prev.headerFontSize,
        bodyFontSize: parseInt(currentTemplate.layout.typography?.bodyFontSize) || prev.bodyFontSize,
        lineSpacing: parseFloat(currentTemplate.layout.spacing?.lineHeight) || prev.lineSpacing,
        headerAlignment: currentTemplate.layout.headerAlignment || prev.headerAlignment,
        datePosition: currentTemplate.layout.datePosition || prev.datePosition,
        primaryColor: currentTemplate.layout.styling?.primaryColor || prev.primaryColor,
        secondaryColor: currentTemplate.layout.styling?.secondaryColor || prev.secondaryColor
      }));
    }
  }, [currentTemplate]);

  const handleSettingChange = (key: string, value: any) => {
    const newSettings = { ...designSettings, [key]: value };
    setDesignSettings(newSettings);
    
    if (onSettingsChange) {
      onSettingsChange(newSettings);
    }
  };

  const handleMarginChange = (key: string, value: number) => {
    const newMargins = { ...designSettings.margins, [key]: value };
    const newSettings = { ...designSettings, margins: newMargins };
    setDesignSettings(newSettings);
    
    if (onSettingsChange) {
      onSettingsChange(newSettings);
    }
  };

  const handleReset = () => {
    const defaultSettings = {
      fontFamily: 'Times New Roman, serif',
      headerFontSize: 16,
      bodyFontSize: 12,
      lineSpacing: 1.6,
      paragraphSpacing: 16,
      headerAlignment: 'left' as 'left' | 'center' | 'right',
      datePosition: 'right' as 'left' | 'right',
      primaryColor: '#000000',
      secondaryColor: '#333333',
      margins: {
        top: 40,
        bottom: 40,
        left: 40,
        right: 40,
      }
    };
    setDesignSettings(defaultSettings);
    if (onSettingsChange) {
      onSettingsChange(defaultSettings);
    }
  };

  return (
    <div className="h-full w-full bg-[#1A201A] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">Cover Letter Design</h1>
          <p className="text-sm text-white/60">Customize the visual appearance of your cover letter.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <motion.button
            onClick={handleReset}
            className="px-4 py-1.5 text-xs bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RotateCcw className="w-3 h-3 inline mr-1.5" />
            Reset
          </motion.button>
        </div>
      </div>

      {/* Cards in single column layout */}
      <div className="flex flex-col gap-6">
        {/* Typography Section */}
        <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Type className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-base font-semibold text-white">Typography</h3>
          </div>
          
          <div>
            <div className="space-y-4">
              {/* Font Family */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Font Family</label>
                <select
                  value={designSettings.fontFamily.split(',')[0]}
                  onChange={(e) => handleSettingChange('fontFamily', e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
                >
                  <option value="Times New Roman" className="bg-gray-800 text-white">Times New Roman</option>
                  <option value="Georgia" className="bg-gray-800 text-white">Georgia</option>
                  <option value="Calibri" className="bg-gray-800 text-white">Calibri</option>
                  <option value="Arial" className="bg-gray-800 text-white">Arial</option>
                  <option value="Helvetica Neue" className="bg-gray-800 text-white">Helvetica</option>
                  <option value="Inter" className="bg-gray-800 text-white">Inter</option>
                </select>
              </div>

              {/* Font Sizes */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">Header Size</label>
                  <input
                    type="range"
                    min="14"
                    max="20"
                    value={designSettings.headerFontSize}
                    onChange={(e) => handleSettingChange('headerFontSize', parseInt(e.target.value))}
                    className="w-full accent-[#80FF00]"
                  />
                  <span className="text-xs text-white/60">{designSettings.headerFontSize}px</span>
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">Body Size</label>
                  <input
                    type="range"
                    min="10"
                    max="14"
                    value={designSettings.bodyFontSize}
                    onChange={(e) => handleSettingChange('bodyFontSize', parseInt(e.target.value))}
                    className="w-full accent-[#80FF00]"
                  />
                  <span className="text-xs text-white/60">{designSettings.bodyFontSize}px</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Layout Section */}
        <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Layout className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-base font-semibold text-white">Layout</h3>
          </div>
          
          <div>
            <div className="space-y-4">
              {/* Header Alignment */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Header Alignment</label>
                <div className="flex gap-2">
                  {[
                    { id: 'left', icon: AlignLeft, label: 'Left' },
                    { id: 'center', icon: AlignCenter, label: 'Center' },
                    { id: 'right', icon: AlignRight, label: 'Right' }
                  ].map((align) => (
                    <button
                      key={align.id}
                      onClick={() => handleSettingChange('headerAlignment', align.id)}
                      className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                        designSettings.headerAlignment === align.id
                          ? 'bg-[#80FF00]/20 border-[#80FF00] text-[#80FF00]'
                          : 'border-white/20 text-white/80 hover:bg-white/10'
                      }`}
                    >
                      <align.icon className="w-4 h-4" />
                      {align.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Line & Paragraph Spacing */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">Line Spacing</label>
                  <input
                    type="range"
                    min="1.2"
                    max="2.0"
                    step="0.1"
                    value={designSettings.lineSpacing}
                    onChange={(e) => handleSettingChange('lineSpacing', parseFloat(e.target.value))}
                    className="w-full accent-[#80FF00]"
                  />
                  <span className="text-xs text-white/60">{designSettings.lineSpacing}x</span>
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">Paragraph</label>
                  <input
                    type="range"
                    min="8"
                    max="24"
                    step="2"
                    value={designSettings.paragraphSpacing}
                    onChange={(e) => handleSettingChange('paragraphSpacing', parseInt(e.target.value))}
                    className="w-full accent-[#80FF00]"
                  />
                  <span className="text-xs text-white/60">{designSettings.paragraphSpacing}px</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Colors Section */}
        <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Palette className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-base font-semibold text-white">Colors</h3>
          </div>
          
          <div>
            <div className="space-y-4">
              {/* Color Presets */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Color Presets</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'black', name: 'Black', primary: '#000000', secondary: '#333333' },
                    { id: 'navy', name: 'Navy', primary: '#1E40AF', secondary: '#374151' },
                    { id: 'slate', name: 'Slate', primary: '#1F2937', secondary: '#6B7280' },
                    { id: 'blue', name: 'Blue', primary: '#2563EB', secondary: '#475569' }
                  ].map((scheme) => (
                    <button
                      key={scheme.id}
                      onClick={() => {
                        handleSettingChange('primaryColor', scheme.primary);
                        handleSettingChange('secondaryColor', scheme.secondary);
                      }}
                      className="p-3 rounded-lg border border-white/20 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: scheme.primary }} />
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: scheme.secondary }} />
                        </div>
                        <span className="text-sm font-medium text-white">{scheme.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Colors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/80 text-xs font-medium mb-2">Primary Color</label>
                  <input
                    type="color"
                    value={designSettings.primaryColor}
                    onChange={(e) => handleSettingChange('primaryColor', e.target.value)}
                    className="w-full h-10 rounded-lg border border-white/20 bg-white/10 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-xs font-medium mb-2">Secondary Color</label>
                  <input
                    type="color"
                    value={designSettings.secondaryColor}
                    onChange={(e) => handleSettingChange('secondaryColor', e.target.value)}
                    className="w-full h-10 rounded-lg border border-white/20 bg-white/10 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Margins Section */}
        <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Ruler className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-base font-semibold text-white">Page Margins</h3>
          </div>
          
          <div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(designSettings.margins).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-white/80 text-sm font-medium mb-2 capitalize">{key}</label>
                    <input
                      type="range"
                      min="20"
                      max="60"
                      step="5"
                      value={value}
                      onChange={(e) => handleMarginChange(key, parseInt(e.target.value))}
                      className="w-full accent-[#80FF00]"
                    />
                    <span className="text-xs text-white/60">{value}px</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoverLetterDesignContent;