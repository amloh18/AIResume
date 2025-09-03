'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ATSScoreGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const ATSScoreGauge: React.FC<ATSScoreGaugeProps> = ({
  score,
  size = 'md',
  showLabel = true,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-28 h-28',
    lg: 'w-32 h-32'
  };

  const strokeWidth = {
    sm: 6,
    md: 8,
    lg: 10
  };

  const radius = {
    sm: 35,
    md: 50,
    lg: 60
  };

  const circumference = 2 * Math.PI * radius[size];
  const progress = (score / 100) * circumference;
  const remaining = circumference - progress;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-lime-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-lime-100';
    if (score >= 60) return 'bg-yellow-100';
    if (score >= 40) return 'bg-orange-100';
    return 'bg-red-100';
  };

  const getScoreStrokeColor = (score: number) => {
    if (score >= 80) return 'stroke-lime-600';
    if (score >= 60) return 'stroke-yellow-600';
    if (score >= 40) return 'stroke-orange-600';
    return 'stroke-red-600';
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={`relative ${sizeClasses[size]}`}>
        {/* Background circle */}
        <svg
          className="w-full h-full transform -rotate-90"
          viewBox={`0 0 ${radius[size] * 2 + strokeWidth[size]} ${radius[size] * 2 + strokeWidth[size]}`}
        >
          <circle
            cx={radius[size] + strokeWidth[size] / 2}
            cy={radius[size] + strokeWidth[size] / 2}
            r={radius[size]}
            stroke="currentColor"
            strokeWidth={strokeWidth[size]}
            fill="none"
            className="text-gray-200 dark:text-gray-700"
          />
          
          {/* Progress circle */}
          <motion.circle
            cx={radius[size] + strokeWidth[size] / 2}
            cy={radius[size] + strokeWidth[size] / 2}
            r={radius[size]}
            stroke="currentColor"
            strokeWidth={strokeWidth[size]}
            fill="none"
            strokeLinecap="round"
            className={getScoreStrokeColor(score)}
            initial={{ strokeDasharray: 0, strokeDashoffset: circumference }}
            animate={{ 
              strokeDasharray: `${progress} ${remaining}`,
              strokeDashoffset: 0
            }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        
        {/* Score text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <motion.div
              className={`font-bold ${getScoreColor(score)}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {score}%
            </motion.div>
          </div>
        </div>
      </div>
      
      {showLabel && (
        <div className="mt-2 text-center">
          <div className={`text-xs font-medium px-2 py-1 rounded-full ${getScoreBgColor(score)} ${getScoreColor(score)}`}>
            ATS Score
          </div>
        </div>
      )}
    </div>
  );
};

export default ATSScoreGauge;
