'use client';

import React from 'react';
import { CheckCircle, AlertCircle, Target } from 'lucide-react';
import { ATSService } from '@/lib/services/atsService';

interface ATSScoreBadgeProps {
  score: number;
  showIcon?: boolean;
  showMessage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function ATSScoreBadge({ 
  score, 
  showIcon = true, 
  showMessage = false, 
  size = 'md',
  className = '' 
}: ATSScoreBadgeProps) {
  const badgeProps = ATSService.getScoreBadgeProps(score);
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSize = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const getIcon = () => {
    if (!showIcon) return null;
    
    switch (badgeProps.icon) {
      case 'excellent':
        return <CheckCircle className={`${iconSize[size]} text-green-600`} />;
      case 'good':
        return <AlertCircle className={`${iconSize[size]} text-yellow-600`} />;
      case 'needs-improvement':
        return <AlertCircle className={`${iconSize[size]} text-red-600`} />;
      default:
        return <Target className={`${iconSize[size]} text-gray-600`} />;
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`flex items-center space-x-2 ${sizeClasses[size]} rounded-full font-medium ${badgeProps.color}`}>
        {getIcon()}
        <span>{score}%</span>
      </div>
      {showMessage && (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {badgeProps.message}
        </span>
      )}
    </div>
  );
}

// Compact version for small spaces
export function ATSScoreBadgeCompact({ score, className = '' }: { score: number; className?: string }) {
  const badgeProps = ATSService.getScoreBadgeProps(score);
  
  return (
    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badgeProps.color} ${className}`}>
      {score}%
    </div>
  );
}

// Progress bar version
export function ATSScoreProgress({ score, className = '' }: { score: number; className?: string }) {
  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">ATS Score</span>
        <span className="text-sm text-gray-600 dark:text-gray-400">{score}%</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-lime-500 to-green-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
