'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, Copy, Check } from 'lucide-react';

interface AICoverLetterGeneratorProps {
  onGenerate: (content: string) => void;
  cvData: any;
  jobData: any;
  disabled?: boolean;
}

const AICoverLetterGenerator: React.FC<AICoverLetterGeneratorProps> = ({
  onGenerate,
  cvData,
  jobData,
  disabled = false
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateCoverLetter = async () => {
    if (!cvData || !jobData) {
      alert('Please select both a CV and a job first.');
      return;
    }

    setIsGenerating(true);
    
    try {
      // Extract relevant information from CV and job
      // Handle both direct cvData and nested cvData.cvData structures
      const actualCVData = cvData.cvData || cvData;
      
      const cvInfo = {
        name: actualCVData.basics?.name || '',
        summary: actualCVData.basics?.summary || '',
        experience: actualCVData.work?.slice(0, 3) || [], // Top 3 experiences
        skills: actualCVData.skills?.slice(0, 5) || [] // Top 5 skills
      };

      const jobInfo = {
        title: jobData.title || jobData.jobTitle || '',
        company: jobData.company || '',
        description: jobData.description || jobData.jobDescription || '',
        requirements: jobData.requirements || []
      };

      // Call AI service to generate cover letter
      const response = await fetch('/api/ai/generate-cover-letter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cvInfo,
          jobInfo
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate cover letter');
      }

      const result = await response.json();
      
      if (result.success && result.content) {
        onGenerate(result.content);
      } else {
        throw new Error('No content generated');
      }
    } catch (error) {
      console.error('Error generating cover letter:', error);
      alert('Failed to generate cover letter. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            AI Cover Letter Generator
          </h3>
        </div>
        <motion.button
          onClick={generateCoverLetter}
          disabled={disabled || isGenerating}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center space-x-2 ${
            disabled || isGenerating
              ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
          }`}
          whileHover={!disabled && !isGenerating ? { scale: 1.05 } : {}}
          whileTap={!disabled && !isGenerating ? { scale: 0.95 } : {}}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>Generate Cover Letter</span>
            </>
          )}
        </motion.button>
      </div>
      
      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
        <p>✨ AI will analyze your CV and the job requirements to create a personalized cover letter.</p>
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Personalized content</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Job-specific</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span>Professional tone</span>
          </div>
        </div>
      </div>

      {disabled && (
        <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ Please select both a CV and a job to generate a cover letter.
          </p>
        </div>
      )}
    </div>
  );
};

export default AICoverLetterGenerator;
