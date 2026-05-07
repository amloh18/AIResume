import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { mapLinkedInProfileToCV } from '@/lib/services/linkedin-mapper';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

interface LinkedInProfileSyncProps {
  linkedInData: any;
  cvData: UnifiedCVDataStructure;
  onSync?: (cvData: UnifiedCVDataStructure) => void;
  onClose?: () => void;
}

export default function LinkedInProfileSync({
  linkedInData,
  cvData,
  onSync,
  onClose,
}: LinkedInProfileSyncProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [differences, setDifferences] = useState<Array<{ field: string; cv: string; linkedin: string }>>([]);

  useEffect(() => {
    if (linkedInData && cvData) {
      calculateDifferences();
    }
  }, [linkedInData, cvData]);

  const calculateDifferences = () => {
    const diffs: Array<{ field: string; cv: string; linkedin: string }> = [];

    // Compare basic info
    if (linkedInData.headline !== cvData.basics.label) {
      diffs.push({
        field: 'Headline',
        cv: cvData.basics.label || 'Not set',
        linkedin: linkedInData.headline || 'Not set',
      });
    }

    if (linkedInData.summary !== cvData.basics.summary) {
      diffs.push({
        field: 'Summary',
        cv: cvData.basics.summary?.substring(0, 100) + '...' || 'Not set',
        linkedin: linkedInData.summary?.substring(0, 100) + '...' || 'Not set',
      });
    }

    // Compare work experience count
    const cvWorkCount = cvData.work?.length || 0;
    const linkedinWorkCount = linkedInData.positions?.values?.length || 0;
    
    if (cvWorkCount !== linkedinWorkCount) {
      diffs.push({
        field: 'Work Experience Count',
        cv: `${cvWorkCount} position(s)`,
        linkedin: `${linkedinWorkCount} position(s)`,
      });
    }

    // Compare education count
    const cvEduCount = cvData.education?.length || 0;
    const linkedinEduCount = linkedInData.educations?.values?.length || 0;
    
    if (cvEduCount !== linkedinEduCount) {
      diffs.push({
        field: 'Education Count',
        cv: `${cvEduCount} education(s)`,
        linkedin: `${linkedinEduCount} education(s)`,
      });
    }

    setDifferences(diffs);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus('syncing');

    try {
      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Map LinkedIn data to CV structure
      const newCvData = mapLinkedInProfileToCV(linkedInData);

      // Call sync callback
      onSync?.(newCvData);

      setSyncStatus('success');
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-[#141810] rounded-xl border border-gray-200 dark:border-white/10 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#0a66c2]/10 rounded-lg flex items-center justify-center">
            <ExternalLink className="w-5 h-5 text-[#0a66c2]" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">LinkedIn Profile Sync</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Compare and sync your profiles</p>
          </div>
        </div>
        
        {syncStatus === 'success' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-1 text-green-600 text-sm"
          >
            <CheckCircle className="w-4 h-4" />
            Synced
          </motion.div>
        )}
      </div>

      {/* Differences Summary */}
      {differences.length > 0 ? (
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Differences Found ({differences.length})
          </p>
          <div className="space-y-2">
            {differences.map((diff, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-500/20 rounded-lg p-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    {diff.field}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">CV: </span>
                    <span className="text-gray-900 dark:text-white">{diff.cv}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">LinkedIn: </span>
                    <span className="text-gray-900 dark:text-white">{diff.linkedin}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-6 flex items-center gap-2 text-green-600 dark:text-green-400">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm">Your profiles are in sync!</span>
        </div>
      )}

      {/* Sync Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSync}
        disabled={isSyncing || differences.length === 0}
        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors ${
          differences.length === 0
            ? 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            : 'bg-[#0a66c2] hover:bg-[#004182] text-white'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
        {isSyncing ? 'Syncing...' : differences.length === 0 ? 'Up to Date' : 'Sync from LinkedIn'}
      </motion.button>

      {syncStatus === 'error' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 flex items-center gap-2 text-red-600 text-sm"
        >
          <AlertCircle className="w-4 h-4" />
          Failed to sync. Please try again.
        </motion.div>
      )}

      <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 text-center">
        This will overwrite your CV data with LinkedIn information
      </p>
    </motion.div>
  );
}
