'use client';

import React from 'react';
import { X, GripVertical } from 'lucide-react';

export type PanelVariant = 'default' | 'card' | 'glass' | 'bordered' | 'highlighted';
export type PanelSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface PanelProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  variant?: PanelVariant;
  size?: PanelSize;
  showClose?: boolean;
  onClose?: () => void;
  draggable?: boolean;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  noPadding?: boolean;
}

const variantStyles: Record<PanelVariant, string> = {
  default: 'bg-white dark:bg-[var(--bg-secondary)] border border-[var(--border-primary)] dark:border-[var(--border-primary)]',
  card: 'bg-white dark:bg-[var(--bg-secondary)] shadow-lg border border-transparent',
  glass: 'bg-white/80 dark:bg-[var(--bg-secondary)]/80 backdrop-blur-xl border border-white/20',
  bordered: 'bg-transparent border-2 border-[var(--border-primary)] dark:border-[var(--border-primary)]',
  highlighted: 'bg-white dark:bg-[var(--bg-secondary)] border-l-4 border-l-[var(--accent-primary)]',
};

const sizeStyles: Record<PanelSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full',
};

export const Panel: React.FC<PanelProps> = ({
  title,
  subtitle,
  children,
  variant = 'default',
  size = 'md',
  showClose = false,
  onClose,
  draggable = false,
  icon,
  actions,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  noPadding = false,
}) => {
  return (
    <div className={`rounded-xl ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
      {/* Header */}
      {(title || showClose || actions) && (
        <div className={`flex items-center justify-between px-4 py-3 border-b border-[var(--border-primary)] dark:border-[var(--border-primary)] ${headerClassName}`}>
          <div className="flex items-center gap-3">
            {draggable && (
              <div className="cursor-grab active:cursor-grabbing text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
                <GripVertical size={16} />
              </div>
            )}
            {icon && <div className="text-[var(--accent-primary)]">{icon}</div>}
            <div>
              {title && (
                <h3 className="text-sm font-semibold text-[var(--text-primary)] dark:text-white">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-[var(--text-tertiary)]">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {actions}
            {showClose && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                aria-label="Close panel"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Body */}
      <div className={noPadding ? '' : 'p-4'}>
        {children}
      </div>
    </div>
  );
};

export const PanelSection: React.FC<{ title?: string; children: React.ReactNode; className?: string }> = ({
  title,
  children,
  className = '',
}) => (
  <div className={className}>
    {title && (
      <h4 className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
        {title}
      </h4>
    )}
    {children}
  </div>
);

export const PanelDivider: React.FC = () => (
  <div className="my-3 border-t border-[var(--border-primary)] dark:border-[var(--border-primary)]" />
);

export default Panel;