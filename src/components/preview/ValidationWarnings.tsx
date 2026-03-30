'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronUp, AlertCircle, Sparkles } from 'lucide-react';
import { ValidationWarning, ValidationResult } from '@/lib/validation/cv-preview-validator';
import { WarningBanner } from './WarningBanner';

interface ValidationWarningsProps {
  result: ValidationResult | null;
  onDismiss?: (id: string) => void;
  onAutoFix?: (warning: ValidationWarning) => void;
  className?: string;
}

export const ValidationWarnings: React.FC<ValidationWarningsProps> = ({
  result,
  onDismiss,
  onAutoFix,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const visibleWarnings = useMemo(() => {
    if (!result?.warnings) return [];
    return result.warnings.filter(w => !dismissedIds.has(w.id));
  }, [result, dismissedIds]);

  const grouped = useMemo(() => {
    const groups: Record<string, ValidationWarning[]> = {};
    for (const w of visibleWarnings) {
      if (!groups[w.section]) groups[w.section] = [];
      groups[w.section].push(w);
    }
    return groups;
  }, [visibleWarnings]);

  const handleDismiss = useCallback(
    (id: string) => {
      setDismissedIds(prev => new Set(prev).add(id));
      onDismiss?.(id);
    },
    [onDismiss]
  );

  if (!result || visibleWarnings.length === 0) return null;

  const { score } = result;
  const scoreColor =
    score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-600' : 'text-red-600';
  const scoreBg =
    score >= 80 ? 'bg-green-50 border-green-200' : score >= 60 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';

  return (
    <div className={`validation-warnings ${className}`}>
      {/* Score Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border ${scoreBg} transition-colors`}
      >
        <div className="flex items-center gap-2">
          <AlertCircle size={14} className={scoreColor} />
          <span className={`text-xs font-semibold ${scoreColor}`}>
            Quality Score: {score}/100
          </span>
          <span className="text-xs text-gray-500">
            ({visibleWarnings.length} {visibleWarnings.length === 1 ? 'issue' : 'issues'})
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp size={14} className="text-gray-400" />
        ) : (
          <ChevronDown size={14} className="text-gray-400" />
        )}
      </button>

      {/* Warnings List */}
      {isExpanded && (
        <div className="mt-2 space-y-3">
          {Object.entries(grouped).map(([section, warnings]) => (
            <div key={section}>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 px-1">
                {section.replace(/_/g, ' ')}
              </div>
              <div className="space-y-1.5">
                {warnings.map(warning => (
                  <WarningBanner
                    key={warning.id}
                    warning={warning}
                    onDismiss={handleDismiss}
                    onAutoFix={onAutoFix}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
