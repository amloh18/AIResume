'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface LoadingAnimationProps {
  isVisible: boolean;
  onComplete?: () => void;
}

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({ isVisible, onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isVisible) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              onComplete?.();
            }, 500);
            return 100;
          }
          return prev + 2;
        });
      }, 50);

      return () => clearInterval(interval);
    }
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
      <div className="text-center">
        <motion.div
          className="text-6xl font-black font-sans mb-4"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* CV part - always neon */}
          <span className="text-lime-400 drop-shadow-[0_0_10px_rgba(132,204,22,0.8)]">CV</span>
          
          {/* CIRCLE part - fills progressively */}
          <span className="relative">
            <span className="text-gray-600">CIRCLE</span>
            <motion.span
              className="absolute inset-0 text-lime-400 drop-shadow-[0_0_10px_rgba(132,204,22,0.8)] overflow-hidden"
              style={{
                width: `${progress}%`,
                clipPath: `inset(0 ${100 - progress}% 0 0)`
              }}
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            >
              CIRCLE
            </motion.span>
          </span>
        </motion.div>
        
        {/* Progress bar */}
        <motion.div
          className="w-64 h-1 bg-gray-800 rounded-full overflow-hidden mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-lime-400 to-lime-500 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </motion.div>
        
        {/* Loading text */}
        <motion.p
          className="text-gray-400 mt-4 text-lg font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Loading...
        </motion.p>
      </div>
    </div>
  );
};

export default LoadingAnimation;
