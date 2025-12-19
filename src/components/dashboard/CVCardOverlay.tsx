'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Edit, 
  Download, 
  Star,
  Pencil,
  Check,
  X,
  Link,
  FileText,
  ExternalLink,
  Loader2,
  BarChart3
} from 'lucide-react';
import { CVJourneyLookupService } from '@/lib/services/cvJourneyLookupService';
import { CVProgressService } from '@/lib/services/cvProgressService';
import { useSession } from 'next-auth/react';
import { formatDetailedTime } from '@/lib/utils/timeUtils';
import { authenticatedFetch } from '@/lib/utils/apiUtils';
import CVPreviewThumbnail from './CVPreviewThumbnail';
import { ITemplate } from '@/types/template';

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
  template?: {
    _id: string;
    name: string;
    globalStyles: any;
    availableSections: any[];
  };
  completionPercentage?: number;
  cvType?: 'master' | 'journey' | 'standalone'; // NEW: Resume Enhancer CV type
  isMaster?: boolean;
  journeyId?: string; // For linked journey functionality
  atsScore?: number; // ATS score for regular CVs
  metadata?: any; // Full metadata object
}

interface CVCardOverlayProps {
  cv: CV;
  onEdit: (cv: CV) => void | Promise<void>;
  onDownload: (cv: CV) => void | Promise<void>;
  onDelete: (cv: CV) => void | Promise<void>;
  onToggleStar: (cvId: string) => void;
  onRename: (cvId: string, newTitle: string) => void;
  onLinkedJourney?: (cv: CV) => void; // Navigate to application tracker
  onEditJourney?: (cv: CV, journey: any) => void | Promise<void>; // Open JobSidebar
  onTitleEdit?: (cvId: string, newTitle: string) => void;
  editingCVId?: string | null;
  editingTitle?: string;
  onStartEditing?: (cv: CV) => void;
  onSaveTitle?: (cvId: string) => void | Promise<void>;
  onCancelEditing?: () => void;
  linkedJourney?: any | null; // Pre-fetched journey data to avoid API calls
  onViewReport?: (cv: CV) => void | Promise<void>; // View career report
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
  onCancelEditing,
  linkedJourney: linkedJourneyProp,
  onViewReport
}) => {
  const { data: session } = useSession();
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Use linkedJourney from props if provided, otherwise maintain internal state (for backwards compatibility)
  const [linkedJourneyState, setLinkedJourneyState] = useState<any>(null);
  const linkedJourney = linkedJourneyProp !== undefined ? linkedJourneyProp : linkedJourneyState;
  const [checkingJourney, setCheckingJourney] = useState(false);
  // Initialize thumbnail from cv.thumbnail or cv.metadata.thumbnailUrl
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(
    cv.thumbnail || cv.metadata?.thumbnailUrl || null
  );
  const [thumbnailLoading, setThumbnailLoading] = useState(false);

  // Generate random background color based on CV ID for consistency
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
    
    // Use CV ID to generate consistent color
    const hash = id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Check if CV is linked to any journey (ONLY if not provided via props)
  useEffect(() => {
    // Skip API call if journey data is provided via props
    if (linkedJourneyProp !== undefined) {
      return;
    }
    
    const checkForLinkedJourney = async () => {
      if (!session?.user?.id || !cv.id) return;
      
      try {
        setCheckingJourney(true);
        const journey = await CVJourneyLookupService.findJourneyByCVId(cv.id, session.user.id);
        setLinkedJourneyState(journey);
      } catch (error) {
        console.error('Error checking for linked journey:', error);
      } finally {
        setCheckingJourney(false);
      }
    };

    checkForLinkedJourney();
  }, [cv.id, session?.user?.id, linkedJourneyProp]);

  // Track if we've attempted to fetch thumbnail to prevent loops
  const thumbnailFetchAttemptedRef = useRef<string | null>(null);
  const thumbnailGenerationInProgressRef = useRef(false);

  // Reset attempted flag when CV changes
  useEffect(() => {
    if (cv?.id && thumbnailFetchAttemptedRef.current !== cv.id) {
      thumbnailFetchAttemptedRef.current = null;
      thumbnailGenerationInProgressRef.current = false;
    }
  }, [cv.id]);

  // Generate thumbnail on-demand when missing
  useEffect(() => {
    // Skip if:
    // - Already have a thumbnail
    // - Already attempted generation for this CV
    // - Generation already in progress
    // - No CV ID
    // - No session (can't authenticate)
    if (
      thumbnailUrl ||
      thumbnailFetchAttemptedRef.current === cv.id ||
      thumbnailGenerationInProgressRef.current ||
      !cv.id ||
      !session?.user?.id ||
      thumbnailLoading
    ) {
      // Log why we're skipping (for debugging)
      if (!thumbnailUrl && cv.id && !thumbnailFetchAttemptedRef.current && !thumbnailGenerationInProgressRef.current) {
        if (!session?.user?.id) {
          console.log('🖼️ CVCardOverlay - Skipping thumbnail generation: No session');
        }
        if (!cv.cvData) {
          console.log('🖼️ CVCardOverlay - Skipping thumbnail generation: No cvData for CV:', cv.id);
        }
      }
      return;
    }

    // Mark as attempted to prevent duplicate requests
    thumbnailFetchAttemptedRef.current = cv.id;
    thumbnailGenerationInProgressRef.current = true;
    setThumbnailLoading(true);

    console.log('🖼️ CVCardOverlay - Generating thumbnail on-demand for CV:', {
      cvId: cv.id,
      hasCvData: !!cv.cvData,
      cvDataKeys: cv.cvData ? Object.keys(cv.cvData) : 'none',
      userId: session?.user?.id
    });

    // Trigger thumbnail generation using authenticated fetch
    authenticatedFetch(`/api/cv/${cv.id}/generate-thumbnail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorText = await res.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText || `HTTP ${res.status}` };
          }
          console.error('❌ CVCardOverlay - API error:', {
            status: res.status,
            statusText: res.statusText,
            error: errorData
          });
          throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data.success && data.thumbnailUrl) {
          console.log('✅ CVCardOverlay - Thumbnail generated successfully:', data.thumbnailUrl);
          setThumbnailUrl(data.thumbnailUrl);
        } else {
          console.warn('⚠️ CVCardOverlay - Thumbnail generation returned no URL:', data);
        }
      })
      .catch((error) => {
        console.error('❌ CVCardOverlay - Failed to generate thumbnail:', {
          cvId: cv.id,
          error: error.message,
          stack: error.stack
        });
        // Reset the attempted flag so we can retry later
        thumbnailFetchAttemptedRef.current = null;
        // Don't set thumbnailUrl to null - keep existing state
      })
      .finally(() => {
        setThumbnailLoading(false);
        thumbnailGenerationInProgressRef.current = false;
      });
  }, [cv.id, thumbnailUrl, thumbnailLoading, session?.user?.id]);

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
      className="flex flex-col gap-3 pb-3 group cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100 }}
      whileHover={{ y: -4 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* CV Preview Container - Outer colored background */}
      <div className="w-full aspect-[3/4] rounded-xl border border-gray-200 dark:border-gray-700 group-hover:shadow-lg dark:group-hover:shadow-lime-500/20 transition-shadow p-6"
           style={{
             backgroundColor: getRandomColor(cv.id)
           }}>
        {/* CV Preview - Inner smaller preview */}
        <div 
          className="w-full h-full rounded-xl relative shadow-lg cursor-pointer overflow-hidden"
          onClick={(e) => {
            e.stopPropagation();
            // Open career report when clicking thumbnail
            if (onViewReport) {
              onViewReport(cv);
            }
          }}
        >
          {/* CV Preview - Use live rendering with TemplateRenderer if cvData and template are available, otherwise fallback to S3 thumbnail */}
          {cv.cvData && cv.template ? (
            <CVPreviewThumbnail
              cvData={cv.cvData}
              template={cv.template as ITemplate}
              className="rounded-xl"
            />
          ) : thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={`CV Preview: ${cv.title}`}
              className="w-full h-full object-cover rounded-xl cursor-pointer"
              loading="lazy"
              onClick={(e) => {
                e.stopPropagation();
                // Open career report when clicking thumbnail
                if (onViewReport) {
                  onViewReport(cv);
                }
              }}
              onError={(e) => {
                // If S3 URL fails, try to get presigned URL
                const target = e.target as HTMLImageElement;
                const currentSrc = target.src;
                if (currentSrc.includes('s3.amazonaws.com') || currentSrc.includes('s3.')) {
                  // Extract key and fetch presigned URL
                  const keyMatch = currentSrc.match(/\.amazonaws\.com\/(.+)$/);
                  if (keyMatch && keyMatch[1]) {
                    fetch(`/api/files/${encodeURIComponent(keyMatch[1])}`)
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
                if (onViewReport) {
                  onViewReport(cv);
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
            /* Fallback when no preview available */
            <div 
              className="w-full h-full flex items-center justify-center rounded-xl cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                // Open career report when clicking thumbnail
                if (onViewReport) {
                  onViewReport(cv);
                }
              }}
            >
              <div className="text-center text-gray-500 px-2">
                <FileText size={48} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium truncate">{cv.title}</p>
                <p className="text-xs opacity-75">No preview available</p>
              </div>
            </div>
          )}

          {/* CV Type Badge - Top right corner */}
          {/* Determine CV type from cvType field or legacy fields */}
          {(() => {
            const cvType = cv.cvType || 
                         (cv.isMaster === true || cv.metadata?.isMaster === true || cv.metadata?.createdVia === 'ai-career-report' ? 'master' : 
                          cv.journeyId ? 'journey' : 'standalone');
            
            const badgeConfig = {
              master: { label: 'Master', bgColor: 'bg-amber-400', textColor: 'text-black', borderColor: 'border-amber-500' },
              journey: { label: 'Journey', bgColor: 'bg-blue-400', textColor: 'text-white', borderColor: 'border-blue-500' },
              standalone: { label: 'Standalone', bgColor: 'bg-gray-400', textColor: 'text-white', borderColor: 'border-gray-500' }
            };
            
            const config = badgeConfig[cvType] || badgeConfig.standalone;
            
            return (
              <div className="absolute top-3 right-3">
                <span className={`px-2 py-1 rounded text-xs font-medium ${config.bgColor} ${config.textColor} border ${config.borderColor}`}>
                  {config.label}
                </span>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Card Info Section */}
      <div>
        {/* CV Title */}
        <div className="mb-2">
          {editingCVId === cv.id ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editingTitle || ''}
                onChange={(e) => onTitleEdit?.(cv.id, e.target.value)}
                className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-lime-400"
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
            <p className="text-gray-800 dark:text-white text-base font-medium leading-normal truncate">
              {cv.title}
            </p>
          )}
        </div>

        {/* Last Modified */}
        <p className="text-gray-500 dark:text-[#aebb9b] text-sm font-normal leading-normal">
          Last modified: {formatDate(cv.lastModified)}
        </p>

        {/* Action Icons Row */}
        <div className="flex gap-2 mt-2 text-gray-500 dark:text-[#aebb9b]">
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(cv);
            }}
            className="hover:text-lime-500 dark:hover:text-lime-400 transition-all duration-200"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Edit CV"
          >
            <Pencil size={16} />
          </motion.button>

          {onViewReport && (
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                onViewReport(cv);
              }}
              className="hover:text-lime-500 dark:hover:text-lime-400 transition-all duration-200"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="View Career Report"
            >
              <BarChart3 size={16} />
            </motion.button>
          )}

          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onDownload(cv);
            }}
            className="hover:text-lime-500 dark:hover:text-lime-400 transition-all duration-200"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Download CV"
          >
            <Download size={16} />
          </motion.button>

          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              // Add share functionality here
            }}
            className="hover:text-lime-500 dark:hover:text-lime-400 transition-all duration-200"
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
            className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
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
