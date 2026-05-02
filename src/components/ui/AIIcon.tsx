// @ts-nocheck
import React from 'react';
import { Brain, Sparkles, Wand2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface AIIconProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'sparkle' | 'wand';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  tooltip?: string;
}

const AIIcon: React.FC<AIIconProps> = ({
  size = 'md',
  variant = 'default',
  className = '',
  onClick,
  disabled = false,
  tooltip
}) => {
  const sizeClasses = {
    tablet: 'w-4 h-4',
    tablet: 'w-5 h-5',
    desktop: 'w-6 h-6'
  };

  const iconVariants = {
    default: Brain,
    sparkle: Sparkles,
    wand: Wand2
  };

  const Icon = iconVariants[variant];

  const baseClasses = `
    text-lime-400 hover:text-lime-300 transition-colors duration-200
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-110'}
    ${className}
  `;

  const iconElement = (
    <motion.div
      className={baseClasses}
      whileHover={!disabled ? { scale: 1.1 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      onClick={disabled ? undefined : onClick}
      title={tooltip}
    >
      <Icon className={sizeClasses[size]} />
    </motion.div>
  );

  if (tooltip && !disabled) {
    return (
      <div className="relative group">
        {iconElement}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
          {tooltip}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
        </div>
      </div>
    );
  }

  return iconElement;
};

export default AIIcon;
