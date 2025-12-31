'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, Lightbulb, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

interface InterviewQuestion {
  question: string;
  category: 'technical' | 'behavioral' | 'situational' | 'company-specific';
  suggestedPoints?: string[]; // Legacy
  keyPoints?: string[];      // New
  suggestedAnswer?: string;
  painPoints?: string[];
  improvementTips?: string[];
  whyAsked: string;
  starExample?: string;
}

interface InterviewCoachProps {
  jobId: string;
  jobTitle: string;
  company: string;
}

const InterviewCoach: React.FC<InterviewCoachProps> = ({
  jobId,
  jobTitle,
  company
}) => {
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  const generateQuestions = async () => {
    setIsGenerating(true);
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
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate interview questions';
      toast.error(errorMessage);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Interview Coach
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            AI-generated questions for {jobTitle} at {company}
          </p>
        </div>
        <Button
          onClick={generateQuestions}
          disabled={isGenerating}
          className="bg-purple-500 hover:bg-purple-600 text-white"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Questions
            </>
          )}
        </Button>
      </div>

      {questions.length > 0 && (
        <div className="space-y-3">
          {questions.map((q, index) => {
            const keyPoints = q.keyPoints || q.suggestedPoints || [];
            const isExpanded = expandedQuestion === index;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border rounded-lg p-4 bg-white dark:bg-gray-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
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
                        {keyPoints.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Suggested talking points:
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                              {keyPoints.map((point, i) => (
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
                        <div className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                          <Lightbulb className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-yellow-800 dark:text-yellow-300">
                            <strong>Why asked:</strong> {q.whyAsked}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                  <button
                    onClick={() => setExpandedQuestion(expandedQuestion === index ? null : index)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex-shrink-0 flex items-center gap-1"
                  >
                    {isExpanded ? (
                      <>
                        Show less <ChevronUp className="w-3 h-3" />
                      </>
                    ) : (
                      <>
                        Show tips <ChevronDown className="w-3 h-3" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InterviewCoach;

