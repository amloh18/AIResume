'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Palette, 
  Layers,
  Star,
  Search,
  Filter,
  Grid3X3,
  List,
  Plus,
  MoreVertical,
  CheckCircle,
  Clock,
  AlertCircle,
  Briefcase,
  Sparkles,
  Loader2
} from 'lucide-react';
import TemplatePreview from './TemplatePreview';

interface CVTemplate {
  _id: string;
  name: string;
  category: string[];
  thumbnail: string;
  isPremium: boolean;
  isDefault: boolean;
  description: string;
  metadata: {
    rating: number;
    usageCount: number;
    tags: string[];
  };
}

interface CVStudioSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activeTab: 'templates' | 'customize' | 'snippets';
  onTabChange: (tab: 'templates' | 'customize' | 'snippets') => void;
  userCVs: any[];
  linkedJobs: any[];
  onTemplateSelect?: (template: CVTemplate) => void;
  onJobSelect?: (job: any) => void;
  selectedTemplate?: CVTemplate;
  // Styling props
  styling?: {
    fontFamily: string;
    bodyFontSize: number;
    sectionTitleFontSize: number;
    nameFontSize: number;
    lineHeight: number;
    margins: number;
    sectionGap: number;
    itemSpacing: number;
    bulletSpacing: number;
  };
  onFontFamilyChange?: (fontFamily: string) => void;
  onBodyFontSizeChange?: (size: number) => void;
  onSectionTitleFontSizeChange?: (size: number) => void;
  onNameFontSizeChange?: (size: number) => void;
  onLineHeightChange?: (height: number) => void;
  onMarginsChange?: (margins: number) => void;
  onSectionGapChange?: (gap: number) => void;
  onItemSpacingChange?: (spacing: number) => void;
  onBulletSpacingChange?: (spacing: number) => void;
  onAutoFit?: () => void;
  onApplySnippet?: (snippet: any) => void;
}

