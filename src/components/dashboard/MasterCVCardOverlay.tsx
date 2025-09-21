'use client';

import React, { useState, useEffect } from 'react';
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

interface MasterCV {
  id: string;
  title: string;
  lastModified: string;
  status: string;
  isMaster: boolean;
  cvData?: any;
  isStarred?: boolean;
  thumbnail?: string; // URL to PNG snapshot
}

interface MasterCVCardOverlayProps {
  onEditMasterCV: (masterCV: MasterCV) => void;
  onDuplicateMasterCV: (masterCV: MasterCV) => void;
  userId: string;
  onToggleStar?: (cvId: string) => void;
}

const MasterCVCardOverlay: React.FC<MasterCVCardOverlayProps> = ({
  onEditMasterCV,
  onDuplicateMasterCV,
  userId,
  onToggleStar
}) => {
  const { data: session } = useSession();
  const [masterCV, setMasterCV] = useState<MasterCV | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<'edit' | 'duplicate' | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchMasterCV();
    }
  }, [userId]);

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
      
      const response = await fetch(`/api/cvs/master?userId=${userId}`);
      console.log('🔍 MasterCVCardOverlay - API response status:', response.status);
      
      const result = await response.json();
      console.log('🔍 MasterCVCardOverlay - API response data:', result);
      
      if (result.success && result.data?.masterCV) {
        console.log('✅ MasterCVCardOverlay - Master CV found:', result.data.masterCV);
        setMasterCV(result.data.masterCV);
      } else {
        console.log('❌ MasterCVCardOverlay - No master CV found in response');
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
            onClick={() => window.location.href = '/master-cv-onboarding'}
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
            onClick={() => window.location.href = '/master-cv-onboarding'}
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
      className="relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100 }}
      whileHover={{ y: -4 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main CV Thumbnail Container */}
      <div className="relative aspect-[3/4] bg-gradient-to-br from-lime-50 to-emerald-50 dark:from-gray-700 dark:to-gray-600 overflow-hidden">
        {/* CV Thumbnail Image */}
        {masterCV.thumbnail ? (
          <img
            src={masterCV.thumbnail}
            alt={`Master CV Preview: ${masterCV.title}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          /* Fallback when no thumbnail available */
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-lime-50 to-emerald-50 dark:from-gray-700 dark:to-gray-600">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <Crown size={48} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">{masterCV.title}</p>
              <p className="text-xs opacity-75">Master CV Template</p>
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
              {/* Edit Button - Single centered action */}
              <div className="flex items-center justify-center p-6">
                {/* Edit Button - Single action */}
                <motion.button
                  onClick={handleEdit}
                  disabled={actionLoading === 'edit'}
                  className="p-4 rounded-full bg-lime-500/30 hover:bg-lime-500/40 text-white transition-all duration-200 backdrop-blur-sm border border-lime-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: actionLoading === 'edit' ? 1 : 1.1 }}
                  whileTap={{ scale: actionLoading === 'edit' ? 1 : 0.9 }}
                  title="Edit Master CV"
                >
                  {actionLoading === 'edit' ? (
                    <Loader2 size={24} className="animate-spin" />
                  ) : (
                    <Edit3 size={24} />
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Master Badge - Always visible */}
        <div className="absolute top-3 left-3">
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-lime-500/20 text-lime-400 border border-lime-500/30 backdrop-blur-sm flex items-center gap-1">
            <Crown size={12} />
            Master
          </span>
        </div>


        {/* Title Overlay - Positioned at bottom of preview */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-lime-500/10 dark:bg-black/20 backdrop-blur-md border-t border-lime-400/20">
          {/* CV Name */}
          <div className="mb-2">
            <div className="flex items-center gap-2">
              <Crown size={16} className="text-lime-300" />
              <h3 className="font-semibold text-white text-sm truncate flex-1">
                {masterCV.title}
              </h3>
            </div>
            <p className="text-white/80 text-xs mt-1">
              Your primary CV template - edit directly or duplicate for job-specific applications.
            </p>
          </div>

          {/* Progress and Last Modified */}
          <div className="flex items-center justify-between text-xs text-white/80">
            <span>Modified: {formatDate(masterCV.lastModified)}</span>
            {(() => {
              const percentage = CVProgressService.calculateCompletionPercentage(masterCV);
              const progressColors = CVProgressService.getProgressColor(percentage);
              return (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <CheckCircle size={12} className="text-lime-300" />
                    <span className="text-lime-300 font-medium">Master</span>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm border ${progressColors.bg} ${progressColors.text} ${progressColors.border}`}>
                    {percentage}%
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MasterCVCardOverlay;
