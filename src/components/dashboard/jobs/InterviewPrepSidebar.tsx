'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Loader2, Lightbulb, MessageSquare, ChevronDown, ChevronUp, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import type { TrackerSidebarActionPayload } from './trackerSidebarConfig';

interface InterviewQuestion {
  question: string;
  category: 'technical' | 'behavioral' | 'situational' | 'company-specific';
  suggestedPoints?: string[]; // Legacy field for backward compatibility
  suggestedAnswer?: string;
  keyPoints?: string[];
  painPoints?: string[];
  improvementTips?: string[];
  whyAsked: string;
  starExample?: string;
}

interface InterviewPrepSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle: string;
  company: string;
  actionContext?: TrackerSidebarActionPayload | null;
}

const InterviewPrepSidebar: React.FC<InterviewPrepSidebarProps> = ({
  isOpen,
  onClose,
  jobId,
  jobTitle,
  company,
  actionContext = null,
}) => {
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const sidebarWidth = 640;

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

  const handleDownloadPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Set font
      doc.setFont('helvetica');
      
      // Title
      doc.setFontSize(20);
      doc.setTextColor(50, 50, 50);
      doc.text('Interview Preparation Questions', 20, 20);
      
      // Job info
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`${jobTitle} at ${company}`, 20, 30);
      
      let yPos = 45;
      const pageHeight = 280;
      const margin = 20;
      const lineHeight = 7;
      const spacing = 5;

      questions.forEach((q, index) => {
        // Check if we need a new page
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = 20;
        }

        // Question number and category
        doc.setFontSize(14);
        doc.setTextColor(50, 50, 50);
        doc.setFont('helvetica', 'bold');
        doc.text(`Question ${index + 1}: ${q.category}`, margin, yPos);
        yPos += lineHeight + 2;

        // Question text
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 30, 30);
        const questionLines = doc.splitTextToSize(q.question, 170);
        doc.text(questionLines, margin, yPos);
        yPos += questionLines.length * lineHeight + spacing;

        // Suggested Answer
        if (q.suggestedAnswer) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(50, 50, 50);
          doc.text('Suggested Answer:', margin, yPos);
          yPos += lineHeight;
          
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(40, 40, 40);
          const answerLines = doc.splitTextToSize(q.suggestedAnswer, 170);
          doc.text(answerLines, margin, yPos);
          yPos += answerLines.length * lineHeight + spacing;
        }

        // Key Points
        if (q.keyPoints && q.keyPoints.length > 0) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(50, 50, 50);
          doc.text('Key Points:', margin, yPos);
          yPos += lineHeight;
          
          doc.setFont('helvetica', 'normal');
          q.keyPoints.forEach((point) => {
            if (yPos > pageHeight - 20) {
              doc.addPage();
              yPos = 20;
            }
            const pointLines = doc.splitTextToSize(`• ${point}`, 170);
            doc.text(pointLines, margin + 5, yPos);
            yPos += pointLines.length * lineHeight;
          });
          yPos += spacing;
        }

        // Pain Points
        if (q.painPoints && q.painPoints.length > 0) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(150, 50, 50);
          doc.text('Potential Weaknesses:', margin, yPos);
          yPos += lineHeight;
          
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 50, 50);
          q.painPoints.forEach((point) => {
            if (yPos > pageHeight - 20) {
              doc.addPage();
              yPos = 20;
            }
            const pointLines = doc.splitTextToSize(`• ${point}`, 170);
            doc.text(pointLines, margin + 5, yPos);
            yPos += pointLines.length * lineHeight;
          });
          yPos += spacing;
        }

        // Improvement Tips
        if (q.improvementTips && q.improvementTips.length > 0) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(50, 100, 50);
          doc.text('How to Improve:', margin, yPos);
          yPos += lineHeight;
          
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(40, 80, 40);
          q.improvementTips.forEach((tip) => {
            if (yPos > pageHeight - 20) {
              doc.addPage();
              yPos = 20;
            }
            const tipLines = doc.splitTextToSize(`• ${tip}`, 170);
            doc.text(tipLines, margin + 5, yPos);
            yPos += tipLines.length * lineHeight;
          });
          yPos += spacing;
        }

        // Star Example
        if (q.starExample) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(100, 50, 150);
          doc.text('Star Example Answer:', margin, yPos);
          yPos += lineHeight;
          
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(80, 40, 120);
          const starLines = doc.splitTextToSize(q.starExample, 170);
          doc.text(starLines, margin, yPos);
          yPos += starLines.length * lineHeight + spacing;
        }

        // Why Asked
        if (q.whyAsked) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(120, 120, 120);
          const whyLines = doc.splitTextToSize(`Why asked: ${q.whyAsked}`, 170);
          doc.text(whyLines, margin, yPos);
          yPos += whyLines.length * lineHeight + spacing * 2;
        }

        // Add spacing between questions
        yPos += spacing;
      });

      // Save PDF
      const filename = `Interview-Prep-${jobTitle.replace(/[^a-z0-9]/gi, '-')}-${company.replace(/[^a-z0-9]/gi, '-')}.pdf`;
      doc.save(filename);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
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
            className="fixed bg-black/50 backdrop-blur-sm z-[9998]"
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
            className="fixed right-0 top-0 h-screen bg-white dark:bg-[#141810] shadow-2xl z-[9999] flex flex-col"
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
                  {actionContext && (
                    <p className="text-[11px] uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                      {actionContext.stage} stage context
                    </p>
                  )}
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
              {/* Generate Button and Download */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    AI-Generated Questions
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Tailored for this position
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {questions.length > 0 && (
                    <motion.button
                      onClick={handleDownloadPDF}
                      className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-all flex items-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Download className="w-4 h-4" />
                      Download PDF
                    </motion.button>
                  )}
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
                                className="mt-3 space-y-4"
                              >
                                {/* Suggested Answer */}
                                {q.suggestedAnswer && (
                                  <div>
                                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                                      <MessageSquare className="w-3 h-3" />
                                      Suggested Answer:
                                    </p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                      {q.suggestedAnswer}
                                    </p>
                                  </div>
                                )}

                                {/* Key Points */}
                                {(q.keyPoints || q.suggestedPoints) && (q.keyPoints || q.suggestedPoints)!.length > 0 && (
                                  <div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                      Key Points to Cover:
                                    </p>
                                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                      {(q.keyPoints || q.suggestedPoints)!.map((point, i) => (
                                        <li key={i}>{point}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Pain Points */}
                                {q.painPoints && q.painPoints.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                      ⚠️ Potential Weaknesses:
                                    </p>
                                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                      {q.painPoints.map((point, i) => (
                                        <li key={i}>{point}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Improvement Tips */}
                                {q.improvementTips && q.improvementTips.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                                      <Lightbulb className="w-3 h-3" />
                                      How to Improve:
                                    </p>
                                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                      {q.improvementTips.map((tip, i) => (
                                        <li key={i}>{tip}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Star Example */}
                                {q.starExample && (
                                  <div>
                                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                                      <Sparkles className="w-3 h-3" />
                                      Star Example Answer:
                                    </p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                      {q.starExample}
                                    </p>
                                  </div>
                                )}

                                {/* Why Asked */}
                                {q.whyAsked && (
                                  <div className="flex items-start gap-2">
                                    <Lightbulb className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Why this question is asked:
                                      </p>
                                      <p className="text-xs text-gray-600 dark:text-gray-400">
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
