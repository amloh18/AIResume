'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  variant = 'rectangular', 
  width, 
  height, 
  animate = true 
}) => {
  const baseClasses = 'bg-gradient-to-r from-gray-200/80 to-gray-300/60 dark:from-gray-700/80 dark:to-gray-600/60 relative overflow-hidden';
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg'
  };

  const shimmerVariants = {
    initial: { x: '-100%' },
    animate: { 
      x: '100%',
      transition: {
        repeat: Infinity,
        duration: 1.5,
        ease: 'linear' as const
      }
    }
  } as const;

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    >
      {animate && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 dark:via-gray-400/20 to-transparent"
          variants={shimmerVariants}
          initial="initial"
          animate="animate"
        />
      )}
    </div>
  );
};

// Pre-built skeleton components for common use cases
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ 
  lines = 1, 
  className = '' 
}) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton 
        key={index}
        variant="text" 
        height={16}
        width={index === lines - 1 ? '75%' : '100%'}
        className="last:w-3/4"
      />
    ))}
  </div>
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-6 ${className}`}>
    <div className="flex items-center gap-4 mb-4">
      <Skeleton variant="circular" width={48} height={48} />
      <div className="flex-1">
        <Skeleton variant="text" height={20} width="60%" className="mb-2" />
        <Skeleton variant="text" height={14} width="40%" />
      </div>
    </div>
    <SkeletonText lines={3} />
  </div>
);

export const SkeletonTable: React.FC<{ 
  rows?: number; 
  columns?: number; 
  className?: string 
}> = ({ 
  rows = 5, 
  columns = 4, 
  className = '' 
}) => (
  <div className={`bg-black/20 border border-white/10 rounded-xl overflow-hidden ${className}`}>
    {/* Header */}
    <div className="border-b border-white/10 p-4">
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={`header-${index}`} variant="text" height={16} width="80%" />
        ))}
      </div>
    </div>
    
    {/* Rows */}
    <div className="divide-y divide-white/10">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="p-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton 
                key={`cell-${rowIndex}-${colIndex}`} 
                variant="text" 
                height={14} 
                width={colIndex === 0 ? '90%' : '70%'} 
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonChart: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-black/20 border border-white/10 rounded-xl p-6 ${className}`}>
    <div className="flex items-center justify-between mb-6">
      <div>
        <Skeleton variant="text" height={24} width={200} className="mb-2" />
        <Skeleton variant="text" height={14} width={120} />
      </div>
      <Skeleton variant="rounded" width={100} height={32} />
    </div>
    
    {/* Chart area */}
    <div className="h-64 flex items-end justify-between gap-2">
      {Array.from({ length: 12 }).map((_, index) => (
        <Skeleton 
          key={index}
          variant="rectangular" 
          width="100%" 
          height={`${Math.random() * 80 + 20}%`}
          className="rounded-t"
        />
      ))}
    </div>
  </div>
);

export const SkeletonStats: React.FC<{ items?: number; className?: string }> = ({ 
  items = 4, 
  className = '' 
}) => (
  <div className={`grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-4 gap-6 ${className}`}>
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="bg-black/20 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton variant="circular" width={40} height={40} />
          <Skeleton variant="text" height={12} width={60} />
        </div>
        <Skeleton variant="text" height={32} width="80%" className="mb-2" />
        <Skeleton variant="text" height={14} width="60%" />
      </div>
    ))}
  </div>
);

export default Skeleton;
