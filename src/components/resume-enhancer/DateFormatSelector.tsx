'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import { DATE_FORMAT_OPTIONS, type DateFormatStyle } from '@/lib/utils/textFormatting';

interface DateFormatSelectorProps {
    value: DateFormatStyle;
    onChange: (format: DateFormatStyle) => void;
    className?: string;
}

/**
 * Compact dropdown selector for date format preference
 * Used in Step5Review to let users choose how dates appear on their CV
 */
export default function DateFormatSelector({ value, onChange, className = '' }: DateFormatSelectorProps) {
    const options = Object.entries(DATE_FORMAT_OPTIONS) as [DateFormatStyle, { label: string; example: string }][];

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <Calendar className="w-4 h-4 text-[color:var(--text-secondary)]" />
            <select
                value={value}
                onChange={(e) => onChange(e.target.value as DateFormatStyle)}
                className="
          text-xs
          bg-[var(--bg-tertiary)]
          text-[color:var(--text-primary)]
          border border-[var(--border-color)]
          rounded-md
          px-2 py-1.5
          focus:outline-none
          focus:ring-1
          focus:ring-[var(--accent-primary)]
          cursor-pointer
          appearance-none
          pr-6
          min-w-[140px]
        "
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
                    backgroundPosition: 'right 4px center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '16px'
                }}
            >
                {options.map(([key, { label, example }]) => (
                    <option key={key} value={key}>
                        {label} ({example})
                    </option>
                ))}
            </select>
        </div>
    );
}
