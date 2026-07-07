'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';

interface ThemeToggleProps {
  variant?: 'default' | 'compact' | 'minimal' | 'pill';
  className?: string;
  showLabel?: boolean;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'default',
  className = '',
  showLabel = false
}) => {
  const { resolvedTheme, toggleTheme } = useTheme();

  const getVariantClasses = () => {
    switch (variant) {
      case 'compact':
        return {
          container: 'flex items-center justify-center p-1 rounded-md',
          button: 'p-1.5 rounded-sm transition-colors duration-200',
          icon: 'h-4 w-4'
        };
      case 'minimal':
        return {
          container: 'flex items-center justify-center',
          button: 'p-1 rounded transition-colors duration-200',
          icon: 'h-4 w-4'
        };
      case 'pill':
        return {
          container: 'flex items-center justify-center p-1 rounded-full border border-gray-200 dark:border-white/20 bg-white dark:bg-white/10 shadow-md h-8 sm:h-9',
          button: 'p-1 sm:p-1.5 rounded-full transition-colors duration-200',
          icon: 'h-3.5 w-3.5 sm:h-4 sm:w-4'
        };
      default:
        return {
          container: 'flex items-center justify-center p-2 rounded-lg',
          button: 'p-2 rounded-md transition-colors duration-300',
          icon: 'h-5 w-5'
        };
    }
  };

  const variantClasses = getVariantClasses();

  const getThemeClasses = () => {
    if (variant === 'pill') {
      return {
        baseClasses: '',
        buttonClasses: {
          light: 'bg-gray-100 dark:bg-white/20 text-gray-900 dark:text-white shadow-sm',
          dark: 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
        }
      };
    }

    const baseClasses = 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600';
    const buttonClasses = {
      light: 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm dark:shadow-none',
      dark: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
    };

    return { baseClasses, buttonClasses };
  };

  const { baseClasses, buttonClasses } = getThemeClasses();

  return (
    <div className={`${variantClasses.container} ${baseClasses} ${className}`}>
      <button
        onClick={toggleTheme}
        className={`${variantClasses.button} ${resolvedTheme === 'light' ? buttonClasses.light : buttonClasses.dark}`}
        title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
        aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
      >
        <Sun className={variantClasses.icon} />
      </button>
      <button
        onClick={toggleTheme}
        className={`${variantClasses.button} ${resolvedTheme === 'dark' ? buttonClasses.light : buttonClasses.dark}`}
        title={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} theme`}
        aria-label={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} theme`}
      >
        <Moon className={variantClasses.icon} />
      </button>
      {showLabel && (
        <span className="ml-2 text-small text-gray-600 dark:text-gray-300">
          {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
        </span>
      )}
    </div>
  );
};

export default ThemeToggle;
