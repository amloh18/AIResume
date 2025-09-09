'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Eye, 
  Download, 
  Star,
  Crown,
  Layout,
  Grid,
  FileText
} from 'lucide-react';
import { getThemeClasses } from '@/lib/utils/themeUtils';
import { industryTemplates, getTemplatesByCategory } from '@/data/industryTemplates';
import { Template } from '@/lib/stores/templateStore';

interface TemplateContentProps {
  selectedTemplate?: any;
  onTemplateSelect?: (template: any) => void;
  onTemplatePreview?: (template: any) => void;
}

const TemplateContent: React.FC<TemplateContentProps> = ({
  selectedTemplate,
  onTemplateSelect,
  onTemplatePreview
}) => {
  const themeClasses = getThemeClasses;
  
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    // Load templates from our industry templates data
    setTemplates(industryTemplates);
  }, []);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const categories = ['All', 'Professional', 'Creative', 'Minimal', 'Executive', 'Technology', 'Academic', 'Healthcare', 'Finance', 'Marketing'];

  const filteredTemplates = getTemplatesByCategory(selectedCategory);

  const handleTemplateSelect = (template: any) => {
    if (onTemplateSelect) {
      onTemplateSelect(template);
    }
  };

  const handleTemplatePreview = (template: any) => {
    if (onTemplatePreview) {
      onTemplatePreview(template);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
          <Layout className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className={`text-lg font-semibold ${themeClasses.text.primary}`}>
            CV Templates
          </h3>
          <p className={`text-sm ${themeClasses.text.tertiary}`}>
            Choose a professional template for your CV
          </p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
              selectedCategory === category
                ? 'bg-lime-100 text-lime-700 dark:bg-lime-900/20 dark:text-lime-400'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Templates Grid - 2/3 Column Layout */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredTemplates.map((template) => (
          <motion.div
            key={template.id}
            className={`${themeClasses.card.base} rounded-lg border p-3 cursor-pointer transition-all ${
              selectedTemplate?.id === template.id
                ? 'border-lime-300 bg-lime-50 dark:border-lime-600 dark:bg-lime-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleTemplateSelect(template)}
          >
            {/* Template Preview - Smaller */}
            <div className="relative mb-2">
              <div 
                className="aspect-[3/4] bg-white border rounded-md overflow-hidden"
                style={{
                  fontFamily: template.globalStyles.fontFamily,
                  fontSize: '6px',
                  lineHeight: template.globalStyles.lineHeight
                }}
              >
                {/* Mini CV Preview */}
                <div className="p-1.5 h-full">
                  {/* Header */}
                  <div 
                    className="text-center pb-0.5 mb-0.5"
                    style={{ 
                      borderBottom: `1px solid ${template.globalStyles.primaryColor}`,
                      color: template.globalStyles.primaryColor
                    }}
                  >
                    <div className="font-bold text-xs">John Doe</div>
                    <div className="text-xs opacity-75">Software Engineer</div>
                  </div>
                  
                  {/* Sections */}
                  <div className="space-y-0.5">
                    <div>
                      <div 
                        className="font-semibold text-xs mb-0.5"
                        style={{ color: template.globalStyles.primaryColor }}
                      >
                        Experience
                      </div>
                      <div className="text-xs opacity-75">
                        <div>Senior Developer</div>
                        <div>Tech Company</div>
                      </div>
                    </div>
                    
                    <div>
                      <div 
                        className="font-semibold text-xs mb-0.5"
                        style={{ color: template.globalStyles.primaryColor }}
                      >
                        Skills
                      </div>
                      <div className="flex flex-wrap gap-0.5">
                        {['React', 'Node.js'].map((skill, i) => (
                          <span 
                            key={i}
                            className="text-xs px-0.5 py-0.5 rounded"
                            style={{ 
                              backgroundColor: `${template.globalStyles.primaryColor}20`,
                              color: template.globalStyles.primaryColor
                            }}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Selected Badge */}
              {selectedTemplate?.id === template.id && (
                <div className="absolute top-1 left-1 bg-lime-100 text-lime-800 px-1.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                  <Star className="w-2 h-2" />
                  <span className="hidden sm:inline">Selected</span>
                </div>
              )}
            </div>

            {/* Template Info - Compact */}
            <div className="space-y-1">
              <h4 className={`font-medium text-sm ${themeClasses.text.primary} truncate`}>
                {template.name}
              </h4>
              
              <p className={`text-xs ${themeClasses.text.secondary} line-clamp-2`}>
                {template.description}
              </p>

              {/* Actions - Compact */}
              <div className="flex gap-1 pt-1">
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTemplatePreview(template);
                  }}
                  className={`flex items-center gap-1 px-2 py-1 text-xs ${themeClasses.button.secondary} rounded-md flex-1 justify-center`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Eye className="w-3 h-3" />
                  <span className="hidden sm:inline">Preview</span>
                </motion.button>
                
                {selectedTemplate?.id === template.id && (
                  <motion.button
                    className={`flex items-center gap-1 px-2 py-1 text-xs ${themeClasses.button.primary} rounded-md flex-1 justify-center`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Download className="w-3 h-3" />
                    <span className="hidden sm:inline">Applied</span>
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Template Tips */}
      <div className={`p-4 rounded-lg ${themeClasses.background.tertiary} border-l-4 border-blue-500`}>
        <h4 className={`text-sm font-medium ${themeClasses.text.primary} mb-2`}>
          💡 Template Tips
        </h4>
        <ul className={`text-sm ${themeClasses.text.secondary} space-y-1`}>
          <li>• Choose a template that matches your industry</li>
          <li>• Professional templates work best for corporate roles</li>
          <li>• Creative templates are great for design positions</li>
          <li>• Minimal templates focus attention on your content</li>
        </ul>
      </div>
    </div>
  );
};

export default TemplateContent;