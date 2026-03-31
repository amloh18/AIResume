'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface AIGeneratingIndicatorProps {
  visible: boolean;
  text?: string;
}

export const AIGeneratingIndicator: React.FC<AIGeneratingIndicatorProps> = ({
  visible,
  text = 'Generating...',
}) => {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-center gap-2 py-1.5 px-3 text-sm text-lime-600 dark:text-lime-400"
    >
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-lime-500"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
      <span className="text-xs font-medium">{text}</span>
    </motion.div>
  );
};

export default AIGeneratingIndicator;
