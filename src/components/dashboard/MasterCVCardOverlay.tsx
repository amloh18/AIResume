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
  FileText
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { CVProgressService } from '@/lib/services/cvProgressService';
import { UnifiedCVService } from '@/lib/services/unified-cv-service';
import CVPreviewThumbnail from './CVPreviewThumbnail';

interface MasterCV {
  id: string;
  title: string;
  lastModified: string;
  status: string;
  isMaster: boolean;
  cvData?: any;
  templateId?: string; // Template ID reference
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
}

const MasterCVCardOverlay: React.FC<MasterCVCardOverlayProps> = ({
  onEditMasterCV,
  onDuplicateMasterCV,
  userId,
  onToggleStar,
  masterCVData
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
    console.log('🔍 MasterCVCardOverlay - useEffect triggered');
    console.log('🔍 MasterCVCardOverlay - masterCVData:', masterCVData);
    console.log('🔍 MasterCVCardOverlay - userId:', userId);
    console.log('🔍 MasterCVCardOverlay - userId type:', typeof userId);
    console.log('🔍 MasterCVCardOverlay - userId length:', userId?.length);
    
    if (masterCVData) {
      // Use passed Master CV data
      console.log('🔍 MasterCVCardOverlay - Using passed masterCVData:', masterCVData);
      console.log('🔍 MasterCVCardOverlay - Master CV details:', {
        id: masterCVData.id,
        title: masterCVData.title,
        isMaster: masterCVData.isMaster,
        status: masterCVData.status,
        cvData: masterCVData.cvData ? 'Present' : 'Missing'
      });
      setMasterCV(masterCVData);
      // Initialize thumbnail from masterCVData.thumbnail or metadata.thumbnailUrl
      setThumbnailUrl(masterCVData.thumbnail || masterCVData.metadata?.thumbnailUrl || null);
      setLoading(false);
      setError(null);
    } else if (userId) {
      // Fallback to fetching if no data passed
      console.log('🔍 MasterCVCardOverlay - No masterCVData, fetching...');
      fetchMasterCV();
    } else {
      console.log('🔍 MasterCVCardOverlay - No masterCVData and no userId, setting loading to false');
      setLoading(false);
    }
  }, [userId, masterCVData]);

  // Track if we've attempted to fetch thumbnail to prevent loops
  const thumbnailFetchAttemptedRef = useRef<string | null>(null);

  // Reset attempted flag when CV changes
  useEffect(() => {
    if (masterCV?.id && thumbnailFetchAttemptedRef.current !== masterCV.id) {
      thumbnailFetchAttemptedRef.current = null;
    }
  }, [masterCV?.id]);

  // Fetch thumbnail if missing
  useEffect(() => {
    // Early return conditions
    if (!masterCV?.id) return;
    if (thumbnailUrl) return; // Already have thumbnail
    if (thumbnailLoading) return; // Already loading
    if (thumbnailFetchAttemptedRef.current === masterCV.id) return; // Already attempted for this CV

    const fetchThumbnail = async () => {
      // Mark as attempted to prevent retries
      thumbnailFetchAttemptedRef.current = masterCV.id;
      
      console.log('🔍 MasterCVCardOverlay - Fetching thumbnail for Master CV:', {
        masterCVId: masterCV.id,
        masterCVTitle: masterCV.title,
        hasCvData: !!masterCV.cvData,
        hasTemplateId: !!masterCV.templateId,
        cvDataKeys: masterCV.cvData ? Object.keys(masterCV.cvData) : 'No cvData'
      });
      
      try {
        setThumbnailLoading(true);
        const response = await fetch(`/api/cv/${masterCV.id}/generate-thumbnail`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('🔍 MasterCVCardOverlay - Thumbnail API response status:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log('🔍 MasterCVCardOverlay - Thumbnail API result:', result);
          if (result.success && result.thumbnailUrl) {
            setThumbnailUrl(result.thumbnailUrl);
            console.log('🔍 MasterCVCardOverlay - Thumbnail URL set:', result.thumbnailUrl);
          } else {
            console.log('🔍 MasterCVCardOverlay - Thumbnail generation failed:', result.error);
            // Reset attempted flag on failure so we can retry later if needed
            thumbnailFetchAttemptedRef.current = null;
          }
        } else {
          const errorResult = await response.json();
          console.log('🔍 MasterCVCardOverlay - Thumbnail API error:', errorResult);
          // Reset attempted flag on error so we can retry later if needed
          thumbnailFetchAttemptedRef.current = null;
        }
      } catch (error) {
        console.error('Error fetching thumbnail:', error);
        // Reset attempted flag on error so we can retry later if needed
        thumbnailFetchAttemptedRef.current = null;
      } finally {
        setThumbnailLoading(false);
      }
    };

    fetchThumbnail();
  }, [masterCV?.id, thumbnailUrl]); // Only depend on CV ID and thumbnail URL, not loading state

  const fetchMasterCV = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 MasterCVCardOverlay - Fetching master CV with userId:', {
        userId,
        userIdType: typeof userId,
        userIdLength: userId?.length,
        sessionUserId: session?.user?.id
      });
      
      if (!userId) {
        throw new Error('No user ID provided');
      }
      
      // Use unified service to get master CV
      console.log('🔍 MasterCVCardOverlay - Calling UnifiedCVService.getCVs...');
      const allCVs = await UnifiedCVService.getCVs(userId, { 
        projection: 'summary'
      });
      console.log('🔍 MasterCVCardOverlay - UnifiedCVService.getCVs result:', allCVs);
      
      // Filter for master CVs - UnifiedCVDocument uses metadata.isMaster
      const masterCVs = allCVs.filter(cv => {
        const isMaster = cv.metadata?.isMaster;
        if (typeof isMaster === 'boolean') return isMaster === true;
        if (typeof isMaster === 'string') return isMaster === 'true';
        return String(isMaster) === 'true';
      });
      
      console.log('🔍 MasterCVCardOverlay - Unified service response:', masterCVs);
      
      if (masterCVs && masterCVs.length > 0) {
        const masterCVData = masterCVs[0];
        console.log('✅ MasterCVCardOverlay - Master CV found:', masterCVData);
        console.log('🔍 MasterCVCardOverlay - Template data:', {
          templateId: masterCVData.templateId,
          templateName: masterCVData.templateName
        });
        
        // Fetch full template if templateId is provided
        let template = null;
        if (masterCVData.templateId) {
          try {
            console.log('🔍 MasterCVCardOverlay - Fetching full template data for:', masterCVData.templateId);
            const templateResponse = await fetch(`/api/templates/${masterCVData.templateId}`);
            if (templateResponse.ok) {
              const templateResult = await templateResponse.json();
              if (templateResult.success && templateResult.data) {
                template = templateResult.data;
                console.log('✅ MasterCVCardOverlay - Template fetched successfully');
              }
            }
          } catch (templateError) {
            console.warn('⚠️ MasterCVCardOverlay - Failed to fetch template:', templateError);
          }
        }
        
        // Transform to expected format - UnifiedCVDocument format
        const transformedMasterCV = {
          id: masterCVData.id,
          title: masterCVData.title,
          lastModified: new Date(masterCVData.metadata?.lastModified || masterCVData.updatedAt).toLocaleDateString(),
          status: masterCVData.status,
          isMaster: masterCVData.metadata?.isMaster || true,
          cvData: masterCVData.cvData,
          template: template, // Include fetched template if available
          templateId: masterCVData.templateId,
          templateName: masterCVData.templateName,
          isStarred: masterCVData.metadata?.starred || false,
          thumbnail: masterCVData.metadata?.thumbnailUrl
        };
        
        console.log('🔍 MasterCVCardOverlay - Transformed Master CV:', {
          id: transformedMasterCV.id,
          hasCvData: !!transformedMasterCV.cvData,
          hasTemplate: !!transformedMasterCV.template,
          templateHasGlobalStyles: !!transformedMasterCV.template?.globalStyles
        });
        
        setMasterCV(transformedMasterCV);
        // Initialize thumbnail from thumbnail or metadata.thumbnailUrl
        setThumbnailUrl(transformedMasterCV.thumbnail || transformedMasterCV.metadata?.thumbnailUrl || null);
      } else {
        console.log('❌ MasterCVCardOverlay - No master CV found');
        setError('No master CV found');
      }
    } catch (error) {
      console.error('❌ MasterCVCardOverlay - Error fetching master CV:', error);
      setError('Failed to load master CV');
    } finally {
      setLoading(false);
    }
  };

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
        <div className="w-full h-full bg-center bg-no-repeat bg-cover rounded-xl relative shadow-lg"
             style={{
               backgroundImage: thumbnailUrl ? `url(${thumbnailUrl})` : 'none'
             }}>
          {/* Master CV Preview - Prioritize S3 thumbnail for performance */}
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={`Master CV Preview: ${masterCV.title}`}
              className="w-full h-full object-cover rounded-xl"
              loading="lazy"
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
                        // If presigned URL fails, fallback to live rendering
                        setThumbnailUrl(null);
                      }
                    })
                    .catch(() => {
                      // If all S3 attempts fail, fallback to live rendering
                      console.error('Failed to fetch presigned URL for thumbnail, falling back to live rendering');
                      setThumbnailUrl(null);
                    });
                } else {
                  // For non-S3 URLs, if they fail, try live rendering
                  setThumbnailUrl(null);
                }
              }}
            />
          ) : masterCV?.cvData && masterCV?.template && masterCV.template.globalStyles ? (
            // Fallback to live rendering if thumbnail is not available
            <CVPreviewThumbnail 
              cvData={masterCV.cvData}
              template={masterCV.template}
              className="rounded-xl"
            />
          ) : thumbnailLoading ? (
            /* Loading state */
            <div className="w-full h-full flex items-center justify-center rounded-xl">
              <div className="text-center text-gray-500">
                <Loader2 size={32} className="mx-auto mb-2 animate-spin opacity-50" />
                <p className="text-sm font-medium">Generating preview...</p>
                <p className="text-xs opacity-75">Please wait</p>
              </div>
            </div>
          ) : (
            /* Fallback when no thumbnail available */
            <div className="w-full h-full flex items-center justify-center rounded-xl">
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
