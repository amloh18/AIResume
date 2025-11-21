'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Loader2, Lightbulb, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

interface InterviewQuestion {
  question: string;
  category: 'technical' | 'behavioral' | 'situational' | 'company-specific';
  suggestedPoints: string[];
  whyAsked: string;
}

interface InterviewPrepSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle: string;
  company: string;
}

const InterviewPrepSidebar: React.FC<InterviewPrepSidebarProps> = ({
  isOpen,
  onClose,
  jobId,
  jobTitle,
  company
}) => {
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const sidebarWidth = 480;

  useEffect(() => {
    if (isOpen && jobId) {
      generateQuestions();
    }
  }, [isOpen, jobId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const generateQuestions = async () => {
    setIsGenerating(true);
    setQuestions([]);
    setExpandedQuestion(null);

    try {
      const response = await fetch('/api/ai/interview-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate questions');
      }

      const result = await response.json();
      if (result.success && result.data.questions) {
        setQuestions(result.data.questions);
        toast.success('Interview questions generated!');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error generating interview questions:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate interview questions');
    } finally {
      setIsGenerating(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'technical':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'behavioral':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'situational':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
      case 'company-specific':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed bg-black/50 backdrop-blur-sm z-40"
            style={{
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh'
            }}
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.div
            ref={sidebarRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-screen bg-white dark:bg-[#141810] shadow-2xl z-50 flex flex-col"
            style={{ width: sidebarWidth }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] sticky top-0 z-10">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <MessageSquare className="w-5 h-5 text-orange-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    Interview Prep
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {jobTitle} at {company}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Generate Button */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    AI-Generated Questions
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Tailored for this position
                  </p>
                </div>
                <motion.button
                  onClick={generateQuestions}
                  disabled={isGenerating}
                  className="px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate
                    </>
                  )}
                </motion.button>
              </div>

              {/* Loading State */}
              {isGenerating && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-4" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Generating tailored interview questions...
                  </p>
                </div>
              )}

              {/* Questions List */}
              {!isGenerating && questions.length > 0 && (
                <div className="space-y-3">
                  {questions.map((q, index) => {
                    const isExpanded = expandedQuestion === index;

                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="border border-gray-200 dark:border-white/10 rounded-lg p-4 bg-white dark:bg-[#1a2015] hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(q.category)}`}>
                                {q.category}
                              </span>
                            </div>
                            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                              {q.question}
                            </h4>
                            
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-3 space-y-3"
                              >
                                {/* Suggested Talking Points */}
                                {q.suggestedPoints && q.suggestedPoints.length > 0 && (
                                  <div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                      Suggested talking points:
                                    </p>
                                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                      {q.suggestedPoints.map((point, i) => (
                                        <li key={i}>{point}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Why Asked */}
                                {q.whyAsked && (
                                  <div className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                    <Lightbulb className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                                        Why this question is asked:
                                      </p>
                                      <p className="text-xs text-yellow-700 dark:text-yellow-400">
                                        {q.whyAsked}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </div>
                        </div>
                        
                        {/* Expand/Collapse Button */}
                        <button
                          onClick={() => setExpandedQuestion(isExpanded ? null : index)}
                          className="mt-3 w-full flex items-center justify-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-4 h-4" />
                              Show less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4" />
                              Show tips
                            </>
                          )}
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Empty State */}
              {!isGenerating && questions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-4" />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Click "Generate" to create tailored interview questions
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default InterviewPrepSidebar;

