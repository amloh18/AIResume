'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface LoadingAnimationProps {
  progress?: number; // 0 to 1
  className?: string;
  showProgressBar?: boolean; // Optional: hide progress bar for minimal loading
}

const LoadingAnimation: React.FC<LoadingAnimationProps> = React.memo(({ 
  progress = 0, 
  className = '',
  showProgressBar = true
}) => {
  // Memoize the progress width calculation
  const progressWidth = useMemo(() => `${progress * 100}%`, [progress]);

  // Memoize the container class
  const containerClass = useMemo(() => 
    `flex items-center justify-center min-h-screen bg-black ${className}`, 
    [className]
  );

  return (
    <div className={containerClass}>
      <div className="text-center space-y-8">
        {/* Logo Container */}
        <motion.div
          className="text-6xl font-black font-sans mb-4 flex items-center justify-center"
          style={{ fontWeight: 900 }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* CV part - always neon */}
          <span className="text-lime-400 drop-shadow-[0_0_10px_rgba(132,204,22,0.8)]">
            CV
          </span>
          
          {/* CIRCLE part - progressive fill */}
          <span className="relative inline-block">
            {/* Grey base text */}
            <span className="text-gray-600">CIRCLE</span>
            
            {/* Neon overlay that fills progressively */}
            <motion.span
              className="absolute top-0 left-0 text-lime-400 drop-shadow-[0_0_10px_rgba(132,204,22,0.8)] overflow-hidden"
              style={{
                width: progressWidth,
              }}
              initial={{ width: 0 }}
              animate={{ width: progressWidth }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              CIRCLE
            </motion.span>
          </span>
        </motion.div>

        {/* Progress Bar - Only show if enabled */}
        {showProgressBar && (
          <motion.div
            className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden mx-auto"
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <motion.div
              className="h-full bg-gradient-to-r from-lime-400 to-lime-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: progressWidth }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
});

LoadingAnimation.displayName = 'LoadingAnimation';

export default LoadingAnimation;
