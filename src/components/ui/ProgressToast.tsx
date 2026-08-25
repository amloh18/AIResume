'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastVariant = 'success' | 'warning' | 'error' | 'info' | 'progress';

export interface ProgressToastAction {
  label: string;
  onClick: () => void;
}

export interface ProgressToastData {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  action?: ProgressToastAction;
  actions?: ProgressToastAction[];
  duration?: number; // auto-close in ms (default 5000)
  progress?: number; // 0-100 for progress variant
  showTimer?: boolean; // show auto-close timer bar
  onDismiss?: () => void;
}

interface ProgressToastProps extends Omit<ProgressToastData, 'onDismiss'> {
  onDismiss: (id: string) => void;
}

const variantConfig: Record<ToastVariant, {
  borderColor: string;
  iconBg: string;
  darkIconBg: string;
  Icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  darkIconColor: string;
}> = {
  success: {
    borderColor: 'border-l-emerald-500',
    iconBg: 'bg-emerald-50',
    darkIconBg: 'dark:bg-emerald-500/15',
    Icon: CheckCircle2,
    iconColor: 'text-emerald-600',
    darkIconColor: 'dark:text-emerald-500',
  },
  warning: {
    borderColor: 'border-l-amber-500',
    iconBg: 'bg-amber-50',
    darkIconBg: 'dark:bg-amber-500/15',
    Icon: AlertTriangle,
    iconColor: 'text-amber-600',
    darkIconColor: 'dark:text-amber-500',
  },
  error: {
    borderColor: 'border-l-red-500',
    iconBg: 'bg-red-50',
    darkIconBg: 'dark:bg-red-500/15',
    Icon: AlertCircle,
    iconColor: 'text-red-600',
    darkIconColor: 'dark:text-red-500',
  },
  info: {
    borderColor: 'border-l-blue-500',
    iconBg: 'bg-blue-50',
    darkIconBg: 'dark:bg-blue-500/15',
    Icon: Info,
    iconColor: 'text-blue-600',
    darkIconColor: 'dark:text-blue-500',
  },
  progress: {
    borderColor: 'border-l-emerald-500',
    iconBg: 'bg-emerald-50',
    darkIconBg: 'dark:bg-emerald-500/15',
    Icon: Loader2,
    iconColor: 'text-emerald-600',
    darkIconColor: 'dark:text-emerald-500',
  },
};

export function ProgressToast({
  id,
  variant,
  title,
  description,
  action,
  actions,
  duration = 5000,
  progress,
  showTimer = true,
  onDismiss,
}: ProgressToastProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isPaused, setIsPaused] = useState(false);
  const [shouldDismiss, setShouldDismiss] = useState(false);
  const config = variantConfig[variant];
  const IconComponent = config.Icon;
  const resolvedActions = actions?.length ? actions : action ? [action] : [];

  useEffect(() => {
    setTimeLeft(duration);
  }, [duration, variant]);

  // Deferred dismissal — avoids calling parent setState inside child setState updater
  useEffect(() => {
    if (shouldDismiss) {
      onDismiss(id);
    }
  }, [shouldDismiss, id, onDismiss]);

  useEffect(() => {
    if (!showTimer || isPaused || variant === 'progress') return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 100) {
          clearInterval(interval);
          setShouldDismiss(true);
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [showTimer, isPaused, variant]);

  const handleDismiss = useCallback(() => {
    onDismiss(id);
  }, [id, onDismiss]);

  const timerProgress = showTimer ? ((duration - timeLeft) / duration) * 100 : 0;

  return (
    <div
      className={cn(
        'pointer-events-auto w-full max-w-[400px] overflow-hidden rounded-2xl border border-gray-200 border-l-4 shadow-2xl transition-all',
        config.borderColor,
        // Light theme (default)
        'bg-white text-gray-900',
        // Dark theme
        'dark:bg-[#111111]/95 dark:text-white dark:border-gray-800'
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Main content */}
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div className={cn(
          'mt-0.5 flex-shrink-0 rounded-full p-1.5',
          config.iconBg,
          config.darkIconBg
        )}>
          <IconComponent
            className={cn(
              'h-4 w-4',
              config.iconColor,
              config.darkIconColor,
              variant === 'progress' && 'animate-spin'
            )}
          />
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <p className="block text-sm font-semibold leading-snug text-gray-900 dark:text-white">{title}</p>
          {description && (
            <p className="block text-xs text-gray-500 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">{description}</p>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 rounded-md p-1 text-gray-400 opacity-60 transition-opacity hover:text-gray-900 hover:opacity-100 dark:hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {resolvedActions.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {resolvedActions.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                item.onClick();
                handleDismiss();
              }}
              className="rounded-lg border border-gray-200 bg-gray-100 px-4 py-1.5 text-xs font-semibold transition-colors hover:bg-gray-200 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Timer bar + message */}
      {showTimer && variant !== 'progress' && (
        <div className="border-t border-gray-100 dark:border-white/5 px-4 py-2">
          <div className="flex items-center justify-between text-[10px] text-gray-500">
            <span>
              This message will close in {Math.ceil(timeLeft / 1000)} seconds.{' '}
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="font-bold text-gray-600 hover:text-gray-900 transition-colors dark:text-gray-400 dark:hover:text-white"
              >
                {isPaused ? 'Resume' : 'Click to stop'}.
              </button>
            </span>
          </div>
          {/* Timer progress bar */}
          <div className="mt-1.5 h-0.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/5">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-100 ease-linear',
                variant === 'success' && 'bg-emerald-500',
                variant === 'warning' && 'bg-amber-500',
                variant === 'error' && 'bg-red-500',
                variant === 'info' && 'bg-blue-500'
              )}
              style={{ width: `${timerProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Progress bar for progress variant */}
      {variant === 'progress' && progress !== undefined && (
        <div className="border-t border-gray-100 dark:border-white/5 px-4 py-2">
          <div className="flex items-center justify-between text-[10px] text-gray-500">
            <span>{description || 'In progress...'}</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{Math.round(progress)}%</span>
          </div>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/5">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
