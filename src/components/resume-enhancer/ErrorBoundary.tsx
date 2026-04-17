'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  stepName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary for Resume Enhancer step components
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 */
class ResumeEnhancerErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error to console in development
    console.error(`Error in ${this.props.stepName || 'Resume Enhancer'}:`, error);
    console.error('Component stack:', errorInfo.componentStack);
    
    // In production, you might want to log to an error reporting service
    // Example: logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleGoHome = () => {
    window.location.href = '/editor';
  };

  handleGoBack = () => {
    window.history.back();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-[var(--bg-secondary)] rounded-2xl shadow-xl p-8 text-center">
            {/* Error Icon */}
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>

            {/* Error Title */}
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
              Something went wrong
            </h2>
            
            {/* Error Description */}
            <p className="text-[var(--text-secondary)] mb-2">
              {this.props.stepName 
                ? `An error occurred in ${this.props.stepName}. This has been logged and we'll look into it.`
                : 'An unexpected error occurred. This has been logged and we\'ll look into it.'}
            </p>

            {/* Error Details (collapsible in development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left mb-6 bg-[var(--bg-tertiary)] rounded-lg p-4">
                <summary className="cursor-pointer text-sm font-medium text-[var(--text-secondary)]">
                  Error Details
                </summary>
                <pre className="mt-2 text-xs text-red-400 overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-black rounded-lg font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              
              <button
                onClick={this.handleGoBack}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--hover-bg)] text-[var(--text-primary)] rounded-lg font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--hover-bg)] text-[var(--text-primary)] rounded-lg font-medium transition-colors"
              >
                <Home className="w-4 h-4" />
                Start Over
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ResumeEnhancerErrorBoundary;

/**
 * Higher-order component to wrap a component with an error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  stepName?: string,
  onReset?: () => void
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  const ComponentWithErrorBoundary = (props: P) => (
    <ResumeEnhancerErrorBoundary stepName={stepName} onReset={onReset}>
      <WrappedComponent {...props} />
    </ResumeEnhancerErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;
  
  return ComponentWithErrorBoundary;
}
