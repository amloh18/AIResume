'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedScoreProps {
  value: number;
  max?: number;
  suffix?: string;
  className?: string;
  showChange?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * AnimatedScore - Animates number changes with spring physics
 * Safe for use in sidebar/header areas (doesn't affect CV preview/annotations)
 */
export const AnimatedScore: React.FC<AnimatedScoreProps> = ({
  value,
  max = 100,
  suffix = '',
  className = '',
  showChange = true,
  size = 'md'
}) => {
  const prevValueRef = useRef(value);
  const [change, setChange] = useState<number>(0);
  const [showChangeIndicator, setShowChangeIndicator] = useState(false);

  const springValue = useSpring(value, {
    stiffness: 100,
    damping: 15,
    mass: 1
  });

  const displayValue = useTransform(springValue, (latest) => Math.round(latest));

  useEffect(() => {
    springValue.set(value);
    
    if (showChange && prevValueRef.current !== value) {
      const diff = value - prevValueRef.current;
      setChange(diff);
      setShowChangeIndicator(true);
      
      // Hide change indicator after 2 seconds
      const timer = setTimeout(() => setShowChangeIndicator(false), 2000);
      prevValueRef.current = value;
      
      return () => clearTimeout(timer);
    }
    prevValueRef.current = value;
  }, [value, springValue, showChange]);

  const sizes = {
    sm: 'text-h3',
    md: 'text-h2',
    lg: 'text-display'
  };

  return (
    <div className={`relative inline-flex items-baseline gap-1 ${className}`}>
      <motion.span 
        className={`font-bold tabular-nums ${sizes[size]}`}
        style={{
          color: value >= 70 ? '#80FF00' : value >= 50 ? '#f59e0b' : '#ef4444'
        }}
      >
        <motion.span>{displayValue}</motion.span>
      </motion.span>
      
      {suffix && (
        <span className="text-gray-400 text-small">{suffix}</span>
      )}
      
      {/* Change indicator - positioned to not interfere with other elements */}
      {showChangeIndicator && change !== 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.8 }}
          className={`absolute -right-8 top-0 text-small font-semibold pointer-events-none ${
            change > 0 ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {change > 0 ? '+' : ''}{change}
        </motion.div>
      )}
    </div>
  );
};

/**
 * AnimatedProgressBar - Progress bar with animated fill
 */
interface AnimatedProgressBarProps {
  value: number;
  max?: number;
  height?: number;
  showLabel?: boolean;
  className?: string;
  colorStops?: { threshold: number; color: string }[];
}

export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
  value,
  max = 100,
  height = 12,
  showLabel = false,
  className = '',
  colorStops = [
    { threshold: 0, color: '#ef4444' },
    { threshold: 50, color: '#f59e0b' },
    { threshold: 70, color: '#80FF00' }
  ]
}) => {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));
  
  // Get color based on value
  const getColor = () => {
    const sortedStops = [...colorStops].sort((a, b) => b.threshold - a.threshold);
    for (const stop of sortedStops) {
      if (percentage >= stop.threshold) {
        return stop.color;
      }
    }
    return colorStops[0]?.color || '#80FF00';
  };

  return (
    <div className={`relative ${className}`}>
      <div 
        className="w-full rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden"
        style={{ height }}
      >
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ 
            type: "spring",
            stiffness: 60,
            damping: 15,
            mass: 1
          }}
          style={{ 
            backgroundColor: getColor(),
            boxShadow: `0 0 10px ${getColor()}40`
          }}
        />
      </div>
      
      {showLabel && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center text-small font-semibold"
          style={{ 
            color: percentage >= 50 ? '#000' : '#fff',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
          }}
        >
          {Math.round(percentage)}%
        </motion.div>
      )}
    </div>
  );
};

export default AnimatedScore;

