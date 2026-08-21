'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useFocusMode } from '@/lib/hooks/useFocusMode';

interface FocusModeToggleProps {
  className?: string;
  active?: boolean;
  onToggle?: () => void;
}

const FocusModeToggle: React.FC<FocusModeToggleProps> = ({ className, active, onToggle }) => {
  const { isFocusMode: hookIsFocusMode, toggleFocusMode: hookToggleFocusMode } = useFocusMode();

  // Use props if provided (controlled mode), otherwise use hook (uncontrolled mode)
  const isFocusMode = active !== undefined ? active : hookIsFocusMode;
  const toggleFocusMode = onToggle || hookToggleFocusMode;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFocusMode();
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      className={`h-[36px] flex items-center justify-center gap-2 px-3 sm:px-4 text-small font-medium rounded-xl border transition-all duration-200 flex-shrink-0 cursor-pointer ${isFocusMode
          ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-500 text-blue-900 dark:text-blue-100'
          : 'bg-white dark:bg-black/20 border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5'
        } ${className || ''}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      title={isFocusMode ? 'Exit Focus Mode (Shift+F)' : 'Enter Focus Mode (Shift+F)'}
    >
      {isFocusMode ? (
        <>
          <EyeOff size={16} className="flex-shrink-0" />
          <span className="hidden xs:inline">Focus Mode</span>
        </>
      ) : (
        <>
          <Eye size={16} className="flex-shrink-0" />
          <span className="hidden xs:inline">Focus Mode</span>
        </>
      )}
    </motion.button>
  );
};

export default FocusModeToggle;

