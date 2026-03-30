'use client';

import React, { forwardRef, useState } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  showCount?: boolean;
  maxLength?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      hint,
      showCount = false,
      maxLength,
      className = '',
      id,
      value,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState('');
    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : internalValue;
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!isControlled) {
        setInternalValue(e.target.value);
      }
      props.onChange?.(e);
    };

    const hasError = !!error;
    const charCount = typeof currentValue === 'string' ? currentValue.length : 0;

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm font-medium text-[var(--text-primary)] dark:text-gray-200"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          value={currentValue}
          onChange={handleChange}
          maxLength={maxLength}
          className={`
            w-full px-3 py-2 text-sm
            bg-white dark:bg-[var(--bg-tertiary)]
            text-[var(--text-primary)] dark:text-white
            rounded-lg border
            transition-colors duration-150
            placeholder:text-[var(--text-tertiary)]
            focus:outline-none focus:ring-2 focus:ring-offset-1
            resize-none
            ${hasError
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : 'border-[var(--border-primary)] dark:border-[var(--border-primary)] focus:border-[var(--accent-primary)] focus:ring-[var(--accent-primary)]'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
            ${className}
          `}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
          {...props}
        />
        <div className="flex justify-between items-center">
          <div>
            {error && (
              <p id={`${textareaId}-error`} className="text-xs text-red-500" role="alert">
                {error}
              </p>
            )}
            {hint && !error && (
              <p id={`${textareaId}-hint`} className="text-xs text-[var(--text-tertiary)]">
                {hint}
              </p>
            )}
          </div>
          {showCount && maxLength && (
            <span className={`text-xs ${charCount >= maxLength ? 'text-red-500' : 'text-[var(--text-tertiary)]'}`}>
              {charCount}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;