'use client';

import React, { forwardRef } from 'react';

export type InputSize = 'sm' | 'md' | 'lg';
export type InputVariant = 'default' | 'error' | 'success';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  size?: InputSize;
  variant?: InputVariant;
  fullWidth?: boolean;
}

const sizeStyles: Record<InputSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-2.5 text-base',
};

const variantStyles: Record<InputVariant, string> = {
  default: `
    border-[var(--border-primary)] dark:border-[var(--border-primary)]
    focus:border-[var(--accent-primary)] focus:ring-[var(--accent-primary)]
  `,
  error: `
    border-red-500 focus:border-red-500 focus:ring-red-500
    bg-red-50 dark:bg-red-900/10
  `,
  success: `
    border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500
    bg-emerald-50 dark:bg-emerald-900/10
  `,
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftElement,
      rightElement,
      size = 'md',
      variant = 'default',
      fullWidth = false,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = !!error;
    const appliedVariant = hasError ? 'error' : variant;

    return (
      <div className={`flex flex-col gap-1 ${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[var(--text-primary)] dark:text-gray-200"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftElement && (
            <div className="absolute left-3 text-[var(--text-tertiary)]">
              {leftElement}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full
              bg-white dark:bg-[var(--bg-tertiary)]
              text-[var(--text-primary)] dark:text-white
              rounded-lg
              border
              transition-colors duration-150
              placeholder:text-[var(--text-tertiary)]
              focus:outline-none focus:ring-2 focus:ring-offset-1
              disabled:opacity-50 disabled:cursor-not-allowed
              ${sizeStyles[size]}
              ${variantStyles[appliedVariant]}
              ${leftElement ? 'pl-10' : ''}
              ${rightElement ? 'pr-10' : ''}
              ${className}
            `}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 text-[var(--text-tertiary)]">
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-red-500" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-xs text-[var(--text-tertiary)]">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;