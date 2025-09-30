'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Type, 
  Palette, 
  Ruler, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Minus,
  Plus,
  RotateCcw
} from 'lucide-react';

interface DesignSettings {
  fontFamily: string;
  headerFontSize: number;
  bodyFontSize: number;
  sectionFontSize: number;
  lineSpacing: number;
  letterSpacing: number;
  sectionSpacing: number;
  colorScheme: string;
  alignment: 'left' | 'center' | 'right';
  pagePadding: { top: number; bottom: number; left: number; right: number };
}

interface DesignPanelProps {
  settings: DesignSettings;
  onSettingsChange: (settings: DesignSettings) => void;
  onReset: () => void;
}

const DesignPanel: React.FC<DesignPanelProps> = ({
  settings,
  onSettingsChange,
  onReset
}) => {
  const fontOptions = [
    { value: 'Inter', label: 'Inter', preview: 'Inter' },
    { value: 'Roboto', label: 'Roboto', preview: 'Roboto' },
    { value: 'Open Sans', label: 'Open Sans', preview: 'Open Sans' },
    { value: 'Lato', label: 'Lato', preview: 'Lato' },
    { value: 'Poppins', label: 'Poppins', preview: 'Poppins' },
    { value: 'Montserrat', label: 'Montserrat', preview: 'Montserrat' },
    { value: 'Source Sans Pro', label: 'Source Sans Pro', preview: 'Source Sans Pro' },
    { value: 'Nunito', label: 'Nunito', preview: 'Nunito' }
  ];

  const colorSchemes = [
    { value: 'professional', label: 'Professional', colors: ['#1f2937', '#6b7280', '#059669'] },
    { value: 'modern', label: 'Modern', colors: ['#1f2937', '#6b7280', '#10b981'] },
    { value: 'classic', label: 'Classic', colors: ['#1f2937', '#6b7280', '#1e40af'] },
    { value: 'elegant', label: 'Elegant', colors: ['#1f2937', '#6b7280', '#7c3aed'] },
    { value: 'minimal', label: 'Minimal', colors: ['#374151', '#6b7280', '#f9fafb'] },
    { value: 'bold', label: 'Bold', colors: ['#1f2937', '#6b7280', '#dc2626'] }
  ];

  const updateSetting = (key: keyof DesignSettings, value: any) => {
    onSettingsChange({
      ...settings,
      [key]: value
    });
  };

  const updatePagePadding = (side: keyof DesignSettings['pagePadding'], value: number) => {
    updateSetting('pagePadding', {
      ...settings.pagePadding,
      [side]: value
    });
  };

  return (
    <div className="space-y-8">
      {/* Typography Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Type className="h-5 w-5 text-lime-600" />
          <h3 className="text-lg font-medium text-gray-900">Typography</h3>
        </div>
        
        <div className="space-y-4">
          {/* Font Family */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Font Family</label>
            <div className="grid grid-cols-2 gap-2">
              {fontOptions.map((font) => (
                <button
                  key={font.value}
                  onClick={() => updateSetting('fontFamily', font.value)}
                  className={`
                    p-3 rounded-lg border text-left transition-all
                    ${settings.fontFamily === font.value
                      ? 'border-lime-500 bg-lime-50 text-lime-700'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <div className="text-sm font-medium">{font.label}</div>
                  <div 
                    className="text-xs text-gray-500 mt-1"
                    style={{ fontFamily: font.value }}
                  >
                    {font.preview}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Font Sizes */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Header Font Size: {settings.headerFontSize}px
              </label>
              <input
                type="range"
                min="16"
                max="48"
                value={settings.headerFontSize}
                onChange={(e) => updateSetting('headerFontSize', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Body Font Size: {settings.bodyFontSize}px
              </label>
              <input
                type="range"
                min="10"
                max="20"
                value={settings.bodyFontSize}
                onChange={(e) => updateSetting('bodyFontSize', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Section Font Size: {settings.sectionFontSize}px
              </label>
              <input
                type="range"
                min="14"
                max="32"
                value={settings.sectionFontSize}
                onChange={(e) => updateSetting('sectionFontSize', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Spacing Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Ruler className="h-5 w-5 text-lime-600" />
          <h3 className="text-lg font-medium text-gray-900">Spacing</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Line Spacing: {settings.lineSpacing}
            </label>
            <input
              type="range"
              min="1"
              max="2"
              step="0.1"
              value={settings.lineSpacing}
              onChange={(e) => updateSetting('lineSpacing', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Letter Spacing: {settings.letterSpacing}px
            </label>
            <input
              type="range"
              min="-2"
              max="5"
              step="0.5"
              value={settings.letterSpacing}
              onChange={(e) => updateSetting('letterSpacing', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Section Spacing: {settings.sectionSpacing}px
            </label>
            <input
              type="range"
              min="8"
              max="32"
              value={settings.sectionSpacing}
              onChange={(e) => updateSetting('sectionSpacing', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          {/* Page Padding */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Page Padding</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Top: {settings.pagePadding.top}px</label>
                <input
                  type="range"
                  min="16"
                  max="64"
                  value={settings.pagePadding.top}
                  onChange={(e) => updatePagePadding('top', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Bottom: {settings.pagePadding.bottom}px</label>
                <input
                  type="range"
                  min="16"
                  max="64"
                  value={settings.pagePadding.bottom}
                  onChange={(e) => updatePagePadding('bottom', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Left: {settings.pagePadding.left}px</label>
                <input
                  type="range"
                  min="16"
                  max="64"
                  value={settings.pagePadding.left}
                  onChange={(e) => updatePagePadding('left', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Right: {settings.pagePadding.right}px</label>
                <input
                  type="range"
                  min="16"
                  max="64"
                  value={settings.pagePadding.right}
                  onChange={(e) => updatePagePadding('right', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Colors Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Palette className="h-5 w-5 text-lime-600" />
          <h3 className="text-lg font-medium text-gray-900">Colors</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Color Scheme</label>
            <div className="grid grid-cols-2 gap-3">
              {colorSchemes.map((scheme) => (
                <button
                  key={scheme.value}
                  onClick={() => updateSetting('colorScheme', scheme.value)}
                  className={`
                    p-4 rounded-lg border transition-all text-left
                    ${settings.colorScheme === scheme.value
                      ? 'border-lime-500 bg-lime-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="flex space-x-1">
                      {scheme.colors.map((color, index) => (
                        <div
                          key={index}
                          className="w-4 h-4 rounded-full border border-gray-200"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{scheme.label}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Primary • Secondary • Accent
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Layout Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <AlignLeft className="h-5 w-5 text-lime-600" />
          <h3 className="text-lg font-medium text-gray-900">Layout</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Text Alignment</label>
            <div className="flex space-x-2">
              {[
                { value: 'left', icon: AlignLeft, label: 'Left' },
                { value: 'center', icon: AlignCenter, label: 'Center' },
                { value: 'right', icon: AlignRight, label: 'Right' }
              ].map((alignment) => (
                <button
                  key={alignment.value}
                  onClick={() => updateSetting('alignment', alignment.value)}
                  className={`
                    flex-1 flex flex-col items-center space-y-2 p-4 rounded-lg border transition-all
                    ${settings.alignment === alignment.value
                      ? 'border-lime-500 bg-lime-50 text-lime-700'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <alignment.icon className="h-6 w-6" />
                  <span className="text-sm font-medium">{alignment.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Reset Button */}
      <div className="pt-4 border-t border-gray-200">
        <button
          onClick={onReset}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Reset to Default</span>
        </button>
      </div>
    </div>
  );
};

export default DesignPanel;

// Add custom slider styles
const sliderStyles = `
  .slider::-webkit-slider-thumb {
    appearance: none;
    height: 16px;
    width: 16px;
    border-radius: 50%;
    background: #059669;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .slider::-moz-range-thumb {
    height: 16px;
    width: 16px;
    border-radius: 50%;
    background: #059669;
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .slider::-webkit-slider-track {
    background: #e5e7eb;
    border-radius: 8px;
    height: 8px;
  }
  
  .slider::-moz-range-track {
    background: #e5e7eb;
    border-radius: 8px;
    height: 8px;
    border: none;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = sliderStyles;
  document.head.appendChild(style);
}
