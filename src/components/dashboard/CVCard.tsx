'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Edit, 
  Copy, 
  Download, 
  Share2, 
  Trash2, 
  Eye,
  Star,
  Pencil,
  Check,
  X,
  Crown
} from 'lucide-react';

interface CV {
  id: string;
  title: string;
  lastModified: string;
  status: 'draft' | 'published' | 'archived';
  views: number;
  isStarred: boolean;
  thumbnail: string;
  description?: string;
  cvData?: any;
  completionPercentage?: number;
  isMaster?: boolean;
}

interface CVCardProps {
  cv: CV;
  onEdit: (cv: CV) => void;
  onDuplicate: (cv: CV) => void;
  onDownload: (cv: CV) => void;
  onShare: (cv: CV) => void;
  onDelete: (cv: CV) => void;
  onToggleStar: (cvId: string) => void;
  onTitleEdit?: (cvId: string, newTitle: string) => void;
  editingCVId?: string | null;
  editingTitle?: string;
  onStartEditing?: (cv: CV) => void;
  onSaveTitle?: (cvId: string) => void;
  onCancelEditing?: () => void;
}

const CVCard: React.FC<CVCardProps> = ({
  cv,
  onEdit,
  onDuplicate,
  onDownload,
  onShare,
  onDelete,
  onToggleStar,
  onTitleEdit,
  editingCVId,
  editingTitle,
  onStartEditing,
  onSaveTitle,
  onCancelEditing
}) => {
  const [showActions, setShowActions] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'draft':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      case 'archived':
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <motion.div
      className="frosted-glass-card rounded-2xl overflow-hidden hover:bg-gray-200 dark:hover:bg-white/10 transition-all duration-300 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-opacity-50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5, scale: 1.02 }}
      onClick={() => onEdit(cv)}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      tabIndex={0}
      role="button"
      aria-label={`Open CV: ${cv.title}`}
    >
      {/* CV Preview Section */}
      <div className="relative h-40 bg-gray-50 dark:bg-gray-800 overflow-hidden">
        {/* Status Badge - Top Left */}
        <div className={`absolute top-3 left-3 px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(cv.status)} z-10`}>
          {cv.status}
        </div>
        
        {/* Master Badge - Top Right */}
        {cv.isMaster && (
          <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-lime-500/20 text-lime-400 border border-lime-500/30 text-xs font-medium z-10 flex items-center gap-1">
            <Crown size={12} />
            Master
          </div>
        )}

        {/* Star Button - Bottom Right */}
        <motion.button
          className="absolute bottom-3 right-3 p-1.5 rounded-lg bg-black/20 backdrop-blur-sm text-white/60 hover:text-yellow-400 transition-colors z-10"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar(cv.id);
          }}
        >
          <Star size={14} className={cv.isStarred ? 'fill-yellow-400 text-yellow-400' : ''} />
        </motion.button>

        {/* CV Preview Content - Scaled Down */}
        <div className="h-full p-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 transform scale-75 origin-top-left">
          {cv.cvData ? (
            <div className="text-xs">
              {/* CV Header */}
              <div className="text-center mb-2">
                <h1 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">
                  {cv.cvData.basics?.name || 'Your Name'}
                </h1>
                {cv.cvData.basics?.email && (
                  <p className="text-gray-700 dark:text-gray-300 text-xs">{cv.cvData.basics.email}</p>
                )}
                {cv.cvData.basics?.phone && (
                  <p className="text-gray-700 dark:text-gray-300 text-xs">{cv.cvData.basics.phone}</p>
                )}
              </div>
              
              {/* Professional Summary */}
              {cv.cvData.basics?.summary && (
                <div className="mb-2">
                  <h2 className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1 border-b border-gray-400 dark:border-gray-600 pb-1">Summary</h2>
                  <p className="text-gray-800 dark:text-gray-300 text-xs leading-relaxed">
                    {cv.cvData.basics.summary.substring(0, 100)}
                    {cv.cvData.basics.summary.length > 100 && '...'}
                  </p>
                </div>
              )}
              
              {/* Work Experience - First entry */}
              {cv.cvData.work && cv.cvData.work.length > 0 && (
                <div>
                  <h2 className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1 border-b border-gray-400 dark:border-gray-600 pb-1">Experience</h2>
                  <div className="mb-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-xs">
                        {cv.cvData.work[0].position || cv.cvData.work[0].title}
                      </h3>
                      <span className="text-gray-600 dark:text-gray-400 text-xs">
                        {cv.cvData.work[0].startDate} - {cv.cvData.work[0].endDate || 'Present'}
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 text-xs font-medium">
                      {cv.cvData.work[0].name || cv.cvData.work[0].company}
                    </p>
                    {cv.cvData.work[0].summary && (
                      <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                        {cv.cvData.work[0].summary.substring(0, 60)}
                        {cv.cvData.work[0].summary.length > 60 && '...'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs">
              {/* Fallback CV Preview */}
              <div className="text-center mb-2">
                <h1 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">
                  {cv.title}
                </h1>
                <p className="text-gray-700 dark:text-gray-300 text-xs">CV Document</p>
              </div>
              
              <div className="mb-2">
                <h2 className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1 border-b border-gray-400 dark:border-gray-600 pb-1">Status</h2>
                <p className="text-gray-800 dark:text-gray-300 text-xs">
                  {cv.status === 'draft' ? 'Draft in progress' : 
                   cv.status === 'published' ? 'Published and ready' : 
                   'Archived'}
                </p>
              </div>
              
              {cv.completionPercentage !== undefined && (
                <div>
                  <h2 className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1 border-b border-gray-400 dark:border-gray-600 pb-1">Progress</h2>
                  <p className="text-gray-800 dark:text-gray-300 text-xs">
                    {cv.completionPercentage}% complete
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CV Info Section */}
      <div className="p-4">
        {/* Title Section */}
        <div className="mb-3">
          {editingCVId === cv.id ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editingTitle || ''}
                onChange={(e) => onTitleEdit?.(cv.id, e.target.value)}
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-sm font-semibold focus:outline-none focus:border-lime-400"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onSaveTitle?.(cv.id);
                  } else if (e.key === 'Escape') {
                    onCancelEditing?.();
                  }
                }}
              />
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  onSaveTitle?.(cv.id);
                }}
                className="p-1 text-lime-400 hover:text-lime-300 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Check size={12} />
              </motion.button>
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  onCancelEditing?.();
                }}
                className="p-1 text-white/60 hover:text-white transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X size={12} />
              </motion.button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white group-hover:text-lime-400 transition-colors flex-1 text-sm">
                {cv.title}
              </h3>
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartEditing?.(cv);
                }}
                className="p-1 text-white/40 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Pencil size={12} />
              </motion.button>
            </div>
          )}

          {cv.description && (
            <p className="text-white/40 text-xs mt-1 line-clamp-2">{cv.description}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <motion.button
            className="flex-1 px-3 py-2 bg-gradient-to-r from-lime-400/20 to-lime-500/20 border border-lime-400/30 text-lime-400 rounded-lg text-xs font-medium hover:from-lime-400/30 hover:to-lime-500/30 transition-all duration-300 flex items-center justify-center gap-1"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(cv);
            }}
          >
            <Edit size={12} />
            Edit
          </motion.button>
          
          <motion.button
            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition-all duration-300 flex items-center justify-center"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(cv);
            }}
          >
            <Copy size={12} />
          </motion.button>
          
          <motion.button
            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition-all duration-300 flex items-center justify-center"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={(e) => {
              e.stopPropagation();
              onDownload(cv);
            }}
          >
            <Download size={12} />
          </motion.button>
        </div>

        {/* Additional Info */}
        <div className="mt-3 flex items-center justify-between text-xs text-white/40">
          <span>Modified: {formatDate(cv.lastModified)}</span>
          <span>{cv.views} views</span>
        </div>
      </div>
    </motion.div>
  );
};

export default CVCard;
