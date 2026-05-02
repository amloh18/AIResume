'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ScoreBreakdownProps {
  label: string;
  value: number;
  max: number;
  displayType?: 'fraction' | 'percentage';
  colorVariant?: 'green' | 'blue' | 'dynamic';
  className?: string;
  compact?: boolean;
}

/**
 * ScoreBreakdown - Unified component for displaying score factors with progress bars.
 * Based on the Step 5 (Review) design.
 */
export const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({
  label,
  value,
  max,
  displayType = 'fraction',
  colorVariant = 'green',
  className = '',
  compact = false,
}) => {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));

  const getBarColor = () => {
    if (colorVariant === 'dynamic') {
      if (percentage >= 80) return 'bg-emerald-500';
      if (percentage >= 60) return 'bg-yellow-500';
      return 'bg-red-500';
    }
    if (colorVariant === 'blue') return 'bg-blue-500';
    return 'bg-[#8bc34a]'; // Premium green from Step 5
  };

  const barColor = getBarColor();

  return (
    <div className={`flex items-center gap-3 sm:gap-4 ${className}`}>
      {/* Label */}
      <span 
        className={`font-medium text-gray-700 dark:text-gray-300 truncate ${
          compact ? 'text-[11px] w-20' : 'text-sm w-24'
        }`}
        title={label}
      >
        {label}
      </span>

      {/* Progress Bar Container */}
      <div className={`flex-1 ${compact ? 'h-1' : 'h-2'} bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden relative`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }} // Slight bounce
          className={`h-full rounded-full ${barColor} shadow-[0_0_8px_rgba(0,0,0,0.1)]`}
          style={{
            boxShadow: colorVariant === 'dynamic' ? `0 0 10px ${
              percentage >= 80 ? 'rgba(34,197,94,0.25)' : 
              percentage >= 60 ? 'rgba(234,179,8,0.3)' : 
              'rgba(239,68,68,0.3)'
            }` : undefined
          }}
        />
      </div>

      {/* Value Display */}
      <span 
        className={`font-bold tabular-nums text-right ${
          compact ? 'text-[10px] w-12' : 'text-sm w-16'
        } ${
          colorVariant === 'dynamic' 
            ? percentage >= 80 ? 'text-emerald-500 dark:text-emerald-400' : percentage >= 60 ? 'text-yellow-500' : 'text-red-500'
            : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        {displayType === 'fraction' ? (
          <>{value} <span className="opacity-40 font-medium">/ {max}</span></>
        ) : (
          `${Math.round(percentage)}%`
        )}
      </span>
    </div>
  );
};

export default ScoreBreakdown;
