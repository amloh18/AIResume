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
      className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden hover:bg-white/15 transition-all duration-500 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-opacity-50 shadow-2xl"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 100 }}
      whileHover={{ 
        y: -8, 
        scale: 1.03,
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(132, 204, 22, 0.1)"
      }}
      onClick={() => onEdit(cv)}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      tabIndex={0}
      role="button"
      aria-label={`Open CV: ${cv.title}`}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-purple-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
      {/* CV Preview Section */}
      <div className="relative h-44 bg-gradient-to-br from-blue-400/15 via-purple-400/10 to-pink-400/15 overflow-hidden">
        {/* Animated background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-50" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]" />
        
        {/* Status Badge - Top Left */}
        <motion.div 
          className={`absolute top-3 left-3 px-3 py-1.5 rounded-xl text-xs font-semibold z-10 backdrop-blur-sm shadow-lg ${getStatusColor(cv.status)}`}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          whileHover={{ scale: 1.05 }}
        >
          {cv.status}
        </motion.div>
        
        {/* Master Badge - Top Right */}
        {cv.isMaster && (
          <motion.div 
            className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-gradient-to-r from-lime-500/25 to-lime-600/25 text-lime-300 border border-lime-400/40 text-xs font-semibold z-10 flex items-center gap-1.5 backdrop-blur-sm shadow-lg"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            whileHover={{ scale: 1.05 }}
          >
            <Crown size={12} className="text-lime-400" />
            Master
          </motion.div>
        )}

        {/* Star Button - Bottom Right */}
        <motion.button
          className="absolute bottom-3 right-3 p-2 rounded-xl bg-white/10 backdrop-blur-md text-white/70 hover:text-yellow-400 transition-all duration-300 z-10 border border-white/20 hover:border-yellow-400/50 hover:bg-yellow-400/10"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
          whileHover={{ scale: 1.15, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar(cv.id);
          }}
        >
          <Star size={16} className={cv.isStarred ? 'fill-yellow-400 text-yellow-400' : ''} />
        </motion.button>

        {/* CV Preview Content - Scaled Down */}
        <motion.div 
          className="h-full p-2 text-white/90 rounded-lg overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {cv.cvData ? (
            <div className="text-[10px] leading-tight">
              {/* CV Header */}
              <div className="text-center mb-1">
                <h1 className="text-xs font-bold text-white mb-0.5">
                  {cv.cvData.basics?.name || 'Your Name'}
                </h1>
                {cv.cvData.basics?.email && (
                  <p className="text-white/80 text-[10px]">{cv.cvData.basics.email}</p>
                )}
                {cv.cvData.basics?.phone && (
                  <p className="text-white/80 text-[10px]">{cv.cvData.basics.phone}</p>
                )}
              </div>
              
              {/* Professional Summary */}
              {cv.cvData.basics?.summary && (
                <div className="mb-1">
                  <h2 className="text-[10px] font-semibold text-white mb-0.5 border-b border-white/30 pb-0.5">Summary</h2>
                  <p className="text-white/90 text-[10px] leading-tight">
                    {cv.cvData.basics.summary.substring(0, 80)}
                    {cv.cvData.basics.summary.length > 80 && '...'}
                  </p>
                </div>
              )}
              
              {/* Work Experience - First entry */}
              {cv.cvData.work && cv.cvData.work.length > 0 && (
                <div>
                  <h2 className="text-[10px] font-semibold text-white mb-0.5 border-b border-white/30 pb-0.5">Experience</h2>
                  <div className="mb-0.5">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-white text-[10px]">
                        {cv.cvData.work[0].position || cv.cvData.work[0].title}
                      </h3>
                      <span className="text-white/70 text-[10px]">
                        {cv.cvData.work[0].startDate} - {cv.cvData.work[0].endDate || 'Present'}
                      </span>
                    </div>
                    <p className="text-white/80 text-[10px] font-medium">
                      {cv.cvData.work[0].name || cv.cvData.work[0].company}
                    </p>
                    {cv.cvData.work[0].summary && (
                      <p className="text-white/70 text-[10px] mt-0.5">
                        {cv.cvData.work[0].summary.substring(0, 50)}
                        {cv.cvData.work[0].summary.length > 50 && '...'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-[10px] leading-tight">
              {/* Fallback CV Preview */}
              <div className="text-center mb-1">
                <h1 className="text-xs font-bold text-white mb-0.5">
                  {cv.title}
                </h1>
                <p className="text-white/80 text-[10px]">CV Document</p>
              </div>
              
              <div className="mb-1">
                <h2 className="text-[10px] font-semibold text-white mb-0.5 border-b border-white/30 pb-0.5">Status</h2>
                <p className="text-white/90 text-[10px]">
                  {cv.status === 'draft' ? 'Draft in progress' : 
                   cv.status === 'published' ? 'Published and ready' : 
                   'Archived'}
                </p>
              </div>
              
              {cv.completionPercentage !== undefined && (
                <div>
                  <h2 className="text-[10px] font-semibold text-white mb-0.5 border-b border-white/30 pb-0.5">Progress</h2>
                  <p className="text-white/90 text-[10px]">
                    {cv.completionPercentage}% complete
                  </p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* CV Info Section */}
      <div className="p-5 relative">
        {/* Title Section */}
        <motion.div 
          className="mb-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
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
              <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors flex-1 text-base">
                {cv.title}
              </h3>
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartEditing?.(cv);
                }}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all duration-300 opacity-0 group-hover:opacity-100 border border-white/20"
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
              >
                <Pencil size={14} />
              </motion.button>
            </div>
          )}

          {cv.description && (
            <p className="text-white/40 text-xs mt-1 line-clamp-2">{cv.description}</p>
          )}
        </motion.div>

        {/* Action Buttons */}
        <motion.div 
          className="flex items-center gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.4 }}
        >
          <motion.button
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500/25 to-purple-500/25 border border-blue-400/40 text-blue-300 rounded-xl text-sm font-semibold hover:from-blue-500/35 hover:to-purple-500/35 transition-all duration-300 flex items-center justify-center gap-2 backdrop-blur-sm shadow-lg"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(cv);
            }}
          >
            <Edit size={14} />
            Edit
          </motion.button>
          
          <motion.button
            className="px-4 py-3 bg-white/15 hover:bg-white/25 text-white rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center backdrop-blur-sm border border-white/20 hover:border-white/30 shadow-lg"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(cv);
            }}
          >
            <Copy size={14} />
          </motion.button>
          
          <motion.button
            className="px-4 py-3 bg-white/15 hover:bg-white/25 text-white rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center backdrop-blur-sm border border-white/20 hover:border-white/30 shadow-lg"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              onDownload(cv);
            }}
          >
            <Download size={14} />
          </motion.button>
        </motion.div>

        {/* Additional Info */}
        <motion.div 
          className="mt-4 flex items-center justify-between text-sm text-white/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            <span>Modified: {formatDate(cv.lastModified)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-400 rounded-full" />
            <span className="font-medium text-purple-300">{cv.views} views</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default CVCard;
