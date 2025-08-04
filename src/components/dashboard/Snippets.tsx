'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Grid, 
  List, 
  Star, 
  Eye, 
  Download,
  Plus,
  Crown,
  Sparkles,
  BookOpen,
  Palette,
  Layout,
  Type,
  Settings,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Lock
} from 'lucide-react';

interface Snippet {
  _id: string;
  name: string;
  description: string;
  category: 'section' | 'template' | 'layout';
  sectionType: 'personal' | 'education' | 'experience' | 'skills' | 'projects' | 'summary' | 'contact';
  templateId: string;
  templateName: string;
  templateImage: string;
  layout: {
    columns: number;
    position: string;
    alignment: string;
    spacing: string;
  };
  styling: {
    backgroundColor: string;
    textColor: string;
    accentColor: string;
    borderStyle: string;
    borderColor: string;
    borderRadius: number;
    shadow: string;
    typography: {
      fontFamily: string;
      fontSize: string;
      fontWeight: string;
      lineHeight: string;
    };
  };
  content: {
    title: string;
    subtitle?: string;
    fields: Array<{
      name: string;
      type: string;
      required: boolean;
      placeholder: string;
    }>;
  };
  accessLevel: 'day-pass' | 'pro' | 'all';
  isActive: boolean;
  isPremium: boolean;
  tags: string[];
  usageCount: number;
  rating: number;
}

interface SnippetsProps {
  userAccessLevel?: 'day-pass' | 'pro' | 'free';
}

