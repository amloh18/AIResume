'use client';

import React from 'react';

interface RegionSelectorProps {
  value: 'UK' | 'India';
  onChange: (region: 'UK' | 'India') => void;
  disabled?: boolean;
}

export function RegionSelector({ value, onChange, disabled }: RegionSelectorProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#313a28] rounded-lg p-1">
      <button
        type="button"
        onClick={() => onChange('UK')}
        disabled={disabled}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
          value === 'UK'
            ? 'bg-white dark:bg-[#141810] text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title="United Kingdom"
      >
        🇬🇧 UK
      </button>
      <button
        type="button"
        onClick={() => onChange('India')}
        disabled={disabled}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
          value === 'India'
            ? 'bg-white dark:bg-[#141810] text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title="India"
      >
        🇮🇳 India
      </button>
    </div>
  );
}

export default RegionSelector;
