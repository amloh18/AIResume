'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Crown,
  Edit3, 
  Copy, 
  Loader2,
  AlertCircle,
  CheckCircle,
  Plus,
  Star
} from 'lucide-react';
import { useSession } from 'next-auth/react';

interface MasterCV {
  id: string;
  title: string;
  lastModified: string;
  status: string;
  isMaster: boolean;
  cvData?: any;
  isStarred?: boolean;
}

interface MasterCVCardProps {
  onEditMasterCV: (masterCV: MasterCV) => void;
  onDuplicateMasterCV: (masterCV: MasterCV) => void;
  userId: string;
  onToggleStar?: (cvId: string) => void;
}

const MasterCVCardUpdated: React.FC<MasterCVCardProps> = ({
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

  useEffect(() => {
    if (userId) {
      fetchMasterCV();
    }
  }, [userId]);

  const fetchMasterCV = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/cvs/master?userId=${userId}`);
      const result = await response.json();
      
      if (result.success && result.data?.masterCV) {
        setMasterCV(result.data.masterCV);
      } else {
        setError('No master CV found');
      }
    } catch (error) {
      console.error('Error fetching master CV:', error);
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
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <motion.div
        className="frosted-glass-card rounded-2xl p-6 flex flex-col items-center justify-center text-center min-h-[300px]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="w-16 h-16 bg-gradient-to-br from-lime-400/20 to-lime-500/20 rounded-full flex items-center justify-center mb-4">
          <Loader2 className="h-6 w-6 animate-spin text-lime-400" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Loading Master CV...</h3>
        <p className="text-white/60 text-sm">Please wait while we fetch your master CV</p>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        className="frosted-glass-card rounded-2xl p-6 flex flex-col items-center justify-center text-center min-h-[300px]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="w-16 h-16 bg-gradient-to-br from-red-400/20 to-orange-400/20 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="h-6 w-6 text-red-400" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Master CV Not Found</h3>
        <p className="text-white/60 text-sm mb-4">{error}</p>
        <motion.button
          className="px-4 py-2 bg-gradient-to-r from-lime-400 to-lime-500 text-black font-semibold rounded-xl hover:from-lime-300 hover:to-lime-400 transition-all duration-300 flex items-center gap-2"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => window.location.href = '/master-cv-onboarding'}
        >
          <Plus size={16} />
          Create Master CV
        </motion.button>
      </motion.div>
    );
  }

  if (!masterCV) {
    return (
      <motion.div
        className="frosted-glass-card rounded-2xl p-6 flex flex-col items-center justify-center text-center min-h-[300px]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="w-16 h-16 bg-gradient-to-br from-gray-400/20 to-slate-400/20 rounded-full flex items-center justify-center mb-4">
          <Crown className="h-6 w-6 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">No Master CV</h3>
        <p className="text-white/60 text-sm mb-4">Create a master CV to get started</p>
        <motion.button
          className="px-4 py-2 bg-gradient-to-r from-lime-400 to-lime-500 text-black font-semibold rounded-xl hover:from-lime-300 hover:to-lime-400 transition-all duration-300 flex items-center gap-2"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => window.location.href = '/master-cv-onboarding'}
        >
          <Plus size={16} />
          Create Master CV
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="frosted-glass-card rounded-2xl overflow-hidden hover:bg-gray-200 dark:hover:bg-white/10 transition-all duration-300 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-opacity-50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      whileHover={{ y: -5, scale: 1.02 }}
      onClick={handleEdit}
      tabIndex={0}
      role="button"
      aria-label={`Open Master CV: ${masterCV.title}`}
    >
      {/* Master CV Preview Section */}
      <div className="relative h-40 bg-gradient-to-br from-lime-400/10 to-blue-400/10 overflow-hidden">
        {/* Master Badge - Top Left */}
        <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-lime-500/20 text-lime-400 border border-lime-500/30 text-xs font-medium z-10 flex items-center gap-1">
          <Crown size={12} />
          Master
        </div>
        
        {/* Status Badge - Top Right */}
        <div className={`absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-medium ${
          masterCV.status === 'published' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
          masterCV.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
          'bg-gray-500/20 text-gray-400 border border-gray-500/30'
        } z-10`}>
          {masterCV.status}
        </div>

        {/* Star Button - Bottom Right */}
        {onToggleStar && (
          <motion.button
            className="absolute bottom-3 right-3 p-1.5 rounded-lg bg-black/20 backdrop-blur-sm text-white/60 hover:text-yellow-400 transition-colors z-10"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar(masterCV.id);
            }}
          >
            <Star size={14} className={masterCV.isStarred ? 'fill-yellow-400 text-yellow-400' : ''} />
          </motion.button>
        )}

        {/* Master CV Preview Content - Scaled Down */}
        <div className="h-full p-3 bg-gradient-to-br from-lime-400/5 to-blue-400/5 text-gray-900 dark:text-gray-100 transform scale-75 origin-top-left">
          {masterCV.cvData ? (
            <div className="text-xs">
              {/* CV Header */}
              <div className="text-center mb-2">
                <h1 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">
                  {masterCV.cvData.basics?.name || 'Your Name'}
                </h1>
                {masterCV.cvData.basics?.email && (
                  <p className="text-gray-700 dark:text-gray-300 text-xs">{masterCV.cvData.basics.email}</p>
                )}
                {masterCV.cvData.basics?.phone && (
                  <p className="text-gray-700 dark:text-gray-300 text-xs">{masterCV.cvData.basics.phone}</p>
                )}
              </div>
              
              {/* Professional Summary */}
              {masterCV.cvData.basics?.summary && (
                <div className="mb-2">
                  <h2 className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1 border-b border-gray-400 dark:border-gray-600 pb-1">Summary</h2>
                  <p className="text-gray-800 dark:text-gray-300 text-xs leading-relaxed">
                    {masterCV.cvData.basics.summary.substring(0, 100)}
                    {masterCV.cvData.basics.summary.length > 100 && '...'}
                  </p>
                </div>
              )}
              
              {/* Work Experience - First entry */}
              {masterCV.cvData.work && masterCV.cvData.work.length > 0 && (
                <div>
                  <h2 className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1 border-b border-gray-400 dark:border-gray-600 pb-1">Experience</h2>
                  <div className="mb-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-xs">
                        {masterCV.cvData.work[0].position || masterCV.cvData.work[0].title}
                      </h3>
                      <span className="text-gray-600 dark:text-gray-400 text-xs">
                        {masterCV.cvData.work[0].startDate} - {masterCV.cvData.work[0].endDate || 'Present'}
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 text-xs font-medium">
                      {masterCV.cvData.work[0].name || masterCV.cvData.work[0].company}
                    </p>
                    {masterCV.cvData.work[0].summary && (
                      <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                        {masterCV.cvData.work[0].summary.substring(0, 60)}
                        {masterCV.cvData.work[0].summary.length > 60 && '...'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs">
              {/* Fallback Master CV Preview */}
              <div className="text-center mb-2">
                <h1 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">
                  {masterCV.title}
                </h1>
                <p className="text-gray-700 dark:text-gray-300 text-xs">Master CV Template</p>
              </div>
              
              <div className="mb-2">
                <h2 className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1 border-b border-gray-400 dark:border-gray-600 pb-1">Status</h2>
                <p className="text-gray-800 dark:text-gray-300 text-xs">
                  {masterCV.status === 'draft' ? 'Draft in progress' : 
                   masterCV.status === 'published' ? 'Published and ready' : 
                   'Archived'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Master CV Info Section */}
      <div className="p-4">
        {/* Title Section */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <Crown className="w-4 h-4 text-lime-400" />
            <h3 className="font-semibold text-white group-hover:text-lime-400 transition-colors text-sm">
              {masterCV.title}
            </h3>
          </div>
          <p className="text-white/60 text-xs">
            Your primary CV template - edit directly or duplicate for job-specific applications.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <motion.button
            className="flex-1 px-3 py-2 bg-gradient-to-r from-lime-400/20 to-lime-500/20 border border-lime-400/30 text-lime-400 rounded-lg text-xs font-medium hover:from-lime-400/30 hover:to-lime-500/30 transition-all duration-300 flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: actionLoading === 'edit' ? 1 : 1.02 }}
            whileTap={{ scale: actionLoading === 'edit' ? 1 : 0.98 }}
            onClick={handleEdit}
            disabled={actionLoading === 'edit'}
          >
            {actionLoading === 'edit' ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Edit3 size={12} />
            )}
            Edit Master
          </motion.button>
          
          <motion.button
            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition-all duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: actionLoading === 'duplicate' ? 1 : 1.02 }}
            whileTap={{ scale: actionLoading === 'duplicate' ? 1 : 0.98 }}
            onClick={handleDuplicate}
            disabled={actionLoading === 'duplicate'}
          >
            {actionLoading === 'duplicate' ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Copy size={12} />
            )}
          </motion.button>
        </div>

        {/* Additional Info */}
        <div className="mt-3 flex items-center justify-between text-xs text-white/40">
          <span>Modified: {formatDate(masterCV.lastModified)}</span>
          <div className="flex items-center gap-1">
            <CheckCircle size={10} className="text-lime-400" />
            <span>Master CV</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MasterCVCardUpdated;
