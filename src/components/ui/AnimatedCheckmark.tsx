'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';

interface AnimatedCheckmarkProps {
  show: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

/**
 * AnimatedCheckmark - Shows an animated checkmark that blooms in and fades out
 * Safe for use in sidebar/header areas (doesn't affect CV preview/annotations)
 */
export const AnimatedCheckmark: React.FC<AnimatedCheckmarkProps> = ({
  show,
  size = 'md',
  color = '#013f2e',
  className = ''
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: [0, 1.2, 1], 
            opacity: [0, 1, 1] 
          }}
          exit={{ 
            scale: 0.8, 
            opacity: 0 
          }}
          transition={{ 
            duration: 0.4,
            times: [0, 0.6, 1],
            ease: "easeOut"
          }}
          className={`inline-flex items-center justify-center pointer-events-none ${className}`}
          style={{ color }}
        >
          <Check className={sizes[size]} strokeWidth={3} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * SaveIndicator - Auto-save indicator with checkmark bloom animation
 */
interface SaveIndicatorProps {
  status: 'idle' | 'saving' | 'success' | 'error';
  className?: string;
}

export const SaveIndicator: React.FC<SaveIndicatorProps> = ({
  status,
  className = ''
}) => {
  return (
    <div className={`flex items-center gap-1.5 text-small ${className}`}>
      <AnimatePresence mode="wait">
        {status === 'saving' && (
          <motion.div
            key="saving"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-gray-400"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full"
            />
            <span>Saving...</span>
          </motion.div>
        )}
        
        {status === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex items-center gap-1.5 text-[#013f2e]"
          >
            <AnimatedCheckmark show={true} size="sm" />
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Saved
            </motion.span>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-red-400"
          >
            <span>Failed to save</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnimatedCheckmark;

