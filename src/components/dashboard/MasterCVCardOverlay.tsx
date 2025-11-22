'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crown,
  Edit3, 
  Copy, 
  Loader2,
  AlertCircle,
  CheckCircle,
  Plus,
  Star,
  FileText,
  BarChart3
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import CVPreviewThumbnail from './CVPreviewThumbnail';
import { ITemplate } from '@/types/template';
// UnifiedCVService removed - Canvas handles all data loading

interface MasterCV {
  id: string;
  title: string;
  lastModified: string;
  status: string;
  isMaster: boolean;
  cvData?: any;
  templateId?: string; // Template ID reference
  templateName?: string; // Template name for display
  template?: {
    _id: string;
    name: string;
    globalStyles: any;
    availableSections: any[];
  };
  isStarred?: boolean;
  thumbnail?: string; // URL to PNG snapshot
  metadata?: any; // Full metadata object
}

interface MasterCVCardOverlayProps {
  onEditMasterCV: (masterCV: MasterCV) => void;
  onDuplicateMasterCV: (masterCV: MasterCV) => void;
  userId: string;
  onToggleStar?: (cvId: string) => void;
  masterCVData?: MasterCV | null; // Optional prop to pass Master CV data
  onViewReport?: (masterCV: MasterCV) => void; // View career report
}

