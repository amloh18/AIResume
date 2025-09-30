'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface MinimalLoadingProps {
  className?: string;
}

const MinimalLoading: React.FC<MinimalLoadingProps> = ({ className = '' }) => {
  return (
    <motion.div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 dark:border-t-blue-400 rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
    </motion.div>
  );
};

export default MinimalLoading;
