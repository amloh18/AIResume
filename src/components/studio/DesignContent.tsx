'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Palette, 
  Type, 
  Layout, 
  Spacing,
  RotateCcw,
  Code
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
    pagePadding: { top: 32, bottom: 32, left: 32, right: 32 },
    skillsDisplayType: 'category' as 'category' | 'chips' | 'comma'
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
      pagePadding: { top: 32, bottom: 32, left: 32, right: 32 },
      skillsDisplayType: 'category' as 'category' | 'chips' | 'comma'
    };
    setDesignSettings(defaultSettings);
    if (onSettingsChange) {
      onSettingsChange(defaultSettings);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Design Settings</h1>
          <p className="text-gray-300">Customize the visual appearance of your CV.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <motion.button
            onClick={handleReset}
            className="px-6 py-2 text-sm bg-green-600/20 text-green-400 rounded-full hover:bg-green-600/30 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RotateCcw className="w-4 h-4 inline mr-2" />
            Reset
          </motion.button>
        </div>
      </div>

      {/* Typography Section */}
      <div className="bg-white/5 rounded-2xl border border-white/10 transition-all duration-300">
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Type className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">Typography</h3>
            </div>
          </div>
        </div>
        
        <div className="px-6 pb-6">
          <div className="pt-4 space-y-6">
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
            <div className="grid grid-cols-3 gap-6">
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
      <div className="bg-white/5 rounded-2xl border border-white/10 transition-all duration-300">
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Layout className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">Layout</h3>
            </div>
          </div>
        </div>
        
        <div className="px-6 pb-6">
          <div className="pt-4 space-y-6">
            {/* Alignment */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Text Alignment for CV Header</label>
              <p className="text-xs text-white/60 mb-4">Affects basics section only (excluding professional summary)</p>
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
      <div className="bg-white/5 rounded-2xl border border-white/10 transition-all duration-300">
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Code className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">Skills Display</h3>
            </div>
          </div>
        </div>
        
        <div className="px-6 pb-6">
          <div className="pt-4">
            <div className="grid grid-cols-1 gap-4">
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
                  className={`p-4 rounded-lg border transition-colors text-left ${
                    designSettings.skillsDisplayType === displayType.id
                      ? 'border-[#80FF00] bg-[#80FF00]/10'
                      : 'border-white/20 hover:bg-white/10'
                  }`}
                >
                  <div className="flex flex-col gap-2">
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
      <div className="bg-white/5 rounded-2xl border border-white/10 transition-all duration-300">
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">Color Scheme</h3>
            </div>
          </div>
        </div>
        
        <div className="px-6 pb-6">
          <div className="pt-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: 'black-black', name: 'Black/Black', colors: ['#000000', '#000000'] },
                { id: 'black-grey', name: 'Black/Dark Grey', colors: ['#000000', '#374151'] },
                { id: 'blue-black', name: 'Blue/Black', colors: ['#2563eb', '#000000'] },
                { id: 'green-black', name: 'Green/Black', colors: ['#16a34a', '#000000'] }
              ].map((scheme) => (
                <button
                  key={scheme.id}
                  onClick={() => handleSettingChange('colorScheme', scheme.id)}
                  className={`p-4 rounded-lg border transition-colors ${
                    designSettings.colorScheme === scheme.id
                      ? 'border-[#80FF00] bg-[#80FF00]/10'
                      : 'border-white/20 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex gap-1">
                      {scheme.colors.map((color, i) => (
                        <div
                          key={i}
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium text-white">{scheme.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignContent;