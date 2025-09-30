'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Grid3X3, 
  Star, 
  Eye, 
  Check,
  Search,
  Filter,
  TrendingUp,
  Briefcase,
  GraduationCap,
  Palette,
  Loader2,
  Crown,
  Info
} from 'lucide-react';
import { Template } from '@/lib/stores/templateStore';
import { UnifiedUnifiedCVDataStructure } from '@/types/unified-cv-schema';
import TemplatePreview from './TemplatePreview';

interface TemplatePanelProps {
  selectedTemplate: Template | null;
  onTemplateSelect: (template: Template) => void;
  onPreviewTemplate: (template: Template) => void;
  cvData?: UnifiedCVDataStructure | null;
}

const TemplatePanel: React.FC<TemplatePanelProps> = ({
  selectedTemplate,
  onTemplateSelect,
  onPreviewTemplate,
  cvData
}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'createdAt'>('name');

  // Fetch templates from API
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/templates?isActive=true');
        const data = await response.json();
        
        if (response.ok) {
          setTemplates(data.templates || []);
        } else {
          setError(data.error || 'Failed to fetch templates');
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

  const categories = [
    { value: 'all', label: 'All Templates', icon: Grid3X3 },
    { value: 'cv', label: 'CV Templates', icon: Briefcase },
    { value: 'resume', label: 'Resume Templates', icon: TrendingUp },
    { value: 'portfolio', label: 'Portfolio Templates', icon: Palette },
    { value: 'cover-letter', label: 'Cover Letters', icon: GraduationCap },
    { value: 'custom', label: 'Custom Templates', icon: Grid3X3 }
  ];

  const filteredTemplates = templates
    .filter(template => {
      const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'createdAt':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return a.name.localeCompare(b.name);
      }
    });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'cv': return 'text-blue-600 bg-blue-100';
      case 'resume': return 'text-purple-600 bg-purple-100';
      case 'portfolio': return 'text-pink-600 bg-pink-100';
      case 'cover-letter': return 'text-green-600 bg-green-100';
      case 'custom': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-lime-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading templates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Grid3X3 className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading templates</h3>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
          />
        </div>

        {/* Category Filter */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={`
                flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                ${selectedCategory === category.value
                  ? 'bg-lime-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              <category.icon className="h-3 w-3" />
              <span>{category.label}</span>
            </button>
          ))}
        </div>

        {/* Sort Options */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} found
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-sm border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-lime-500"
          >
            <option value="name">Sort by Name</option>
            <option value="createdAt">Sort by Date</option>
          </select>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
              relative p-4 rounded-lg border-2 transition-all cursor-pointer
              ${selectedTemplate?.id === template.id
                ? 'border-lime-500 bg-lime-50 shadow-lg ring-2 ring-lime-200'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-md bg-white'
              }
            `}
            onClick={() => {
              console.log('🔍 TemplatePanel - Selecting template:', template.name, 'ID:', template.id);
              console.log('🔍 TemplatePanel - Current selectedTemplate:', selectedTemplate?.id);
              onTemplateSelect(template);
            }}
          >
            {/* Selected Checkmark - Only show on active template */}
            {selectedTemplate?.id === template.id && (
              <div className="absolute top-3 right-3 w-7 h-7 bg-lime-500 rounded-full flex items-center justify-center shadow-md">
                <Check className="h-5 w-5 text-white font-bold" />
              </div>
            )}

            {/* Default Badge - Only show if not selected */}
            {template.isDefault && selectedTemplate?.id !== template.id && (
              <div className="absolute top-3 left-3 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                Default
              </div>
            )}

            {/* Template Preview */}
            <div className="mb-3 relative group">
              <TemplatePreview 
                template={template}
                cvData={cvData}
                scale={0.25}
                className="w-full h-32"
              />
              
              {/* Hover Info Overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="text-center text-white p-2">
                  <div className="flex items-center justify-center space-x-2 mb-1">
                    {template.tier === 'premium' ? (
                      <Crown className="h-4 w-4 text-amber-400" />
                    ) : (
                      <Star className="h-4 w-4 text-green-400" />
                    )}
                    <span className="text-sm font-medium">{template.tier === 'premium' ? 'Premium' : 'Free'}</span>
                  </div>
                  <p className="text-xs opacity-90">{template.availableSections?.length || 0} sections</p>
                  <p className="text-xs opacity-75 mt-1">{template.layoutType}</p>
                </div>
              </div>
            </div>

            {/* Template Info */}
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <h3 className="font-medium text-gray-900 truncate pr-2">{template.name}</h3>
                <div className="flex items-center space-x-1 flex-shrink-0">
                  {template.tier === 'premium' ? (
                    <Crown className="h-3 w-3 text-amber-500" />
                  ) : (
                    <Star className="h-3 w-3 text-green-500" />
                  )}
                  <span className="text-xs text-gray-500">v{template.version}</span>
                </div>
              </div>

              <p className="text-sm text-gray-600 line-clamp-2">{template.description || 'Professional CV template with modern design'}</p>

              {/* Tags and Layout Info */}
              <div className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}>
                  {template.category}
                </span>
                <span className="text-xs text-gray-500 capitalize">{template.layoutType}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center space-x-1">
                  <Info className="h-3 w-3" />
                  <span>{template.availableSections?.length || 0} sections</span>
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreviewTemplate(template);
                  }}
                  className="flex items-center space-x-1 text-lime-600 hover:text-lime-700 transition-colors"
                >
                  <Eye className="h-3 w-3" />
                  <span>Preview</span>
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* No Results */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Grid3X3 className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
          <p className="text-gray-500">Try adjusting your search or filter criteria</p>
        </div>
      )}
    </div>
  );
};

export default TemplatePanel;

// Add line-clamp utility styles
const lineClampStyles = `
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = lineClampStyles;
  document.head.appendChild(style);
}
