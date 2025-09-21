'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Edit, 
  Download, 
  Trash2, 
  Star,
  Pencil,
  Check,
  X,
  Link,
  FileText,
  ExternalLink
} from 'lucide-react';
import { CVJourneyLookupService } from '@/lib/services/cvJourneyLookupService';
import { CVProgressService } from '@/lib/services/cvProgressService';
import { useSession } from 'next-auth/react';

interface CV {
  id: string;
  title: string;
  lastModified: string;
  status: 'draft' | 'published' | 'archived';
  views: number;
  isStarred: boolean;
  thumbnail?: string; // URL to PNG snapshot
  description?: string;
  cvData?: any;
  completionPercentage?: number;
  isMaster?: boolean;
  journeyId?: string; // For linked journey functionality
}

interface CVCardOverlayProps {
  cv: CV;
  onEdit: (cv: CV) => void;
  onDownload: (cv: CV) => void;
  onDelete: (cv: CV) => void;
  onToggleStar: (cvId: string) => void;
  onRename: (cvId: string, newTitle: string) => void;
  onLinkedJourney?: (cv: CV) => void; // Navigate to application tracker
  onEditJourney?: (cv: CV, journey: any) => void; // Open ApplicationJourneyModal
  onTitleEdit?: (cvId: string, newTitle: string) => void;
  editingCVId?: string | null;
  editingTitle?: string;
  onStartEditing?: (cv: CV) => void;
  onSaveTitle?: (cvId: string) => void;
  onCancelEditing?: () => void;
}

const CVCardOverlay: React.FC<CVCardOverlayProps> = ({
  cv,
  onEdit,
  onDownload,
  onDelete,
  onToggleStar,
  onRename,
  onLinkedJourney,
  onEditJourney,
  onTitleEdit,
  editingCVId,
  editingTitle,
  onStartEditing,
  onSaveTitle,
  onCancelEditing
}) => {
  const { data: session } = useSession();
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [linkedJourney, setLinkedJourney] = useState<any>(null);
  const [checkingJourney, setCheckingJourney] = useState(false);

  // Check if CV is linked to any journey
  useEffect(() => {
    const checkForLinkedJourney = async () => {
      if (!session?.user?.id || !cv.id) return;
      
      try {
        setCheckingJourney(true);
        const journey = await CVJourneyLookupService.findJourneyByCVId(cv.id, session.user.id);
        setLinkedJourney(journey);
      } catch (error) {
        console.error('Error checking for linked journey:', error);
      } finally {
        setCheckingJourney(false);
      }
    };

    checkForLinkedJourney();
  }, [cv.id, session?.user?.id]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Unknown';
    }
    
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onDelete(cv);
    setShowDeleteConfirm(false);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <motion.div
      className="relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100 }}
      whileHover={{ y: -4 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main CV Thumbnail Container - Now includes title overlay */}
      <div className="relative aspect-[3/4] bg-gray-100 dark:bg-gray-700 overflow-hidden">
        {/* CV Thumbnail Image */}
        {cv.thumbnail ? (
          <img
            src={cv.thumbnail}
            alt={`CV Preview: ${cv.title}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          /* Fallback when no thumbnail available */
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <FileText size={48} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">{cv.title}</p>
              <p className="text-xs opacity-75">No preview available</p>
            </div>
          </div>
        )}

        {/* Hover Overlay */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center"
            >
              {/* Interactive Elements - Icon Row */}
              <div className="flex items-center justify-center gap-4 p-6">
                {/* Star/Favorite Icon */}
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleStar(cv.id);
                  }}
                  className={`p-3 rounded-full transition-all duration-200 backdrop-blur-sm border ${
                    cv.isStarred 
                      ? 'bg-yellow-500/30 border-yellow-400/50 text-yellow-400' 
                      : 'bg-white/20 hover:bg-white/30 border-white/20 text-white hover:text-yellow-400'
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title={cv.isStarred ? "Remove from favorites" : "Add to favorites"}
                >
                  <Star size={20} className={cv.isStarred ? 'fill-current' : ''} />
                </motion.button>

                {/* Edit Journey Icon - Only show if CV is linked to a journey */}
                {linkedJourney && !checkingJourney && (
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditJourney?.(cv, linkedJourney);
                    }}
                    className="p-3 rounded-full bg-blue-500/30 hover:bg-blue-500/40 text-white transition-all duration-200 backdrop-blur-sm border border-blue-400/50"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="Edit Journey"
                  >
                    <ExternalLink size={20} />
                  </motion.button>
                )}

                {/* Download Icon */}
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(cv);
                  }}
                  className="p-3 rounded-full bg-green-500/30 hover:bg-green-500/40 text-white transition-all duration-200 backdrop-blur-sm border border-green-400/50"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Download CV"
                >
                  <Download size={20} />
                </motion.button>

                {/* Delete Icon */}
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  className="p-3 rounded-full bg-red-500/30 hover:bg-red-500/40 text-white transition-all duration-200 backdrop-blur-sm border border-red-400/50"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Delete CV"
                >
                  <Trash2 size={20} />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>


        {/* Master Badge - Always visible */}
        {cv.isMaster && (
          <div className="absolute top-3 right-3">
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-lime-500/20 text-lime-400 border border-lime-500/30 backdrop-blur-sm">
              Master
            </span>
          </div>
        )}

        {/* Title Overlay - Positioned at bottom of preview */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/10 dark:bg-black/20 backdrop-blur-md border-t border-white/20">
          {/* CV Name */}
          <div className="mb-2">
            {editingCVId === cv.id ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editingTitle || ''}
                  onChange={(e) => onTitleEdit?.(cv.id, e.target.value)}
                  className="flex-1 bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400 backdrop-blur-sm"
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
                  className="p-1 text-green-400 hover:text-green-300 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Check size={16} />
                </motion.button>
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancelEditing?.();
                  }}
                  className="p-1 text-white/70 hover:text-white transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X size={16} />
                </motion.button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white text-sm truncate flex-1">
                  {cv.title}
                </h3>
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartEditing?.(cv);
                  }}
                  className="p-1 rounded-lg bg-white/20 hover:bg-white/30 text-white/80 hover:text-white transition-all duration-200 opacity-0 group-hover:opacity-100"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Pencil size={14} />
                </motion.button>
              </div>
            )}
          </div>

          {/* Progress and Last Modified */}
          <div className="flex items-center justify-between text-xs text-white/80">
            <span>Modified: {formatDate(cv.lastModified)}</span>
            {(() => {
              const percentage = CVProgressService.calculateCompletionPercentage(cv);
              const progressColors = CVProgressService.getProgressColor(percentage);
              return (
                <div className="flex items-center gap-2">
                  <span>{cv.views} views</span>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm border ${progressColors.bg} ${progressColors.text} ${progressColors.border}`}>
                    {percentage}% complete
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={cancelDelete}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm mx-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Delete CV
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Are you sure you want to delete "{cv.title}"? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <motion.button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Delete
                </motion.button>
                <motion.button
                  onClick={cancelDelete}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CVCardOverlay;
