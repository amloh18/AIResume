'use client';

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, GripVertical, Plus, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { SnippetCategory, GalleryItem, SectionSnippetType } from '@/types/snippets';
import { useSnippetStore } from '@/lib/stores/snippetStore';
import { LayoutType } from '@/lib/templates/template-definition';

interface SnippetGalleryProps {
  layout?: LayoutType;
  onClose: () => void;
  onSnippetSelect?: (snippet: GalleryItem) => void;
  onSnippetDragStart?: (snippet: GalleryItem) => void;
  anchorRect?: DOMRect | null;
}

type GalleryCategory = 'all' | 'basics' | 'skills' | 'experience' | 'education' | 'projects' | 'other';

const GALLERY_CATEGORY_LABELS: Record<GalleryCategory, string> = {
  all: 'All Snippets',
  basics: 'Basics',
  skills: 'Skills',
  experience: 'Experience',
  education: 'Education',
  projects: 'Projects',
  other: 'Other',
};

const CATEGORY_ICONS: Record<GalleryCategory, string> = {
  all: '📋',
  basics: '👤',
  skills: '⚡',
  experience: '💼',
  education: '🎓',
  projects: '🚀',
  other: '📁',
};

export const SnippetGallery: React.FC<SnippetGalleryProps> = ({
  layout,
  onClose,
  onSnippetSelect,
  onSnippetDragStart,
  anchorRect,
}) => {
  const { getGalleryItems, startDragging, stopDragging } = useSnippetStore();
  const [selectedCategory, setSelectedCategory] = useState<GalleryCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['all']));
  const [draggedItem, setDraggedItem] = useState<GalleryItem | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  // Get all gallery items filtered by category and layout
  const allItems = getGalleryItems(undefined, layout);
  
  // Filter by search query
  const filteredItems = allItems.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    );
  });

  // Group items by gallery category
  const groupedItems = filteredItems.reduce((acc, item) => {
    const category = item.galleryCategory || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, GalleryItem[]>);

  // Get categories with items
  const categoriesWithItems = Object.keys(groupedItems).filter(
    cat => groupedItems[cat].length > 0
  ) as GalleryCategory[];

  // Handle snippet selection
  const handleSelect = useCallback((snippet: GalleryItem) => {
    if (onSnippetSelect) {
      onSnippetSelect(snippet);
    }
    onClose();
  }, [onSnippetSelect, onClose]);

  // Handle drag start
  const handleDragStart = useCallback((e: React.DragEvent, snippet: GalleryItem) => {
    setDraggedItem(snippet);
    startDragging(snippet);
    
    // Set drag data
    e.dataTransfer.setData('application/json', JSON.stringify(snippet));
    e.dataTransfer.effectAllowed = 'copy';
    
    if (onSnippetDragStart) {
      onSnippetDragStart(snippet);
    }
  }, [startDragging, onSnippetDragStart]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    stopDragging();
  }, [stopDragging]);

  // Toggle section expansion
  const toggleSection = useCallback((category: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  // Position relative to anchor or center screen
  const style: React.CSSProperties = anchorRect
    ? {
        position: 'absolute',
        top: anchorRect.bottom + 8,
        left: Math.max(8, anchorRect.left - 200),
        zIndex: 200,
      }
    : {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 200,
      };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[199] bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        ref={galleryRef}
        initial={{ opacity: 0, scale: 0.95, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -4 }}
        transition={{ duration: 0.2 }}
        style={style}
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden w-[480px] max-h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2">
            <span className="text-lg">📦</span>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Snippet Gallery
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search snippets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 dark:focus:ring-lime-400 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex overflow-x-auto px-4 py-2 border-b border-gray-200 dark:border-gray-700 gap-1">
          {(['all', 'basics', 'skills', 'experience', 'education', 'projects', 'other'] as GalleryCategory[]).map((category) => {
            const count = category === 'all' 
              ? filteredItems.length 
              : (groupedItems[category] || []).length;
            
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? 'bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span>{CATEGORY_ICONS[category]}</span>
                <span>{GALLERY_CATEGORY_LABELS[category]}</span>
                {count > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Snippet List */}
        <div className="flex-1 overflow-y-auto p-4">
          {selectedCategory === 'all' ? (
            // Show all categories expanded
            categoriesWithItems.map((category) => (
              <div key={category} className="mb-4">
                <button
                  onClick={() => toggleSection(category)}
                  className="flex items-center justify-between w-full px-2 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>{CATEGORY_ICONS[category]}</span>
                    <span>{GALLERY_CATEGORY_LABELS[category]}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({groupedItems[category]?.length || 0})
                    </span>
                  </div>
                  {expandedSections.has(category) ? (
                    <ChevronUp size={14} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={14} className="text-gray-400" />
                  )}
                </button>
                
                <AnimatePresence>
                  {expandedSections.has(category) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {(groupedItems[category] || []).map((item) => (
                          <SnippetCard
                            key={item.id}
                            item={item}
                            onSelect={handleSelect}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            isDragging={draggedItem?.id === item.id}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          ) : (
            // Show single category
            <div className="grid grid-cols-2 gap-3">
              {(groupedItems[selectedCategory] || []).map((item) => (
                <SnippetCard
                  key={item.id}
                  item={item}
                  onSelect={handleSelect}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  isDragging={draggedItem?.id === item.id}
                />
              ))}
              
              {(!groupedItems[selectedCategory] || groupedItems[selectedCategory].length === 0) && (
                <div className="col-span-2 text-center py-8 text-gray-500 dark:text-gray-400">
                  <p className="text-sm">No snippets available for this category</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <GripVertical size={12} />
              <span>Drag snippets to add to your CV</span>
            </div>
            <div className="flex items-center gap-1">
              <Plus size={12} />
              <span>Click to insert</span>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

// Snippet Card Component
interface SnippetCardProps {
  item: GalleryItem;
  onSelect: (item: GalleryItem) => void;
  onDragStart: (e: React.DragEvent, item: GalleryItem) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

const SnippetCard: React.FC<SnippetCardProps> = ({
  item,
  onSelect,
  onDragStart,
  onDragEnd,
  isDragging,
}) => {
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      experience: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      education: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      skills: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
      projects: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
      basics: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
      other: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
    };
    return colors[category] || colors.other;
  };

  const getColumnBadge = (columnSupport: string) => {
    if (columnSupport === 'both') return null;
    return (
      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
        columnSupport === 'single' 
          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
          : 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300'
      }`}>
        {columnSupport === 'single' ? '1 Col' : '2 Col'}
      </span>
    );
  };

  return (
    <motion.div
      draggable
      onDragStart={(e) => onDragStart(e as any, item)}
      onDragEnd={onDragEnd}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`group relative bg-white dark:bg-gray-800 border rounded-lg overflow-hidden cursor-grab active:cursor-grabbing transition-all ${
        isDragging
          ? 'border-lime-500 ring-2 ring-lime-500/50 shadow-lg'
          : 'border-gray-200 dark:border-gray-700 hover:border-lime-300 dark:hover:border-lime-600 hover:shadow-md'
      }`}
    >
      {/* Preview Image */}
      <div className="relative h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 overflow-hidden">
        {item.previewImage ? (
          <div 
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${item.previewImage})` }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl opacity-50">
            {item.category === 'experience' && '💼'}
            {item.category === 'education' && '🎓'}
            {item.category === 'skills' && '⚡'}
            {item.category === 'projects' && '🚀'}
            {item.category === 'certificates' && '📜'}
            {item.category === 'languages' && '🌍'}
            {!['experience', 'education', 'skills', 'projects', 'certificates', 'languages'].includes(item.category) && '📋'}
          </div>
        )}
        
        {/* Drag handle */}
        <div className="absolute top-2 left-2 p-1 rounded bg-white/80 dark:bg-gray-800/80 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical size={12} className="text-gray-600 dark:text-gray-300" />
        </div>
        
        {/* Column badge */}
        {getColumnBadge(item.columnSupport) && (
          <div className="absolute top-2 right-2">
            {getColumnBadge(item.columnSupport)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {item.name}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
              {item.description}
            </p>
          </div>
        </div>
        
        {/* Category badge */}
        <div className="mt-2 flex items-center gap-2">
          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${getCategoryColor(item.galleryCategory)}`}>
            {item.galleryCategory}
          </span>
          {item.isSection && (
            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300">
              Section
            </span>
          )}
        </div>
      </div>

      {/* Click overlay */}
      <button
        onClick={() => onSelect(item)}
        className="absolute inset-0 w-full h-full opacity-0"
        aria-label={`Add ${item.name}`}
      />
    </motion.div>
  );
};

export default SnippetGallery;
