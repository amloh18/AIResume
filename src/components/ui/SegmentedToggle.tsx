'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface SegmentedToggleOption {
    value: string;
    label: string;
    icon?: React.ElementType;
}

interface SegmentedToggleProps {
    options: SegmentedToggleOption[];
    value: string;
    onChange: (value: string) => void;
    className?: string;
    theme?: 'default' | 'purple' | 'blue' | 'green' | 'lime';
    size?: 'sm' | 'md';
}

const SegmentedToggle: React.FC<SegmentedToggleProps> = ({
    options,
    value,
    onChange,
    className = '',
    theme = 'default',
    size = 'sm'
}) => {
    const getThemeColors = () => {
        switch (theme) {
            case 'purple':
                return {
                    activeBg: 'bg-purple-100 dark:bg-purple-900/40',
                    activeText: 'text-purple-600 dark:text-purple-300',
                    indicator: 'bg-white dark:bg-gray-800'
                };
            case 'blue':
                return {
                    activeBg: 'bg-blue-100 dark:bg-blue-900/40',
                    activeText: 'text-blue-600 dark:text-blue-300',
                    indicator: 'bg-white dark:bg-gray-800'
                };
            case 'green':
                return {
                    activeBg: 'bg-green-100 dark:bg-green-900/40',
                    activeText: 'text-green-600 dark:text-green-300',
                    indicator: 'bg-white dark:bg-gray-800'
                };
            case 'lime':
                return {
                    activeBg: 'bg-lime-100 dark:bg-lime-900/40',
                    activeText: 'text-lime-700 dark:text-lime-300',
                    indicator: 'bg-white dark:bg-gray-800'
                };
            default:
                return {
                    activeBg: 'bg-gray-100 dark:bg-gray-700',
                    activeText: 'text-gray-900 dark:text-white',
                    indicator: 'bg-white dark:bg-gray-600'
                };
        }
    };

    const colors = getThemeColors();
    const sizeClasses = size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm';
    const containerPadding = size === 'sm' ? 'p-1' : 'p-1.5';

    return (
        <div className={`flex bg-gray-100 dark:bg-white/5 rounded-full ${containerPadding} relative ${className}`}>
            {options.map((option) => {
                const isActive = value === option.value;
                return (
                    <button
                        key={option.value}
                        onClick={() => onChange(option.value)}
                        className={`
              relative flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors z-10
              ${sizeClasses}
              ${isActive ? colors.activeText : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}
            `}
                    >
                        {isActive && (
                            <motion.div
                                layoutId={`segmented-indicator-${theme}`}
                                className={`absolute inset-0 rounded-full shadow-sm ${colors.indicator}`}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                style={{ zIndex: -1 }}
                            />
                        )}
                        {option.icon && <option.icon size={size === 'sm' ? 12 : 14} />}
                        <span>{option.label}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default SegmentedToggle;