const CVStudioSidebar: React.FC<CVStudioSidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  activeTab,
  onTabChange,
  userCVs,
  linkedJobs,
  onTemplateSelect,
  onJobSelect,
  selectedTemplate,
  styling = {
    fontFamily: 'Arial, sans-serif',
    bodyFontSize: 11,
    sectionTitleFontSize: 15,
    nameFontSize: 20,
    lineHeight: 1.0,
    margins: 96,
    sectionGap: 10,
    itemSpacing: 2,
    bulletSpacing: 4
  },
  onFontFamilyChange,
  onBodyFontSizeChange,
  onSectionTitleFontSizeChange,
  onNameFontSizeChange,
  onLineHeightChange,
  onMarginsChange,
  onSectionGapChange,
  onItemSpacingChange,
  onBulletSpacingChange,
  onAutoFit,
  onApplySnippet
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [templates, setTemplates] = useState<CVTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snippets, setSnippets] = useState<any[]>([]);
  const [snippetsLoading, setSnippetsLoading] = useState(false);
  const [snippetsError, setSnippetsError] = useState<string | null>(null);

  const tabs = [
    { id: 'templates', name: 'Templates', icon: FileText, description: 'Choose from professional templates' },
    { id: 'snippets', name: 'Snippets', icon: Layers, description: 'CV section designs' },
    { id: 'customize', name: 'Customize', icon: Palette, description: 'Adjust styling and layout' }
  ];

  // Fetch templates from API
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        console.log('Fetching templates from API...');
        const response = await fetch('/api/templates');
        const data = await response.json();
        
        if (data.success) {
          console.log(`Loaded ${data.data.length} templates:`, data.data.map((t: any) => t.name));
          setTemplates(data.data);
        } else {
          console.error('Failed to load templates:', data);
          setError('Failed to load templates');
        }
      } catch (err) {
        console.error('Error fetching templates:', err);
        setError('Failed to load templates');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  // Fetch snippets from API
  useEffect(() => {
    const fetchSnippets = async () => {
      try {
        setSnippetsLoading(true);
        console.log('Fetching snippets from API...');
        const response = await fetch('/api/snippets?limit=20');
        const data = await response.json();
        
        if (data.success) {
          console.log(`Loaded ${data.data.length} snippets:`, data.data.map((s: any) => s.name));
          setSnippets(data.data);
        } else {
          console.error('Failed to load snippets:', data);
          setSnippetsError('Failed to load snippets');
        }
      } catch (err) {
        console.error('Error fetching snippets:', err);
        setSnippetsError('Failed to load snippets');
      } finally {
        setSnippetsLoading(false);
      }
    };

    fetchSnippets();
  }, []);

  // Filter templates based on search
  const filteredTemplates = templates.filter(template => 
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.category.some(cat => cat.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Filter snippets based on search
  const filteredSnippets = snippets.filter(snippet => 
    snippet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    snippet.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    snippet.sectionType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderTemplatesTab = () => (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <button
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 size={16} />
          </button>
          <button
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
            onClick={() => setViewMode('list')}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3">
            <Loader2 className="animate-spin text-purple-400" size={20} />
            <span className="text-white/60">Loading templates...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-8">
          <AlertCircle className="mx-auto text-red-400 mb-2" size={24} />
          <p className="text-red-400 text-sm mb-2">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="text-purple-400 hover:text-purple-300 text-sm"
          >
            Try again
          </button>
        </div>
      )}

      {/* Templates Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-2 gap-3">
          {filteredTemplates.map((template) => (
            <TemplatePreview
              key={template._id}
              template={template}
              isSelected={selectedTemplate?._id === template._id}
              onClick={() => onTemplateSelect?.(template)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredTemplates.length === 0 && (
        <div className="text-center py-8">
          <FileText className="mx-auto text-white/40 mb-2" size={32} />
          <p className="text-white/60 text-sm">No templates found</p>
        </div>
      )}
    </div>
  );

  const renderCustomizeTab = () => (
    <div className="space-y-6">
      {/* Typography */}
      <div>
        <h3 className="text-white font-semibold mb-3">Typography</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-white/60 text-sm mb-1 block">Font Family</label>
            <select 
              value={styling.fontFamily}
              onChange={(e) => onFontFamilyChange?.(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              <option value="Arial, sans-serif">Arial</option>
              <option value="Times New Roman, serif">Times New Roman</option>
              <option value="Calibri, sans-serif">Calibri</option>
              <option value="Georgia, serif">Georgia</option>
            </select>
          </div>
          
          <div>
            <label className="text-white/60 text-sm mb-1 block">Body Text Size (10-12pt)</label>
            <div className="flex items-center justify-between text-xs text-white/60 mb-1">
              <span>10pt</span>
              <span>11pt</span>
              <span>12pt</span>
            </div>
            <input
              type="range"
              min="10"
              max="12"
              value={styling.bodyFontSize}
              onChange={(e) => onBodyFontSizeChange?.(parseInt(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          
          <div>
            <label className="text-white/60 text-sm mb-1 block">Section Headings (14-16pt)</label>
            <div className="flex items-center justify-between text-xs text-white/60 mb-1">
              <span>14pt</span>
              <span>15pt</span>
              <span>16pt</span>
            </div>
            <input
              type="range"
              min="14"
              max="16"
              value={styling.sectionTitleFontSize}
              onChange={(e) => onSectionTitleFontSizeChange?.(parseInt(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          
          <div>
            <label className="text-white/60 text-sm mb-1 block">Name Size (18-22pt)</label>
            <div className="flex items-center justify-between text-xs text-white/60 mb-1">
              <span>18pt</span>
              <span>20pt</span>
              <span>22pt</span>
            </div>
            <input
              type="range"
              min="18"
              max="22"
              value={styling.nameFontSize}
              onChange={(e) => onNameFontSizeChange?.(parseInt(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          
          <div>
            <label className="text-white/60 text-sm mb-1 block">Line Spacing</label>
            <div className="flex items-center justify-between text-xs text-white/60 mb-1">
              <span>1.0</span>
              <span>1.15</span>
              <span>1.2</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="1.2"
              step="0.05"
              value={styling.lineHeight}
              onChange={(e) => onLineHeightChange?.(parseFloat(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Colors */}
      <div>
        <h3 className="text-white font-semibold mb-3">Colors</h3>
        <div className="space-y-3">
          <div>
            <label className="text-white/60 text-sm mb-1 block">Primary Color</label>
            <div className="flex gap-2">
              {['#84cc16', '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b'].map((color) => (
                <button
                  key={color}
                  className="w-8 h-8 rounded-lg border-2 border-white/20 hover:border-white/40 transition-colors"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          
          <div>
            <label className="text-white/60 text-sm mb-1 block">Background</label>
            <div className="flex gap-2">
              {['#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0'].map((color) => (
                <button
                  key={color}
                  className="w-8 h-8 rounded-lg border-2 border-white/20 hover:border-white/40 transition-colors"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Spacing */}
      <div>
        <h3 className="text-white font-semibold mb-3">Spacing</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-white/60 text-sm mb-1 block">Margins (1-inch standard)</label>
            <div className="flex items-center justify-between text-xs text-white/60 mb-1">
              <span>0.5"</span>
              <span>1.0"</span>
              <span>1.5"</span>
            </div>
            <input
              type="range"
              min="48"
              max="144"
              step="24"
              value={styling.margins}
              onChange={(e) => onMarginsChange?.(parseInt(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          
          <div>
            <label className="text-white/60 text-sm mb-1 block">Section Gap</label>
            <input
              type="range"
              min="5"
              max="20"
              value={styling.sectionGap}
              onChange={(e) => onSectionGapChange?.(parseInt(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          
          <div>
            <label className="text-white/60 text-sm mb-1 block">Item Spacing</label>
            <input
              type="range"
              min="1"
              max="5"
              value={styling.itemSpacing}
              onChange={(e) => onItemSpacingChange?.(parseInt(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          
          <div>
            <label className="text-white/60 text-sm mb-1 block">Bullet Point Spacing</label>
            <input
              type="range"
              min="2"
              max="8"
              value={styling.bulletSpacing}
              onChange={(e) => onBulletSpacingChange?.(parseInt(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          
          <div>
            <label className="text-white/60 text-sm mb-1 block">Auto Fit</label>
            <button
              onClick={() => onAutoFit?.()}
              className="w-full px-3 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-blue-400 rounded-lg text-sm font-medium hover:from-blue-500/30 hover:to-purple-500/30 transition-all duration-300"
            >
              Auto Fit
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSnippetsTab = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Snippets</h3>
        <button className="p-2 text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/10">
          <Plus size={16} />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
        <input
          type="text"
          placeholder="Search snippets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        />
      </div>

      {/* Snippets Grid */}
      {snippetsLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="text-white/60 animate-spin" />
        </div>
      ) : snippetsError ? (
        <div className="text-center py-8">
          <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
          <h3 className="text-white font-semibold mb-2">Error Loading Snippets</h3>
          <p className="text-white/60 text-sm">{snippetsError}</p>
        </div>
      ) : filteredSnippets.length === 0 ? (
        <div className="text-center py-8">
          <Layers size={48} className="mx-auto text-blue-400 mb-4" />
          <h3 className="text-white font-semibold mb-2">No Snippets Found</h3>
          <p className="text-white/60 text-sm">
            {searchQuery ? 'Try adjusting your search terms.' : 'No snippets available yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredSnippets.map((snippet) => (
            <div
              key={snippet._id || snippet.id}
              className="p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              onClick={() => onApplySnippet?.(snippet)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-medium truncate">{snippet.name}</h4>
                  <p className="text-white/60 text-sm truncate">{snippet.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400">
                      {snippet.sectionType}
                    </span>
                    {snippet.isPremium && (
                      <Star size={12} className="text-yellow-400" />
                    )}
                  </div>
                </div>
                <button className="p-1 text-white/60 hover:text-white transition-colors ml-2">
                  <MoreVertical size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <motion.aside
      className="bg-white/5 backdrop-blur-xl border-r border-white/10 flex flex-col relative z-40 h-screen sticky top-0"
      initial={{ width: isCollapsed ? 60 : 480 }}
      animate={{ width: isCollapsed ? 60 : 480 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {/* Tab Navigation */}
      {!isCollapsed && (
        <div className="flex border-b border-white/10 flex-shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 transition-colors ${
                activeTab === tab.id
                  ? 'text-white bg-white/10 border-b-2 border-purple-500'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
              onClick={() => onTabChange(tab.id as any)}
            >
              <tab.icon size={16} />
              <span className="text-xs font-medium">{tab.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'templates' && renderTemplatesTab()}
              {activeTab === 'customize' && renderCustomizeTab()}
              {activeTab === 'snippets' && renderSnippetsTab()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed Icons */}
        {isCollapsed && (
          <div className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`w-full p-3 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'text-white bg-white/10'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
                onClick={() => onTabChange(tab.id as any)}
                title={tab.name}
              >
                <tab.icon size={20} />
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.aside>
  );
};

export default CVStudioSidebar; 