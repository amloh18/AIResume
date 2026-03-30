'use client';

import React from 'react';
import { Check } from 'lucide-react';

export type StepVariant = 'numbered' | 'bulleted' | 'underlined';

export interface Step {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

export interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  variant?: StepVariant;
  showLabels?: boolean;
  showProgress?: boolean;
  completedSteps?: number[];
  disabled?: boolean;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  currentStep,
  onStepClick,
  variant = 'numbered',
  showLabels = true,
  showProgress = true,
  completedSteps = [],
  disabled = false,
}) => {
  const isCompleted = (index: number) => completedSteps.includes(index) || index < currentStep;
  const isCurrent = (index: number) => index === currentStep;

  const getStepClasses = (index: number) => {
    const base = 'flex items-center justify-center transition-all duration-200';
    
    if (isCompleted(index)) {
      return `${base} bg-[var(--accent-primary)] text-black`;
    }
    if (isCurrent(index)) {
      return `${base} bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]`;
    }
    return `${base} bg-[var(--bg-tertiary)] dark:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]`;
  };

  const getConnectorClasses = (index: number) => {
    if (isCompleted(index)) {
      return 'bg-[var(--accent-primary)]';
    }
    return 'bg-[var(--border-primary)] dark:bg-[var(--border-primary)]';
  };

  const getLabelClasses = (index: number) => {
    if (isCurrent(index)) {
      return 'text-[var(--text-primary)] dark:text-white font-medium';
    }
    if (isCompleted(index)) {
      return 'text-[var(--text-primary)] dark:text-white';
    }
    return 'text-[var(--text-tertiary)]';
  };

  return (
    <div className="w-full">
      {/* Progress Bar */}
      {showProgress && (
        <div className="mb-4 h-1 bg-[var(--bg-tertiary)] dark:bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--accent-primary)] transition-all duration-300 ease-out"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      )}

      {/* Steps */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            {/* Step Button */}
            <button
              onClick={() => !disabled && onStepClick?.(index)}
              disabled={disabled}
              className={`
                flex flex-col items-center gap-2
                ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:opacity-80'}
              `}
              aria-current={isCurrent(index) ? 'step' : undefined}
            >
              {/* Step Circle */}
              <div
                className={`
                  w-10 h-10 rounded-full text-sm font-medium
                  ${getStepClasses(index)}
                `}
              >
                {isCompleted(index) ? (
                  <Check size={20} />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>

              {/* Label */}
              {showLabels && (
                <div className={`text-center ${getLabelClasses(index)}`}>
                  <span className="text-xs sm:text-sm whitespace-nowrap">{step.label}</span>
                </div>
              )}
            </button>

            {/* Connector */}
            {index < steps.length - 1 && (
              <div className="flex-1 mx-2">
                <div className={`h-0.5 rounded ${getConnectorClasses(index)}`} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default StepIndicator;