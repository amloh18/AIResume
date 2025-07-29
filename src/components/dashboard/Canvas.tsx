'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Plus, 
  Edit, 
  Copy, 
  Download, 
  Share2, 
  Trash2, 
  Eye,
  Star,
  Calendar,
  Users,
  Palette,
  Layers,
  ArrowRight,
  Sparkles,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react';

interface CV {
  id: string;
  title: string;
  template: string;
  lastModified: string;
  status: 'draft' | 'published' | 'archived';
  views: number;
  isStarred: boolean;
  thumbnail: string;
}

const Canvas: React.FC = () => {
  const [cvs, setCvs] = useState<CV[]>([
    {
      id: '1',
      title: 'Senior UX Designer CV',
      template: 'Modern',
      lastModified: '2 hours ago',
      status: 'published',
      views: 12,
      isStarred: true,
      thumbnail: '/api/placeholder/300/200'
    },
    {
      id: '2',
      title: 'Product Manager CV',
      template: 'Classic',
      lastModified: '1 day ago',
      status: 'draft',
      views: 0,
      isStarred: false,
      thumbnail: '/api/placeholder/300/200'
    },
    {
      id: '3',
      title: 'Frontend Developer CV',
      template: 'Creative',
      lastModified: '3 days ago',
      status: 'published',
      views: 8,
      isStarred: true,
      thumbnail: '/api/placeholder/300/200'
    }
  ]);

  const [selectedCV, setSelectedCV] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const templates = [
    { id: 'modern', name: 'Modern', description: 'Clean and professional', color: 'from-lime-400 to-lime-500' },
    { id: 'classic', name: 'Classic', description: 'Traditional and elegant', color: 'from-blue-400 to-blue-500' },
    { id: 'creative', name: 'Creative', description: 'Bold and innovative', color: 'from-purple-400 to-purple-500' },
    { id: 'minimal', name: 'Minimal', description: 'Simple and focused', color: 'from-gray-400 to-gray-500' }
  ];

  const toggleStar = (id: string) => {
    setCvs(cvs.map(cv => 
      cv.id === id ? { ...cv, isStarred: !cv.isStarred } : cv
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'text-green-400 bg-green-400/10';
      case 'draft': return 'text-yellow-400 bg-yellow-400/10';
      case 'archived': return 'text-gray-400 bg-gray-400/10';
      default: return 'text-white/60 bg-white/10';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Canvas</h1>
          <p className="text-white/60">Create, edit, and manage your CVs with professional templates</p>
        </div>
        
        <div className="flex items-center gap-4">
          <motion.button
            className="p-2 text-white/60 hover:text-white transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            <Layers size={20} />
          </motion.button>
          
          <motion.button
            className="px-6 py-3 bg-gradient-to-r from-lime-400 to-lime-500 text-black font-semibold rounded-xl hover:from-lime-300 hover:to-lime-400 transition-all duration-300 flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus size={16} />
            New CV
          </motion.button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-lime-400/20 to-lime-500/20 rounded-xl flex items-center justify-center">
              <FileText size={24} className="text-lime-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Total CVs</p>
              <p className="text-2xl font-bold text-white">{cvs.length}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400/20 to-blue-500/20 rounded-xl flex items-center justify-center">
              <Eye size={24} className="text-blue-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Total Views</p>
              <p className="text-2xl font-bold text-white">{cvs.reduce((sum, cv) => sum + cv.views, 0)}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400/20 to-purple-500/20 rounded-xl flex items-center justify-center">
              <Star size={24} className="text-purple-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Starred</p>
              <p className="text-2xl font-bold text-white">{cvs.filter(cv => cv.isStarred).length}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-400/20 to-green-500/20 rounded-xl flex items-center justify-center">
              <CheckCircle size={24} className="text-green-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Published</p>
              <p className="text-2xl font-bold text-white">{cvs.filter(cv => cv.status === 'published').length}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* CV Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Your CVs</h2>
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Clock size={16} />
            <span>Recently modified</span>
          </div>
        </div>

        <div className={`grid gap-6 ${
          viewMode === 'grid' 
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
            : 'grid-cols-1'
        }`}>
          {cvs.map((cv, index) => (
            <motion.div
              key={cv.id}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 transition-all duration-300 group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
            >
              {/* CV Thumbnail */}
              <div className="relative h-48 bg-gradient-to-br from-lime-400/10 to-blue-400/10 flex items-center justify-center">
                <div className="w-16 h-20 bg-white/20 rounded-lg border border-white/30 flex items-center justify-center">
                  <FileText size={24} className="text-white/60" />
                </div>
                
                {/* Status Badge */}
                <div className={`absolute top-4 left-4 px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(cv.status)}`}>
                  {cv.status}
                </div>
                
                {/* Star Button */}
                <motion.button
                  className="absolute top-4 right-4 p-2 rounded-lg bg-black/20 backdrop-blur-sm text-white/60 hover:text-yellow-400 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => toggleStar(cv.id)}
                >
                  <Star size={16} className={cv.isStarred ? 'fill-yellow-400 text-yellow-400' : ''} />
                </motion.button>
              </div>

              {/* CV Info */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1 group-hover:text-lime-400 transition-colors">
                      {cv.title}
                    </h3>
                    <p className="text-white/60 text-sm">{cv.template} Template</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-white/40 text-sm mb-4">
                  <div className="flex items-center gap-2">
                    <Clock size={14} />
                    <span>{cv.lastModified}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye size={14} />
                    <span>{cv.views} views</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <motion.button
                    className="flex-1 px-3 py-2 bg-gradient-to-r from-lime-400/20 to-lime-500/20 border border-lime-400/30 text-lime-400 rounded-lg text-sm font-medium hover:from-lime-400/30 hover:to-lime-500/30 transition-all duration-300 flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Edit size={14} />
                    Edit
                  </motion.button>
                  
                  <motion.button
                    className="p-2 text-white/60 hover:text-white transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Share2 size={16} />
                  </motion.button>
                  
                  <motion.button
                    className="p-2 text-white/60 hover:text-white transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Download size={16} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Templates Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-white">Templates</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {templates.map((template, index) => (
            <motion.div
              key={template.id}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 cursor-pointer group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
            >
              <div className={`w-12 h-16 bg-gradient-to-br ${template.color} rounded-lg mb-4 flex items-center justify-center`}>
                <FileText size={20} className="text-white" />
              </div>
              
              <h3 className="font-semibold text-white mb-2 group-hover:text-lime-400 transition-colors">
                {template.name}
              </h3>
              <p className="text-white/60 text-sm mb-4">{template.description}</p>
              
              <motion.button
                className="w-full px-4 py-2 bg-gradient-to-r from-lime-400/20 to-lime-500/20 border border-lime-400/30 text-lime-400 rounded-lg text-sm font-medium hover:from-lime-400/30 hover:to-lime-500/30 transition-all duration-300 flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus size={14} />
                Use Template
              </motion.button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Canvas; 