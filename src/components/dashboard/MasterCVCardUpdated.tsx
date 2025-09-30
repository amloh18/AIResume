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
  masterCVData?: MasterCV | null; // Optional prop to pass Master CV data
}

const MasterCVCardUpdated: React.FC<MasterCVCardProps> = ({
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

  useEffect(() => {
    if (masterCVData) {
      // Use passed Master CV data
      setMasterCV(masterCVData);
      setLoading(false);
      setError(null);
    } else if (userId) {
      // Fallback to fetching if no data passed
      fetchMasterCV();
    }
  }, [userId, masterCVData]);

  const fetchMasterCV = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 MasterCVCardUpdated - Fetching master CV with userId:', {
        userId,
        userIdType: typeof userId,
        userIdLength: userId?.length,
        sessionUserId: session?.user?.id
      });
      
      const response = await fetch(`/api/cvs/master?userId=${userId}`);
      console.log('🔍 MasterCVCardUpdated - API response status:', response.status);
      
      const result = await response.json();
      console.log('🔍 MasterCVCardUpdated - API response data:', result);
      
      if (result.success && result.data?.masterCV) {
        console.log('✅ MasterCVCardUpdated - Master CV found:', result.data.masterCV);
        setMasterCV(result.data.masterCV);
      } else {
        console.log('❌ MasterCVCardUpdated - No master CV found in response');
        setError('No master CV found');
      }
    } catch (error) {
      console.error('❌ MasterCVCardUpdated - Error fetching master CV:', error);
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
      className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden hover:bg-white/15 transition-all duration-500 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-opacity-50 shadow-2xl"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
      whileHover={{ 
        y: -8, 
        scale: 1.03,
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(132, 204, 22, 0.1)"
      }}
      onClick={handleEdit}
      tabIndex={0}
      role="button"
      aria-label={`Open Master CV: ${masterCV.title}`}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-lime-500/5 via-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-lime-400/10 to-emerald-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
      {/* Master CV Preview Section */}
      <div className="relative h-44 bg-gradient-to-br from-lime-400/15 via-emerald-400/10 to-teal-400/15 overflow-hidden">
        {/* Animated background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-lime-500/5 to-emerald-500/5 opacity-50" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(132,204,22,0.1),transparent_50%)]" />
        
        {/* Master Badge - Top Left */}
        <motion.div 
          className="absolute top-3 left-3 px-3 py-1.5 rounded-xl bg-gradient-to-r from-lime-500/25 to-lime-600/25 text-lime-300 border border-lime-400/40 text-xs font-semibold z-10 flex items-center gap-1.5 backdrop-blur-sm shadow-lg"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
          whileHover={{ scale: 1.05 }}
        >
          <Crown size={12} className="text-lime-400" />
          Master
        </motion.div>
        
        {/* Status Badge - Top Right */}
        <motion.div 
          className={`absolute top-3 right-3 px-3 py-1.5 rounded-xl text-xs font-semibold z-10 backdrop-blur-sm shadow-lg ${
            masterCV.status === 'published' ? 'bg-gradient-to-r from-green-500/25 to-green-600/25 text-green-300 border border-green-400/40' :
            masterCV.status === 'draft' ? 'bg-gradient-to-r from-yellow-500/25 to-yellow-600/25 text-yellow-300 border border-yellow-400/40' :
            'bg-gradient-to-r from-gray-500/25 to-gray-600/25 text-gray-300 border border-gray-400/40'
          }`}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
          whileHover={{ scale: 1.05 }}
        >
          {masterCV.status}
        </motion.div>

        {/* Star Button - Bottom Right */}
        {onToggleStar && (
          <motion.button
            className="absolute bottom-3 right-3 p-2 rounded-xl bg-white/10 backdrop-blur-md text-white/70 hover:text-yellow-400 transition-all duration-300 z-10 border border-white/20 hover:border-yellow-400/50 hover:bg-yellow-400/10"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.7, type: "spring", stiffness: 200 }}
            whileHover={{ scale: 1.15, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar(masterCV.id);
            }}
          >
            <Star size={16} className={masterCV.isStarred ? 'fill-yellow-400 text-yellow-400' : ''} />
          </motion.button>
        )}

        {/* Master CV Preview Content - Scaled Down */}
        <motion.div 
          className="h-full p-2 text-white/90 rounded-lg overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          {masterCV.cvData ? (
            <div className="text-[10px] leading-tight">
              {/* CV Header */}
              <div className="text-center mb-1">
                <h1 className="text-xs font-bold text-white mb-0.5">
                  {masterCV.cvData.basics?.name || 'Your Name'}
                </h1>
                {masterCV.cvData.basics?.email && (
                  <p className="text-white/80 text-[10px]">{masterCV.cvData.basics.email}</p>
                )}
                {masterCV.cvData.basics?.phone && (
                  <p className="text-white/80 text-[10px]">{masterCV.cvData.basics.phone}</p>
                )}
              </div>
              
              {/* Professional Summary */}
              {masterCV.cvData.basics?.summary && (
                <div className="mb-1">
                  <h2 className="text-[10px] font-semibold text-white mb-0.5 border-b border-white/30 pb-0.5">Summary</h2>
                  <p className="text-white/90 text-[10px] leading-tight">
                    {masterCV.cvData.basics.summary.substring(0, 80)}
                    {masterCV.cvData.basics.summary.length > 80 && '...'}
                  </p>
                </div>
              )}
              
              {/* Work Experience - First entry */}
              {masterCV.cvData.work && masterCV.cvData.work.length > 0 && (
                <div>
                  <h2 className="text-[10px] font-semibold text-white mb-0.5 border-b border-white/30 pb-0.5">Experience</h2>
                  <div className="mb-0.5">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-white text-[10px]">
                        {masterCV.cvData.work[0].position || masterCV.cvData.work[0].title}
                      </h3>
                      <span className="text-white/70 text-[10px]">
                        {masterCV.cvData.work[0].startDate} - {masterCV.cvData.work[0].endDate || 'Present'}
                      </span>
                    </div>
                    <p className="text-white/80 text-[10px] font-medium">
                      {masterCV.cvData.work[0].name || masterCV.cvData.work[0].company}
                    </p>
                    {masterCV.cvData.work[0].summary && (
                      <p className="text-white/70 text-[10px] mt-0.5">
                        {masterCV.cvData.work[0].summary.substring(0, 50)}
                        {masterCV.cvData.work[0].summary.length > 50 && '...'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-[10px] leading-tight">
              {/* Fallback Master CV Preview */}
              <div className="text-center mb-1">
                <h1 className="text-xs font-bold text-white mb-0.5">
                  {masterCV.title}
                </h1>
                <p className="text-white/80 text-[10px]">Master CV Template</p>
              </div>
              
              <div className="mb-1">
                <h2 className="text-[10px] font-semibold text-white mb-0.5 border-b border-white/30 pb-0.5">Status</h2>
                <p className="text-white/90 text-[10px]">
                  {masterCV.status === 'draft' ? 'Draft in progress' : 
                   masterCV.status === 'published' ? 'Published and ready' : 
                   'Archived'}
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Master CV Info Section */}
      <div className="p-5 relative">
        {/* Title Section */}
        <motion.div 
          className="mb-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <motion.div
              className="p-1.5 rounded-lg bg-lime-500/20 border border-lime-400/30"
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <Crown className="w-4 h-4 text-lime-400" />
            </motion.div>
            <h3 className="font-bold text-white group-hover:text-lime-400 transition-colors text-base">
              {masterCV.title}
            </h3>
          </div>
          <p className="text-white/70 text-sm leading-relaxed">
            Your primary CV template - edit directly or duplicate for job-specific applications.
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div 
          className="flex items-center gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.4 }}
        >
          <motion.button
            className="flex-1 px-4 py-3 bg-gradient-to-r from-lime-500/25 to-lime-600/25 border border-lime-400/40 text-lime-300 rounded-xl text-sm font-semibold hover:from-lime-500/35 hover:to-lime-600/35 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm shadow-lg"
            whileHover={{ scale: actionLoading === 'edit' ? 1 : 1.05, y: -2 }}
            whileTap={{ scale: actionLoading === 'edit' ? 1 : 0.95 }}
            onClick={handleEdit}
            disabled={actionLoading === 'edit'}
          >
            {actionLoading === 'edit' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Edit3 size={14} />
            )}
            Edit Master
          </motion.button>
          
          <motion.button
            className="px-4 py-3 bg-white/15 hover:bg-white/25 text-white rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm border border-white/20 hover:border-white/30 shadow-lg"
            whileHover={{ scale: actionLoading === 'duplicate' ? 1 : 1.05, y: -2 }}
            whileTap={{ scale: actionLoading === 'duplicate' ? 1 : 0.95 }}
            onClick={handleDuplicate}
            disabled={actionLoading === 'duplicate'}
          >
            {actionLoading === 'duplicate' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Copy size={14} />
            )}
          </motion.button>
        </motion.div>

        {/* Additional Info */}
        <motion.div 
          className="mt-4 flex items-center justify-between text-sm text-white/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.4 }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse" />
            <span>Modified: {formatDate(masterCV.lastModified)}</span>
          </div>
          <div className="flex items-center gap-2">
            <motion.div
              className="p-1 rounded-lg bg-lime-500/20 border border-lime-400/30"
              whileHover={{ scale: 1.1 }}
            >
              <CheckCircle size={12} className="text-lime-400" />
            </motion.div>
            <span className="font-medium text-lime-300">Master CV</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default MasterCVCardUpdated;
