'use client';

import React, { forwardRef } from 'react';
import { tokens } from '../tokens';
import { LoadingSpinner } from './LoadingSpinner';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ButtonDensity = 'compact' | 'default' | 'relaxed';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  density?: ButtonDensity;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] 
    text-black dark:text-black
    border-transparent
    focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 dark:focus:ring-offset-gray-900
  `,
  secondary: `
    bg-[var(--bg-tertiary)] dark:bg-[var(--bg-tertiary)]
    text-[var(--text-primary)] dark:text-white
    border-transparent
    hover:bg-[var(--border-primary)] dark:hover:bg-[var(--border-secondary)]
  `,
  outline: `
    bg-transparent
    text-[var(--text-primary)] dark:text-white
    border border-[var(--border-primary)] dark:border-[var(--border-primary)]
    hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--bg-tertiary)]
  `,
  ghost: `
    bg-transparent
    text-[var(--text-secondary)] dark:text-gray-400
    border-transparent
    hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--bg-tertiary)]
    hover:text-[var(--text-primary)] dark:hover:text-white
  `,
  danger: `
    bg-red-500 hover:bg-red-600
    text-white
    border-transparent
    focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
  `,
  success: `
    bg-emerald-500 hover:bg-emerald-600
    text-white
    border-transparent
    focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'px-2 py-1 text-xs gap-1',
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2',
  xl: 'px-6 py-3 text-base gap-2.5',
};

const densityStyles: Record<ButtonDensity, string> = {
  compact: '',
  default: '',
  relaxed: 'py-3',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      density = 'default',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;
    
    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center
          font-medium rounded-lg
          transition-all duration-150 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${densityStyles[density]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {isLoading ? (
          <LoadingSpinner size={size === 'xs' ? 'xs' : size === 'sm' ? 'sm' : 'md'} />
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;