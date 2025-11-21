'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Copy, Plus, Star, ArrowRight, CheckCircle } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface CV {
  id: string;
  title: string;
  status: string;
  isMaster: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CVSelectionStepProps {
  jobTitle?: string;
  company?: string;
  jobId?: string;
  onCVSelected: (cvId: string, action: 'existing' | 'duplicate' | 'new') => void;
  onBack: () => void;
}

const CVSelectionStep: React.FC<CVSelectionStepProps> = ({
  jobTitle,
  company,
  jobId,
  onCVSelected,
  onBack
}) => {
  const { data: session, status } = useSession();
  const [cvs, setCvs] = useState<CV[]>([]);
  const [masterCV, setMasterCV] = useState<CV | null>(null);
  const [loading, setLoading] = useState(true);
  const [duplicating, setDuplicating] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string>('');

  useEffect(() => {
    if (session?.user?.id) {
      fetchCVs();
      fetchMasterCV();
    }
  }, [session?.user?.id]);

  const fetchCVs = async () => {
    try {
      const response = await fetch(`/api/cvs?userId=${session?.user?.id}&type=cv&projection=list`);
      const result = await response.json();
      
      if (result.success) {
        setCvs(result.data.cvs);
      }
    } catch (error) {
      console.error('Error fetching CVs:', error);
    }
  };

  const fetchMasterCV = async () => {
    try {
      const response = await fetch(`/api/cvs/master?userId=${session?.user?.id}`);
      const result = await response.json();
      
      if (result.success && result.data.masterCV) {
        setMasterCV(result.data.masterCV);
      }
    } catch (error) {
      console.error('Error fetching master CV:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateMasterCV = async () => {
    if (!masterCV) return;
    
    setDuplicating(true);
    try {
      // Create a proper title with job title prefix
      const duplicatedTitle = jobTitle && company 
        ? `${jobTitle} - ${company} CV`
        : `${masterCV.title} (Copy)`;

      const response = await fetch('/api/cvs/duplicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceCvId: masterCV.id,
          userId: session?.user?.id,
          jobId,
          journeyId: null, // Create freestanding CV, not linked to journey yet
          customTitle: duplicatedTitle // Pass the custom title directly
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        onCVSelected(result.cvId, 'duplicate');
      } else {
        console.error('Error duplicating master CV:', result.message);
      }
    } catch (error) {
      console.error('Error duplicating master CV:', error);
    } finally {
      setDuplicating(false);
    }
  };

  const handleCreateNew = () => {
    onCVSelected('', 'new');
  };

  const handleSelectExisting = (cvId: string) => {
    onCVSelected(cvId, 'existing');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white">Loading CVs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Attach a CV</h2>
        <p className="text-white/60">
          Choose how you'd like to create or attach a CV for{' '}
          {jobTitle && company ? (
            <span className="text-lime-400 font-medium">{jobTitle} at {company}</span>
          ) : (
            'this job'
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 tablet:grid-cols-3 gap-6">
        {/* Option 1: Duplicate Master CV (if available) */}
        {masterCV && (
          <motion.div
            className={`relative bg-gradient-to-br from-lime-500/10 to-lime-600/10 border-2 rounded-xl p-6 cursor-pointer transition-all ${
              selectedOption === 'duplicate' 
                ? 'border-lime-400 shadow-lg shadow-lime-400/20' 
                : 'border-lime-500/30 hover:border-lime-400/50'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedOption('duplicate')}
          >
            {/* Recommended Badge */}
            <div className="absolute -top-2 -right-2 bg-lime-400 text-black text-xs font-bold px-2 py-1 rounded-full">
              RECOMMENDED
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-lime-400/20 rounded-lg flex items-center justify-center">
                <Star className="h-6 w-6 text-lime-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Duplicate Master CV</h3>
                <p className="text-lime-400/80 text-sm">Use your comprehensive CV as base</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="text-sm text-white/80">
                <strong>Master CV:</strong> {masterCV.title}
              </div>
              <div className="text-xs text-white/60">
                Last updated: {new Date(masterCV.updatedAt).toLocaleDateString()}
              </div>
              <div className="text-xs text-lime-400">
                Will be renamed to: {jobTitle && company ? `${jobTitle}-${company}-CV` : `${masterCV.title} (Copy)`}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-white/60">
                <Copy className="h-4 w-4" />
                <span>Duplicate & Customize</span>
              </div>
              {selectedOption === 'duplicate' && (
                <CheckCircle className="h-5 w-5 text-lime-400" />
              )}
            </div>
          </motion.div>
        )}

        {/* Option 2: Create New CV */}
        <motion.div
          className={`bg-white/5 border-2 rounded-xl p-6 cursor-pointer transition-all ${
            selectedOption === 'new' 
              ? 'border-blue-400 shadow-lg shadow-blue-400/20' 
              : 'border-white/20 hover:border-blue-400/50'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setSelectedOption('new')}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-400/20 rounded-lg flex items-center justify-center">
              <Plus className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Create New CV</h3>
              <p className="text-blue-400/80 text-sm">Start from scratch</p>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="text-sm text-white/80">
              Build a completely new CV tailored for this specific role
            </div>
            <div className="text-xs text-white/60">
              Full customization and control
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-white/60">
              <FileText className="h-4 w-4" />
              <span>Fresh Start</span>
            </div>
            {selectedOption === 'new' && (
              <CheckCircle className="h-5 w-5 text-blue-400" />
            )}
          </div>
        </motion.div>

        {/* Option 3: Use Existing CV */}
        <motion.div
          className={`bg-white/5 border-2 rounded-xl p-6 cursor-pointer transition-all ${
            selectedOption === 'existing' 
              ? 'border-purple-400 shadow-lg shadow-purple-400/20' 
              : 'border-white/20 hover:border-purple-400/50'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setSelectedOption('existing')}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-400/20 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Use Existing CV</h3>
              <p className="text-purple-400/80 text-sm">Select from your CVs</p>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="text-sm text-white/80">
              {cvs.length > 0 
                ? `Choose from ${cvs.length} existing CV${cvs.length > 1 ? 's' : ''}`
                : 'No existing CVs found'
              }
            </div>
            <div className="text-xs text-white/60">
              Link an existing CV to this job
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-white/60">
              <Copy className="h-4 w-4" />
              <span>Select Existing</span>
            </div>
            {selectedOption === 'existing' && (
              <CheckCircle className="h-5 w-5 text-purple-400" />
            )}
          </div>
        </motion.div>
      </div>

      {/* Existing CVs List (shown when "existing" is selected) */}
      {selectedOption === 'existing' && cvs.length > 0 && (
        <motion.div
          className="bg-white/5 border border-white/20 rounded-xl p-6"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <h3 className="text-lg font-semibold text-white mb-4">Select a CV</h3>
          <div className="space-y-3">
            {cvs.map((cv) => (
              <motion.div
                key={cv.id}
                className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg hover:border-purple-400/50 cursor-pointer transition-colors"
                whileHover={{ scale: 1.01 }}
                onClick={() => handleSelectExisting(cv.id)}
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-purple-400" />
                  <div>
                    <div className="text-white font-medium">{cv.title}</div>
                    <div className="text-xs text-white/60">
                      {cv.status} • Updated {new Date(cv.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  {cv.isMaster && (
                    <div className="bg-lime-400/20 text-lime-400 text-xs px-2 py-1 rounded-full">
                      Master
                    </div>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-white/40" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-white/10">
        <motion.button
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Back
        </motion.button>

        <motion.button
          onClick={() => {
            if (selectedOption === 'duplicate') {
              handleDuplicateMasterCV();
            } else if (selectedOption === 'new') {
              handleCreateNew();
            }
            // For existing, selection happens in the list
          }}
          disabled={!selectedOption || duplicating || (selectedOption === 'existing' && cvs.length === 0)}
          className="flex items-center gap-2 px-6 py-3 bg-lime-500 hover:bg-lime-600 text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {duplicating ? (
            <>
              <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              Duplicating...
            </>
          ) : selectedOption === 'duplicate' ? (
            <>
              Duplicate Master CV
              <Copy className="h-4 w-4" />
            </>
          ) : selectedOption === 'new' ? (
            <>
              Create New CV
              <Plus className="h-4 w-4" />
            </>
          ) : selectedOption === 'existing' ? (
            'Select a CV above'
          ) : (
            'Choose an option'
          )}
        </motion.button>
      </div>
    </div>
  );
};

export default CVSelectionStep;
