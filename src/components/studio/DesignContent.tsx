'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Palette,
  Type,
  Layout,
  RotateCcw,
  Code,
  Ruler
} from 'lucide-react';

interface DesignContentProps {
  onSettingsChange?: (settings: any) => void;
  currentTemplate?: any;
  cvData?: any;
}

const DesignContent: React.FC<DesignContentProps> = ({
  onSettingsChange,
  currentTemplate,
  cvData
}) => {
  // Initialize design settings from template or defaults
  const [designSettings, setDesignSettings] = useState({
    fontFamily: currentTemplate?.globalStyles?.fontFamily || 'Inter',
    headerFontSize: parseInt(currentTemplate?.globalStyles?.headerFontSize) || 24,
    bodyFontSize: parseInt(currentTemplate?.globalStyles?.fontSize) || 14,
    sectionFontSize: parseInt(currentTemplate?.globalStyles?.sectionFontSize) || 18,
    lineSpacing: parseFloat(currentTemplate?.globalStyles?.lineHeight) || 1.5,
    letterSpacing: parseInt(currentTemplate?.globalStyles?.letterSpacing) || 0,
    sectionSpacing: parseInt(currentTemplate?.globalStyles?.spacing) || 24,
    colorScheme: 'professional',
    primaryColor: currentTemplate?.globalStyles?.primaryColor || '#000000',
    secondaryColor: currentTemplate?.globalStyles?.secondaryColor || '#374151',
    accentColor: currentTemplate?.globalStyles?.accentColor || '#80FF00',
    alignment: 'left' as 'left' | 'center' | 'right',
    pagePadding: { top: 32, bottom: 32, left: 32, right: 32 },
    skillsDisplayType: 'category' as 'category' | 'chips' | 'comma',
    sectionStyle: 'underline' as 'underline' | 'background' | 'border' | 'minimal',
    dateFormat: 'MMM YYYY' as 'MMM YYYY' | 'MM/YYYY' | 'YYYY-MM' | 'Full',
    bulletStyle: 'disc' as 'disc' | 'square' | 'circle' | 'arrow'
  });

  // Sync settings when template changes
  useEffect(() => {
    if (currentTemplate?.globalStyles) {
      setDesignSettings(prev => ({
        ...prev,
        fontFamily: currentTemplate.globalStyles.fontFamily || prev.fontFamily,
        headerFontSize: parseInt(currentTemplate.globalStyles.headerFontSize) || prev.headerFontSize,
        bodyFontSize: parseInt(currentTemplate.globalStyles.fontSize) || prev.bodyFontSize,
        sectionFontSize: parseInt(currentTemplate.globalStyles.sectionFontSize) || prev.sectionFontSize,
        lineSpacing: parseFloat(currentTemplate.globalStyles.lineHeight) || prev.lineSpacing,
        primaryColor: currentTemplate.globalStyles.primaryColor || prev.primaryColor,
        secondaryColor: currentTemplate.globalStyles.secondaryColor || prev.secondaryColor
      }));
    }
  }, [currentTemplate]);

  const handleSettingChange = (key: string, value: any) => {
    const newSettings = { ...designSettings, [key]: value };
    setDesignSettings(newSettings);
    
    // Immediately apply to template and trigger re-render
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
      lineSpacing: 1.5,
      letterSpacing: 0,
      sectionSpacing: 24,
      colorScheme: 'professional',
      primaryColor: '#000000',
      secondaryColor: '#374151',
      accentColor: '#80FF00',
      alignment: 'left' as 'left' | 'center' | 'right',
      pagePadding: { top: 32, bottom: 32, left: 32, right: 32 },
      skillsDisplayType: 'category' as 'category' | 'chips' | 'comma',
      sectionStyle: 'underline' as 'underline' | 'background' | 'border' | 'minimal',
      dateFormat: 'MMM YYYY' as 'MMM YYYY' | 'MM/YYYY' | 'YYYY-MM' | 'Full',
      bulletStyle: 'disc' as 'disc' | 'square' | 'circle' | 'arrow'
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
          <h1 className="text-xl font-bold text-white mb-1">Design Settings</h1>
          <p className="text-sm text-white/60">Customize the visual appearance of your CV.</p>
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

      {/* Cards in 2-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Typography Section */}
      <div className="bg-white/5 rounded-xl border border-white/10 transition-all duration-300">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Type className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-base font-semibold text-white">Typography</h3>
          </div>
        </div>
        
        <div className="px-4 pb-4">
          <div className="pt-2 space-y-4">
            {/* Font Family */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Font Family</label>
              <select
                value={designSettings.fontFamily}
                onChange={(e) => handleSettingChange('fontFamily', e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
              >
                <option value="Inter" className="bg-gray-800 text-white">Inter</option>
                <option value="Roboto" className="bg-gray-800 text-white">Roboto</option>
                <option value="Open Sans" className="bg-gray-800 text-white">Open Sans</option>
                <option value="Lato" className="bg-gray-800 text-white">Lato</option>
                <option value="Montserrat" className="bg-gray-800 text-white">Montserrat</option>
                <option value="Source Sans Pro" className="bg-gray-800 text-white">Source Sans Pro</option>
              </select>
            </div>

            {/* Font Sizes */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Header Size</label>
                <input
                  type="range"
                  min="18"
                  max="32"
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
                  max="18"
                  value={designSettings.bodyFontSize}
                  onChange={(e) => handleSettingChange('bodyFontSize', parseInt(e.target.value))}
                  className="w-full accent-[#80FF00]"
                />
                <span className="text-xs text-white/60">{designSettings.bodyFontSize}px</span>
              </div>
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Section Size</label>
                <input
                  type="range"
                  min="14"
                  max="24"
                  value={designSettings.sectionFontSize}
                  onChange={(e) => handleSettingChange('sectionFontSize', parseInt(e.target.value))}
                  className="w-full accent-[#80FF00]"
                />
                <span className="text-xs text-white/60">{designSettings.sectionFontSize}px</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Layout Section */}
      <div className="bg-white/5 rounded-xl border border-white/10 transition-all duration-300">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Layout className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-base font-semibold text-white">Layout</h3>
          </div>
        </div>
        
        <div className="px-4 pb-4">
          <div className="pt-2 space-y-4">
            {/* Alignment */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Text Alignment for CV Header</label>
              <p className="text-xs text-white/50 mb-3">Affects basics section only (excluding professional summary)</p>
              <div className="flex gap-3">
                {['left', 'center', 'right'].map((align) => (
                  <button
                    key={align}
                    onClick={() => handleSettingChange('alignment', align)}
                    className={`px-4 py-3 text-sm rounded-lg border transition-colors ${
                      designSettings.alignment === align
                        ? 'bg-[#80FF00]/20 border-[#80FF00] text-[#80FF00]'
                        : 'border-white/20 text-white/80 hover:bg-white/10'
                    }`}
                  >
                    {align.charAt(0).toUpperCase() + align.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Spacing */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Line Spacing</label>
              <input
                type="range"
                min="1"
                max="2"
                step="0.1"
                value={designSettings.lineSpacing}
                onChange={(e) => handleSettingChange('lineSpacing', parseFloat(e.target.value))}
                className="w-full accent-[#80FF00]"
              />
              <span className="text-xs text-white/60">{designSettings.lineSpacing}x</span>
            </div>
          </div>
        </div>
      </div>

      {/* Skills Display Type Section */}
      <div className="bg-white/5 rounded-xl border border-white/10 transition-all duration-300">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Code className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-base font-semibold text-white">Skills Display</h3>
          </div>
        </div>
        
        <div className="px-4 pb-4">
          <div className="pt-2">
            <div className="grid grid-cols-1 gap-3">
              {[
                { 
                  id: 'category', 
                  name: 'Category with Comma List', 
                  description: 'Programming Languages: JavaScript, Python, Java',
                  preview: 'Category based grouping'
                },
                { 
                  id: 'chips', 
                  name: 'Skill Chips', 
                  description: '[JavaScript] [Python] [Java] [React]',
                  preview: 'Individual skill badges'
                },
                { 
                  id: 'comma', 
                  name: 'Simple Comma Separated', 
                  description: 'JavaScript, Python, Java, React, Node.js',
                  preview: 'Clean comma list'
                }
              ].map((displayType) => (
                <button
                  key={displayType.id}
                  onClick={() => handleSettingChange('skillsDisplayType', displayType.id)}
                  className={`p-3 rounded-lg border transition-colors text-left ${
                    designSettings.skillsDisplayType === displayType.id
                      ? 'border-[#80FF00] bg-[#80FF00]/10'
                      : 'border-white/20 hover:bg-white/10'
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-white">{displayType.name}</span>
                    <span className="text-xs text-white/60">{displayType.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Color Scheme Section */}
      <div className="bg-white/5 rounded-xl border border-white/10 transition-all duration-300">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Palette className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-base font-semibold text-white">Colors</h3>
          </div>
        </div>
        
        <div className="px-4 pb-4">
          <div className="pt-2 space-y-4">
            {/* Color Presets */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Color Presets</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'black-black', name: 'Black/Black', primary: '#000000', secondary: '#000000' },
                  { id: 'black-grey', name: 'Black/Grey', primary: '#000000', secondary: '#374151' },
                  { id: 'blue-black', name: 'Blue/Black', primary: '#2563eb', secondary: '#000000' },
                  { id: 'green-black', name: 'Green/Black', primary: '#16a34a', secondary: '#000000' },
                  { id: 'purple-grey', name: 'Purple/Grey', primary: '#7c3aed', secondary: '#6b7280' },
                  { id: 'navy-slate', name: 'Navy/Slate', primary: '#1e40af', secondary: '#475569' }
                ].map((scheme) => (
                  <button
                    key={scheme.id}
                    onClick={() => {
                      handleSettingChange('primaryColor', scheme.primary);
                      handleSettingChange('secondaryColor', scheme.secondary);
                      handleSettingChange('colorScheme', scheme.id);
                    }}
                    className={`p-3 rounded-lg border transition-colors ${
                      designSettings.colorScheme === scheme.id
                        ? 'border-[#80FF00] bg-[#80FF00]/10'
                        : 'border-white/20 hover:bg-white/10'
                    }`}
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
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-white/80 text-xs font-medium mb-2">Primary</label>
                <input
                  type="color"
                  value={designSettings.primaryColor}
                  onChange={(e) => handleSettingChange('primaryColor', e.target.value)}
                  className="w-full h-10 rounded-lg border border-white/20 bg-white/10 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-white/80 text-xs font-medium mb-2">Secondary</label>
                <input
                  type="color"
                  value={designSettings.secondaryColor}
                  onChange={(e) => handleSettingChange('secondaryColor', e.target.value)}
                  className="w-full h-10 rounded-lg border border-white/20 bg-white/10 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-white/80 text-xs font-medium mb-2">Accent</label>
                <input
                  type="color"
                  value={designSettings.accentColor}
                  onChange={(e) => handleSettingChange('accentColor', e.target.value)}
                  className="w-full h-10 rounded-lg border border-white/20 bg-white/10 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spacing Section */}
      <div className="bg-white/5 rounded-xl border border-white/10 transition-all duration-300">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Ruler className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-base font-semibold text-white">Spacing</h3>
          </div>
        </div>
        
        <div className="px-4 pb-4">
          <div className="pt-2 space-y-4">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Section Spacing</label>
              <input
                type="range"
                min="8"
                max="48"
                step="4"
                value={designSettings.sectionSpacing}
                onChange={(e) => handleSettingChange('sectionSpacing', parseInt(e.target.value))}
                className="w-full accent-[#80FF00]"
              />
              <span className="text-xs text-white/60">{designSettings.sectionSpacing}px</span>
            </div>

            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Letter Spacing</label>
              <input
                type="range"
                min="-1"
                max="2"
                step="0.1"
                value={designSettings.letterSpacing}
                onChange={(e) => handleSettingChange('letterSpacing', parseFloat(e.target.value))}
                className="w-full accent-[#80FF00]"
              />
              <span className="text-xs text-white/60">{designSettings.letterSpacing}px</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section Style */}
      <div className="bg-white/5 rounded-xl border border-white/10 transition-all duration-300">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Layout className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-base font-semibold text-white">Section Headings</h3>
          </div>
        </div>
        
        <div className="px-4 pb-4">
          <div className="pt-2">
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'underline', name: 'Underline', icon: '___' },
                { id: 'background', name: 'Background', icon: '█░░' },
                { id: 'border', name: 'Border', icon: '┌─┐' },
                { id: 'minimal', name: 'Minimal', icon: 'T' }
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => handleSettingChange('sectionStyle', style.id)}
                  className={`p-3 rounded-lg border transition-colors ${
                    designSettings.sectionStyle === style.id
                      ? 'border-[#80FF00] bg-[#80FF00]/10'
                      : 'border-white/20 hover:bg-white/10'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-mono">{style.icon}</span>
                    <span className="text-xs font-medium text-white">{style.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Date Format */}
      <div className="bg-white/5 rounded-xl border border-white/10 transition-all duration-300">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Type className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-base font-semibold text-white">Date Format</h3>
          </div>
        </div>
        
        <div className="px-4 pb-4">
          <div className="pt-2">
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'MMM YYYY', name: 'Jan 2024', example: 'Jan 2024' },
                { id: 'MM/YYYY', name: '01/2024', example: '01/2024' },
                { id: 'YYYY-MM', name: '2024-01', example: '2024-01' },
                { id: 'Full', name: 'January 2024', example: 'January 2024' }
              ].map((format) => (
                <button
                  key={format.id}
                  onClick={() => handleSettingChange('dateFormat', format.id)}
                  className={`p-3 rounded-lg border transition-colors text-left ${
                    designSettings.dateFormat === format.id
                      ? 'border-[#80FF00] bg-[#80FF00]/10'
                      : 'border-white/20 hover:bg-white/10'
                  }`}
                >
                  <span className="text-xs font-medium text-white block">{format.name}</span>
                  <span className="text-xs text-white/60">{format.example}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default DesignContent;