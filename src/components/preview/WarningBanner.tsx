'use client';

import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Lightbulb,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { ValidationWarning, WarningSeverity } from '@/lib/validation/cv-preview-validator';

interface WarningBannerProps {
  warning: ValidationWarning;
  onDismiss?: (id: string) => void;
  onAutoFix?: (warning: ValidationWarning) => void;
  compact?: boolean;
}

const severityConfig: Record<
  WarningSeverity,
  { icon: typeof AlertCircle; bgColor: string; borderColor: string; textColor: string; label: string }
> = {
  error: {
    icon: AlertCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    label: 'Error',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-800',
    label: 'Warning',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    label: 'Info',
  },
  suggestion: {
    icon: Lightbulb,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800',
    label: 'Suggestion',
  },
};

export const WarningBanner: React.FC<WarningBannerProps> = ({
  warning,
  onDismiss,
  onAutoFix,
  compact = false,
}) => {
  const config = severityConfig[warning.type];
  const Icon = config.icon;

  return (
    <div
      className={`flex items-start gap-2 p-2.5 rounded-lg border ${config.bgColor} ${config.borderColor} ${compact ? 'py-1.5' : ''}`}
    >
      <Icon size={compact ? 14 : 16} className={`${config.textColor} flex-shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <p className={`text-xs ${config.textColor} leading-relaxed`}>{warning.message}</p>
        {warning.autoFixLabel && onAutoFix && (
          <button
            onClick={() => onAutoFix(warning)}
            className="mt-1 flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-900 transition-colors"
          >
            <Sparkles size={12} />
            {warning.autoFixLabel}
          </button>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={() => onDismiss(warning.id)}
          className={`${config.textColor} opacity-50 hover:opacity-100 flex-shrink-0 transition-opacity`}
        >
          <X size={compact ? 12 : 14} />
        </button>
      )}
    </div>
  );
};
