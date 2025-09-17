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
  Plus
} from 'lucide-react';
import { useSession } from 'next-auth/react';

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
}

const MasterCVCard: React.FC<MasterCVCardProps> = ({
  onEditMasterCV,
  onDuplicateMasterCV,
  userId
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
        className="bg-gradient-to-br from-lime-400/10 to-blue-400/10 border-2 border-dashed border-lime-400/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="w-20 h-20 bg-gradient-to-br from-lime-400/20 to-lime-500/20 rounded-full flex items-center justify-center mb-6">
          <Loader2 className="h-8 w-8 animate-spin text-lime-400" />
        </div>
        <h3 className="text-lg font-bold text-white mb-3">Loading Master CV...</h3>
        <p className="text-white/60">Please wait while we fetch your master CV</p>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        className="bg-gradient-to-br from-red-400/10 to-orange-400/10 border-2 border-dashed border-red-400/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="w-20 h-20 bg-gradient-to-br from-red-400/20 to-orange-400/20 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
        <h3 className="text-lg font-bold text-white mb-3">Master CV Not Found</h3>
        <p className="text-white/60 mb-6">{error}</p>
        <motion.button
          className="px-6 py-3 bg-gradient-to-r from-lime-400 to-lime-500 text-black font-semibold rounded-xl hover:from-lime-300 hover:to-lime-400 transition-all duration-300 flex items-center gap-2"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => window.location.href = '/master-cv-onboarding'}
        >
          <Plus size={18} />
          Create Master CV
        </motion.button>
      </motion.div>
    );
  }

  if (!masterCV) {
    return (
      <motion.div
        className="bg-gradient-to-br from-gray-400/10 to-slate-400/10 border-2 border-dashed border-gray-400/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="w-20 h-20 bg-gradient-to-br from-gray-400/20 to-slate-400/20 rounded-full flex items-center justify-center mb-6">
          <Crown className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-white mb-3">No Master CV</h3>
        <p className="text-white/60 mb-6">Create a master CV to get started</p>
        <motion.button
          className="px-6 py-3 bg-gradient-to-r from-lime-400 to-lime-500 text-black font-semibold rounded-xl hover:from-lime-300 hover:to-lime-400 transition-all duration-300 flex items-center gap-2"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => window.location.href = '/master-cv-onboarding'}
        >
          <Plus size={18} />
          Create Master CV
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="bg-gradient-to-br from-lime-400/10 to-blue-400/10 border-2 border-dashed border-lime-400/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-lime-400/50 hover:from-lime-400/15 hover:to-blue-400/15 transition-all duration-300 group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      whileHover={{ y: -5, scale: 1.02 }}
    >
      <div className="w-20 h-20 bg-gradient-to-br from-lime-400/20 to-lime-500/20 rounded-full flex items-center justify-center mb-6 group-hover:from-lime-400/30 group-hover:to-lime-500/30 transition-all duration-300">
        <Crown size={32} className="text-lime-400" />
      </div>
      
      <h3 className="text-lg font-bold text-white mb-3">Master CV</h3>
      <p className="text-white/60 mb-4 max-w-sm">
        Your primary CV template - edit directly or duplicate for job-specific applications.
      </p>

      {/* Master CV Info */}
      <div className="bg-white/10 rounded-lg p-4 mb-6 w-full">
        <div className="flex items-center gap-2 mb-2">
          <Crown className="w-4 h-4 text-lime-400" />
          <h4 className="font-semibold text-white text-sm">{masterCV.title}</h4>
        </div>
        <div className="text-xs text-white/60">
          <p>Last modified: {formatDate(masterCV.lastModified)}</p>
          <p>Status: <span className="capitalize">{masterCV.status}</span></p>
        </div>
      </div>
      
      <div className="flex items-center gap-4 text-white/40 text-sm mb-6">
        <div className="flex items-center gap-2">
          <CheckCircle size={16} className="text-lime-400" />
          <span>Edit Master</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle size={16} className="text-lime-400" />
          <span>Duplicate CV</span>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <motion.button
          className="px-4 py-2 bg-gradient-to-r from-lime-400 to-lime-500 text-black font-semibold rounded-xl hover:from-lime-300 hover:to-lime-400 transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={{ scale: actionLoading === 'edit' ? 1 : 1.05 }}
          whileTap={{ scale: actionLoading === 'edit' ? 1 : 0.95 }}
          onClick={handleEdit}
          disabled={actionLoading === 'edit'}
        >
          {actionLoading === 'edit' ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Edit3 size={16} />
          )}
          Edit
        </motion.button>
        
        <motion.button
          className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={{ scale: actionLoading === 'duplicate' ? 1 : 1.05 }}
          whileTap={{ scale: actionLoading === 'duplicate' ? 1 : 0.95 }}
          onClick={handleDuplicate}
          disabled={actionLoading === 'duplicate'}
        >
          {actionLoading === 'duplicate' ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Copy size={16} />
          )}
          Duplicate
        </motion.button>
      </div>
    </motion.div>
  );
};

export default MasterCVCard;