const Snippets: React.FC<SnippetsProps> = ({ userAccessLevel = 'free' }) => {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSectionType, setSelectedSectionType] = useState<string>('all');
  const [selectedAccessLevel, setSelectedAccessLevel] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState<Snippet | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const categories = [
    { id: 'all', name: 'All Categories', icon: BookOpen },
    { id: 'section', name: 'Sections', icon: Layout },
    { id: 'template', name: 'Templates', icon: Palette },
    { id: 'layout', name: 'Layouts', icon: Settings }
  ];

  const sectionTypes = [
    { id: 'all', name: 'All Sections' },
    { id: 'personal', name: 'Personal Info' },
    { id: 'education', name: 'Education' },
    { id: 'experience', name: 'Experience' },
    { id: 'skills', name: 'Skills' },
    { id: 'projects', name: 'Projects' },
    { id: 'summary', name: 'Summary' },
    { id: 'contact', name: 'Contact' }
  ];

  const accessLevels = [
    { id: 'all', name: 'All Access', icon: Eye },
    { id: 'all', name: 'Free', icon: Check },
    { id: 'day-pass', name: 'Day Pass', icon: Sparkles },
    { id: 'pro', name: 'Pro', icon: Crown }
  ];

  useEffect(() => {
    fetchSnippets();
  }, [selectedCategory, selectedSectionType, selectedAccessLevel]);

  const fetchSnippets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedSectionType !== 'all') params.append('sectionType', selectedSectionType);
      if (selectedAccessLevel !== 'all') params.append('accessLevel', selectedAccessLevel);
      
      const response = await fetch(`/api/snippets?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setSnippets(data.data);
      }
    } catch (error) {
      console.error('Error fetching snippets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSnippets = snippets.filter(snippet => {
    const matchesSearch = snippet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         snippet.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         snippet.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSearch;
  });

  const canAccessSnippet = (snippet: Snippet) => {
    if (snippet.accessLevel === 'all') return true;
    if (userAccessLevel === 'pro') return true;
    if (userAccessLevel === 'day-pass' && snippet.accessLevel === 'day-pass') return true;
    return false;
  };

  const handleSnippetSelect = (snippet: Snippet) => {
    if (!canAccessSnippet(snippet)) {
      // Show upgrade modal or message
      return;
    }
    setSelectedSnippet(snippet);
    setShowPreview(true);
  };

  const renderSnippetCard = (snippet: Snippet) => (
    <motion.div
      key={snippet._id}
      className={`relative group cursor-pointer ${
        !canAccessSnippet(snippet) ? 'opacity-60' : ''
      }`}
      onClick={() => handleSnippetSelect(snippet)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 h-full transition-all duration-300 hover:border-white/20 hover:bg-white/10">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-white font-semibold text-sm mb-1">{snippet.name}</h3>
            <p className="text-white/60 text-xs line-clamp-2">{snippet.description}</p>
          </div>
          {snippet.isPremium && (
            <Crown size={16} className="text-yellow-400 flex-shrink-0 ml-2" />
          )}
        </div>

        {/* Template Preview */}
        <div className="relative mb-3">
          <div 
            className="w-full h-24 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${snippet.styling.backgroundColor}20, ${snippet.styling.accentColor}20)`,
              border: `1px solid ${snippet.styling.borderColor}40`
            }}
          >
            <div className="text-center">
              <div className="text-xs font-medium text-white/80 mb-1">{snippet.templateName}</div>
              <div className="text-xs text-white/60">{snippet.sectionType}</div>
            </div>
          </div>
          
          {/* Access Level Badge */}
          <div className="absolute top-2 right-2">
            {snippet.accessLevel === 'pro' ? (
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-xs px-2 py-1 rounded-full font-medium">
                PRO
              </div>
            ) : snippet.accessLevel === 'day-pass' ? (
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                DAY PASS
              </div>
            ) : (
              <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                FREE
              </div>
            )}
          </div>
        </div>

        {/* Layout Info */}
        <div className="flex items-center justify-between text-xs text-white/60 mb-3">
          <div className="flex items-center gap-1">
            <Layout size={12} />
            <span>{snippet.layout.columns} col</span>
          </div>
          <div className="flex items-center gap-1">
            <Type size={12} />
            <span>{snippet.styling.typography.fontFamily}</span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {snippet.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="bg-white/10 text-white/70 text-xs px-2 py-1 rounded-full"
            >
              {tag}
            </span>
          ))}
          {snippet.tags.length > 3 && (
            <span className="text-white/40 text-xs">+{snippet.tags.length - 3}</span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-white/50">
          <div className="flex items-center gap-1">
            <Eye size={12} />
            <span>{snippet.usageCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Star size={12} className="text-yellow-400" />
            <span>{snippet.rating}</span>
          </div>
        </div>

        {/* Lock Overlay */}
        {!canAccessSnippet(snippet) && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <Lock size={24} className="text-white/60" />
          </div>
        )}
      </div>
    </motion.div>
  );

  const renderSnippetList = (snippet: Snippet) => (
    <motion.div
      key={snippet._id}
      className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 ${
        !canAccessSnippet(snippet) ? 'opacity-60' : ''
      }`}
      onClick={() => handleSnippetSelect(snippet)}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-center gap-4">
        {/* Template Preview */}
        <div 
          className="w-16 h-16 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${snippet.styling.backgroundColor}20, ${snippet.styling.accentColor}20)`,
            border: `1px solid ${snippet.styling.borderColor}40`
          }}
        >
          <div className="text-center">
            <div className="text-xs font-medium text-white/80">{snippet.templateName}</div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-white font-semibold">{snippet.name}</h3>
            <div className="flex items-center gap-2">
              {snippet.isPremium && <Crown size={16} className="text-yellow-400" />}
              {snippet.accessLevel === 'pro' ? (
                <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-xs px-2 py-1 rounded-full font-medium">
                  PRO
                </div>
              ) : snippet.accessLevel === 'day-pass' ? (
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  DAY PASS
                </div>
              ) : (
                <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  FREE
                </div>
              )}
            </div>
          </div>
          <p className="text-white/60 text-sm mb-2">{snippet.description}</p>
          <div className="flex items-center gap-4 text-xs text-white/50">
            <span>{snippet.sectionType}</span>
            <span>•</span>
            <span>{snippet.layout.columns} columns</span>
            <span>•</span>
            <span>{snippet.usageCount} uses</span>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Star size={12} className="text-yellow-400" />
              <span>{snippet.rating}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Snippets Library</h1>
          <p className="text-white/60">Browse and use CV section designs from our template collection</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all duration-200">
            <Plus size={16} />
            <span>Create Snippet</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
        <div className="flex items-center gap-4 mb-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search snippets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/40"
            />
          </div>

          {/* View Mode */}
          <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all duration-200 ${
                viewMode === 'grid' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all duration-200 ${
                viewMode === 'list' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              <List size={16} />
            </button>
          </div>

          {/* Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all duration-200"
          >
            <Filter size={16} />
            <span>Filters</span>
            {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-white/10 pt-4 space-y-4"
            >
              {/* Category Filter */}
              <div>
                <label className="text-white/80 text-sm font-medium mb-2 block">Category</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                        selectedCategory === category.id
                          ? 'bg-lime-500 text-black font-medium'
                          : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                      }`}
                    >
                      <category.icon size={14} />
                      <span>{category.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Section Type Filter */}
              <div>
                <label className="text-white/80 text-sm font-medium mb-2 block">Section Type</label>
                <div className="flex flex-wrap gap-2">
                  {sectionTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedSectionType(type.id)}
                      className={`px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                        selectedSectionType === type.id
                          ? 'bg-lime-500 text-black font-medium'
                          : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                      }`}
                    >
                      {type.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Access Level Filter */}
              <div>
                <label className="text-white/80 text-sm font-medium mb-2 block">Access Level</label>
                <div className="flex flex-wrap gap-2">
                  {accessLevels.map((level) => (
                    <button
                      key={level.id}
                      onClick={() => setSelectedAccessLevel(level.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                        selectedAccessLevel === level.id
                          ? 'bg-lime-500 text-black font-medium'
                          : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                      }`}
                    >
                      <level.icon size={14} />
                      <span>{level.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Snippets Grid/List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400 mx-auto"></div>
          <p className="text-white/60 mt-4">Loading snippets...</p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-4'}>
          <AnimatePresence>
            {filteredSnippets.map((snippet, index) => (
              <motion.div
                key={snippet._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
              >
                {viewMode === 'grid' ? renderSnippetCard(snippet) : renderSnippetList(snippet)}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredSnippets.length === 0 && (
        <div className="text-center py-12">
          <BookOpen size={48} className="text-white/40 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No snippets found</h3>
          <p className="text-white/60">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Snippet Preview Modal */}
      <AnimatePresence>
        {showPreview && selectedSnippet && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              className="bg-gray-900 border border-white/20 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">{selectedSnippet.name}</h2>
                  <p className="text-white/60">{selectedSnippet.description}</p>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Preview */}
              <div className="mb-6">
                <div 
                  className="w-full h-48 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center mb-4"
                  style={{
                    background: `linear-gradient(135deg, ${selectedSnippet.styling.backgroundColor}20, ${selectedSnippet.styling.accentColor}20)`,
                    border: `1px solid ${selectedSnippet.styling.borderColor}40`
                  }}
                >
                  <div className="text-center">
                    <div className="text-lg font-medium text-white/80 mb-2">{selectedSnippet.templateName}</div>
                    <div className="text-sm text-white/60">{selectedSnippet.sectionType}</div>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h4 className="text-white font-semibold mb-2">Layout</h4>
                  <div className="space-y-1 text-sm text-white/60">
                    <div>Columns: {selectedSnippet.layout.columns}</div>
                    <div>Position: {selectedSnippet.layout.position}</div>
                    <div>Alignment: {selectedSnippet.layout.alignment}</div>
                    <div>Spacing: {selectedSnippet.layout.spacing}</div>
                  </div>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2">Styling</h4>
                  <div className="space-y-1 text-sm text-white/60">
                    <div>Font: {selectedSnippet.styling.typography.fontFamily}</div>
                    <div>Size: {selectedSnippet.styling.typography.fontSize}</div>
                    <div>Weight: {selectedSnippet.styling.typography.fontWeight}</div>
                    <div>Shadow: {selectedSnippet.styling.shadow}</div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button className="flex-1 bg-lime-500 hover:bg-lime-600 text-black font-semibold py-3 px-6 rounded-lg transition-all duration-200">
                  Use This Snippet
                </button>
                <button className="px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all duration-200">
                  <Download size={20} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Snippets; 