const MasterCVCardOverlay: React.FC<MasterCVCardOverlayProps> = ({
  onEditMasterCV,
  onDuplicateMasterCV,
  userId,
  onToggleStar,
  masterCVData,
  onViewReport
}) => {
  const { data: session } = useSession();
  const [masterCV, setMasterCV] = useState<MasterCV | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<'edit' | 'duplicate' | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailLoading, setThumbnailLoading] = useState(false);

  // Generate random background color based on Master CV ID for consistency
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
    
    // Use Master CV ID to generate consistent color
    const hash = id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  useEffect(() => {
    // MasterCVCardOverlay should always receive data from Canvas
    // No fallback fetch - Canvas handles all data loading
    if (masterCVData) {
      setMasterCV(masterCVData);
      // Initialize thumbnail from masterCVData.thumbnail or metadata.thumbnailUrl
      setThumbnailUrl(masterCVData.thumbnail || masterCVData.metadata?.thumbnailUrl || null);
      setLoading(false);
      setError(null);
    } else {
      // No master CV exists - show empty state
      setMasterCV(null);
      setLoading(false);
      setError(null);
    }
  }, [masterCVData]);

  // Track if we've attempted to fetch thumbnail to prevent loops
  const thumbnailFetchAttemptedRef = useRef<string | null>(null);

  // Reset attempted flag when CV changes
  useEffect(() => {
    if (masterCV?.id && thumbnailFetchAttemptedRef.current !== masterCV.id) {
      thumbnailFetchAttemptedRef.current = null;
    }
  }, [masterCV?.id]);

  // REMOVED: Thumbnail generation on page load
  // Thumbnails should be generated when leaving studio, not on every page load
  // This was causing performance issues with POST requests during initial render
  // Now we just use whatever thumbnail URL is already available in masterCV.thumbnail or masterCV.metadata.thumbnailUrl

  // Removed fetchMasterCV - Canvas now handles all data loading
  // MasterCVCardOverlay receives all data via props for better performance

  const handleEdit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!masterCV) return;
    
    setActionLoading('edit');
    try {
      await onEditMasterCV(masterCV);
    } catch (error) {
      console.error('Error editing master CV:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!masterCV) return;
    
    setActionLoading('duplicate');
    try {
      await onDuplicateMasterCV(masterCV);
    } catch (error) {
      console.error('Error duplicating master CV:', error);
    } finally {
      setActionLoading(null);
    }
  };

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


  // Loading state
  if (loading) {
    return (
      <motion.div
        className="relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg min-h-[400px] flex items-center justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-lime-400/20 to-lime-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
            <Loader2 className="h-6 w-6 animate-spin text-lime-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Loading Master CV...</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Please wait while we fetch your master CV</p>
        </div>
      </motion.div>
    );
  }

  // Error state
  if (error) {
    return (
      <motion.div
        className="relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg min-h-[400px] flex items-center justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-gradient-to-br from-red-400/20 to-orange-400/20 rounded-full flex items-center justify-center mb-4 mx-auto">
            <AlertCircle className="h-6 w-6 text-red-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Master CV Not Found</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{error}</p>
          <motion.button
            className="px-4 py-2 bg-gradient-to-r from-lime-400 to-lime-500 text-black font-semibold rounded-xl hover:from-lime-300 hover:to-lime-400 transition-all duration-300 flex items-center gap-2 mx-auto"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.location.href = '/ai-career-report'}
          >
            <Plus size={16} />
            Create Master CV
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // No master CV state
  if (!masterCV) {
    return (
      <motion.div
        className="relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg min-h-[400px] flex items-center justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-gradient-to-br from-gray-400/20 to-slate-400/20 rounded-full flex items-center justify-center mb-4 mx-auto">
            <Crown className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Master CV</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Create a master CV to get started</p>
          <motion.button
            className="px-4 py-2 bg-gradient-to-r from-lime-400 to-lime-500 text-black font-semibold rounded-xl hover:from-lime-300 hover:to-lime-400 transition-all duration-300 flex items-center gap-2 mx-auto"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.location.href = '/ai-career-report'}
          >
            <Plus size={16} />
            Create Master CV
          </motion.button>
        </div>
      </motion.div>
    );
  }

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
      {/* Master CV Preview Container - Outer colored background */}
      <div className="w-full aspect-[3/4] rounded-xl border border-gray-200 dark:border-gray-700 group-hover:shadow-lg dark:group-hover:shadow-lime-500/20 transition-shadow p-6"
           style={{
             backgroundColor: masterCV ? getRandomColor(masterCV.id) : '#F0FDF4'
           }}>
        {/* Master CV Preview - Inner smaller preview */}
        <div 
          className="w-full h-full rounded-xl relative shadow-lg cursor-pointer overflow-hidden"
          onClick={(e) => {
            e.stopPropagation();
            // Open career report when clicking thumbnail
            if (onViewReport && masterCV) {
              onViewReport(masterCV);
            }
          }}
        >
          {/* Master CV Preview - Use live rendering with TemplateRenderer if cvData and template are available, otherwise fallback to S3 thumbnail */}
          {masterCV?.cvData && masterCV?.template ? (
            <CVPreviewThumbnail
              cvData={masterCV.cvData}
              template={masterCV.template as ITemplate}
              className="rounded-xl"
            />
          ) : thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={`Master CV Preview: ${masterCV.title}`}
              className="w-full h-full object-cover rounded-xl cursor-pointer"
              loading="lazy"
              onClick={(e) => {
                e.stopPropagation();
                // Open career report when clicking thumbnail
                if (onViewReport && masterCV) {
                  onViewReport(masterCV);
                }
              }}
              onError={(e) => {
                // If S3 URL fails, try to get presigned URL first
                const target = e.target as HTMLImageElement;
                const currentSrc = target.src;
                if (currentSrc.includes('s3.amazonaws.com') || currentSrc.includes('s3.')) {
                  // Extract key and fetch presigned URL
                  fetch(`/api/files/${encodeURIComponent(currentSrc.split('.amazonaws.com/')[1] || '')}`)
                    .then(res => res.json())
                      .then(data => {
                        if (data.url) {
                          target.src = data.url;
                        } else {
                          // If presigned URL fails, show placeholder
                          setThumbnailUrl(null);
                        }
                      })
                      .catch(() => {
                        console.error('Failed to fetch presigned URL for thumbnail');
                        setThumbnailUrl(null);
                      });
                } else {
                  setThumbnailUrl(null);
                }
              }}
            />
          ) : thumbnailLoading ? (
            /* Loading state */
            <div 
              className="w-full h-full flex items-center justify-center rounded-xl cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                // Open career report when clicking thumbnail
                if (onViewReport && masterCV) {
                  onViewReport(masterCV);
                }
              }}
            >
              <div className="text-center text-gray-500">
                <Loader2 size={32} className="mx-auto mb-2 animate-spin opacity-50" />
                <p className="text-sm font-medium">Generating preview...</p>
                <p className="text-xs opacity-75">Please wait</p>
              </div>
            </div>
          ) : (
            /* Fallback when no thumbnail available */
            <div 
              className="w-full h-full flex items-center justify-center rounded-xl cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                // Open career report when clicking thumbnail
                if (onViewReport && masterCV) {
                  onViewReport(masterCV);
                }
              }}
            >
              <div className="text-center text-gray-500">
                <Crown size={48} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">{masterCV.title}</p>
                <p className="text-xs opacity-75">Master CV Template</p>
              </div>
            </div>
          )}

          {/* Master Badge - Top right corner */}
          <div className="absolute top-3 right-3">
            <span className="px-2 py-1 rounded text-xs font-medium bg-lime-400 text-black border border-lime-400">
              Master
            </span>
          </div>
        </div>
      </div>

      {/* Card Info Section */}
      <div>
        {/* Master CV Title */}
        <div className="mb-2">
          <div className="flex items-center gap-2">
            <Crown size={14} className="text-lime-400" />
            <p className="text-gray-800 dark:text-white text-base font-medium leading-normal flex-1">
              {masterCV.title}
            </p>
          </div>
        </div>

        {/* Last Modified */}
        <p className="text-gray-500 dark:text-[#aebb9b] text-sm font-normal leading-normal">
          Last modified: {formatDate(masterCV.lastModified)}
        </p>

        {/* Action Icons Row */}
        <div className="flex gap-2 mt-2 text-gray-500 dark:text-[#aebb9b]">
          {/* Edit Icon */}
          <motion.button
            onClick={handleEdit}
            disabled={actionLoading === 'edit'}
            className="hover:text-lime-500 dark:hover:text-lime-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: actionLoading === 'edit' ? 1 : 1.1 }}
            whileTap={{ scale: actionLoading === 'edit' ? 1 : 0.9 }}
            title="Edit Master CV"
          >
            {actionLoading === 'edit' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Edit3 size={16} />
            )}
          </motion.button>

          {/* View Report Icon */}
          {onViewReport && (
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                if (masterCV) {
                  onViewReport(masterCV);
                }
              }}
              className="hover:text-lime-500 dark:hover:text-lime-400 transition-all duration-200"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="View Career Report"
            >
              <BarChart3 size={16} />
            </motion.button>
          )}

          {/* Duplicate Icon */}
          <motion.button
            onClick={handleDuplicate}
            disabled={actionLoading === 'duplicate'}
            className="hover:text-lime-500 dark:hover:text-lime-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: actionLoading === 'duplicate' ? 1 : 1.1 }}
            whileTap={{ scale: actionLoading === 'duplicate' ? 1 : 0.9 }}
            title="Duplicate Master CV"
          >
            {actionLoading === 'duplicate' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Copy size={16} />
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default MasterCVCardOverlay;
