'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Info,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';

interface ImprovedPanelProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  collapsible?: boolean;
  status?: 'default' | 'success' | 'warning' | 'error' | 'info';
  completion?: number; // 0-100
  tooltip?: string;
  className?: string;
}

const ImprovedPanel: React.FC<ImprovedPanelProps> = ({
  title,
  description,
  icon,
  children,
  defaultExpanded = true,
  collapsible = true,
  status = 'default',
  completion = 0,
  tooltip,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const { theme } = useTheme();

  const getStatusColors = () => {
    switch (status) {
      case 'success':
        return {
          border: 'border-green-200 dark:border-green-700',
          bg: 'bg-green-50 dark:bg-green-900/10',
          text: 'text-green-700 dark:text-green-300',
          icon: 'text-green-500'
        };
      case 'warning':
        return {
          border: 'border-yellow-200 dark:border-yellow-700',
          bg: 'bg-yellow-50 dark:bg-yellow-900/10',
          text: 'text-yellow-700 dark:text-yellow-300',
          icon: 'text-yellow-500'
        };
      case 'error':
        return {
          border: 'border-red-200 dark:border-red-700',
          bg: 'bg-red-50 dark:bg-red-900/10',
          text: 'text-red-700 dark:text-red-300',
          icon: 'text-red-500'
        };
      case 'info':
        return {
          border: 'border-blue-200 dark:border-blue-700',
          bg: 'bg-blue-50 dark:bg-blue-900/10',
          text: 'text-blue-700 dark:text-blue-300',
          icon: 'text-blue-500'
        };
      default:
        return {
          border: 'border-gray-200 dark:border-gray-700',
          bg: 'bg-white dark:bg-gray-800',
          text: 'text-gray-700 dark:text-gray-300',
          icon: 'text-gray-500'
        };
    }
  };

  const colors = getStatusColors();

  return (
    <motion.div
      className={`rounded-lg border transition-all duration-200 ${colors.border} ${colors.bg} ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className={`p-4 ${collapsible ? 'cursor-pointer' : ''}`} onClick={() => collapsible && setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {icon && <div className={`${colors.icon}`}>{icon}</div>}
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className={`font-semibold text-sm ${colors.text}`}>{title}</h3>
                {tooltip && (
                  <div className="relative group">
                    <Info size={14} className="text-gray-400 hover:text-gray-600 cursor-help" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-900 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                      {tooltip}
                    </div>
                  </div>
                )}
              </div>
              {description && (
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {description}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Completion indicator */}
            {completion > 0 && (
              <div className="flex items-center space-x-1">
                <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${completion}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {completion}%
                </span>
              </div>
            )}
            
            {/* Status indicator */}
            {status !== 'default' && (
              <div className={`${colors.icon}`}>
                {status === 'success' && <CheckCircle size={16} />}
                {status === 'warning' && <AlertCircle size={16} />}
                {status === 'error' && <AlertCircle size={16} />}
                {status === 'info' && <Info size={16} />}
              </div>
            )}
            
            {/* Expand/collapse icon */}
            {collapsible && (
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight size={16} className="text-gray-400" />
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Enhanced Action Button Component
interface ActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  tooltip?: string;
  className?: string;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  onClick,
  icon,
  label,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  tooltip,
  className = ''
}) => {
  const { theme } = useTheme();

  const getVariantClasses = () => {
    const baseClasses = 'flex items-center space-x-2 font-medium transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    switch (variant) {
      case 'primary':
        return `${baseClasses} bg-lime-600 text-white hover:bg-lime-700 focus:ring-lime-500`;
      case 'secondary':
        return `${baseClasses} bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600`;
      case 'success':
        return `${baseClasses} bg-green-600 text-white hover:bg-green-700 focus:ring-green-500`;
      case 'warning':
        return `${baseClasses} bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500`;
      case 'danger':
        return `${baseClasses} bg-red-600 text-white hover:bg-red-700 focus:ring-red-500`;
      default:
        return baseClasses;
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-xs';
      case 'md':
        return 'px-4 py-2 text-sm';
      case 'lg':
        return 'px-6 py-3 text-base';
      default:
        return 'px-4 py-2 text-sm';
    }
  };

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className={`${getVariantClasses()} ${getSizeClasses()} ${className} ${
          disabled || loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'
        }`}
        title={tooltip}
      >
        {loading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
        ) : (
          icon
        )}
        <span>{label}</span>
      </button>
      
      {tooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-900 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          {tooltip}
        </div>
      )}
    </div>
  );
};

// Enhanced Form Field Component
interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  helpText?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  error,
  helpText,
  children,
  className = ''
}) => {
  const { theme } = useTheme();

  return (
    <div className={`space-y-2 ${className}`}>
      <label className={`block text-sm font-medium ${
        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
      }`}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {children}
      
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 flex items-center space-x-1">
          <AlertCircle size={14} />
          <span>{error}</span>
        </p>
      )}
      
      {helpText && !error && (
        <p className={`text-xs ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        }`}>
          {helpText}
        </p>
      )}
    </div>
  );
};

export default ImprovedPanel;
