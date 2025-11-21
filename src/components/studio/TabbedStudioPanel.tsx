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
  cvSectionsAndOrderingContent?: React.ReactNode;
  documentType?: 'cv' | 'cover-letter'; // NEW: Added document type prop
}

const TabbedStudioPanel: React.FC<TabbedStudioPanelProps> = ({
  structureContent,
  designContent,
  templateContent,
  jobATSContent,
  parserContent,
  cvSectionsAndOrderingContent,
  documentType = 'cv' // Default to CV mode
}) => {
  const themeClasses = getThemeClasses;
  const [activeTab, setActiveTab] = useState<'structure' | 'design' | 'template'>('structure');

  // Define all possible tabs
  const allTabs = [
    {
      id: 'structure' as const,
      label: 'Structure',
      icon: TrendingUp,
      content: (
        <div className="space-y-6">
          {/* Dynamic Layout for Job & ATS and CV Parser */}
          <div className={`grid gap-4 ${parserContent ? 'grid-cols-1 desktop:grid-cols-2' : 'grid-cols-1'}`}>
            {/* Job & ATS Section - HIDE for cover letter mode */}
            {jobATSContent && documentType === 'cv' && (
              <div className="space-y-4">
                {jobATSContent}
              </div>
            )}

            {/* CV Parser Section - Only show if needed and in CV mode */}
            {parserContent && documentType === 'cv' && (
              <div className="space-y-4">
                {parserContent}
              </div>
            )}
          </div>

          {/* CV Sections & Ordering - Merged Section */}
          {cvSectionsAndOrderingContent && (
            <div>
              {cvSectionsAndOrderingContent}
            </div>
          )}

          {/* Structure Content - Fallback for other content */}
          {!cvSectionsAndOrderingContent && (
            <div>
              {structureContent}
            </div>
          )}
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
  
  // Filter tabs based on document type
  const tabs = documentType === 'cover-letter'
    ? allTabs.filter(tab => tab.id === 'structure') // Only structure tab for cover letters
    : allTabs; // All tabs for CVs

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="bg-white/90 dark:bg-[#1a230f] border border-gray-200/60 dark:border-white/10 rounded-xl shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50 mb-6 flex-shrink-0 overflow-hidden">
        <div className="flex">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 flex items-center justify-center gap-3 px-6 py-4 text-sm font-semibold transition-all duration-200 relative
                ${activeTab === tab.id 
                  ? 'text-lime-600 dark:text-lime-400 bg-lime-50/50 dark:bg-lime-900/20' 
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50/50 dark:hover:bg-gray-700/50'
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className={`p-1.5 rounded-lg transition-all duration-200 ${
                activeTab === tab.id 
                  ? 'bg-lime-100 dark:bg-lime-900/30' 
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                <tab.icon className={`w-4 h-4 ${
                  activeTab === tab.id 
                    ? 'text-lime-600 dark:text-lime-400' 
                    : 'text-gray-500 dark:text-gray-400'
                }`} />
              </div>
              <span>{tab.label}</span>
              
              {/* Active tab indicator */}
              {activeTab === tab.id && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-lime-500 to-lime-600 rounded-t-full"
                  layoutId="activeTab"
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Tab Content - Scrollable */}
      <div className="flex-1 overflow-y-auto scrollbar-hide min-h-0">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="p-6"
        >
          {tabs.find(tab => tab.id === activeTab)?.content}
        </motion.div>
      </div>
    </div>
  );
};

export default TabbedStudioPanel;