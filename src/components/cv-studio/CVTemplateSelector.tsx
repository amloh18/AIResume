'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Star, 
  Eye, 
  Download, 
  Palette,
  Settings,
  CheckCircle,
  Sparkles
} from 'lucide-react';

interface CVTemplate {
  id: string;
  name: string;
  category: string[];
  thumbnail: string;
  isPremium: boolean;
  description: string;
  features: string[];
  rating: number;
  downloads: number;
}

interface CVTemplateSelectorProps {
  onTemplateSelect: (template: CVTemplate) => void;
  selectedTemplate?: CVTemplate;
}

const CVTemplateSelector: React.FC<CVTemplateSelectorProps> = ({
  onTemplateSelect,
  selectedTemplate
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'all', name: 'All Templates', count: 12 },
    { id: 'ats-friendly', name: 'ATS-Friendly', count: 6 },
    { id: 'modern', name: 'Modern', count: 4 },
    { id: 'creative', name: 'Creative', count: 3 },
    { id: 'minimalist', name: 'Minimalist', count: 3 },
    { id: 'professional', name: 'Professional', count: 5 }
  ];

  const templates: CVTemplate[] = [
    {
      id: '1',
      name: 'Classic ATS',
      category: ['ATS-Friendly', 'Professional'],
      thumbnail: '/api/placeholder/300/400',
      isPremium: false,
      description: 'Optimized for Applicant Tracking Systems with clean, structured layout.',
      features: ['ATS Optimized', 'Clean Layout', 'Professional', 'Single Column'],
      rating: 4.8,
      downloads: 15420
    },
    {
      id: '2',
      name: 'Modern Sidebar',
      category: ['Modern', 'Two-Column'],
      thumbnail: '/api/placeholder/300/400',
      isPremium: false,
      description: 'Contemporary design with sidebar layout for better visual hierarchy.',
      features: ['Modern Design', 'Sidebar Layout', 'Visual Hierarchy', 'Two Column'],
      rating: 4.6,
      downloads: 8920
    },
    {
      id: '3',
      name: 'Creative Portfolio',
      category: ['Creative', 'Portfolio'],
      thumbnail: '/api/placeholder/300/400',
      isPremium: true,
      description: 'Perfect for creative professionals showcasing their work and skills.',
      features: ['Creative Design', 'Portfolio Focus', 'Visual Elements', 'Premium'],
      rating: 4.9,
      downloads: 5670
    },
    {
      id: '4',
      name: 'Minimalist Clean',
      category: ['Minimalist', 'ATS-Friendly'],
      thumbnail: '/api/placeholder/300/400',
      isPremium: false,
      description: 'Clean and minimal design that focuses on content over decoration.',
      features: ['Minimalist', 'Clean Design', 'Content Focus', 'ATS Friendly'],
      rating: 4.7,
      downloads: 12340
    },
    {
      id: '5',
      name: 'Executive Professional',
      category: ['Professional', 'Executive'],
      thumbnail: '/api/placeholder/300/400',
      isPremium: true,
      description: 'Sophisticated design for senior-level professionals and executives.',
      features: ['Executive Level', 'Professional', 'Sophisticated', 'Premium'],
      rating: 4.9,
      downloads: 3450
    },
    {
      id: '6',
      name: 'Developer Focus',
      category: ['Modern', 'Technical'],
      thumbnail: '/api/placeholder/300/400',
      isPremium: false,
      description: 'Designed specifically for software developers and technical professionals.',
      features: ['Developer Focus', 'Technical', 'Modern', 'Code Highlighting'],
      rating: 4.5,
      downloads: 7890
    }
  ];

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = activeCategory === 'all' || template.category.some(cat => 
      cat.toLowerCase().includes(activeCategory.toLowerCase())
    );
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Choose Your Template</h2>
          <p className="text-gray-600 mt-1">Select a professional template that matches your style and industry</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
            }`}
            onClick={() => setViewMode('grid')}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
            }`}
            onClick={() => setViewMode('list')}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === category.id
                  ? 'bg-blue-600 text-white'
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
        viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
      }`}>
        <AnimatePresence>
          {filteredTemplates.map((template) => (
            <motion.div
              key={template.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className={`group cursor-pointer ${
                viewMode === 'list' ? 'flex gap-4' : ''
              }`}
            >
              <div className={`bg-white border-2 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg ${
                selectedTemplate?.id === template.id 
                  ? 'border-blue-500 shadow-lg' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                {/* Template Preview */}
                <div className="relative">
                  <div className="aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <div className="w-16 h-20 bg-white rounded-lg shadow-md flex items-center justify-center">
                      <FileText className="w-8 h-8 text-gray-400" />
                    </div>
                  </div>
                  
                  {/* Premium Badge */}
                  {template.isPremium && (
                    <div className="absolute top-3 right-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                      <Star className="w-3 h-3 inline mr-1" />
                      PRO
                    </div>
                  )}
                  
                  {/* Quick Actions */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex gap-2">
                      <button className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors">
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                      <button 
                        className="p-2 bg-blue-600 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
                        onClick={() => onTemplateSelect(template)}
                      >
                        <CheckCircle className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Template Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {template.name}
                    </h3>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-600">{template.rating}</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {template.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-1 mb-3">
                    {template.category.slice(0, 2).map((cat) => (
                      <span
                        key={cat}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full"
                      >
                        {cat}
                      </span>
                    ))}
                    {template.category.length > 2 && (
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                        +{template.category.length - 2}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {template.downloads.toLocaleString()} downloads
                    </span>
                    <button
                      onClick={() => onTemplateSelect(template)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedTemplate?.id === template.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {selectedTemplate?.id === template.id ? 'Selected' : 'Use Template'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
          <p className="text-gray-600">Try adjusting your search or filter criteria</p>
        </div>
      )}
    </div>
  );
};

export default CVTemplateSelector; 