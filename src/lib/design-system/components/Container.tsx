'use client';

import React from 'react';
import { tokens } from '@/lib/design-system/tokens';

export interface ContainerProps {
  children: React.ReactNode;
  variant?: 'default' | 'glass' | 'elevated' | 'outlined';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const DesignContainer: React.FC<ContainerProps> = ({
  children,
  variant = 'default',
  size = 'md',
  padding = 'md',
  className = '',
}) => {
  const variantStyles = {
    default: 'bg-white dark:bg-[var(--bg-secondary)] border border-[var(--border-primary)]',
    glass: 'bg-white/80 dark:bg-[var(--bg-secondary)]/80 backdrop-blur-xl border border-white/20',
    elevated: 'bg-white dark:bg-[var(--bg-secondary)] shadow-xl',
    outlined: 'bg-transparent border-2 border-[var(--border-primary)]',
  };

  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-full',
  };

  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div className={`mx-auto rounded-xl ${variantStyles[variant]} ${sizeStyles[size]} ${paddingStyles[padding]} ${className}`}>
      {children}
    </div>
  );
};

export const GlassCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white/60 dark:bg-[var(--bg-secondary)]/60 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg ${className}`}>
    {children}
  </div>
);

export const SectionDivider: React.FC<{ label?: string }> = ({ label }) => (
  <div className="flex items-center gap-4 my-4">
    <div className="flex-1 h-px bg-[var(--border-primary)]" />
    {label && <span className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">{label}</span>}
    <div className="flex-1 h-px bg-[var(--border-primary)]" />
  </div>
);

export const FlexRow: React.FC<{ children: React.ReactNode; gap?: number; className?: string; align?: 'start' | 'center' | 'end' }> = ({ 
  children, 
  gap = 4, 
  className = '',
  align = 'center' 
}) => {
  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
  };
  return <div className={`flex flex-row gap-${gap} ${alignClasses[align]} ${className}`}>{children}</div>;
};

export const FlexCol: React.FC<{ children: React.ReactNode; gap?: number; className?: string; align?: 'start' | 'center' | 'end' }> = ({ 
  children, 
  gap = 4, 
  className = '',
  align = 'start' 
}) => {
  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
  };
  return <div className={`flex flex-col gap-${gap} ${alignClasses[align]} ${className}`}>{children}</div>;
};

export const Grid2: React.FC<{ children: React.ReactNode; gap?: number; className?: string }> = ({ 
  children, 
  gap = 4, 
  className = '' 
}) => (
  <div className={`grid grid-cols-2 gap-${gap} ${className}`}>{children}</div>
);

export const Grid3: React.FC<{ children: React.ReactNode; gap?: number; className?: string }> = ({ 
  children, 
  gap = 4, 
  className = '' 
}) => (
  <div className={`grid grid-cols-3 gap-${gap} ${className}`}>{children}</div>
);

export default DesignContainer;