'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

interface EnhancedLoadingAnimationProps {
  progress?: number;
  showProgressBar?: boolean;
  message?: string;
  theme?: 'light' | 'dark';
  variant?: 'route-transition' | 'app-loading' | 'minimal';
}

const EnhancedLoadingAnimation: React.FC<EnhancedLoadingAnimationProps> = ({
  progress = 0.5,
  showProgressBar = true,
  message = 'Loading...',
  theme = 'dark',
  variant = 'app-loading'
}) => {
  // Minimal variant for quick transitions
  if (variant === 'minimal') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <motion.div
          className="w-8 h-8 border-3 border-lime-200 dark:border-lime-800 border-t-lime-500 dark:border-t-lime-400 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  // Route transition variant
  if (variant === 'route-transition') {
    return (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-black dark:to-gray-900"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          className="text-center space-y-4"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <motion.div
            className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-lime-400 to-lime-500 flex items-center justify-center"
            animate={{ 
              rotate: [0, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              rotate: { duration: 2, repeat: Infinity, ease: "linear" },
              scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
            }}
          >
            <CheckCircle size={24} className="text-white" />
          </motion.div>
          <motion.p
            className="text-sm font-medium text-gray-600 dark:text-gray-300"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {message}
          </motion.p>
        </motion.div>
      </motion.div>
    );
  }

  // Full app loading variant
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-center space-y-8 p-8">
        {/* Logo Animation */}
        <motion.div
          className="relative"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <motion.div
            className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-lime-400 to-lime-500 flex items-center justify-center relative overflow-hidden"
            animate={{ 
              boxShadow: [
                "0 0 20px rgba(132, 204, 22, 0.3)",
                "0 0 40px rgba(132, 204, 22, 0.5)",
                "0 0 20px rgba(132, 204, 22, 0.3)"
              ]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Shimmer Effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ 
                duration: 1.5,
                repeat: Infinity,
                repeatDelay: 1,
                ease: "easeInOut"
              }}
            />
            
            <CheckCircle size={32} className="text-black relative z-10" />
          </motion.div>
        </motion.div>

        {/* Brand Text */}
        <motion.div
          className="space-y-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h1 className="text-3xl font-bold">
            <span className="text-lime-400">CV</span>
            <span className="text-white">CIRCLE</span>
          </h1>
          <p className="text-white/60 text-sm">Professional CV Builder</p>
        </motion.div>

        {/* Progress Bar */}
        {showProgressBar && (
          <motion.div
            className="w-64 mx-auto"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-lime-400 to-lime-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <motion.p
              className="text-white/60 text-xs mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {message}
            </motion.p>
          </motion.div>
        )}

        {/* Loading Dots */}
        <motion.div
          className="flex items-center justify-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-lime-400 rounded-full"
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{ 
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default EnhancedLoadingAnimation;