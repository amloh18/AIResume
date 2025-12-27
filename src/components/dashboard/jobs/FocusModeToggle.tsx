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
    console.log('Focus mode button clicked, current state:', isFocusMode);
    toggleFocusMode();
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={false}
      className={`p-2 tablet:px-3 tablet:py-2 rounded-lg text-sm font-medium border transition-all duration-200 flex items-center gap-2 flex-shrink-0 h-[36px] cursor-pointer ${isFocusMode
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
          <span className="hidden tablet:inline">Focus Mode</span>
        </>
      ) : (
        <>
          <Eye size={16} className="flex-shrink-0" />
          <span className="hidden tablet:inline">Focus Mode</span>
        </>
      )}
    </motion.button>
  );
};

export default FocusModeToggle;

