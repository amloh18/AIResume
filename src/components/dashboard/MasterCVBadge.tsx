'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Star, Crown } from 'lucide-react';
import { CHIP_INLINE, CHIP_TONES, type ChipTone } from '@/components/ui/chip-styles';

interface MasterCVBadgeProps {
  variant?: 'default' | 'compact' | 'large';
  showIcon?: boolean;
  className?: string;
}

const MasterCVBadge: React.FC<MasterCVBadgeProps> = ({ 
  variant = 'default', 
  showIcon = true,
  className = '' 
}) => {
  const variants = {
    default: {
      container: 'bg-gradient-to-r from-lime-400 to-lime-500 text-black px-3 py-1 rounded-full text-small font-bold',
      icon: 'h-4 w-4',
      text: 'Master CV'
    },
    compact: {
      container: `${CHIP_INLINE} ${CHIP_TONES.green} font-medium`,
      icon: 'h-3 w-3',
      text: 'Master'
    },
    large: {
      container: 'bg-gradient-to-r from-lime-400 to-lime-500 text-black px-4 py-2 rounded-lg text-body font-bold shadow-lg',
      icon: 'h-5 w-5',
      text: 'Master CV'
    }
  };

  const config = variants[variant];

  return (
    <motion.div
      className={`flex items-center gap-2 ${config.container} ${className}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
    >
      {showIcon && (
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          {variant === 'large' ? (
            <Crown className={config.icon} />
          ) : (
            <Star className={config.icon} />
          )}
        </motion.div>
      )}
      <span>{config.text}</span>
    </motion.div>
  );
};

export default MasterCVBadge;