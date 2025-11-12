'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { handlePreviewError, ErrorType } from '@/lib/accessibility-utils';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  context?: 'studio' | 'dashboard' | 'general';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  userFriendlyError: ReturnType<typeof handlePreviewError> | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      userFriendlyError: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const userFriendlyError = handlePreviewError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    });

    this.setState({
      error,
      errorInfo,
      userFriendlyError
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Log error for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      userFriendlyError: null
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleExitWithoutSaving = () => {
    // Clear any pending saves
    sessionStorage.removeItem('studioUnsavedChanges');
    localStorage.removeItem('studioDraftData');
    
    // Navigate to dashboard
    window.location.href = '/dashboard';
  };

  handleReportBug = () => {
    const { error, errorInfo, userFriendlyError } = this.state;
    
    const bugReport = {
      error: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      userFriendlyError: userFriendlyError,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // In a real application, you would send this to your error reporting service
    console.log('Bug Report:', bugReport);
    
    // For now, copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(bugReport, null, 2))
      .then(() => {
        alert('Bug report copied to clipboard. Please share this with the development team.');
      })
      .catch(() => {
        alert('Unable to copy bug report. Please contact support.');
      });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { userFriendlyError } = this.state;
      
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                {userFriendlyError?.title || 'Something went wrong'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* User-friendly error message */}
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  {userFriendlyError?.message || 'An unexpected error occurred while rendering your CV preview.'}
                </p>
                
                {userFriendlyError?.action && (
                  <Badge variant="outline" className="text-sm">
                    Suggested Action: {userFriendlyError.action}
                  </Badge>
                )}
              </div>

              {/* Error details (if enabled) */}
              {this.props.showDetails && this.state.error && (
                <details className="space-y-2">
                  <summary className="cursor-pointer text-sm font-medium">
                    Technical Details
                  </summary>
                  <div className="bg-muted p-3 rounded text-sm font-mono text-xs overflow-auto max-h-32">
                    <div className="font-semibold mb-1">Error:</div>
                    <div className="text-destructive">{this.state.error.message}</div>
                    
                    {this.state.error.stack && (
                      <>
                        <div className="font-semibold mb-1 mt-2">Stack Trace:</div>
                        <div className="whitespace-pre-wrap">{this.state.error.stack}</div>
                      </>
                    )}
                    
                    {this.state.errorInfo?.componentStack && (
                      <>
                        <div className="font-semibold mb-1 mt-2">Component Stack:</div>
                        <div className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</div>
                      </>
                    )}
                  </div>
                </details>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <Button onClick={this.handleRetry} className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                
                {this.props.context === 'studio' && (
                  <Button variant="outline" onClick={this.handleExitWithoutSaving} className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Exit Without Saving
                  </Button>
                )}
                
                {this.props.context !== 'studio' && (
                  <Button variant="outline" onClick={this.handleGoHome} className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Go Home
                  </Button>
                )}
                
                <Button variant="outline" onClick={this.handleReportBug} className="flex items-center gap-2">
                  <Bug className="h-4 w-4" />
                  Report Bug
                </Button>
              </div>

              {/* Additional help */}
              <div className="text-sm text-muted-foreground">
                <p>
                  If this problem persists, please try refreshing the page or contact support.
                  Error ID: {this.state.userFriendlyError?.timestamp.toISOString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;