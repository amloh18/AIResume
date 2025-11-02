'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Edit3, 
  Copy, 
  Crown,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { UnifiedCVService } from '@/lib/services/unified-cv-service';

interface MasterCV {
  id: string;
  title: string;
  lastModified: string;
  status: string;
  isMaster: boolean;
}

interface MasterCVCardProps {
  onEditMasterCV: (masterCV: MasterCV) => void;
  onDuplicateMasterCV: (masterCV: MasterCV) => void;
  userId: string;
  isMasterCV?: boolean; // Add prop to determine if this is a master CV
}

const MasterCVCard: React.FC<MasterCVCardProps> = ({
  onEditMasterCV,
  onDuplicateMasterCV,
  userId,
  isMasterCV = true // Default to true for backward compatibility
}) => {
  const { data: session } = useSession();
  const [masterCV, setMasterCV] = useState<MasterCV | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<'edit' | 'duplicate' | null>(null);

  useEffect(() => {
    if (userId) {
      fetchMasterCV();
    }
  }, [userId]);

  const fetchMasterCV = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 MasterCVCard - Fetching master CV with userId:', {
        userId,
        userIdType: typeof userId,
        userIdLength: userId?.length,
        sessionUserId: session?.user?.id
      });
      
      if (!userId) {
        throw new Error('No user ID provided');
      }
      
      // Use unified service to get master CV - same approach as MasterCVCardOverlay in dashboard
      console.log('🔍 MasterCVCard - Calling UnifiedCVService.getCVs...');
      const allCVs = await UnifiedCVService.getCVs(userId, { 
        projection: 'summary'
      });
      console.log('🔍 MasterCVCard - UnifiedCVService.getCVs result:', allCVs);
      
      // Filter for master CVs - handle both old format (isMaster at root) and new format (metadata.isMaster)
      const masterCVs = allCVs.filter(cv => 
        cv.metadata?.isMaster === true || 
        cv.metadata?.isMaster === 'true' ||
        cv.isMaster === true ||
        cv.isMaster === 'true'
      );
      
      console.log('🔍 MasterCVCard - Unified service response:', masterCVs);
      
      if (masterCVs && masterCVs.length > 0) {
        const masterCVData = masterCVs[0];
        console.log('✅ MasterCVCard - Master CV found:', masterCVData);
        
        // Transform to expected format - handle both old and new formats
        const transformedMasterCV = {
          id: masterCVData.id,
          title: masterCVData.title,
          lastModified: new Date(masterCVData.metadata?.lastModified || masterCVData.updatedAt).toLocaleDateString(),
          status: masterCVData.status,
          isMaster: masterCVData.metadata?.isMaster || masterCVData.isMaster || true, // Handle both formats
          cvData: masterCVData.cvData,
          isStarred: masterCVData.metadata?.starred || false,
          thumbnail: masterCVData.metadata?.thumbnailUrl
        };
        
        setMasterCV(transformedMasterCV);
      } else {
        console.log('❌ MasterCVCard - No master CV found');
        setError('No master CV found');
      }
    } catch (error) {
      console.error('❌ MasterCVCard - Error fetching master CV:', error);
      setError('Failed to load master CV');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
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

  const handleDuplicate = async () => {
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
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-lime-50/90 to-green-50/90 dark:from-lime-900/20 dark:to-green-900/20 backdrop-blur-xl border border-lime-200/60 dark:border-lime-700/60 rounded-xl p-6 shadow-lg shadow-lime-200/50 dark:shadow-lime-900/50">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-lime-600" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading Master CV...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-r from-red-50/90 to-orange-50/90 dark:from-red-900/20 dark:to-orange-900/20 backdrop-blur-xl border border-red-200/60 dark:border-red-700/60 rounded-xl p-6 shadow-lg shadow-red-200/50 dark:shadow-red-900/50">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl shadow-md">
            <AlertCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white">
              Master CV Not Found
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!masterCV) {
    return (
      <div className="bg-gradient-to-r from-gray-50/90 to-slate-50/90 dark:from-gray-800/90 dark:to-slate-900/90 backdrop-blur-xl border border-gray-200/60 dark:border-gray-700/60 rounded-xl p-6 shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-gray-500 to-slate-600 rounded-xl shadow-md">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white">
              No Master CV
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Create a master CV to get started
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-lime-50/90 to-green-50/90 dark:from-lime-900/20 dark:to-green-900/20 backdrop-blur-xl border border-lime-200/60 dark:border-lime-700/60 rounded-xl p-6 shadow-lg shadow-lime-200/50 dark:shadow-lime-900/50">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-gradient-to-br from-lime-500 to-green-600 rounded-xl shadow-md">
          <Crown className="w-5 h-5 text-white" />
        </div>
        <div>
          <h4 className="text-lg font-bold text-gray-900 dark:text-white">
            Master CV
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Your primary CV template
          </p>
        </div>
      </div>

      {/* Master CV Info */}
      <div className="bg-white/80 dark:bg-[#1a230f] rounded-lg p-4 mb-4 border border-gray-200/60 dark:border-white/10">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-4 h-4 text-lime-600" />
          <h5 className="font-semibold text-gray-900 dark:text-white">{masterCV.title}</h5>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p>Last modified: {formatDate(masterCV.lastModified)}</p>
          <p>Status: <span className="capitalize">{masterCV.status}</span></p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className={`grid gap-3 ${isMasterCV ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
        <motion.button
          onClick={handleEdit}
          disabled={actionLoading === 'edit'}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-lime-600 to-lime-700 hover:from-lime-700 hover:to-lime-800 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={{ scale: actionLoading === 'edit' ? 1 : 1.02 }}
          whileTap={{ scale: actionLoading === 'edit' ? 1 : 0.98 }}
        >
          {actionLoading === 'edit' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Edit3 className="w-4 h-4" />
          )}
          {isMasterCV ? 'Edit Master CV' : 'Edit CV'}
        </motion.button>

        {isMasterCV && (
          <motion.button
            onClick={handleDuplicate}
            disabled={actionLoading === 'duplicate'}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white/80 dark:bg-[#1a230f] hover:bg-white dark:hover:bg-[#313a28] text-gray-700 dark:text-white text-sm font-medium rounded-lg transition-all duration-200 border border-gray-200 dark:border-white/10 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: actionLoading === 'duplicate' ? 1 : 1.02 }}
            whileTap={{ scale: actionLoading === 'duplicate' ? 1 : 0.98 }}
          >
            {actionLoading === 'duplicate' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            Duplicate CV
          </motion.button>
        )}
      </div>

      {/* Info Text */}
      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        <p>• Edit: Load CV in studio for editing</p>
        {isMasterCV && <p>• Duplicate: Create a copy for job-specific applications</p>}
      </div>
    </div>
  );
};

export default MasterCVCard;
