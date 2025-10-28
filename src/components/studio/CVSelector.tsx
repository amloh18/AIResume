'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface CV {
  id: string;
  title: string;
  lastModified: string;
  status: string;
  description?: string;
}

interface CVSelectorProps {
  selectedCVId: string | null;
  onCVSelect: (cvId: string | null) => void;
  userId: string;
}

const CVSelector: React.FC<CVSelectorProps> = ({ selectedCVId, onCVSelect, userId }) => {
  const { data: session } = useSession();
  const [cvs, setCvs] = useState<CV[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedCV, setSelectedCV] = useState<CV | null>(null);

  useEffect(() => {
    loadCVs();
  }, [userId]);

  useEffect(() => {
    if (selectedCVId && cvs.length > 0) {
      const cv = cvs.find(cv => cv.id === selectedCVId);
      setSelectedCV(cv || null);
    }
  }, [selectedCVId, cvs]);

  const loadCVs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/cvs?userId=${userId}`);
      const result = await response.json();
      
      if (result.success && result.data?.cvs) {
        setCvs(result.data.cvs);
      }
    } catch (error) {
      console.error('Error loading CVs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCVSelect = (cv: CV) => {
    setSelectedCV(cv);
    onCVSelect(cv.id);
    setIsOpen(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <div className="relative">
      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Select CV
        </label>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-3 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1a230f] text-left hover:border-gray-400 dark:hover:border-white/20 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <FileText className="h-5 w-5 text-gray-400" />
            <div>
              {selectedCV ? (
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{selectedCV.title}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Modified {formatDate(selectedCV.lastModified)}
                  </div>
                </div>
              ) : (
                <span className="text-gray-500 dark:text-gray-400">Choose a CV...</span>
              )}
            </div>
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>
      </div>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute z-10 w-full mt-1 bg-white dark:bg-[#1a230f] border border-gray-300 dark:border-white/10 rounded-lg shadow-lg max-h-60 overflow-y-auto scrollbar-hide"
        >
          {loading ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              Loading CVs...
            </div>
          ) : cvs.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              No CVs found. Create a CV first.
            </div>
          ) : (
            <div className="py-2">
              {cvs.map((cv) => (
                <button
                  key={cv.id}
                  onClick={() => handleCVSelect(cv)}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-[#313a28] transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div className="text-left">
                      <div className="font-medium text-gray-900 dark:text-white">{cv.title}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Modified {formatDate(cv.lastModified)}
                      </div>
                    </div>
                  </div>
                  {selectedCVId === cv.id && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default CVSelector;
