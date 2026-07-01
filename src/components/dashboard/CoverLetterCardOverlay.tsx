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
import CoverLetterPreviewThumbnail from './CoverLetterPreviewThumbnail';

interface CoverLetter {
  id: string;
  title: string;
  lastModified: string;
  status: 'draft' | 'final' | 'archived';
  content: string;
  isStarred?: boolean;
  wordCount?: number;
  views?: number;
  thumbnail?: string;
  metadata?: {
    targetCompany?: string;
    targetPosition?: string;
    wordCount?: number;
    lastModified?: Date;
  };
  journeyId?: string;
  cvId?: string;
  jobId?: string;
}

interface CoverLetterCardOverlayProps {
  coverLetter: CoverLetter;
  onEdit: (coverLetter: CoverLetter) => void | Promise<void>;
  onDownload: (coverLetter: CoverLetter) => void | Promise<void>;
  onDelete: (coverLetter: CoverLetter) => void | Promise<void>;
  onToggleStar: (coverLetterId: string) => void;
  onEditJourney?: (coverLetter: CoverLetter, journey: any) => void | Promise<void>;
  onTitleEdit?: (coverLetterId: string, newTitle: string) => void;
  editingCoverLetterId?: string | null;
  editingTitle?: string;
  onStartEditing?: (coverLetter: CoverLetter) => void;
  onSaveTitle?: (coverLetterId: string) => void | Promise<void>;
  onCancelEditing?: () => void;
}

const CoverLetterCardOverlayComponent: React.FC<CoverLetterCardOverlayProps> = ({
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

  // Generate random background color based on Cover Letter ID for consistency
  const getRandomColor = (id: string) => {
    const colors = [
      '#F0FDF4', // Light green
      '#FEF3C7', // Light yellow
      '#FEE2E2', // Light red
      '#E0E7FF', // Light blue
      '#F3E8FF', // Light purple
      '#F0F9FF', // Light cyan
      '#FDF2F8', // Light pink
      '#ECFDF5', // Light emerald
      '#FFFBEB', // Light amber
      '#F1F5F9', // Light slate
    ];

    // Use Cover Letter ID to generate consistent color
    const hash = id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);

    return colors[Math.abs(hash) % colors.length];
  };

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
      className="flex flex-col gap-3 pb-3 group cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100 }}
      whileHover={{ y: -4 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Cover Letter Preview Container - Outer colored background */}
      <div className="w-full aspect-[3/4] rounded-xl border border-gray-200 dark:border-gray-700 group-hover:shadow-lg dark:group-hover:shadow-lime-500/20 transition-shadow p-6"
        style={{
          backgroundColor: getRandomColor(coverLetter.id)
        }}>
        {/* Cover Letter Preview - Inner smaller preview */}
        <div className="w-full h-full bg-center bg-no-repeat bg-cover rounded-lg relative shadow-lg">
          {/* Cover Letter Preview */}
          {coverLetter.content ? (
            <CoverLetterPreviewThumbnail
              content={coverLetter.content}
              className="rounded-lg"
            />
          ) : (
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
          )}
        </div>
      </div>

      {/* Card Info Section */}
      <div>
        {/* Cover Letter Title */}
        <div className="mb-2">
          {editingCoverLetterId === coverLetter.id ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editingTitle || ''}
                onChange={(e) => onTitleEdit?.(coverLetter.id, e.target.value)}
                className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-body font-semibold focus:outline-none focus:ring-2 focus:ring-purple-400"
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
            <p className="text-gray-800 dark:text-white text-body font-medium leading-normal">
              {coverLetter.title}
            </p>
          )}
        </div>

        {/* Last Modified */}
        <p className="text-gray-500 dark:text-[#aebb9b] text-small font-normal leading-normal">
          Last modified: {formatDate(coverLetter.lastModified)}
        </p>

        {/* Action Icons Row */}
        <div className="flex gap-2 mt-2 text-gray-500 dark:text-[#aebb9b]">
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(coverLetter);
            }}
            className="hover:text-lime-500 dark:hover:text-lime-400 transition-all duration-200"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Edit Cover Letter"
          >
            <Pencil size={16} />
          </motion.button>

          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onDownload(coverLetter);
            }}
            className="hover:text-lime-500 dark:hover:text-lime-400 transition-all duration-200"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Download Cover Letter"
          >
            <Download size={16} />
          </motion.button>

          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            className="hover:text-lime-500 dark:hover:text-lime-400 transition-all duration-200"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Delete Cover Letter"
          >
            <Trash2 size={16} />
          </motion.button>

          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              // Add share functionality here
            }}
            className="hover:text-lime-500 dark:hover:text-lime-400 transition-all duration-200"
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
            className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm mx-4 shadow-2xl"
            >
              <h3 className="text-h3 font-semibold text-gray-900 dark:text-white mb-2">
                Delete Cover Letter?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-small mb-4">
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

// Memoized component to prevent unnecessary re-renders
const CoverLetterCardOverlay = React.memo(CoverLetterCardOverlayComponent, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.coverLetter.id === nextProps.coverLetter.id &&
    prevProps.coverLetter.title === nextProps.coverLetter.title &&
    prevProps.coverLetter.status === nextProps.coverLetter.status &&
    prevProps.coverLetter.lastModified === nextProps.coverLetter.lastModified &&
    prevProps.coverLetter.isStarred === nextProps.coverLetter.isStarred &&
    prevProps.editingCoverLetterId === nextProps.editingCoverLetterId &&
    prevProps.editingTitle === nextProps.editingTitle
  );
});

export default CoverLetterCardOverlay;
