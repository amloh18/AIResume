'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Edit, ExternalLink, CheckCircle, Star, Calendar } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface CV {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  isMaster?: boolean;
  metadata?: {
    isMaster?: boolean;
  };
}

interface CVSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCV: (cvId: string) => void;
  currentCVId?: string;
  userId: string;
}

const CVSelectionModal: React.FC<CVSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectCV,
  currentCVId,
  userId
}) => {
  const [cvs, setCvs] = useState<CV[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCVId, setSelectedCVId] = useState<string | null>(currentCVId || null);

  // Load user's CVs
  useEffect(() => {
    if (isOpen && userId) {
      loadCVs();
    }
  }, [isOpen, userId]);

  const loadCVs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/cvs?userId=${userId}`);
      if (response.ok) {
        const result = await response.json();
        const cvList = result.data?.cvs || result.cvs || [];
        setCvs(cvList);
      } else {
        console.error('Failed to load CVs');
      }
    } catch (error) {
      console.error('Error loading CVs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCV = (cvId: string) => {
    setSelectedCVId(cvId);
  };

  const handleConfirmSelection = () => {
    if (selectedCVId) {
      onSelectCV(selectedCVId);
      onClose();
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

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    
    return formatDate(dateString);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-[#141810] rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Select CV for Journey
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Choose which CV to link to this application journey
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-500"></div>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {cvs.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No CVs found</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                      Create a CV first to link it to this journey
                    </p>
                  </div>
                ) : (
                  cvs.map((cv) => (
                    <motion.div
                      key={cv.id}
                      onClick={() => handleSelectCV(cv.id)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedCVId === cv.id
                          ? 'border-lime-500 bg-lime-50 dark:bg-lime-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {cv.title}
                            </h3>
                            {cv.isMaster || cv.metadata?.isMaster ? (
                              <span className="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full">
                                Master
                              </span>
                            ) : null}
                            {currentCVId === cv.id && (
                              <span className="px-2 py-1 text-xs bg-lime-100 dark:bg-lime-900/30 text-lime-800 dark:text-lime-300 rounded-full">
                                Current
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Updated {getRelativeTime(cv.updatedAt)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              <span>Created {getRelativeTime(cv.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {selectedCVId === cv.id && (
                            <CheckCircle className="h-5 w-5 text-lime-500" />
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Navigate to edit this CV
                              window.open(`/studio?cvId=${cv.id}`, '_blank');
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            title="Edit CV"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {selectedCVId ? (
                  <span>Selected: {cvs.find(cv => cv.id === selectedCVId)?.title}</span>
                ) : (
                  <span>No CV selected</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSelection}
                  disabled={!selectedCVId}
                  className="px-4 py-2 text-sm bg-lime-600 text-white rounded-lg hover:bg-lime-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                >
                  Link CV
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CVSelectionModal;
