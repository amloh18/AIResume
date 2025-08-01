'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Star, 
  Eye, 
  Download, 
  Palette,
  Settings,
  CheckCircle,
  Sparkles,
  Loader2,
  Crown,
  Zap,
  Search
} from 'lucide-react';

interface CVTemplate {
  _id: string;
  id?: string;
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

interface EnhancedTemplateSelectorProps {
  onTemplateSelect: (template: CVTemplate) => void;
  selectedTemplate?: CVTemplate;
  onClose?: () => void;
}

const EnhancedTemplateSelector: React.FC<EnhancedTemplateSelectorProps> = ({
  onTemplateSelect,
  selectedTemplate,
  onClose
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [templates, setTemplates] = useState<CVTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);

  // Fetch templates from API
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/templates');
        const data = await response.json();
        
        if (data.success) {
          setTemplates(data.data);
        } else {
          setError('Failed to load templates');
        }
      } catch (err) {
        setError('Failed to load templates');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  // Generate categories from templates
  const categories = React.useMemo(() => {
    const categoryCounts: Record<string, number> = {};
    templates.forEach(template => {
      template.category.forEach(cat => {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });
    });

    const categoryList = [
      { id: 'all', name: 'All Templates', count: templates.length },
      ...Object.entries(categoryCounts).map(([id, count]) => ({
        id: id.toLowerCase(),
        name: id,
        count
      }))
    ];

    return categoryList;
  }, [templates]);

  // Filter templates based on category and search
  const filteredTemplates = React.useMemo(() => {
    return templates.filter(template => {
      const matchesCategory = activeCategory === 'all' || 
        template.category.some(cat => cat.toLowerCase() === activeCategory);
      
      const matchesSearch = searchQuery === '' || 
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.category.some(cat => cat.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesCategory && matchesSearch;
    });
  }, [templates, activeCategory, searchQuery]);

  const handleTemplateClick = (template: CVTemplate) => {
    onTemplateSelect(template);
    onClose?.();
  };

  const isSelected = (template: CVTemplate) => {
    return selectedTemplate?._id === template._id;
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3">
            <Loader2 className="animate-spin text-blue-500" size={24} />
            <span className="text-gray-600">Loading templates...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-500 mb-2">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="text-blue-500 hover:text-blue-600"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 max-h-[80vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Choose Your Template</h2>
          <p className="text-gray-600 mt-1">Select a professional template that matches your style and industry</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
          >
            {viewMode === 'grid' ? (
              <FileText size={20} />
            ) : (
              <Palette size={20} />
            )}
          </button>
        </div>
      </div>

      {/* Search and Categories */}
      <div className="mb-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeCategory === category.id
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.name} ({category.count})
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className={`grid gap-6 ${
        viewMode === 'grid' 
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
          : 'grid-cols-1'
      }`}>
        {filteredTemplates.map((template) => (
          <motion.div
            key={template._id}
            className={`relative group cursor-pointer rounded-xl overflow-hidden transition-all duration-300 ${
              isSelected(template)
                ? 'ring-4 ring-blue-500 ring-opacity-50 shadow-2xl scale-105'
                : 'hover:shadow-xl hover:scale-105'
            }`}
            onMouseEnter={() => setHoveredTemplate(template._id)}
            onMouseLeave={() => setHoveredTemplate(null)}
            onClick={() => handleTemplateClick(template)}
            whileHover={{ 
              scale: isSelected(template) ? 1.05 : 1.02,
              y: -5
            }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Template Image */}
            <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden">
              <img
                src={template.thumbnail}
                alt={template.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Selection Indicator */}
              {isSelected(template) && (
                <motion.div
                  className="absolute top-3 right-3 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  <CheckCircle className="w-5 h-5 text-white" />
                </motion.div>
              )}

              {/* Premium Badge */}
              {template.isPremium && (
                <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  Premium
                </div>
              )}

              {/* Popular Badge */}
              {template.metadata.usageCount > 1000 && (
                <div className="absolute top-3 left-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Popular
                </div>
              )}
            </div>

            {/* Template Info */}
            <div className="p-4 bg-white">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">
                  {template.name}
                </h3>
                <div className="flex items-center gap-1 text-yellow-400">
                  <Star className="w-3 h-3 fill-current" />
                  <span className="text-xs text-gray-600">
                    {template.metadata.rating.toFixed(1)}
                  </span>
                </div>
              </div>
              
              <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                {template.description}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {template.category.slice(0, 2).map((cat) => (
                    <span
                      key={cat}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
                
                <div className="text-xs text-gray-500">
                  {template.metadata.usageCount.toLocaleString()} uses
                </div>
              </div>
            </div>

            {/* Tooltip */}
            <AnimatePresence>
              {hoveredTemplate === template._id && (
                <motion.div
                  className="absolute -top-2 left-1/2 transform -translate-x-1/2 -translate-y-full bg-gray-900 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap z-50"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  Click to change template without losing content
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
          <p className="text-gray-600">Try adjusting your search or category filters</p>
        </div>
      )}
    </div>
  );
};

export default EnhancedTemplateSelector; 