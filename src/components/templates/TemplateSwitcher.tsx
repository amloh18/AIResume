'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Layout, 
  Palette, 
  Eye, 
  EyeOff, 
  Check, 
  ChevronDown, 
  Grid,
  Columns,
  Sidebar,
  X
} from 'lucide-react';
import { 
  TemplateDefinition, 
  ThemeConfig, 
  LayoutType,
  DEFAULT_THEME,
  generateThemeCSS 
} from '@/lib/templates/template-definition';
import { ITemplate } from '@/types/template';

interface TemplateSwitcherProps {
  templates: TemplateDefinition[];
  currentTemplate: TemplateDefinition | null;
  onTemplateSelect: (template: TemplateDefinition) => void;
  theme: ThemeConfig;
  onThemeChange: (theme: ThemeConfig) => void;
  sectionVisibility: Record<string, boolean>;
  onSectionVisibilityChange: (sectionId: string, visible: boolean) => void;
  availableSections: Array<{ id: string; name: string; icon?: string }>;
}

export const TemplateSwitcher: React.FC<TemplateSwitcherProps> = ({
  templates,
  currentTemplate,
  onTemplateSelect,
  theme,
  onThemeChange,
  sectionVisibility,
  onSectionVisibilityChange,
  availableSections,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'templates' | 'theme' | 'sections'>('templates');

  const handleTemplateSelect = useCallback((template: TemplateDefinition) => {
    onTemplateSelect(template);
    setIsOpen(false);
  }, [onTemplateSelect]);

  const getLayoutIcon = (type: LayoutType) => {
    switch (type) {
      case 'single-column':
        return <Grid size={16} />;
      case 'two-column':
        return <Columns size={16} />;
      case 'sidebar-left':
      case 'sidebar-right':
        return <Sidebar size={16} />;
    }
  };

  const tabs = [
    { id: 'templates' as const, label: 'Templates', icon: Layout },
    { id: 'theme' as const, label: 'Theme', icon: Palette },
    { id: 'sections' as const, label: 'Sections', icon: Eye },
  ];

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-lime-500 dark:hover:border-lime-500 transition-colors"
      >
        {currentTemplate ? (
          <>
            <div className="w-6 h-8 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
              <img 
                src={currentTemplate.thumbnail} 
                alt={currentTemplate.name}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-sm font-medium">{currentTemplate.name}</span>
          </>
        ) : (
          <span className="text-sm text-gray-500">Select Template</span>
        )}
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-2 w-[600px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden"
          >
            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-lime-600 dark:text-lime-400 border-b-2 border-lime-500'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
              <button
                onClick={() => setIsOpen(false)}
                className="p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={16} />
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-4 max-h-[400px] overflow-y-auto">
              {activeTab === 'templates' && (
                <TemplatesTab 
                  templates={templates}
                  currentTemplate={currentTemplate}
                  onSelect={handleTemplateSelect}
                  getLayoutIcon={getLayoutIcon}
                />
              )}

              {activeTab === 'theme' && (
                <ThemeTab 
                  theme={theme}
                  onThemeChange={onThemeChange}
                  currentTemplate={currentTemplate}
                />
              )}

              {activeTab === 'sections' && (
                <SectionsTab 
                  availableSections={availableSections}
                  sectionVisibility={sectionVisibility}
                  onVisibilityChange={onSectionVisibilityChange}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

interface TemplatesTabProps {
  templates: TemplateDefinition[];
  currentTemplate: TemplateDefinition | null;
  onSelect: (template: TemplateDefinition) => void;
  getLayoutIcon: (type: LayoutType) => React.ReactNode;
}

const TemplatesTab: React.FC<TemplatesTabProps> = ({
  templates,
  currentTemplate,
  onSelect,
  getLayoutIcon,
}) => {
  const [filter, setFilter] = useState<'all' | 'free' | 'premium'>('all');

  const filteredTemplates = templates.filter(t => {
    if (filter === 'all') return true;
    return t.tier === filter;
  });

  return (
    <div>
      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(['all', 'free', 'premium'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
              filter === f
                ? 'bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-3 gap-3">
        {filteredTemplates.map((template) => {
          const isSelected = currentTemplate?.id === template.id;
          
          return (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              className={`relative rounded-lg border-2 overflow-hidden text-left transition-all ${
                isSelected
                  ? 'border-lime-500 ring-2 ring-lime-500/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {/* Selection Check */}
              {isSelected && (
                <div className="absolute top-2 right-2 z-10 w-5 h-5 bg-lime-500 rounded-full flex items-center justify-center">
                  <Check size={12} className="text-white" />
                </div>
              )}

              {/* Thumbnail */}
              <div className="aspect-[3/4] bg-gray-50 dark:bg-gray-800">
                <img 
                  src={template.thumbnail} 
                  alt={template.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Info */}
              <div className="p-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium truncate">{template.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    template.tier === 'premium' 
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  }`}>
                    {template.tier}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1 text-gray-400">
                  {getLayoutIcon(template.layout.type)}
                  <span className="text-xs capitalize">{template.layout.type.replace('-', ' ')}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface ThemeTabProps {
  theme: ThemeConfig;
  onThemeChange: (theme: ThemeConfig) => void;
  currentTemplate: TemplateDefinition | null;
}

const ThemeTab: React.FC<ThemeTabProps> = ({
  theme,
  onThemeChange,
  currentTemplate,
}) => {
  const colorPresets = [
    { name: 'Lime', primary: '#84cc16', accent: '#84cc16' },
    { name: 'Blue', primary: '#3b82f6', accent: '#60a5fa' },
    { name: 'Purple', primary: '#8b5cf6', accent: '#a78bfa' },
    { name: 'Rose', primary: '#f43f5e', accent: '#fb7185' },
    { name: 'Orange', primary: '#f97316', accent: '#fb923c' },
    { name: 'Teal', primary: '#14b8a6', accent: '#2dd4bf' },
  ];

  const fontOptions = [
    { value: 'Inter, system-ui, sans-serif', label: 'Inter' },
    { value: 'Georgia, serif', label: 'Georgia' },
    { value: 'Courier New, monospace', label: 'Courier' },
    { value: 'Times New Roman, serif', label: 'Times' },
    { value: 'Arial, sans-serif', label: 'Arial' },
  ];

  return (
    <div className="space-y-6">
      {/* Color Presets */}
      <div>
        <label className="block text-sm font-medium mb-2">Primary Color</label>
        <div className="flex gap-2 flex-wrap">
          {colorPresets.map((preset) => (
            <button
              key={preset.name}
              onClick={() => onThemeChange({
                ...theme,
                colors: { ...theme.colors, primary: preset.primary, accent: preset.accent },
              })}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                theme.colors.primary === preset.primary
                  ? 'border-gray-900 dark:border-white scale-110'
                  : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: preset.primary }}
              title={preset.name}
            />
          ))}
        </div>
      </div>

      {/* Custom Colors */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Primary</label>
          <input
            type="color"
            value={theme.colors.primary}
            onChange={(e) => onThemeChange({
              ...theme,
              colors: { ...theme.colors, primary: e.target.value },
            })}
            className="w-full h-10 rounded cursor-pointer"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Secondary</label>
          <input
            type="color"
            value={theme.colors.secondary}
            onChange={(e) => onThemeChange({
              ...theme,
              colors: { ...theme.colors, secondary: e.target.value },
            })}
            className="w-full h-10 rounded cursor-pointer"
          />
        </div>
      </div>

      {/* Typography */}
      <div>
        <label className="block text-sm font-medium mb-2">Heading Font</label>
        <select
          value={theme.fonts.heading}
          onChange={(e) => onThemeChange({
            ...theme,
            fonts: { ...theme.fonts, heading: e.target.value },
          })}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
        >
          {fontOptions.map((font) => (
            <option key={font.value} value={font.value}>{font.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Body Font</label>
        <select
          value={theme.fonts.body}
          onChange={(e) => onThemeChange({
            ...theme,
            fonts: { ...theme.fonts, body: e.target.value },
          })}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
        >
          {fontOptions.map((font) => (
            <option key={font.value} value={font.value}>{font.label}</option>
          ))}
        </select>
      </div>

      {/* CSS Output */}
      <div>
        <label className="block text-sm font-medium mb-2">Generated CSS</label>
        <pre className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs overflow-x-auto">
          {generateThemeCSS(theme)}
        </pre>
      </div>
    </div>
  );
};

interface SectionsTabProps {
  availableSections: Array<{ id: string; name: string; icon?: string }>;
  sectionVisibility: Record<string, boolean>;
  onVisibilityChange: (sectionId: string, visible: boolean) => void;
}

const SectionsTab: React.FC<SectionsTabProps> = ({
  availableSections,
  sectionVisibility,
  onVisibilityChange,
}) => {
  return (
    <div className="space-y-2">
      {availableSections.map((section) => {
        const isVisible = sectionVisibility[section.id] !== false;
        
        return (
          <div
            key={section.id}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <span className="text-sm font-medium">{section.name}</span>
            <button
              onClick={() => onVisibilityChange(section.id, !isVisible)}
              className={`p-2 rounded-lg transition-colors ${
                isVisible
                  ? 'bg-lime-100 dark:bg-lime-900/30 text-lime-600 dark:text-lime-400'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
              }`}
            >
              {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default TemplateSwitcher;