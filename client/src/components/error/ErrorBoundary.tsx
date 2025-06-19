// React Error Boundary components for financial application
import React, { Component, ReactNode } from 'react';
import { ErrorFactory, errorHandler } from '@/lib/error-handler';
import { ErrorCategory, ErrorSeverity, type FinancialError } from '@shared/error-types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, TrendingDown, Calculator, Database } from 'lucide-react';

interface ErrorInfo {
  componentStack: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: FinancialError | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: FinancialError, retry: () => void) => ReactNode;
  onError?: (error: FinancialError, errorInfo: ErrorInfo) => void;
  maxRetries?: number;
  category?: ErrorCategory;
  showDetails?: boolean;
  enableRecovery?: boolean;
}

export class FinancialErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Create a financial error from the React error
    const financialError: FinancialError = {
      id: `react_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.HIGH,
      message: error.message,
      userMessage: 'An unexpected error occurred in the application',
      originalError: error,
      timestamp: new Date(),
      recoveryStrategy: 'retry' as any,
      retryable: true,
      complianceLog: true,
      context: {
        type: 'react_error',
        stack: error.stack
      }
    };

    return {
      hasError: true,
      error: financialError
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (this.state.error) {
      // Update the error with component stack info
      this.state.error.context = {
        ...this.state.error.context,
        componentStack: errorInfo.componentStack
      };

      // Log the error through our error handler
      errorHandler.handleError(this.state.error);

      // Call the onError prop if provided
      this.props.onError?.(this.state.error, errorInfo);
    }

    this.setState({ errorInfo });
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private handleRetry = () => {
    const maxRetries = this.props.maxRetries || 3;
    
    if (this.state.retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  private handleAutoRetry = () => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    this.retryTimeoutId = setTimeout(() => {
      this.handleRetry();
    }, 2000); // Auto retry after 2 seconds
  };

  private getErrorIcon = (category: ErrorCategory) => {
    switch (category) {
      case ErrorCategory.CALCULATION:
        return Calculator;
      case ErrorCategory.DATA_INTEGRITY:
        return Database;
      case ErrorCategory.API_LIMIT:
      case ErrorCategory.RATE_LIMIT:
        return TrendingDown;
      default:
        return AlertTriangle;
    }
  };

  private getErrorColor = (severity: ErrorSeverity): string => {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'text-yellow-600';
      case ErrorSeverity.MEDIUM:
        return 'text-orange-600';
      case ErrorSeverity.HIGH:
        return 'text-red-600';
      case ErrorSeverity.CRITICAL:
        return 'text-red-800';
      default:
        return 'text-gray-600';
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // Default error UI
      const Icon = this.getErrorIcon(this.state.error.category);
      const maxRetries = this.props.maxRetries || 3;
      const canRetry = this.state.retryCount < maxRetries && this.state.error.retryable;

      return (
        <Card className="w-full max-w-lg mx-auto my-8">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Icon className={`h-6 w-6 ${this.getErrorColor(this.state.error.severity)}`} />
              <CardTitle className="text-lg">
                {this.state.error.severity === ErrorSeverity.CRITICAL ? 'Critical Error' : 'Something went wrong'}
              </CardTitle>
            </div>
            <CardDescription>
              {this.state.error.userMessage}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Details</AlertTitle>
              <AlertDescription>
                <div className="space-y-2">
                  <p><strong>Category:</strong> {this.state.error.category}</p>
                  <p><strong>Severity:</strong> {this.state.error.severity}</p>
                  <p><strong>Time:</strong> {this.state.error.timestamp.toLocaleString()}</p>
                  {this.state.error.id && (
                    <p><strong>Error ID:</strong> <code className="text-xs">{this.state.error.id}</code></p>
                  )}
                </div>
              </AlertDescription>
            </Alert>

            {this.props.showDetails && this.state.error.originalError && (
              <Alert variant="destructive">
                <AlertTitle>Technical Details</AlertTitle>
                <AlertDescription>
                  <pre className="text-xs overflow-auto max-h-32 whitespace-pre-wrap">
                    {this.state.error.originalError.stack}
                  </pre>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex space-x-2">
              {canRetry && (
                <Button onClick={this.handleRetry} className="flex items-center space-x-2">
                  <RefreshCw className="h-4 w-4" />
                  <span>Try Again ({maxRetries - this.state.retryCount} attempts left)</span>
                </Button>
              )}
              
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>
            </div>

            {this.props.enableRecovery && canRetry && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={this.handleAutoRetry}
                className="w-full"
              >
                Auto-retry in 2 seconds
              </Button>
            )}

            {this.state.retryCount >= maxRetries && (
              <Alert>
                <AlertTitle>Maximum retries reached</AlertTitle>
                <AlertDescription>
                  Please refresh the page or contact support if the problem persists.
                  Error ID: <code>{this.state.error.id}</code>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Specialized error boundaries for different parts of the financial application

export const StockDataErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <FinancialErrorBoundary
      category={ErrorCategory.DATA_INTEGRITY}
      maxRetries={2}
      enableRecovery={true}
      fallback={(error, retry) => (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingDown className="h-5 w-5 text-orange-600" />
              <span>Stock Data Unavailable</span>
            </CardTitle>
            <CardDescription>
              Unable to load current stock data. This might be due to API limits or network issues.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Alert>
                <AlertDescription>
                  We're using cached data when available. Live data will resume shortly.
                </AlertDescription>
              </Alert>
              <Button onClick={retry} size="sm" className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4" />
                <span>Retry Loading</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    >
      {children}
    </FinancialErrorBoundary>
  );
};

export const CalculationErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <FinancialErrorBoundary
      category={ErrorCategory.CALCULATION}
      maxRetries={1}
      fallback={(error, retry) => (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calculator className="h-5 w-5 text-red-600" />
              <span>Calculation Error</span>
            </CardTitle>
            <CardDescription>
              Unable to complete the financial calculation. Please check your inputs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Alert variant="destructive">
                <AlertDescription>
                  The calculation could not be completed with the provided data. 
                  This may be due to invalid inputs or missing required information.
                </AlertDescription>
              </Alert>
              <Button onClick={retry} size="sm" variant="outline">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    >
      {children}
    </FinancialErrorBoundary>
  );
};

export const ChartErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <FinancialErrorBoundary
      category={ErrorCategory.DATA_INTEGRITY}
      maxRetries={1}
      fallback={(error, retry) => (
        <div className="w-full h-64 flex items-center justify-center border border-dashed border-gray-300 rounded-lg">
          <div className="text-center space-y-3">
            <TrendingDown className="h-8 w-8 text-gray-400 mx-auto" />
            <div>
              <p className="text-sm font-medium text-gray-900">Chart unavailable</p>
              <p className="text-xs text-gray-500">Unable to render chart data</p>
            </div>
            <Button onClick={retry} size="sm" variant="outline">
              Retry
            </Button>
          </div>
        </div>
      )}
    >
      {children}
    </FinancialErrorBoundary>
  );
};

// HOC for wrapping components with error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Partial<ErrorBoundaryProps>
) {
  const WrappedComponent = (props: P) => {
    return (
      <FinancialErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </FinancialErrorBoundary>
    );
  };

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

export default FinancialErrorBoundary;