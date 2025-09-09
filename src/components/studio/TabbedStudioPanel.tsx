'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Settings, 
  Eye, 
  Target,
  FileText,
  Palette
} from 'lucide-react';
import { getThemeClasses } from '@/lib/utils/themeUtils';

interface TabbedStudioPanelProps {
  structureContent: React.ReactNode;
  designContent: React.ReactNode;
  templateContent: React.ReactNode;
  jobATSContent?: React.ReactNode;
  parserContent?: React.ReactNode;
}

const TabbedStudioPanel: React.FC<TabbedStudioPanelProps> = ({
  structureContent,
  designContent,
  templateContent,
  jobATSContent,
  parserContent
}) => {
  const themeClasses = getThemeClasses;
  const [activeTab, setActiveTab] = useState<'structure' | 'design' | 'template'>('structure');

  const tabs = [
    {
      id: 'structure' as const,
      label: 'Structure',
      icon: TrendingUp,
      content: (
        <div className="space-y-6">
          {/* Dynamic Layout for Job & ATS and CV Parser */}
          <div className={`grid gap-4 ${parserContent ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
            {/* Job & ATS Section */}
            {jobATSContent && (
              <div className="space-y-4">
                {jobATSContent}
              </div>
            )}

            {/* CV Parser Section - Only show if needed */}
            {parserContent && (
              <div className="space-y-4">
                {parserContent}
              </div>
            )}
          </div>

          {/* Structure Content */}
          <div>
            {structureContent}
          </div>
        </div>
      )
    },
    {
      id: 'design' as const,
      label: 'Design',
      icon: Palette,
      content: designContent
    },
    {
      id: 'template' as const,
      label: 'Template',
      icon: Eye,
      content: templateContent
    }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className={`${themeClasses.card.base} rounded-lg border ${themeClasses.border.primary} mb-4 flex-shrink-0`}>
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative
                ${activeTab === tab.id 
                  ? 'text-lime-600 dark:text-lime-400' 
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                }
              `}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
              
              {/* Active tab indicator */}
              {activeTab === tab.id && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-lime-600 dark:bg-lime-400"
                  layoutId="activeTab"
                  transition={{ duration: 0.2 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="p-4"
        >
          {tabs.find(tab => tab.id === activeTab)?.content}
        </motion.div>
      </div>
    </div>
  );
};

export default TabbedStudioPanel;