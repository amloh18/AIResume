'use client';

import React, { forwardRef } from 'react';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';
export type CardVariant = 'default' | 'outlined' | 'elevated' | 'glass';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
  variant?: CardVariant;
  hoverable?: boolean;
  children: React.ReactNode;
}

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
};

const variantStyles: Record<CardVariant, string> = {
  default: `
    bg-white dark:bg-[var(--bg-secondary)]
    border border-[var(--border-primary)] dark:border-[var(--border-primary)]
  `,
  outlined: `
    bg-transparent
    border-2 border-[var(--border-primary)] dark:border-[var(--border-primary)]
  `,
  elevated: `
    bg-white dark:bg-[var(--bg-secondary)]
    shadow-lg dark:shadow-xl
  `,
  glass: `
    bg-white/80 dark:bg-[var(--bg-secondary)]/80
    backdrop-blur-xl
    border border-white/20 dark:border-white/10
  `,
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      padding = 'md',
      variant = 'default',
      hoverable = false,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={`
          rounded-xl
          transition-all duration-200
          ${variantStyles[variant]}
          ${paddingStyles[padding]}
          ${hoverable ? 'hover:shadow-lg hover:border-[var(--accent-primary)] cursor-pointer' : ''}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`pb-4 border-b border-[var(--border-primary)] dark:border-[var(--border-primary)] ${className}`} {...props}>
    {children}
  </div>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`py-4 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`pt-4 border-t border-[var(--border-primary)] dark:border-[var(--border-primary)] ${className}`} {...props}>
    {children}
  </div>
);

export default Card;