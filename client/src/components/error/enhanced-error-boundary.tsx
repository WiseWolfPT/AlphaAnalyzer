import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, RefreshCw, Home, FileText, Bug } from "lucide-react";
import { handleError } from "@/services/error-handler-service";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  errorCount: number;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ 
    error?: Error; 
    retry: () => void;
    errorCount: number;
  }>;
  context?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  maxRetries?: number;
  showDetails?: boolean;
}

export class EnhancedErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId?: NodeJS.Timeout;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState((prevState) => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }

    // Report error to global error handler
    handleError(error, {
      context: this.props.context || 'React Component',
      category: 'system',
      severity: 'high',
      showNotification: false, // Don't show notification, we're showing UI
      data: {
        componentStack: errorInfo.componentStack,
        errorBoundary: this.props.context || 'EnhancedErrorBoundary',
        errorCount: this.state.errorCount + 1
      }
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Auto-retry for transient errors
    this.scheduleAutoRetry();
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  scheduleAutoRetry = () => {
    const { maxRetries = 3 } = this.props;
    
    // Only auto-retry for potentially transient errors
    if (this.state.errorCount < maxRetries && this.isTransientError(this.state.error)) {
      this.retryTimeoutId = setTimeout(() => {
        this.handleRetry();
      }, 3000 * this.state.errorCount); // Exponential backoff
    }
  };

  isTransientError = (error?: Error): boolean => {
    if (!error) return false;
    
    const transientPatterns = [
      'chunk',
      'network',
      'fetch',
      'timeout',
      'loading',
      'import'
    ];
    
    return transientPatterns.some(pattern => 
      error.message.toLowerCase().includes(pattern)
    );
  };

  handleRetry = () => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
    
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined 
    });
  };

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      errorCount: 0
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReportBug = () => {
    const errorDetails = {
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // In production, this would send to a bug tracking system
    console.log('Bug report:', errorDetails);
    
    // Copy error details to clipboard
    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
    
    // Show notification
    handleError(new Error('Bug report copied to clipboard'), {
      severity: 'low',
      category: 'system',
      showNotification: true
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent 
            error={this.state.error} 
            retry={this.handleRetry}
            errorCount={this.state.errorCount}
          />
        );
      }

      return (
        <DefaultErrorFallback 
          error={this.state.error} 
          errorInfo={this.state.errorInfo}
          retry={this.handleRetry}
          reset={this.handleReset}
          goHome={this.handleGoHome}
          reportBug={this.handleReportBug}
          errorCount={this.state.errorCount}
          showDetails={this.props.showDetails}
          context={this.props.context}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error?: Error;
  errorInfo?: React.ErrorInfo;
  retry: () => void;
  reset: () => void;
  goHome: () => void;
  reportBug: () => void;
  errorCount: number;
  showDetails?: boolean;
  context?: string;
}

export function DefaultErrorFallback({ 
  error, 
  errorInfo,
  retry, 
  reset,
  goHome,
  reportBug,
  errorCount,
  showDetails = process.env.NODE_ENV === 'development',
  context
}: ErrorFallbackProps) {
  const isChunkError = error?.message?.includes('chunk') || error?.message?.includes('Loading');
  const isNetworkError = error?.message?.includes('fetch') || error?.message?.includes('Network');
  
  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl">
            {isChunkError ? 'Update Required' : 
             isNetworkError ? 'Connection Problem' : 
             'Something went wrong'}
          </CardTitle>
          {context && (
            <p className="text-sm text-muted-foreground mt-1">
              Error in {context}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {isChunkError ? 
                'A new version is available. Please refresh the page to update.' :
               isNetworkError ? 
                'Unable to connect to the server. Please check your internet connection and try again.' :
                'An unexpected error occurred. The issue has been logged and we\'ll look into it.'}
            </AlertDescription>
          </Alert>

          {errorCount > 1 && (
            <Alert variant="destructive">
              <AlertDescription>
                This error has occurred {errorCount} times. 
                {errorCount >= 3 && ' Consider refreshing the page or contacting support.'}
              </AlertDescription>
            </Alert>
          )}

          {showDetails && error && (
            <details className="mt-4 p-3 bg-muted rounded-lg">
              <summary className="cursor-pointer text-sm font-medium">
                Error Details
              </summary>
              <div className="mt-2 space-y-2">
                <div>
                  <p className="text-xs font-semibold">Message:</p>
                  <pre className="text-xs whitespace-pre-wrap break-words">
                    {error.message}
                  </pre>
                </div>
                {error.stack && (
                  <div>
                    <p className="text-xs font-semibold">Stack:</p>
                    <pre className="text-xs whitespace-pre-wrap break-words max-h-40 overflow-auto">
                      {error.stack}
                    </pre>
                  </div>
                )}
                {errorInfo?.componentStack && (
                  <div>
                    <p className="text-xs font-semibold">Component Stack:</p>
                    <pre className="text-xs whitespace-pre-wrap break-words max-h-40 overflow-auto">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}

          <div className="flex flex-col gap-2">
            {isChunkError ? (
              <Button onClick={() => window.location.reload()} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Page
              </Button>
            ) : (
              <>
                <Button variant="default" onClick={retry} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                {errorCount > 2 && (
                  <Button variant="outline" onClick={reset} className="w-full">
                    Reset Component
                  </Button>
                )}
              </>
            )}
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={goHome} className="flex-1">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
              {showDetails && (
                <Button variant="outline" onClick={reportBug} className="flex-1">
                  <Bug className="h-4 w-4 mr-2" />
                  Report
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook for handling async errors in functional components
export function useAsyncError() {
  const [, setError] = React.useState();
  
  return React.useCallback(
    (error: Error) => {
      setError(() => {
        throw error;
      });
    },
    [setError]
  );
}

// Higher-order component wrapper
export function withEnhancedErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: Partial<ErrorBoundaryProps>
) {
  return function WrappedComponent(props: P) {
    return (
      <EnhancedErrorBoundary {...options}>
        <Component {...props} />
      </EnhancedErrorBoundary>
    );
  };
}