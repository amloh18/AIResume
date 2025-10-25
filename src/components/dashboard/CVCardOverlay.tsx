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
  ExternalLink,
  Loader2
} from 'lucide-react';
import { CVJourneyLookupService } from '@/lib/services/cvJourneyLookupService';
import { CVProgressService } from '@/lib/services/cvProgressService';
import { useSession } from 'next-auth/react';
import { formatDetailedTime } from '@/lib/utils/timeUtils';

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
  atsScore?: number; // ATS score for regular CVs
  metadata?: any; // Full metadata object
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
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(cv.thumbnail || null);
  const [thumbnailLoading, setThumbnailLoading] = useState(false);

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

  // Fetch thumbnail if missing
  useEffect(() => {
    const fetchThumbnail = async () => {
      if (thumbnailUrl || thumbnailLoading) return;
      
      try {
        setThumbnailLoading(true);
        const response = await fetch(`/api/cv/${cv.id}/generate-thumbnail`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.thumbnailUrl) {
            setThumbnailUrl(result.thumbnailUrl);
          }
        }
      } catch (error) {
        console.error('Error fetching thumbnail:', error);
      } finally {
        setThumbnailLoading(false);
      }
    };

    fetchThumbnail();
  }, [cv.id, thumbnailUrl, thumbnailLoading]);

  const formatDate = (dateString: string) => {
    return formatDetailedTime(dateString);
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
      className="relative group cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100 }}
      whileHover={{ y: -4 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* CV Preview Container - Vibrant colored card */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300" 
           style={{
             background: cv.metadata?.cardColor || 
               (cv.title.includes('Software') ? '#2D3748' : 
                cv.title.includes('Product') ? '#F7FAFC' :
                cv.title.includes('UX') ? '#FED7D7' : '#F7FAFC')
           }}>
        {/* CV Thumbnail Image */}
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={`CV Preview: ${cv.title}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : thumbnailLoading ? (
          /* Loading state */
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Loader2 size={32} className="mx-auto mb-2 animate-spin opacity-50" />
              <p className="text-sm font-medium">Generating preview...</p>
              <p className="text-xs opacity-75">Please wait</p>
            </div>
          </div>
        ) : (
          /* Fallback when no thumbnail available */
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-gray-500">
              <FileText size={48} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">{cv.title}</p>
              <p className="text-xs opacity-75">No preview available</p>
            </div>
          </div>
        )}

        {/* Master Badge - Top right corner as shown in image */}
        {(cv.isMaster || cv.metadata?.isMaster) && (
          <div className="absolute top-3 right-3">
            <span className="px-2 py-1 rounded text-xs font-medium bg-lime-400 text-black border border-lime-400">
              Master
            </span>
          </div>
        )}
      </div>

      {/* Card Footer - Title, Last Modified, and Action Icons - No background */}
      <div className="mt-3 h-24 flex flex-col justify-between">
        {/* CV Title */}
        <div className="mb-2">
          {editingCVId === cv.id ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editingTitle || ''}
                onChange={(e) => onTitleEdit?.(cv.id, e.target.value)}
                className="flex-1 bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                {cv.title}
              </h3>
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartEditing?.(cv);
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
          Last modified: {formatDate(cv.lastModified)}
        </div>

        {/* Action Icons Row - Plain icons without boxes */}
        <div className="flex items-center justify-center gap-4">
          {/* Edit Icon */}
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(cv);
            }}
            className="p-2 text-gray-400 hover:text-white transition-all duration-200"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Edit CV"
          >
            <Pencil size={16} />
          </motion.button>

          {/* Download Icon */}
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onDownload(cv);
            }}
            className="p-2 text-gray-400 hover:text-white transition-all duration-200"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Download CV"
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
            title="Delete CV"
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
            title="Share CV"
          >
            <Link size={16} />
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
