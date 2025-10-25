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
import { formatDetailedTime } from '@/lib/utils/timeUtils';

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
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 168) { // 7 days
      const days = Math.floor(diffInHours / 24);
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
        bg: 'bg-purple-500/20',
        text: 'text-purple-300',
        border: 'border-purple-400/30'
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
      className="relative group cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100 }}
      whileHover={{ y: -4 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Cover Letter Preview Container - Vibrant colored card */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300" 
           style={{
             background: coverLetter.metadata?.cardColor || 
               (coverLetter.title.includes('Product') ? '#F7FAFC' :
                coverLetter.title.includes('UX') ? '#FED7D7' : '#F7FAFC')
           }}>
        {/* Cover Letter Thumbnail Preview */}
        <div className="h-full p-4 bg-gradient-to-br from-purple-400/10 to-purple-500/10">
          <div className="h-full bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-purple-200 dark:border-purple-400/20 p-3 overflow-hidden">
            {/* Cover Letter Content Preview */}
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="mb-3">
                <div className="h-2 bg-purple-300 dark:bg-purple-400/30 rounded w-1/3 mb-2"></div>
                <div className="h-1 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
              </div>
              
              {/* Date */}
              <div className="mb-3">
                <div className="h-1 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
              </div>
              
              {/* Greeting */}
              <div className="mb-3">
                <div className="h-1 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mb-1"></div>
                <div className="h-1 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
              </div>
              
              {/* Body paragraphs */}
              <div className="space-y-2 flex-1">
                <div className="h-1 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
                <div className="h-1 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
                <div className="h-1 bg-gray-300 dark:bg-gray-600 rounded w-4/5"></div>
                <div className="h-1 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
                <div className="h-1 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
              </div>
              
              {/* Closing */}
              <div className="mt-3">
                <div className="h-1 bg-gray-300 dark:bg-gray-600 rounded w-1/3"></div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Card Footer - Title, Last Modified, and Action Icons - No background */}
      <div className="mt-3 h-24 flex flex-col justify-between">
        {/* Cover Letter Title */}
        <div className="mb-2">
          {editingCoverLetterId === coverLetter.id ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editingTitle || ''}
                onChange={(e) => onTitleEdit?.(coverLetter.id, e.target.value)}
                className="flex-1 bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-400"
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
                className="p-1 text-green-500 hover:text-green-600 transition-colors"
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
                className="p-1 text-gray-500 hover:text-gray-600 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X size={16} />
              </motion.button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white text-sm flex-1">
                {coverLetter.title}
              </h3>
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartEditing?.(coverLetter);
                }}
                className="p-1 text-gray-400 hover:text-white transition-all duration-200 opacity-0 group-hover:opacity-100"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Pencil size={12} />
              </motion.button>
            </div>
          )}
        </div>

        {/* Last Modified */}
        <div className="text-xs text-gray-400 mb-3">
          Last modified: {formatDate(coverLetter.lastModified)}
        </div>

        {/* Action Icons Row - Plain icons without boxes */}
        <div className="flex items-center justify-center gap-4">
          {/* Edit Icon */}
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(coverLetter);
            }}
            className="p-2 text-gray-400 hover:text-white transition-all duration-200"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Edit Cover Letter"
          >
            <Pencil size={16} />
          </motion.button>

          {/* Download Icon */}
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onDownload(coverLetter);
            }}
            className="p-2 text-gray-400 hover:text-white transition-all duration-200"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Download Cover Letter"
          >
            <Download size={16} />
          </motion.button>

          {/* Delete Icon */}
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            className="p-2 text-gray-400 hover:text-white transition-all duration-200"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Delete Cover Letter"
          >
            <Trash2 size={16} />
          </motion.button>

          {/* Share Icon */}
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              // Add share functionality here
            }}
            className="p-2 text-gray-400 hover:text-white transition-all duration-200"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Share Cover Letter"
          >
            <ExternalLink size={16} />
          </motion.button>
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
