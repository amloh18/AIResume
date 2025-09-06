'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';

interface ThemeToggleProps {
  variant?: 'default' | 'compact' | 'minimal';
  className?: string;
  showLabel?: boolean;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  variant = 'default', 
  className = '',
  showLabel = false 
}) => {
  const { theme, toggleTheme } = useTheme();

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
        className={`${variantClasses.button} ${theme === 'light' ? buttonClasses.light : buttonClasses.dark}`}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      >
        <Sun className={variantClasses.icon} />
      </button>
      <button 
        onClick={toggleTheme}
        className={`${variantClasses.button} ${theme === 'dark' ? buttonClasses.light : buttonClasses.dark}`}
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      >
        <Moon className={variantClasses.icon} />
      </button>
      {showLabel && (
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">
          {theme === 'dark' ? 'Dark' : 'Light'}
        </span>
      )}
    </div>
  );
};

export default ThemeToggle;
