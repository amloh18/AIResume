'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Target, AlertCircle } from 'lucide-react';
// Simple tooltip using CSS group hover

interface JobMatchScoreProps {
  matchScore?: number | null; // null for draft jobs
  jobTitle: string;
  hasJourney: boolean;
  onClick?: () => void;
  size?: 'small' | 'medium' | 'large';
}

const JobMatchScore: React.FC<JobMatchScoreProps> = ({
  matchScore,
  jobTitle,
  hasJourney,
  onClick,
  size = 'medium'
}) => {
  // Draft jobs or jobs without journeys don't have match scores
  if (!hasJourney || matchScore === null || matchScore === undefined) {
    return (
      <div className="relative group">
        <div
          className={`flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 ${
            onClick ? 'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700' : ''
          }`}
          onClick={onClick}
          title="Create CV Journey to see match score"
        >
          <AlertCircle className="w-3 h-3 text-gray-500" />
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            No journey
          </span>
        </div>
      </div>
    );
  }

  // Determine color based on score
  const getColorClasses = (score: number) => {
    if (score >= 85) {
      return {
        bg: 'bg-green-100 dark:bg-green-900/30',
        border: 'border-green-400 dark:border-green-500',
        text: 'text-green-700 dark:text-green-400',
        ring: 'ring-green-500/50'
      };
    } else if (score >= 70) {
      return {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        border: 'border-blue-400 dark:border-blue-500',
        text: 'text-blue-700 dark:text-blue-400',
        ring: 'ring-blue-500/50'
      };
    } else if (score >= 50) {
      return {
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        border: 'border-yellow-400 dark:border-yellow-500',
        text: 'text-yellow-700 dark:text-yellow-400',
        ring: 'ring-yellow-500/50'
      };
    } else {
      return {
        bg: 'bg-red-100 dark:bg-red-900/30',
        border: 'border-red-400 dark:border-red-500',
        text: 'text-red-700 dark:text-red-400',
        ring: 'ring-red-500/50'
      };
    }
  };

  const colors = getColorClasses(matchScore);
  const sizeClasses = {
    small: 'w-12 h-12 text-xs',
    medium: 'w-16 h-16 text-sm',
    large: 'w-20 h-20 text-base'
  };

  const tooltipText = `Match for ${jobTitle}: ${matchScore >= 85 ? 'Excellent match!' : matchScore >= 70 ? 'Good match' : matchScore >= 50 ? 'Moderate match' : 'Low match - consider tailoring CV'}`;

  return (
    <div className="relative group">
      <motion.div
        className={`relative ${sizeClasses[size]} rounded-full ${colors.bg} ${colors.border} border-2 flex items-center justify-center ${colors.text} font-bold ${
          onClick ? 'cursor-pointer hover:scale-105' : ''
        } transition-all`}
        onClick={onClick}
        whileHover={onClick ? { scale: 1.05 } : {}}
        whileTap={onClick ? { scale: 0.95 } : {}}
        title={tooltipText}
      >
        {/* Circular progress ring */}
        <svg
          className="absolute inset-0 transform -rotate-90"
          width={size === 'small' ? 48 : size === 'medium' ? 64 : 80}
          height={size === 'small' ? 48 : size === 'medium' ? 64 : 80}
        >
          <circle
            cx={size === 'small' ? 24 : size === 'medium' ? 32 : 40}
            cy={size === 'small' ? 24 : size === 'medium' ? 32 : 40}
            r={size === 'small' ? 20 : size === 'medium' ? 26 : 32}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray={`${2 * Math.PI * (size === 'small' ? 20 : size === 'medium' ? 26 : 32)}`}
            strokeDashoffset={`${2 * Math.PI * (size === 'small' ? 20 : size === 'medium' ? 26 : 32) * (1 - matchScore / 100)}`}
            className={colors.text}
            opacity="0.3"
          />
        </svg>
        
        {/* Score text */}
        <div className="relative z-10 flex flex-col items-center justify-center">
          <span>{Math.round(matchScore)}%</span>
          {size !== 'small' && (
            <Target className="w-3 h-3 mt-0.5" />
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default JobMatchScore;

