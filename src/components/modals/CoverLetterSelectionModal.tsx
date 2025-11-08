'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Edit, ExternalLink, CheckCircle, Star, Calendar } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface CoverLetter {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  content?: string;
  wordCount?: number;
}

interface CoverLetterSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCoverLetter: (coverLetterId: string) => void;
  currentCoverLetterId?: string;
  userId: string;
}

const CoverLetterSelectionModal: React.FC<CoverLetterSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectCoverLetter,
  currentCoverLetterId,
  userId
}) => {
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoverLetterId, setSelectedCoverLetterId] = useState<string | null>(currentCoverLetterId || null);

  // Load user's cover letters
  useEffect(() => {
    if (isOpen && userId) {
      loadCoverLetters();
    }
  }, [isOpen, userId]);

  const loadCoverLetters = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/cover-letters?userId=${userId}`);
      if (response.ok) {
        const result = await response.json();
        const coverLetterList = result.data?.coverLetters || result.coverLetters || [];
        setCoverLetters(coverLetterList);
      } else {
        console.error('Failed to load cover letters');
      }
    } catch (error) {
      console.error('Error loading cover letters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCoverLetter = (coverLetterId: string) => {
    setSelectedCoverLetterId(coverLetterId);
  };

  const handleConfirmSelection = () => {
    if (selectedCoverLetterId) {
      onSelectCoverLetter(selectedCoverLetterId);
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
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-[#141810] rounded-xl shadow-2xl w-[90%] max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Select Cover Letter for Journey
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Choose which cover letter to link to this application journey
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
          <div className="p-6 flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-500"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {coverLetters.length === 0 ? (
                  <div className="text-center py-8">
                    <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No cover letters found</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                      Create a cover letter first to link it to this journey
                    </p>
                  </div>
                ) : (
                  coverLetters.map((coverLetter) => (
                    <motion.div
                      key={coverLetter.id}
                      onClick={() => handleSelectCoverLetter(coverLetter.id)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedCoverLetterId === coverLetter.id
                          ? 'border-lime-500 bg-lime-50 dark:bg-lime-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Mail className="h-4 w-4 text-gray-500" />
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {coverLetter.title}
                            </h3>
                            {currentCoverLetterId === coverLetter.id && (
                              <span className="px-2 py-1 text-xs bg-lime-100 dark:bg-lime-900/30 text-lime-800 dark:text-lime-300 rounded-full">
                                Current
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Updated {getRelativeTime(coverLetter.updatedAt)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              <span>{coverLetter.wordCount || 0} words</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {selectedCoverLetterId === coverLetter.id && (
                            <CheckCircle className="h-5 w-5 text-lime-500" />
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Navigate to edit this cover letter
                              window.open(`/studio?type=cover_letter&coverLetterId=${coverLetter.id}`, '_blank');
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            title="Edit Cover Letter"
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
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {selectedCoverLetterId ? (
                  <span>Selected: {coverLetters.find(cl => cl.id === selectedCoverLetterId)?.title}</span>
                ) : (
                  <span>No cover letter selected</span>
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
                  disabled={!selectedCoverLetterId}
                  className="px-4 py-2 text-sm bg-lime-600 text-white rounded-lg hover:bg-lime-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                >
                  Link Cover Letter
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CoverLetterSelectionModal;
