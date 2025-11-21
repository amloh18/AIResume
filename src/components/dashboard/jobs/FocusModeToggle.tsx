'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useFocusMode } from '@/lib/hooks/useFocusMode';

interface FocusModeToggleProps {
  className?: string;
}

const FocusModeToggle: React.FC<FocusModeToggleProps> = ({ className }) => {
  const { isFocusMode, toggleFocusMode } = useFocusMode();

  return (
    <motion.button
      onClick={toggleFocusMode}
      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all duration-200 flex items-center gap-2 flex-shrink-0 h-[36px] ${
        isFocusMode
          ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-500 text-blue-900 dark:text-blue-100'
          : 'bg-gray-100 dark:bg-[#232f1c] border-gray-300 dark:border-lime-500/20 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-[#2a3a1f]'
      } ${className || ''}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      title={isFocusMode ? 'Exit Focus Mode (Shift+F)' : 'Enter Focus Mode (Shift+F)'}
    >
      {isFocusMode ? (
        <>
          <EyeOff size={16} className="flex-shrink-0" />
          <span>Focus Mode</span>
        </>
      ) : (
        <>
          <Eye size={16} className="flex-shrink-0" />
          <span>Focus Mode</span>
        </>
      )}
    </motion.button>
  );
};

export default FocusModeToggle;

