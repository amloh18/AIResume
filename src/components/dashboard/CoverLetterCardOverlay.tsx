'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  Trash2, 
  Star,
  Pencil,
  Check,
  X,
  ExternalLink,
  PenTool,
  FileText
} from 'lucide-react';
import { CVJourneyLookupService } from '@/lib/services/cvJourneyLookupService';
import { useSession } from 'next-auth/react';

interface CoverLetter {
  id: string;
  title: string;
  lastModified: string;
  status: 'draft' | 'final' | 'archived';
  content: string;
  isStarred?: boolean;
  wordCount?: number;
  metadata?: {
    targetCompany?: string;
    targetPosition?: string;
    wordCount?: number;
    lastModified?: Date;
  };
}

interface CoverLetterCardOverlayProps {
  coverLetter: CoverLetter;
  onEdit: (coverLetter: CoverLetter) => void;
  onDownload: (coverLetter: CoverLetter) => void;
  onDelete: (coverLetter: CoverLetter) => void;
  onToggleStar: (coverLetterId: string) => void;
  onEditJourney?: (coverLetter: CoverLetter, journey: any) => void;
  onTitleEdit?: (coverLetterId: string, newTitle: string) => void;
  editingCoverLetterId?: string | null;
  editingTitle?: string;
  onStartEditing?: (coverLetter: CoverLetter) => void;
  onSaveTitle?: (coverLetterId: string) => void;
  onCancelEditing?: () => void;
}

const CoverLetterCardOverlay: React.FC<CoverLetterCardOverlayProps> = ({
  coverLetter,
  onEdit,
  onDownload,
  onDelete,
  onToggleStar,
  onEditJourney,
  onTitleEdit,
  editingCoverLetterId,
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

  // Check if Cover Letter is linked to any journey
  useEffect(() => {
    const checkForLinkedJourney = async () => {
      if (!session?.user?.id || !coverLetter.id) return;
      
      try {
        setCheckingJourney(true);
        // Note: This would need a similar service for cover letters
        // For now, we'll skip this check since cover letters don't have the same journey lookup
        setLinkedJourney(null);
      } catch (error) {
        console.error('Error checking for linked journey:', error);
      } finally {
        setCheckingJourney(false);
      }
    };

    checkForLinkedJourney();
  }, [coverLetter.id, session?.user?.id]);

  const formatDate = (dateString: string | Date) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = Math.abs(now.getTime() - date.getTime()) / 36e5;

      if (diffInHours < 1) {
        return 'Just now';
      } else if (diffInHours < 24) {
        return `${Math.floor(diffInHours)} hours ago`;
      } else if (diffInHours < 168) { // 7 days
        return `${Math.floor(diffInHours / 24)} days ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      return 'Unknown';
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onDelete(coverLetter);
    setShowDeleteConfirm(false);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  // Calculate completion percentage for cover letter
  const calculateCompletionPercentage = (cl: CoverLetter): number => {
    let score = 0;
    let maxScore = 4;

    // Check title
    if (cl.title && cl.title.trim()) score++;
    
    // Check content length (meaningful content)
    if (cl.content && cl.content.trim().length > 100) score++;
    
    // Check word count (good cover letters are 200-400 words)
    const wordCount = cl.metadata?.wordCount || cl.content?.split(/\s+/).length || 0;
    if (wordCount >= 200) score++;
    
    // Check if it has target company/position info
    if (cl.metadata?.targetCompany || cl.metadata?.targetPosition) score++;

    return Math.round((score / maxScore) * 100);
  };

  const getProgressColor = (percentage: number): { bg: string; text: string; border: string } => {
    if (percentage >= 90) {
      return {
        bg: 'bg-green-500/20',
        text: 'text-green-300',
        border: 'border-green-400/30'
      };
    }
    if (percentage >= 70) {
      return {
        bg: 'bg-blue-500/20',
        text: 'text-blue-300',
        border: 'border-blue-400/30'
      };
    }
    if (percentage >= 50) {
      return {
        bg: 'bg-yellow-500/20',
        text: 'text-yellow-300',
        border: 'border-yellow-400/30'
      };
    }
    return {
      bg: 'bg-red-500/20',
      text: 'text-red-300',
      border: 'border-red-400/30'
    };
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
      {/* Main Cover Letter Preview Container */}
      <div className="relative aspect-[3/4] bg-gradient-to-br from-blue-50 to-indigo-50 dark:bg-gradient-to-br dark:from-blue-900/20 dark:to-indigo-900/20 overflow-hidden">
        {/* Cover Letter Preview */}
        <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-400/10 to-blue-500/10">
          <PenTool size={64} className="text-blue-400/60" />
        </div>

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
                    onToggleStar(coverLetter.id);
                  }}
                  className={`p-3 rounded-full transition-all duration-200 backdrop-blur-sm border ${
                    coverLetter.isStarred 
                      ? 'bg-yellow-500/30 border-yellow-400/50 text-yellow-400' 
                      : 'bg-white/20 hover:bg-white/30 border-white/20 text-white hover:text-yellow-400'
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title={coverLetter.isStarred ? "Remove from favorites" : "Add to favorites"}
                >
                  <Star size={20} className={coverLetter.isStarred ? 'fill-current' : ''} />
                </motion.button>

                {/* Edit Journey Icon - Only show if Cover Letter is linked to a journey */}
                {linkedJourney && !checkingJourney && (
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditJourney?.(coverLetter, linkedJourney);
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
                    onDownload(coverLetter);
                  }}
                  className="p-3 rounded-full bg-green-500/30 hover:bg-green-500/40 text-white transition-all duration-200 backdrop-blur-sm border border-green-400/50"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Download Cover Letter"
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
                  title="Delete Cover Letter"
                >
                  <Trash2 size={20} />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Title Overlay - Positioned at bottom of preview */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-blue-500/10 dark:bg-black/20 backdrop-blur-md border-t border-blue-400/20">
          {/* Cover Letter Name */}
          <div className="mb-2">
            {editingCoverLetterId === coverLetter.id ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editingTitle || ''}
                  onChange={(e) => onTitleEdit?.(coverLetter.id, e.target.value)}
                  className="flex-1 bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400 backdrop-blur-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onSaveTitle?.(coverLetter.id);
                    } else if (e.key === 'Escape') {
                      onCancelEditing?.();
                    }
                  }}
                />
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSaveTitle?.(coverLetter.id);
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
                  {coverLetter.title}
                </h3>
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartEditing?.(coverLetter);
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
            <span>Modified: {formatDate(coverLetter.lastModified)}</span>
            {(() => {
              const percentage = calculateCompletionPercentage(coverLetter);
              const progressColors = getProgressColor(percentage);
              const wordCount = coverLetter.metadata?.wordCount || coverLetter.content?.split(/\s+/).length || 0;
              return (
                <div className="flex items-center gap-2">
                  <span>{wordCount} words</span>
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
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm mx-4 shadow-2xl"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Delete Cover Letter?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                This action cannot be undone. The cover letter "{coverLetter.title}" will be permanently deleted.
              </p>
              <div className="flex gap-3">
                <motion.button
                  onClick={cancelDelete}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Delete
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CoverLetterCardOverlay;
